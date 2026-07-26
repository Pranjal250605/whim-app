// Edge Function: nearby-places
// Live "Near me" discovery via Google Places API (New) + a Claude enrichment
// pass that makes the results feel curated instead of generic:
//   1. per-vibe Text Search around the user's GPS → characterful candidates
//      (not just the most popular chains a broad nearby-sweep returns)
//   2. ONE batched Claude call re-sorts each place into the best vibe, writes an
//      evocative one-line blurb, and DROPS generic / uninteresting spots
//   3. graceful fallback to a deterministic type→vibe map if the LLM or a query
//      fails, so "Near me" never breaks
//
// LEGAL: Google Places content is returned LIVE and only the place_id is
// retained long-term. Blurbs are model-generated (ours). The 1-hour grid cache
// holds display fields for performance only. This never writes to `spots`.
//
// Deploy: supabase functions deploy nearby-places
// Secrets: GOOGLE_PLACES_API_KEY, ANTHROPIC_API_KEY

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { maybePurgeCaches, underDailyCap, underGlobalDailyCap } from '../_shared/guard.ts';

const DAILY_CAP = 200; // per-user Places+LLM searches per UTC day
const GLOBAL_CAP = 6000; // all-users LLM-enrichment ceiling per day (bill brake)
const ONE_HOUR_MS = 60 * 60 * 1000;
const MIN_RATINGS = 10; // needs some real local traction to be a candidate
const PER_VIBE_CAP = 12; // spots returned per vibe

type Vibe = 'classics' | 'matcha' | 'nature' | 'nightlife';
const VIBES: Vibe[] = ['classics', 'matcha', 'nature', 'nightlife'];

// Text-search phrasing per vibe — surfaces interesting places, not chains.
const VIBE_QUERIES: Record<Vibe, string> = {
  classics: 'iconic landmarks, historic sites, temples and museums worth seeing',
  matcha: 'cozy specialty-coffee cafes, artisan bakeries and charming little shops',
  nature: 'parks, gardens, waterfronts and scenic nature spots',
  nightlife: 'characterful cocktail bars, wine bars, pubs and nightlife',
};

// Deterministic fallback: Google primary types → vibe (used if the LLM is
// unavailable). Only Places (New) "Table A" types.
const VIBE_TYPES: Record<Vibe, string[]> = {
  classics: ['tourist_attraction', 'historical_landmark', 'museum', 'art_gallery', 'church', 'hindu_temple', 'mosque', 'synagogue', 'aquarium', 'zoo', 'amusement_park'],
  matcha: ['cafe', 'coffee_shop', 'bakery', 'ice_cream_shop', 'book_store', 'gift_shop'],
  nature: ['park', 'national_park', 'hiking_area', 'campground', 'marina', 'dog_park'],
  nightlife: ['bar', 'night_club', 'pub', 'wine_bar', 'bar_and_grill'],
};
const TYPE_TO_VIBE = new Map<string, Vibe>();
for (const [vibe, types] of Object.entries(VIBE_TYPES)) for (const t of types) TYPE_TO_VIBE.set(t, vibe as Vibe);

function fallbackVibe(place: any, hint: Vibe): Vibe {
  if (place.primaryType && TYPE_TO_VIBE.has(place.primaryType)) return TYPE_TO_VIBE.get(place.primaryType)!;
  for (const t of place.types ?? []) if (TYPE_TO_VIBE.has(t)) return TYPE_TO_VIBE.get(t)!;
  return hint; // the vibe query it was found under
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const FIELD_MASK =
  'places.id,places.displayName,places.primaryType,places.types,places.location,places.rating,places.userRatingCount,places.shortFormattedAddress,places.photos';

// One vibe → up to N candidate places via Text Search, biased to the user.
async function searchVibe(vibe: Vibe, lat: number, lng: number, radius: number, key: string): Promise<any[]> {
  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': FIELD_MASK },
      body: JSON.stringify({
        textQuery: VIBE_QUERIES[vibe],
        maxResultCount: 12,
        locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius } },
      }),
    });
    if (!res.ok) return [];
    const places = (await res.json()).places ?? [];
    return places.map((p: any) => ({ ...p, _hint: vibe }));
  } catch {
    return [];
  }
}

// Haversine metres — Text Search only biases (can't restrict to a circle), so
// we bound candidates to genuinely near the user.
function distMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000, toRad = Math.PI / 180;
  const dLat = (bLat - aLat) * toRad, dLng = (bLng - aLng) * toRad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * toRad) * Math.cos(bLat * toRad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Weighted score so a 5.0 with 12 reviews doesn't beat a loved, busy 4.6.
function popularity(p: any): number {
  const r = p.rating ?? 0, n = p.userRatingCount ?? 0;
  return r * Math.log10(n + 10);
}

function toSpot(p: any, vibe: Vibe, blurb: string | null) {
  return {
    id: p.id, // place_id — the only Places field retained long-term
    title: p.displayName?.text ?? 'Unnamed',
    kind: (p.primaryType ?? '').replace(/_/g, ' '),
    area: p.shortFormattedAddress ?? '',
    lat: p.location?.latitude, lng: p.location?.longitude,
    rating: p.rating ?? null,
    ratingCount: p.userRatingCount ?? 0,
    photoName: p.photos?.[0]?.name ?? null,
    blurb,
    _vibe: vibe,
  };
}

// Claude re-sorts + blurbs + prunes. Returns null on any failure (→ fallback).
async function enrich(candidates: any[], apiKey: string): Promise<Map<string, { vibe: Vibe; blurb: string; keep: boolean; score: number }> | null> {
  try {
    const list = candidates
      .map((p, i) => `${i}. ${p.displayName?.text ?? 'Unnamed'} — ${(p.primaryType ?? 'place').replace(/_/g, ' ')} — ${p.rating ?? '?'}★ (${p.userRatingCount ?? 0}) — ${p.shortFormattedAddress ?? ''}`)
      .join('\n');
    const prompt =
      `You are a sharp local travel editor for Whim. Below are real places near a traveler.\n` +
      `For EACH, decide the single best vibe, write a vivid one-line blurb, and judge whether it's worth featuring.\n\n` +
      `Vibes:\n` +
      `- classics: iconic must-sees, landmarks, temples/shrines, museums, historic sites\n` +
      `- matcha: cafes, specialty coffee, bakeries, bookshops, calm & photogenic little places\n` +
      `- nature: parks, gardens, waterfronts, viewpoints, outdoor & scenic spots\n` +
      `- nightlife: bars, cocktail/wine bars, pubs, clubs, lively after-dark spots\n\n` +
      `Rules for "keep":\n` +
      `- keep=false for generic chains, fast food, gas stations, parking, transit stops, offices, and bland/forgettable spots.\n` +
      `- keep=true only for places with genuine character a curious traveler would enjoy.\n` +
      `Blurb: max 16 words, specific and evocative, no clichés, no "a must-visit", no emoji, sentence case.\n` +
      `score: 1–10 for how special/worth-a-detour it is.\n\n` +
      `Places:\n${list}\n\n` +
      `Reply with ONLY a JSON array, one object per place IN ORDER by index:\n` +
      `[{"i":0,"vibe":"matcha","blurb":"...","keep":true,"score":8}]`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 4096, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = (data.content ?? [])[0]?.text ?? '';
    const arr = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1));
    const out = new Map<string, { vibe: Vibe; blurb: string; keep: boolean; score: number }>();
    for (const item of arr) {
      const p = candidates[item?.i];
      if (!p) continue;
      const vibe: Vibe = VIBES.includes(item?.vibe) ? item.vibe : p._hint;
      out.set(p.id, {
        vibe,
        blurb: String(item?.blurb ?? '').trim().slice(0, 160),
        keep: item?.keep !== false,
        score: Number(item?.score) || 5,
      });
    }
    return out;
  } catch (e) {
    console.warn('[nearby] enrich failed:', e);
    return null;
  }
}

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
  await maybePurgeCaches(admin);

  // cache hit → serve without a Google/LLM call. ~1 km grid, fresh for an hour.
  const cacheKey = `nb:${lat.toFixed(2)}:${lng.toFixed(2)}:${radius}`;
  const { data: cached } = await admin.from('nearby_cache').select('result, fetched_at').eq('key', cacheKey).maybeSingle();
  if (cached && Date.now() - new Date(cached.fetched_at).getTime() < ONE_HOUR_MS) {
    return json({ source: 'cache', center: [lat, lng], vibes: (cached.result as any).vibes });
  }

  if (!(await underDailyCap(admin, user.id, 'nearby-places', DAILY_CAP)))
    return json({ error: 'Daily nearby limit reached — try again tomorrow.', vibes: {} }, 429);

  const key = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!key) return json({ error: 'Server missing GOOGLE_PLACES_API_KEY' }, 500);

  // 1. gather characterful candidates via per-vibe Text Search (parallel)
  const found = (await Promise.all(VIBES.map((v) => searchVibe(v, lat, lng, radius, key)))).flat();
  const seen = new Set<string>();
  const candidates: any[] = [];
  for (const p of found) {
    if (!p.id || seen.has(p.id)) continue;
    if ((p.userRatingCount ?? 0) < MIN_RATINGS) continue;
    // keep it genuinely near — Text Search bias can pull in far-but-famous spots
    if (p.location && distMeters(lat, lng, p.location.latitude, p.location.longitude) > radius * 1.6) continue;
    seen.add(p.id);
    candidates.push(p);
  }
  if (candidates.length === 0) return json({ source: 'places', center: [lat, lng], vibes: emptyVibes() });

  // 2. LLM enrichment (skipped past the global bill brake → deterministic path)
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  const allowLLM = anthropicKey && (await underGlobalDailyCap(admin, 'nearby-llm', GLOBAL_CAP));
  const enriched = allowLLM ? await enrich(candidates.slice(0, 40), anthropicKey!) : null;

  // 3. assemble vibes — enriched when we have it, deterministic otherwise
  const vibes = emptyVibes();
  for (const p of candidates) {
    const e = enriched?.get(p.id);
    if (enriched) {
      if (!e || !e.keep) continue; // model pruned it (or wasn't returned)
      vibes[e.vibe].push({ ...toSpot(p, e.vibe, e.blurb || null), _score: e.score });
    } else {
      const v = fallbackVibe(p, p._hint);
      vibes[v].push({ ...toSpot(p, v, null), _score: popularity(p) });
    }
  }

  // rank each vibe, cap, and strip internal fields
  const clean = emptyVibes();
  for (const v of VIBES) {
    clean[v] = vibes[v]
      .sort((a: any, b: any) => (b._score ?? 0) - (a._score ?? 0))
      .slice(0, PER_VIBE_CAP)
      .map(({ _score, _vibe, ...s }: any) => s);
  }

  admin.from('nearby_cache').upsert({ key: cacheKey, result: { vibes: clean }, fetched_at: new Date().toISOString() }).then(() => {});
  return json({ source: 'places', center: [lat, lng], vibes: clean });
});

function emptyVibes(): Record<Vibe, any[]> {
  return { classics: [], matcha: [], nature: [], nightlife: [] };
}
