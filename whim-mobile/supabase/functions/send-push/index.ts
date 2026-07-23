// Edge Function: send-push
// A user who just earned a city badge calls this to notify their followers.
// Server-verified: it only sends if the caller actually holds that badge, so a
// client can't fake "X earned the Y badge". Delivers via Expo's push service.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { underDailyCap } from '../_shared/guard.ts';

const DAILY_CAP = 50; // notifications a user can trigger per day (badges are rare)
const TIER = ['', 'Bronze', 'Silver', 'Gold'];
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

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

  let city = '';
  try {
    city = String((await req.json()).city ?? '').trim();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!city) return json({ error: 'city required' }, 400);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  if (!(await underDailyCap(admin, user.id, 'send-push', DAILY_CAP))) return json({ ok: false, capped: true });

  // verify the caller actually holds this badge (anti-spoof)
  const { data: badge } = await admin.from('badges').select('tier').eq('user_id', user.id).eq('city', city).maybeSingle();
  if (!badge) return json({ ok: true, sent: 0 });

  const { data: prof } = await admin.from('profiles').select('display_name').eq('id', user.id).maybeSingle();
  const name = (prof as any)?.display_name ?? 'A friend';
  const tier = TIER[(badge as any).tier] ?? '';

  // followers → their device tokens
  const { data: followers } = await admin.from('follows').select('follower').eq('followee', user.id);
  const ids = (followers ?? []).map((f: any) => f.follower);
  if (!ids.length) return json({ ok: true, sent: 0 });
  const { data: tokens } = await admin.from('push_tokens').select('token').in('user_id', ids);
  const messages = (tokens ?? []).map((t: any) => ({
    to: t.token,
    title: 'Whim ✦',
    body: `${name} earned the ${city} badge${tier ? ` · ${tier}` : ''}`,
    data: { route: '/passport' },
  }));
  if (!messages.length) return json({ ok: true, sent: 0 });

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  }).catch(() => {});

  return json({ ok: true, sent: messages.length });
});
