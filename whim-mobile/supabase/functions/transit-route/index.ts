// Edge Function: transit-route
// Cache-aside public-transit directions via the Google **Routes API**
// (computeRoutes, TRANSIT mode — the modern replacement for the legacy
// Directions API). Returns transit legs (line names, vehicle, per-step
// duration), cached so each leg hits Google at most once.
//
// Deploy:  supabase functions deploy transit-route
// Secret:  supabase secrets set GOOGLE_MAPS_API_KEY=<key with Routes API + billing>

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { maybePurgeCaches, underDailyCap } from '../_shared/guard.ts';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const DAILY_CAP = 300; // Google Routes calls are billed — per-user cache misses per UTC day

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// A coordinate pair must be exactly [lat, lng] with finite, in-range numbers —
// anything else is rejected before it can reach the cache key or Google.
function asLatLng(v: unknown): [number, number] | null {
  if (!Array.isArray(v) || v.length !== 2) return null;
  const [lat, lng] = v;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return [lat, lng];
}

// 5 decimals ≈ 1 m — normalises keys so "35.71480000001" can't mint new rows.
const keyOf = (c: [number, number]) => `${c[0].toFixed(5)},${c[1].toFixed(5)}`;

// Routes API durations look like "1320s" — turn into "22 min".
function fmtDuration(s?: string): string | undefined {
  if (!s) return undefined;
  const sec = parseInt(String(s).replace('s', ''), 10);
  if (isNaN(sec)) return undefined;
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} hr ${m % 60} min`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return json({ error: 'Invalid session' }, 401);

  let body: { origin?: unknown; dest?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const origin = asLatLng(body.origin);
  const dest = asLatLng(body.dest);
  if (!origin || !dest) return json({ error: 'origin/dest must be [lat, lng] pairs' }, 400);

  const cacheKey = `${keyOf(origin)}|${keyOf(dest)}`;
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  await maybePurgeCaches(admin);

  const { data: cached } = await admin
    .from('transit_cache')
    .select('result, fetched_at')
    .eq('key', cacheKey)
    .maybeSingle();
  if (cached && Date.now() - new Date(cached.fetched_at).getTime() < NINETY_DAYS_MS) {
    return json({ source: 'cache', ...cached.result });
  }

  // cache miss → this one costs Google credits, so meter it per user
  if (!(await underDailyCap(admin, user.id, 'transit-route', DAILY_CAP))) {
    return json({ error: 'Daily route limit reached — try again tomorrow.', segments: [] }, 429);
  }

  const key = Deno.env.get('GOOGLE_MAPS_API_KEY');
  if (!key) return json({ error: 'Server missing GOOGLE_MAPS_API_KEY' }, 500);

  const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'routes.duration,routes.legs.steps.travelMode,routes.legs.steps.staticDuration,routes.legs.steps.transitDetails',
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: origin[0], longitude: origin[1] } } },
      destination: { location: { latLng: { latitude: dest[0], longitude: dest[1] } } },
      travelMode: 'TRANSIT',
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.routes?.length) {
    return json({ error: data.error?.message ?? 'No transit route', segments: [] }, res.ok ? 200 : 502);
  }

  const route = data.routes[0];
  const steps: any[] = (route.legs ?? []).flatMap((l: any) => l.steps ?? []);
  const segments = steps.map((step: any) => {
    if (step.travelMode === 'TRANSIT' && step.transitDetails) {
      const td = step.transitDetails;
      return {
        mode: 'transit',
        line: td.transitLine?.nameShort || td.transitLine?.name,
        vehicle: td.transitLine?.vehicle?.type,
        durationText: fmtDuration(step.staticDuration),
        numStops: td.stopCount,
        headsign: td.headsign,
      };
    }
    return { mode: 'walk', durationText: fmtDuration(step.staticDuration) };
  });

  const result = { totalDuration: fmtDuration(route.duration), segments };
  await admin.from('transit_cache').upsert({ key: cacheKey, result, fetched_at: new Date().toISOString() });

  return json({ source: 'google', ...result });
});
