// Edge Function: transit-route
// Cache-aside public-transit directions via Google Directions API. Given an
// origin and destination it returns the transit legs (line names, vehicle type,
// per-step duration), cached so each leg hits Google at most once.
//
// Deploy:  supabase functions deploy transit-route
// Secret:  supabase secrets set GOOGLE_MAPS_API_KEY=<key with Directions API + billing>

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

interface Segment {
  mode: 'walk' | 'transit';
  line?: string;
  vehicle?: string; // SUBWAY, BUS, TRAM, HEAVY_RAIL…
  durationText?: string;
  numStops?: number;
  headsign?: string;
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

  const o = `${origin[0]},${origin[1]}`;
  const d = `${dest[0]},${dest[1]}`;
  const cacheKey = `${o}|${d}`;

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

  const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
  url.searchParams.set('origin', o);
  url.searchParams.set('destination', d);
  url.searchParams.set('mode', 'transit');
  url.searchParams.set('key', key);

  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.status !== 'OK') {
    return json({ error: `Directions: ${data.status}`, segments: [] }, data.status === 'ZERO_RESULTS' ? 200 : 502);
  }

  const leg = data.routes?.[0]?.legs?.[0];
  const segments: Segment[] = (leg?.steps ?? []).map((step: any) => {
    if (step.travel_mode === 'TRANSIT') {
      const td = step.transit_details;
      return {
        mode: 'transit',
        line: td?.line?.short_name || td?.line?.name,
        vehicle: td?.line?.vehicle?.type,
        durationText: step.duration?.text,
        numStops: td?.num_stops,
        headsign: td?.headsign,
      };
    }
    return { mode: 'walk', durationText: step.duration?.text };
  });

  const result = { totalDuration: leg?.duration?.text ?? null, segments };
  await admin.from('transit_cache').upsert({ key: cacheKey, result, fetched_at: new Date().toISOString() });

  return json({ source: 'google', ...result });
});
