import type { BucketAnchor } from './types';

export interface RouteStop {
  id: string;
  title: string;
  kind: string;
  lat: number;
  lng: number;
  order: number;
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

/**
 * Local stand-in for the recommendation/optimisation backend: orders the
 * anchors with a greedy nearest-neighbour walk (a cheap TSP heuristic).
 * When the real engine lands, swap this for the Routes/Optimization API call —
 * the RouteStop[] shape stays the same.
 */
export function orderByProximity(bucket: BucketAnchor[]): RouteStop[] {
  const points = bucket
    .filter((b) => b.anchor.lat != null && b.anchor.lng != null)
    .map((b) => ({
      id: b.anchor.id,
      title: b.anchor.title,
      kind: b.anchor.kind,
      lat: b.anchor.lat as number,
      lng: b.anchor.lng as number,
    }));

  if (points.length <= 2) return points.map((p, i) => ({ ...p, order: i + 1 }));

  const remaining = [...points];
  const ordered = [remaining.shift()!];
  while (remaining.length) {
    const last = ordered[ordered.length - 1];
    let bestIdx = 0;
    let bestDist = Infinity;
    remaining.forEach((p, i) => {
      const d = distanceKm(last, p);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    });
    ordered.push(remaining.splice(bestIdx, 1)[0]);
  }
  return ordered.map((p, i) => ({ ...p, order: i + 1 }));
}
