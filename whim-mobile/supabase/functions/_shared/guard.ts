// Shared abuse guards for the billed Edge Functions (Mapbox / Google calls).
// Both helpers rely on SQL from migration 0006_hardening.sql.

import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Count one call for this user (per UTC day) and say whether they're still
 * under `cap`. Fails OPEN if the migration isn't applied yet — the feature
 * keeps working, we just log that the guard is missing.
 */
export async function underDailyCap(
  admin: SupabaseClient,
  userId: string,
  fn: string,
  cap: number,
): Promise<boolean> {
  const { data, error } = await admin.rpc('bump_edge_usage', {
    p_user: userId,
    p_fn: fn,
    p_cap: cap,
  });
  if (error) {
    console.warn(`bump_edge_usage unavailable (apply 0006_hardening.sql): ${error.message}`);
    return true;
  }
  return data === true;
}

/** Opportunistically purge expired cache rows (~2% of requests). */
export async function maybePurgeCaches(admin: SupabaseClient): Promise<void> {
  if (Math.random() >= 0.02) return;
  const { error } = await admin.rpc('purge_expired_caches');
  if (error) console.warn(`purge_expired_caches unavailable: ${error.message}`);
}
