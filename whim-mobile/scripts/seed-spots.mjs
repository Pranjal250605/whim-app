// Whim · spots seeder
// Reads every data/curated/*.json, geocodes each spot via Mapbox (REAL
// coordinates, not hand-typed), and upserts into the `spots` table.
//
// Idempotent: re-running updates existing rows (on conflict id). Geocoding is
// the validation step — if a place can't be found, it's skipped and logged, so
// fabricated/wrong entries don't silently get coordinates.
//
// USAGE (from the whim-mobile/ folder, Node 20+):
//   1. Create .env.seed (gitignored) with:
//        SUPABASE_URL=https://gvqldgkdtitueyijptmt.supabase.co
//        SUPABASE_SERVICE_ROLE_KEY=sb_secret_...   # your ROTATED secret key
//        MAPBOX_TOKEN=pk_or_sk_token_with_geocoding_access
//   2. Run:
//        node --env-file=.env.seed scripts/seed-spots.mjs
//
// The service-role key is used here only locally (server-side admin write) and
// must NEVER be committed or shipped in the app.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;

if (!SUPABASE_URL || !SERVICE_KEY || !MAPBOX_TOKEN) {
  console.error('Missing env. Need SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MAPBOX_TOKEN.');
  process.exit(1);
}

// permanent=true lets you store results (billed accordingly). Set
// GEOCODE_PERMANENT=false in .env.seed if your Mapbox plan lacks it.
const PERMANENT = (process.env.GEOCODE_PERMANENT ?? 'true') === 'true';

// Photos: free Pexels images (commercial-use licence). Optional — if no key,
// spots keep their tone placeholder. Anchors always get a photo; nearby photos
// are off by default to stay under the 200 req/hour Pexels limit.
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const FETCH_PHOTOS = !!PEXELS_API_KEY;
const FETCH_NEARBY_PHOTOS = FETCH_PHOTOS && (process.env.SEED_NEARBY_PHOTOS ?? 'false') === 'true';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// editorial placeholder tones, cycled until real imagery exists
const PALETTE = ['#E7DCCB', '#DCE3D8', '#DED7E0', '#E9D7CE', '#D7DEE4', '#DDE2D6'];
let toneCursor = 0;
const nextTone = () => PALETTE[toneCursor++ % PALETTE.length];

const slug = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

async function geocode(query, proximity) {
  const url = new URL('https://api.mapbox.com/search/geocode/v6/forward');
  url.searchParams.set('q', query);
  url.searchParams.set('limit', '1');
  url.searchParams.set('permanent', String(PERMANENT));
  if (proximity) url.searchParams.set('proximity', proximity.join(','));
  url.searchParams.set('access_token', MAPBOX_TOKEN);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Mapbox ${res.status}`);
  const json = await res.json();
  const feature = json.features?.[0];
  if (!feature) return null;
  const [lng, lat] = feature.geometry.coordinates;
  return { lat, lng };
}

// Free Pexels photo (landscape). Returns a hotlinkable CDN URL or '' if none.
// Swap to Unsplash here if you prefer — just change the endpoint/parse/header.
async function fetchPhoto(query) {
  if (!PEXELS_API_KEY) return '';
  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', '1');
  url.searchParams.set('orientation', 'landscape');
  try {
    const res = await fetch(url, { headers: { Authorization: PEXELS_API_KEY } });
    if (!res.ok) {
      console.warn(`    photo error ${res.status} for "${query}"`);
      return '';
    }
    const json = await res.json();
    return json.photos?.[0]?.src?.large ?? '';
  } catch (e) {
    console.warn(`    photo fetch failed "${query}": ${e.message}`);
    return '';
  }
}

async function run() {
  const dir = join(__dirname, '..', 'data', 'curated');
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  let ok = 0;
  let skipped = 0;
  let nearbyMisses = 0;

  for (const file of files) {
    const cities = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    for (const city of cities) {
      for (const spot of city.spots) {
        const query =
          spot.geocodeQuery ??
          `${spot.title}, ${spot.area ? spot.area + ', ' : ''}${city.city}, ${city.country}`;

        let coords = null;
        try {
          coords = await geocode(query, city.center);
        } catch (e) {
          console.warn(`  geocode error for "${spot.title}": ${e.message}`);
        }
        if (!coords) {
          console.warn(`  SKIP (not found): ${spot.title}`);
          skipped++;
          continue;
        }

        // geocode each nearby spot too (cafés etc.) so they get real coords and
        // are validated. Not-found ones are kept WITHOUT coords and logged — that
        // log is your review list for anything that might be wrong/closed.
        const anchorProximity = [coords.lng, coords.lat];
        const nearby = [];
        for (const n of spot.nearby ?? []) {
          let nc = null;
          try {
            nc = await geocode(`${n.title}, ${city.city}, ${city.country}`, anchorProximity);
          } catch (e) {
            console.warn(`    nearby geocode error "${n.title}": ${e.message}`);
          }
          if (!nc) {
            console.warn(`    ⚠ nearby not found (review): ${n.title}`);
            nearbyMisses++;
          }
          const nPhoto = FETCH_NEARBY_PHOTOS ? await fetchPhoto(`${n.title} ${city.city}`) : '';
          nearby.push({
            id: slug(n.title),
            title: n.title,
            kind: n.kind,
            mins: n.mins,
            tone: nextTone(),
            photo: nPhoto,
            ...(nc ? { lat: nc.lat, lng: nc.lng } : {}),
          });
          await new Promise((r) => setTimeout(r, 120));
        }

        const anchorPhoto = FETCH_PHOTOS ? await fetchPhoto(`${spot.title} ${city.city}`) : '';

        const row = {
          id: spot.id ?? `${slug(city.city)}-${slug(spot.title)}`,
          city: city.city,
          vibes: spot.vibes,
          title: spot.title,
          kind: spot.kind ?? null,
          area: spot.area ?? null,
          hours: spot.hours ?? null,
          tone: nextTone(),
          photo: anchorPhoto,
          tags: spot.tags ?? [],
          description: spot.description ?? null,
          lat: coords.lat,
          lng: coords.lng,
          nearby,
        };

        const { error } = await supabase.from('spots').upsert(row, { onConflict: 'id' });
        if (error) {
          console.error(`  upsert failed for ${row.id}: ${error.message}`);
          skipped++;
        } else {
          ok++;
          console.log(`  ✓ ${city.city} · ${row.title}  (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`);
        }

        await new Promise((r) => setTimeout(r, 120)); // gentle on the geocoding quota
      }
    }
  }

  console.log(`\nDone. ${ok} anchors upserted, ${skipped} skipped, ${nearbyMisses} nearby need review.`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
