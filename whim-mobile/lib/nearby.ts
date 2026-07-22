import { supabase } from './supabase';
import type { VibeId } from './types';
import { distanceKm } from './route';

// Live "near me" spots from Google Places, sorted into vibes by the
// nearby-places Edge Function. NOT curated, NOT stored — this is the live
// discovery layer that sits alongside the premium curated decks.
export interface NearbySpot {
  id: string; // Google place_id
  title: string;
  kind: string;
  area: string;
  lat?: number;
  lng?: number;
  rating: number | null;
  ratingCount: number;
  photoName: string | null;
  km?: number; // distance from the user, filled client-side
  community?: boolean; // true = a user-submitted local pick, not a live Places result
  blurb?: string | null;
}

export type NearbyVibes = Record<VibeId, NearbySpot[]>;

export interface NearbyResult {
  center: [number, number];
  vibes: NearbyVibes;
}

/** Fetch nearby spots grouped by vibe. Returns null on any failure. */
export async function fetchNearby(lat: number, lng: number, radius = 2000): Promise<NearbyResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke<{ center: [number, number]; vibes: NearbyVibes }>(
      'nearby-places',
      { body: { lat, lng, radius } },
    );
    if (error || !data?.vibes) return null;
    // annotate each spot with distance from the user for display + sorting
    for (const vibe of Object.keys(data.vibes) as VibeId[]) {
      data.vibes[vibe] = data.vibes[vibe].map((s) => ({
        ...s,
        km: s.lat != null && s.lng != null ? distanceKm({ lat, lng }, { lat: s.lat, lng: s.lng }) : undefined,
      }));
    }
    return { center: data.center, vibes: data.vibes };
  } catch {
    return null;
  }
}

/** "4.6★ · 320m" style meta line. */
export function spotMeta(s: NearbySpot): string {
  const bits: string[] = [];
  if (s.rating != null) bits.push(`${s.rating}★`);
  if (s.km != null) bits.push(s.km < 1 ? `${Math.round(s.km * 1000)}m` : `${s.km.toFixed(1)}km`);
  return bits.join('  ·  ');
}
