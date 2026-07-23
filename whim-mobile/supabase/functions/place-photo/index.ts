// Edge Function: place-photo
// Serves a Google Places photo, CACHED so the same photo is fetched from Google
// at most once — every later viewer is served from our Storage CDN. This is the
// key "photos at scale" win: 300 people scrolling the same area = ~1 Google call
// per unique photo, not 300.
//   ?photo=<places/.../photos/...>   (near-me already has the photo name)
//   ?place_id=<id>                   (community spots — we look up the name)
//   &w=<maxWidthPx, default 400>
//
// Secret: GOOGLE_PLACES_API_KEY · Bucket: place-photos (migration 0017)

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { underDailyCap } from '../_shared/guard.ts';

const DAILY_CAP = 1000; // per-user function calls per day (cache hits are cheap)
const BUCKET = 'place-photos';
const CACHE_HEADERS = { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=604800' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const photoNameIn = url.searchParams.get('photo');
  const placeId = url.searchParams.get('place_id');
  const w = Math.min(Math.max(Number(url.searchParams.get('w') ?? 400), 100), 1200);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return new Response('Invalid session', { status: 401, headers: corsHeaders });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // cache key: prefer the stable place_id; fall back to the photo name
  const rawKey = (placeId || photoNameIn || '').replace(/[^A-Za-z0-9]/g, '_').slice(0, 180);
  if (!rawKey) return new Response('No photo', { status: 404, headers: corsHeaders });
  const cacheKey = `${rawKey}_w${w}.jpg`;

  // 1. cache hit → serve from Storage, no Google call, no quota spent
  const hit = await admin.storage.from(BUCKET).download(cacheKey);
  if (hit.data) {
    return new Response(await hit.data.arrayBuffer(), {
      status: 200,
      headers: { ...corsHeaders, ...CACHE_HEADERS, 'X-Cache': 'HIT' },
    });
  }

  // 2. cache miss → this is a real Google fetch, so it counts against the cap
  if (!(await underDailyCap(admin, user.id, 'place-photo', DAILY_CAP)))
    return new Response('Daily photo limit reached', { status: 429, headers: corsHeaders });

  const key = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!key) return new Response('Server missing key', { status: 500, headers: corsHeaders });

  // resolve a photo resource name
  let photoName = photoNameIn;
  if (!photoName && placeId) {
    const det = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'photos' },
    });
    photoName = (await det.json()).photos?.[0]?.name ?? null;
  }
  if (!photoName) return new Response('No photo', { status: 404, headers: corsHeaders });

  const media = await fetch(`https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${w}&key=${key}`);
  if (!media.ok) return new Response('Photo fetch failed', { status: 502, headers: corsHeaders });
  const bytes = new Uint8Array(await media.arrayBuffer());

  // populate the cache for everyone after this viewer (best-effort)
  admin.storage.from(BUCKET).upload(cacheKey, bytes, { contentType: 'image/jpeg', upsert: true }).catch(() => {});

  return new Response(bytes, { status: 200, headers: { ...corsHeaders, ...CACHE_HEADERS, 'X-Cache': 'MISS' } });
});
