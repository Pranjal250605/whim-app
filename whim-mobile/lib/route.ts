import type { BucketAnchor } from './types';

export interface RouteStop {
  id: string;
  title: string;
  kind: string;
  lat: number;
  lng: number;
  order: number;
  hours?: string;
  bestTime?: string; // Morning | Daytime | Evening
}

// Haversine distance in km between two lat/lng points.
function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Classify a spot's freeform opening-hours into a part of day:
// 0 = morning, 1 = daytime / anytime, 2 = evening.
function timeSlot(hours?: string): 0 | 1 | 2 {
  const h = (hours ?? '').toLowerCase();
  if (/(sunrise|dawn|early morning|before noon|6:00 am|7:00 am|8:00 am|opens? morning)/.test(h)) return 0;
  if (/(evening|after dark|night|dusk|dinner)/.test(h)) return 2;
  return 1;
}
const SLOT_LABEL = ['Morning', 'Daytime', 'Evening'] as const;

interface Pt {
  lat: number;
  lng: number;
}
function nearestNeighbour<T extends Pt>(pts: T[], startFrom?: Pt): T[] {
  const remaining = [...pts];
  const ordered: T[] = [];
  let anchor = startFrom;
  if (!anchor && remaining.length) {
    ordered.push(remaining.shift()!);
    anchor = ordered[0];
  }
  while (remaining.length && anchor) {
    let bestIdx = 0;
    let bestDist = Infinity;
    remaining.forEach((p, i) => {
      const d = distanceKm(anchor!, p);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    });
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    anchor = next;
  }
  return ordered;
}

/**
 * Time-of-day-aware ordering: bucket the stops into morning / daytime / evening
 * from their opening hours, sequence those blocks in order, and walk each block
 * nearest-neighbour continuing from where the previous block ended. Keeps the
 * day both geographically sane and open-when-you-arrive.
 */
export function orderSmart(bucket: BucketAnchor[]): RouteStop[] {
  const points = bucket
    .filter((b) => b.anchor.lat != null && b.anchor.lng != null)
    .map((b) => ({
      id: b.anchor.id,
      title: b.anchor.title,
      kind: b.anchor.kind,
      lat: b.anchor.lat as number,
      lng: b.anchor.lng as number,
      hours: b.anchor.hours,
      slot: timeSlot(b.anchor.hours),
    }));

  const ordered: typeof points = [];
  let last: Pt | undefined;
  for (const slot of [0, 1, 2] as const) {
    const group = points.filter((p) => p.slot === slot);
    if (!group.length) continue;
    const walk = nearestNeighbour(group, last);
    ordered.push(...walk);
    last = walk[walk.length - 1];
  }

  return ordered.map((p, i) => ({
    id: p.id,
    title: p.title,
    kind: p.kind,
    lat: p.lat,
    lng: p.lng,
    hours: p.hours,
    order: i + 1,
    bestTime: SLOT_LABEL[p.slot],
  }));
}

// keep the old name working for existing imports
export const orderByProximity = orderSmart;
