import { supabase } from './supabase';
import type { RouteStop } from './route';

export interface TransitSegment {
  mode: 'walk' | 'transit';
  line?: string;
  vehicle?: string;
  durationText?: string;
  numStops?: number;
  headsign?: string;
}

export interface TransitResult {
  totalDuration?: string | null;
  segments: TransitSegment[];
}

/**
 * Public-transit directions between two stops via the cache-aside Edge Function.
 * Returns null on any failure (function not deployed yet, no Google key, no
 * transit found) so the UI can fall back to a time estimate.
 */
export async function getTransit(origin: RouteStop, dest: RouteStop): Promise<TransitResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke<TransitResult>('transit-route', {
      body: { origin: [origin.lat, origin.lng], dest: [dest.lat, dest.lng] },
    });
    if (error || !data || !data.segments?.length) return null;
    return data;
  } catch {
    return null;
  }
}
