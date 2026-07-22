// Edge Function: submit-places
// UGC "dump your top places". Flow:
//   1. require a logged-in user
//   2. for each freeform name → Google Places Text Search (real place_id,
//      name, type, city, coords)
//   3. one batched Claude Haiku call sorts every place into a Whim vibe and
//      writes a 1-line blurb (grounded on the resolved place data)
//   4. store into community_spots (service role), owned by the user
//
// Secrets: GOOGLE_PLACES_API_KEY, ANTHROPIC_API_KEY

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { underDailyCap } from '../_shared/guard.ts';

const DAILY_CAP = 60; // submissions per user per day (each = places + 1 LLM call)
const MAX_PLACES = 15; // per submission

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

type Vibe = 'classics' | 'matcha' | 'nature' | 'nightlife';
const VIBES: Vibe[] = ['classics', 'matcha', 'nature', 'nightlife'];

async function resolvePlace(name: string, key: string) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.primaryType,places.formattedAddress,places.addressComponents,places.location',
    },
    body: JSON.stringify({ textQuery: name, maxResultCount: 1 }),
  });
  if (!res.ok) return null;
  const p = (await res.json()).places?.[0];
  if (!p) return null;
  const cityComp = (p.addressComponents ?? []).find((c: any) =>
    (c.types ?? []).some((t: string) => t === 'locality' || t === 'postal_town' || t === 'administrative_area_level_2'),
  );
  return {
    id: p.id,
    title: p.displayName?.text ?? name,
    kind: (p.primaryType ?? '').replace(/_/g, ' '),
    city: cityComp?.longText ?? '',
    area: (p.formattedAddress ?? '').split(',').slice(0, 2).join(',').trim(),
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
  };
}

// One Haiku call sorts every resolved place into a vibe + writes a blurb.
async function categorize(places: any[], apiKey: string): Promise<Record<string, { vibe: Vibe; blurb: string }>> {
  const list = places.map((p, i) => `${i + 1}. ${p.title} — type: ${p.kind || 'unknown'} — ${p.area}`).join('\n');
  const prompt =
    `Sort each place into exactly ONE Whim vibe and write a punchy one-sentence blurb (max 18 words).\n\n` +
    `Vibes:\n` +
    `- classics: iconic must-sees, landmarks, temples, shrines, museums, historic sites\n` +
    `- matcha: cafés, coffee, bakeries, bookstores, design/boutique shops, slow & photogenic spots\n` +
    `- nature: parks, gardens, nature, waterfronts, outdoors, scenic walks\n` +
    `- nightlife: bars, clubs, pubs, izakaya, late-night food, after-dark spots\n\n` +
    `Places:\n${list}\n\n` +
    `Reply with ONLY a JSON array, one object per place in order: ` +
    `[{"vibe":"matcha","blurb":"..."}]. No prose.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const data = await res.json();
  const text = (data.content ?? [])[0]?.text ?? '[]';
  const arr = JSON.parse(text.slice(text.indexOf('['), text.lastIndexOf(']') + 1));
  const out: Record<string, { vibe: Vibe; blurb: string }> = {};
  places.forEach((p, i) => {
    const v = arr[i]?.vibe;
    out[p.id] = { vibe: VIBES.includes(v) ? v : 'classics', blurb: String(arr[i]?.blurb ?? '').slice(0, 160) };
  });
  return out;
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

  let names: string[] = [];
  try {
    const b = await req.json();
    names = (Array.isArray(b.places) ? b.places : String(b.places ?? '').split(/[\n,]/))
      .map((s: string) => String(s).trim())
      .filter(Boolean)
      .slice(0, MAX_PLACES);
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (names.length === 0) return json({ error: 'Add at least one place.' }, 400);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  if (!(await underDailyCap(admin, user.id, 'submit-places', DAILY_CAP)))
    return json({ error: 'Daily limit reached — try again tomorrow.' }, 429);

  const placesKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!placesKey || !anthropicKey) return json({ error: 'Server missing keys' }, 500);

  // 1. resolve each name → real place
  const resolved: any[] = [];
  const notFound: string[] = [];
  for (const n of names) {
    const p = await resolvePlace(n, placesKey);
    if (p) resolved.push(p);
    else notFound.push(n);
  }
  if (resolved.length === 0) return json({ error: 'Couldn’t find any of those places.', notFound }, 422);

  // 2. sort into vibes + blurbs
  let cats: Record<string, { vibe: Vibe; blurb: string }>;
  try {
    cats = await categorize(resolved, anthropicKey);
  } catch (e) {
    console.warn('categorize failed:', e);
    return json({ error: 'Couldn’t categorize — try again.' }, 502);
  }

  // 3. store (idempotent — re-submitting a place updates it)
  const rows = resolved.map((p) => ({
    id: p.id,
    submitted_by: user.id,
    title: p.title,
    vibe: cats[p.id].vibe,
    kind: p.kind,
    city: p.city,
    area: p.area,
    blurb: cats[p.id].blurb,
    lat: p.lat,
    lng: p.lng,
    status: 'approved',
  }));
  const { error } = await admin.from('community_spots').upsert(rows, { onConflict: 'id' });
  if (error) return json({ error: error.message }, 500);

  return json({ saved: rows.map((r) => ({ title: r.title, vibe: r.vibe, blurb: r.blurb, city: r.city })), notFound });
});
