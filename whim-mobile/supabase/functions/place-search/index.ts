// Edge Function: place-search
// Resolves a freeform location query to real places via Google Places Text
// Search, for the trip builder ("add a location"). Returns the top matches so
// the user can pick the right one. JWT-gated + per-user daily cap (billed API).

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { underDailyCap } from '../_shared/guard.ts';

const DAILY_CAP = 300; // searches per user per UTC day (Places is billed)

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const auth = req.headers.get('Authorization');
  if (!auth) return json({ error: 'Missing Authorization header' }, 401);
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: 'Invalid session' }, 401);

  let query = '';
  let near: { lat: number; lng: number } | undefined;
  try {
    const b = await req.json();
    query = String(b.query ?? '').trim();
    if (b.near && typeof b.near.lat === 'number') near = b.near;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (query.length < 2) return json({ results: [] });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  if (!(await underDailyCap(admin, user.id, 'place-search', DAILY_CAP)))
    return json({ error: 'Daily search limit reached — try again tomorrow.', results: [] }, 429);

  const key = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!key) return json({ error: 'Server missing key' }, 500);

  const body: Record<string, unknown> = { textQuery: query, maxResultCount: 6 };
  if (near) body.locationBias = { circle: { center: { latitude: near.lat, longitude: near.lng }, radius: 30000 } };

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.primaryType,places.formattedAddress,places.addressComponents,places.location',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) return json({ error: 'Search failed', results: [] }, 502);

  const places = (await res.json()).places ?? [];
  const results = places.map((p: any) => {
    const cityComp = (p.addressComponents ?? []).find((c: any) =>
      (c.types ?? []).some((t: string) => t === 'locality' || t === 'postal_town' || t === 'administrative_area_level_2'),
    );
    return {
      id: p.id,
      title: p.displayName?.text ?? query,
      kind: (p.primaryType ?? '').replace(/_/g, ' '),
      area: (p.formattedAddress ?? '').split(',').slice(0, 2).join(',').trim(),
      city: cityComp?.longText ?? '',
      lat: p.location?.latitude ?? null,
      lng: p.location?.longitude ?? null,
    };
  });
  return json({ results });
});
