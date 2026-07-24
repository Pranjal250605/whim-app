import type { VibeId } from '@/lib/types';

// Editorial, seasonally-aware collections. Each is a curated *reason to open the
// app* that maps onto a real (city, vibe) deck — tapping one starts swiping there.
// `months` (1–12) marks when it's in season; evergreen ones omit it. No network:
// cards are typographic postcards in the collection's own tone (fast, never hangs).
export interface Collection {
  id: string;
  eyebrow: string; // season / theme, shown in mono
  title: string;
  blurb: string;
  city: string;
  vibe: VibeId;
  tone: string; // card background
  months?: number[]; // in-season months; omit = evergreen
}

export const COLLECTIONS: Collection[] = [
  { id: 'riviera-summer', eyebrow: 'Summer on the coast', title: 'Riviera Summer', blurb: 'Sun, sea and long lunches along the Côte d’Azur.', city: 'Nice', vibe: 'classics', tone: '#0E7C86', months: [6, 7, 8] },
  { id: 'paris-in-bloom', eyebrow: 'Spring in the city', title: 'Paris, Slowly', blurb: 'Gardens, terraces and the long golden evenings.', city: 'Paris', vibe: 'classics', tone: '#B23A6B', months: [4, 5, 6, 9] },
  { id: 'blossom-chase', eyebrow: 'Cherry-blossom season', title: 'Blossom Chase', blurb: 'Chase sakura through Tokyo’s parks and riversides.', city: 'Tokyo', vibe: 'nature', tone: '#D46A8B', months: [3, 4] },
  { id: 'kyoto-autumn', eyebrow: 'Autumn leaves', title: 'Autumn in Kyoto', blurb: 'Momiji-red temples and quiet mountain paths.', city: 'Kyoto', vibe: 'nature', tone: '#B5521E', months: [10, 11] },
  { id: 'munich-oktober', eyebrow: 'Oktoberfest season', title: 'Bavarian Munich', blurb: 'Beer halls, biergartens and old-town swagger.', city: 'Munich', vibe: 'classics', tone: '#B07A17', months: [9, 10] },
  { id: 'london-christmas', eyebrow: 'Festive season', title: 'London at Christmas', blurb: 'Markets, lights and warm pubs against the cold.', city: 'London', vibe: 'classics', tone: '#8E2436', months: [12] },
  { id: 'neon-tokyo', eyebrow: 'After dark', title: 'Neon Tokyo', blurb: 'Golden Gai, izakayas and the city that never dims.', city: 'Tokyo', vibe: 'nightlife', tone: '#1E1B3A' },
  { id: 'kyoto-green', eyebrow: 'Tea & temples', title: 'Kyoto in Green', blurb: 'Matcha houses, moss gardens and slow mornings.', city: 'Kyoto', vibe: 'matcha', tone: '#1F5C3D' },
  { id: 'berlin-dark', eyebrow: 'After dark', title: 'Berlin After Dark', blurb: 'Kreuzberg bars and the long Berlin night.', city: 'Berlin', vibe: 'nightlife', tone: '#242430' },
  { id: 'nyc-icons', eyebrow: 'The greatest hits', title: 'NYC Icons', blurb: 'The landmarks worth the hype, and the ones near them.', city: 'New York', vibe: 'classics', tone: '#2B3A67' },
  { id: 'sf-bay', eyebrow: 'Fog & coastline', title: 'Bay City', blurb: 'Headlands, hills and the water on every side.', city: 'San Francisco', vibe: 'nature', tone: '#A6641C' },
  { id: 'edinburgh-old', eyebrow: 'Old town legends', title: 'Highland Edinburgh', blurb: 'Closes, crags and the castle over it all.', city: 'Edinburgh', vibe: 'classics', tone: '#4A335E' },
];

// In-season collections first (by current month), evergreen after, stable within.
export function seasonalCollections(now: Date = new Date()): Collection[] {
  const m = now.getMonth() + 1;
  const inSeason = (c: Collection) => (c.months ? c.months.includes(m) : false);
  return [...COLLECTIONS].sort((a, b) => Number(inSeason(b)) - Number(inSeason(a)));
}

export function isInSeason(c: Collection, now: Date = new Date()): boolean {
  return c.months ? c.months.includes(now.getMonth() + 1) : false;
}
