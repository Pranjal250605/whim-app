// Whim · photo mirror
// Downloads each spot's Pexels photo and re-hosts it in Supabase Storage
// (public bucket, served via CDN) so card images load instantly and never
// depend on a third-party hotlink. Pexels' license permits this use.
// NOTE: only ever mirror licensed stock (Pexels/Wikimedia). Google Places
// photos must NOT be stored — terms prohibit it; they're fetched live.
//
// Idempotent: spots already pointing at our storage are skipped.
// USAGE: node --env-file=.env.seed scripts/mirror-photos.mjs

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing env. Need SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const BUCKET = 'spot-photos';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function ensureBucket() {
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (data) return;
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true, // catalogue imagery — public by design, like the spots table
    fileSizeLimit: '4MB',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  });
  if (error) throw error;
  console.log(`created public bucket "${BUCKET}"`);
}

const publicUrl = (path) => `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;

async function run() {
  await ensureBucket();

  const { data: spots, error } = await supabase
    .from('spots')
    .select('id, photo')
    .not('photo', 'is', null)
    .neq('photo', '');
  if (error) throw error;

  let mirrored = 0;
  let skipped = 0;
  let failed = 0;

  for (const spot of spots) {
    if (!spot.photo.startsWith('http')) continue;
    if (spot.photo.includes(`/${BUCKET}/`)) {
      skipped++;
      continue; // already ours
    }
    try {
      const res = await fetch(spot.photo);
      if (!res.ok) throw new Error(`fetch ${res.status}`);
      const type = res.headers.get('content-type') ?? 'image/jpeg';
      const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
      const path = `${spot.id}.${ext}`;
      const bytes = Buffer.from(await res.arrayBuffer());

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, bytes, { contentType: type, upsert: true });
      if (upErr) throw upErr;

      const { error: dbErr } = await supabase
        .from('spots')
        .update({ photo: publicUrl(path) })
        .eq('id', spot.id);
      if (dbErr) throw dbErr;

      mirrored++;
      console.log(`  ✓ ${spot.id}`);
    } catch (e) {
      failed++;
      console.warn(`  ✗ ${spot.id}: ${e.message}`);
    }
  }

  console.log(`\nDone. mirrored=${mirrored} already-ours=${skipped} failed=${failed}`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
