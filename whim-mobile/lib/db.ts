import { supabase } from './supabase';
import type { BucketAnchor, MicroActivity, Spot, VibeId } from './types';

// Thin data-access layer over Supabase. All reads/writes are scoped to the
// logged-in user by RLS — these functions never need to pass user_id, the
// database enforces it.

function rowToSpot(row: any): Spot {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    area: row.area,
    hours: row.hours,
    tone: row.tone,
    photo: row.photo,
    tags: row.tags ?? [],
    desc: row.description ?? '',
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    nearby: (row.nearby ?? []) as MicroActivity[],
  };
}

/** Phase 1 → 2: the curated deck for a (city, vibe), straight from the DB. */
export async function fetchDeck(city: string, vibe: VibeId): Promise<Spot[]> {
  const { data, error } = await supabase
    .from('spots')
    .select('*')
    .eq('city', city)
    .contains('vibes', [vibe]);
  if (error) throw error;
  return (data ?? []).map(rowToSpot);
}

/** Phase 4: rebuild the user's nested bucket list from saved_spots ⋈ spots. */
export async function fetchSavedSpots(): Promise<BucketAnchor[]> {
  const { data, error } = await supabase
    .from('saved_spots')
    .select('spot_id, micro_activity_ids, city, vibe, spots(*)')
    .order('created_at', { ascending: true });
  if (error) throw error;

  return (data ?? [])
    .filter((row: any) => row.spots) // guard against orphaned rows
    .map((row: any) => {
      const anchor = rowToSpot(row.spots);
      const ids: string[] = row.micro_activity_ids ?? [];
      return {
        anchor,
        microActivities: anchor.nearby.filter((n) => ids.includes(n.id)),
        city: row.city ?? '',
        vibe: (row.vibe ?? 'classics') as VibeId,
      };
    });
}

/** Phase 3: persist a right-swipe (idempotent — re-saving updates the row). */
export async function saveSpot(
  spot: Spot,
  microActivityIds: string[],
  city: string,
  vibe: VibeId | null,
): Promise<void> {
  const { error } = await supabase
    .from('saved_spots')
    .upsert(
      { spot_id: spot.id, micro_activity_ids: microActivityIds, city, vibe },
      { onConflict: 'user_id,spot_id' },
    );
  if (error) throw error;
}

export async function removeSavedSpot(spotId: string): Promise<void> {
  // RLS limits the delete to the current user's row.
  const { error } = await supabase.from('saved_spots').delete().eq('spot_id', spotId);
  if (error) throw error;
}

/** Wipe a whole collection (all saved spots for a city + vibe). */
export async function clearSavedSpots(city: string, vibe: VibeId): Promise<void> {
  const { error } = await supabase.from('saved_spots').delete().eq('city', city).eq('vibe', vibe);
  if (error) throw error;
}
