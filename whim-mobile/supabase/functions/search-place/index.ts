// Edge Function: search-place
// Cache-aside geocoding through Mapbox. Flow:
//   1. require a logged-in user (JWT in Authorization header)
//   2. look the query up in geocode_cache → hit = 0 Mapbox credits
//   3. miss → call Mapbox ONCE (permanent mode, so results may be stored),
//      cache it, return it
//
// Deploy:   supabase functions deploy search-place
// Secret:   supabase secrets set MAPBOX_TOKEN=sk.<token-with-geocoding-scope>
//   (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY are injected
//    automatically by the platform — never hardcode them.)

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // ── auth: only signed-in users may search (prevents anonymous credit burn) ──
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return json({ error: 'Invalid session' }, 401);

  // ── input ──
  let q = '';
  let proximity = '';
  try {
    const body = await req.json();
    q = String(body.q ?? '').trim();
    proximity = body.proximity ? String(body.proximity) : ''; // "lng,lat"
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!q) return json({ error: 'Missing "q"' }, 400);

  const cacheKey = `${q}|${proximity}`.toLowerCase();

  // service-role client bypasses RLS to use the cache table
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // ── 1. cache hit? ──
  const { data: cached } = await admin
    .from('geocode_cache')
    .select('result, fetched_at')
    .eq('query', cacheKey)
    .maybeSingle();

  if (cached && Date.now() - new Date(cached.fetched_at).getTime() < THIRTY_DAYS_MS) {
    return json({ source: 'cache', result: cached.result });
  }

  // ── 2. cache miss → call Mapbox once ──
  const token = Deno.env.get('MAPBOX_TOKEN');
  if (!token) return json({ error: 'Server missing MAPBOX_TOKEN' }, 500);

  const url = new URL('https://api.mapbox.com/search/geocode/v6/forward');
  url.searchParams.set('q', q);
  url.searchParams.set('limit', '5');
  url.searchParams.set('permanent', 'true'); // allows storing results (billed accordingly)
  if (proximity) url.searchParams.set('proximity', proximity);
  url.searchParams.set('access_token', token);

  const res = await fetch(url.toString());
  if (!res.ok) return json({ error: `Mapbox error ${res.status}` }, 502);
  const result = await res.json();

  // ── 3. store for next time (fire and forget) ──
  await admin
    .from('geocode_cache')
    .upsert({ query: cacheKey, result, fetched_at: new Date().toISOString() });

  return json({ source: 'mapbox', result });
});
