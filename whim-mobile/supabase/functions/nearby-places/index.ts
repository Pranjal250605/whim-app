// Edge Function: nearby-places
// Live "Near me" discovery via Google Places API (New) — searchNearby around
// the user's GPS, results sorted into Whim's 4 vibes by a deterministic
// type→vibe map (no LLM needed; Google already gives each place a type).
//
// LEGAL: Google Places content is returned LIVE and NOT stored (their terms
// prohibit caching Places data beyond place_id). This never writes to `spots`.
//
// Deploy: supabase functions deploy nearby-places
// Secret: GOOGLE_PLACES_API_KEY (Places-restricted key)

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { underDailyCap } from '../_shared/guard.ts';

const DAILY_CAP = 200; // Places calls are billed — per-user searches per UTC day

type Vibe = 'classics' | 'matcha' | 'nature' | 'nightlife';

// Google Places (New) primary types → Whim vibes. First match wins.
// Only Places (New) "Table A" searchable types — validated against the API.
const VIBE_TYPES: Record<Vibe, string[]> = {
  classics: ['tourist_attraction', 'historical_landmark', 'museum', 'art_gallery', 'church', 'hindu_temple', 'mosque', 'synagogue', 'aquarium', 'zoo', 'amusement_park'],
  matcha: ['cafe', 'coffee_shop', 'bakery', 'ice_cream_shop', 'book_store', 'clothing_store', 'gift_shop'],
  nature: ['park', 'national_park', 'hiking_area', 'campground', 'marina', 'dog_park'],
  nightlife: ['bar', 'night_club', 'pub', 'wine_bar', 'bar_and_grill'],
};
const TYPE_TO_VIBE = new Map<string, Vibe>();
for (const [vibe, types] of Object.entries(VIBE_TYPES)) for (const t of types) TYPE_TO_VIBE.set(t, vibe as Vibe);
const ALL_TYPES = [...TYPE_TO_VIBE.keys()];

function vibeOf(place: any): Vibe | null {
  if (place.primaryType && TYPE_TO_VIBE.has(place.primaryType)) return TYPE_TO_VIBE.get(place.primaryType)!;
  for (const t of place.types ?? []) if (TYPE_TO_VIBE.has(t)) return TYPE_TO_VIBE.get(t)!;
  return null;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: 'Invalid session' }, 401);

  let lat = NaN, lng = NaN, radius = 2000;
  try {
    const b = await req.json();
    lat = Number(b.lat); lng = Number(b.lng);
    if (b.radius) radius = Math.min(Math.max(Number(b.radius), 200), 8000);
  } catch { return json({ error: 'Invalid JSON body' }, 400); }
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
    return json({ error: 'lat/lng required (valid coordinates)' }, 400);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  if (!(await underDailyCap(admin, user.id, 'nearby-places', DAILY_CAP)))
    return json({ error: 'Daily nearby limit reached — try again tomorrow.', vibes: {} }, 429);

  const key = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!key) return json({ error: 'Server missing GOOGLE_PLACES_API_KEY' }, 500);

  const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.primaryType,places.types,places.location,places.rating,places.userRatingCount,places.shortFormattedAddress,places.photos',
    },
    body: JSON.stringify({
      includedTypes: ALL_TYPES,
      maxResultCount: 20,
      rankPreference: 'POPULARITY',
      locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius } },
    }),
  });
  const data = await res.json();
  if (!res.ok) return json({ error: data.error?.message ?? 'Places error', vibes: {} }, 502);

  // sort into vibes; keep decently-rated real spots, drop the noise
  const vibes: Record<Vibe, any[]> = { classics: [], matcha: [], nature: [], nightlife: [] };
  for (const p of data.places ?? []) {
    const v = vibeOf(p);
    if (!v) continue;
    if ((p.userRatingCount ?? 0) < 15) continue; // needs real local traction
    vibes[v].push({
      id: p.id, // place_id — the ONLY Places field we may retain
      title: p.displayName?.text ?? 'Unnamed',
      kind: (p.primaryType ?? '').replace(/_/g, ' '),
      area: p.shortFormattedAddress ?? '',
      lat: p.location?.latitude, lng: p.location?.longitude,
      rating: p.rating ?? null,
      ratingCount: p.userRatingCount ?? 0,
      photoName: p.photos?.[0]?.name ?? null, // fetched live via a photo proxy, never stored
    });
  }
  for (const v of Object.keys(vibes) as Vibe[]) vibes[v].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  return json({ source: 'places', center: [lat, lng], vibes });
});
