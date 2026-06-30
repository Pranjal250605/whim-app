import { supabase } from './supabase';

export interface GeocodeResponse {
  source: 'cache' | 'mapbox';
  result: unknown; // raw Mapbox geocoding payload
}

/**
 * Look up a place via the cache-aside Edge Function (never calls Mapbox
 * directly from the app — the token stays server-side and results are cached).
 *
 * @param q          free-text place query, e.g. "Sensō-ji Temple Tokyo"
 * @param proximity  optional "lng,lat" to bias results near a point
 */
export async function searchPlace(q: string, proximity?: string): Promise<GeocodeResponse> {
  const { data, error } = await supabase.functions.invoke<GeocodeResponse>('search-place', {
    body: { q, proximity },
  });
  if (error) throw error;
  return data as GeocodeResponse;
}
