import { supabase } from './supabase';

// Live Google Places photos are streamed through the place-photo Edge Function
// (never stored). expo-image loads the proxy URL with the user's session token
// in headers. The token is cached module-side and refreshed on auth changes.
let accessToken: string | null = null;
supabase.auth.getSession().then(({ data }) => (accessToken = data.session?.access_token ?? null));
supabase.auth.onAuthStateChange((_e, s) => (accessToken = s?.access_token ?? null));

const FUNCTIONS = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1`;
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

/** An expo-image source for a Places photo, or null if we can't build one. */
export function placePhotoSource(opts: { placeId?: string; photoName?: string | null; w?: number }) {
  if (!accessToken) return null;
  const p = new URLSearchParams();
  if (opts.photoName) p.set('photo', opts.photoName);
  else if (opts.placeId) p.set('place_id', opts.placeId);
  else return null;
  p.set('w', String(opts.w ?? 400));
  return {
    uri: `${FUNCTIONS}/place-photo?${p.toString()}`,
    headers: { apikey: ANON, Authorization: `Bearer ${accessToken}` },
  };
}
