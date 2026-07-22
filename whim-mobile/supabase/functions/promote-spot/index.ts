// Edge Function: promote-spot
// Admin-only. Promotes a community spot (UGC) into the official curated `spots`
// catalogue, then marks the community row 'promoted' so it leaves the feed.
// Gated by profiles.is_admin — the `spots` table has no client write policy, so
// this privileged path is the only way UGC becomes official.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// editorial placeholder tones, matching the seed pipeline (no photo is stored —
// Google photos aren't storable; the deck shows this tint until imagery exists)
const TONES = ['#E7DCCB', '#DCE3D8', '#DED7E0', '#E9D7CE', '#D7DEE4', '#DDE2D6'];

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

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: prof } = await admin.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (!(prof as any)?.is_admin) return json({ error: 'Admins only' }, 403);

  let placeId = '';
  try {
    placeId = String((await req.json()).place_id ?? '');
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!placeId) return json({ error: 'Missing place_id' }, 400);

  const { data: cs, error: e1 } = await admin.from('community_spots').select('*').eq('id', placeId).maybeSingle();
  if (e1) return json({ error: e1.message }, 500);
  if (!cs) return json({ error: 'Spot not found' }, 404);

  const tone = TONES[Math.floor(Math.random() * TONES.length)];
  const { error: e2 } = await admin.from('spots').upsert(
    {
      id: cs.id,
      city: cs.city,
      vibes: [cs.vibe],
      title: cs.title,
      kind: cs.kind,
      area: cs.area,
      hours: null,
      tone,
      photo: '',
      tags: [],
      description: cs.blurb,
      lat: cs.lat,
      lng: cs.lng,
      nearby: [],
    },
    { onConflict: 'id' },
  );
  if (e2) return json({ error: e2.message }, 500);

  await admin.from('community_spots').update({ status: 'promoted' }).eq('id', placeId);
  return json({ ok: true, promoted: cs.title });
});
