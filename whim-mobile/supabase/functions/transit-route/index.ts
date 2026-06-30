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

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

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

  let origin: number[] = [];
  let dest: number[] = [];
  try {
    const body = await req.json();
    origin = body.origin;
    dest = body.dest;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!origin?.length || !dest?.length) return json({ error: 'Missing origin/dest' }, 400);

  const cacheKey = `${origin[0]},${origin[1]}|${dest[0]},${dest[1]}`;
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: cached } = await admin
    .from('transit_cache')
    .select('result, fetched_at')
    .eq('key', cacheKey)
    .maybeSingle();
  if (cached && Date.now() - new Date(cached.fetched_at).getTime() < NINETY_DAYS_MS) {
    return json({ source: 'cache', ...cached.result });
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
