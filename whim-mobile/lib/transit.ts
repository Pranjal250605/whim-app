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

// Emoji here are deliberate — friendly transit glyphs in the timeline copy.
export function vehicleEmoji(v?: string): string {
  switch ((v ?? '').toUpperCase()) {
    case 'BUS':
      return '🚌';
    case 'TRAM':
    case 'LIGHT_RAIL':
      return '🚊';
    case 'HEAVY_RAIL':
    case 'RAIL':
    case 'COMMUTER_TRAIN':
    case 'HIGH_SPEED_TRAIN':
      return '🚆';
    case 'FERRY':
      return '⛴️';
    default:
      return '🚇'; // subway / metro
  }
}

/** One-line label for a leg: "🚇 Ginza  →  🚆 JR Yamanote  ·  22 min". */
export function legText(leg: TransitResult): string {
  const transit = leg.segments.filter((s) => s.mode === 'transit');
  if (transit.length === 0) return `🚶 ${leg.totalDuration ?? 'walk'}`;
  const lines = transit.map((t) => `${vehicleEmoji(t.vehicle)} ${t.line ?? 'Line'}`).join('  →  ');
  return leg.totalDuration ? `${lines}  ·  ${leg.totalDuration}` : lines;
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
