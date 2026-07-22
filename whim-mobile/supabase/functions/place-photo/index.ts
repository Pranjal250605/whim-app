// Edge Function: place-photo
// Streams a Google Places photo LIVE (their terms allow display, not storage,
// so we proxy the bytes and never persist them; the API key stays server-side).
// Used as an <Image> URL — supports GET with query params:
//   ?photo=<places/.../photos/...>   (near-me already has the photo name)
//   ?place_id=<id>                   (community spots — we look up the name)
//   &w=<maxWidthPx, default 400>
//
// Secret: GOOGLE_PLACES_API_KEY

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { underDailyCap } from '../_shared/guard.ts';

const DAILY_CAP = 1000; // photos are billed but cheap; client caches by URL

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

  const key = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!key) return new Response('Server missing key', { status: 500, headers: corsHeaders });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  if (!(await underDailyCap(admin, user.id, 'place-photo', DAILY_CAP)))
    return new Response('Daily photo limit reached', { status: 429, headers: corsHeaders });

  // resolve a photo resource name
  let photoName = photoNameIn;
  if (!photoName && placeId) {
    const det = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'photos' },
    });
    const d = await det.json();
    photoName = d.photos?.[0]?.name ?? null;
  }
  if (!photoName) return new Response('No photo', { status: 404, headers: corsHeaders });

  // fetch the media (follows Google's redirect to the actual image bytes)
  const media = await fetch(`https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${w}&key=${key}`);
  if (!media.ok || !media.body) return new Response('Photo fetch failed', { status: 502, headers: corsHeaders });

  return new Response(media.body, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': media.headers.get('content-type') ?? 'image/jpeg',
      'Cache-Control': 'private, max-age=86400', // client may cache the rendered image
    },
  });
});
