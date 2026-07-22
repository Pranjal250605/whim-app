// City-badge tiers + milestones. A city badge is earned on your first check-in
// there and climbs Bronze → Silver → Gold with the number of spots you stamp.

export type Tier = 1 | 2 | 3;

export const TIER: Record<Tier, { label: string; color: string; soft: string }> = {
  1: { label: 'Bronze', color: '#B0733E', soft: '#EFE1D3' },
  2: { label: 'Silver', color: '#8B95A3', soft: '#E5E8EC' },
  3: { label: 'Gold', color: '#E0A526', soft: '#F6E9C6' },
};

// thresholds (spots checked in within a city)
export const SILVER_AT = 3;
export const GOLD_AT = 5;

export function tierOf(spots: number): Tier {
  return spots >= GOLD_AT ? 3 : spots >= SILVER_AT ? 2 : 1;
}

/** How many more spots to the next tier, or null at Gold. */
export function nextTier(spots: number): { need: number; to: Tier } | null {
  if (spots < SILVER_AT) return { need: SILVER_AT - spots, to: 2 };
  if (spots < GOLD_AT) return { need: GOLD_AT - spots, to: 3 };
  return null;
}

/** 0–1 progress toward the next tier (full at Gold). */
export function tierProgress(spots: number): number {
  if (spots >= GOLD_AT) return 1;
  if (spots >= SILVER_AT) return (spots - SILVER_AT) / (GOLD_AT - SILVER_AT);
  return spots / SILVER_AT;
}

export interface Milestone {
  id: string;
  label: string;
  hint: string;
  earned: (s: { cities: number; places: number }) => boolean;
}

export const MILESTONES: Milestone[] = [
  { id: 'first', label: 'First Stamp', hint: '1 place', earned: (s) => s.places >= 1 },
  { id: 'explorer', label: 'Explorer', hint: '3 cities', earned: (s) => s.cities >= 3 },
  { id: 'globetrotter', label: 'Globetrotter', hint: '5 cities', earned: (s) => s.cities >= 5 },
  { id: 'jetsetter', label: 'Jet-setter', hint: '10 cities', earned: (s) => s.cities >= 10 },
  { id: 'centurion', label: 'Centurion', hint: '50 places', earned: (s) => s.places >= 50 },
];
