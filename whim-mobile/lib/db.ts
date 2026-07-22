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

/** A real photo from this city+vibe's deck, for the Home featured card. */
export async function fetchCoverPhoto(city: string, vibe: VibeId): Promise<string | null> {
  const { data, error } = await supabase
    .from('spots')
    .select('photo')
    .eq('city', city)
    .contains('vibes', [vibe])
    .not('photo', 'is', null)
    .neq('photo', '')
    .limit(1);
  if (error) throw error;
  const photo = data?.[0]?.photo ?? null;
  return photo && photo.startsWith('http') ? photo : null;
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

// ── Group Rooms ──────────────────────────────────────────────────────────
// Creation/joining go through security-definer RPCs; votes are the only
// direct table write (own rows, members only — enforced by RLS).

export interface Room {
  id: string;
  code: string;
  hostId: string;
  name: string | null;
  city: string;
  vibe: VibeId;
  status: 'open' | 'closed';
  memberCount?: number;
}

export interface RoomMember {
  userId: string;
  displayName: string | null;
  isHost: boolean;
}

function rowToRoom(r: any): Room {
  return {
    id: r.id,
    code: r.code,
    hostId: r.host_id,
    name: r.name,
    city: r.city,
    vibe: r.vibe as VibeId,
    status: r.status,
    memberCount: r.member_count != null ? Number(r.member_count) : undefined,
  };
}

export async function createRoom(city: string, vibe: VibeId, name?: string): Promise<Room> {
  const { data, error } = await supabase.rpc('create_room', {
    p_city: city,
    p_vibe: vibe,
    p_name: name ?? null,
  });
  if (error) throw error;
  return rowToRoom(data);
}

export async function joinRoom(code: string): Promise<Room> {
  const { data, error } = await supabase.rpc('join_room', { p_code: code });
  if (error) throw error;
  return rowToRoom(data);
}

export async function fetchRoom(roomId: string): Promise<Room> {
  const { data, error } = await supabase.from('rooms').select('*').eq('id', roomId).single();
  if (error) throw error;
  return rowToRoom(data);
}

export async function fetchMyRooms(): Promise<Room[]> {
  const { data, error } = await supabase.rpc('my_rooms');
  if (error) throw error;
  return (data ?? []).map(rowToRoom);
}

export async function fetchRoomMembers(roomId: string): Promise<RoomMember[]> {
  const { data, error } = await supabase.rpc('get_room_members', { p_room: roomId });
  if (error) throw error;
  return (data ?? []).map((m: any) => ({
    userId: m.user_id,
    displayName: m.display_name,
    isHost: m.is_host,
  }));
}

/** Right/left swipe in a room = a vote. Idempotent (re-voting updates). */
export async function castRoomVote(roomId: string, spotId: string, liked: boolean): Promise<void> {
  const { error } = await supabase
    .from('room_votes')
    .upsert({ room_id: roomId, spot_id: spotId, liked }, { onConflict: 'room_id,user_id,spot_id' });
  if (error) throw error;
}

/** Spot ids the signed-in user has already voted on in this room. */
export async function fetchMyRoomVotes(roomId: string): Promise<string[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('room_votes')
    .select('spot_id')
    .eq('room_id', roomId)
    .eq('user_id', user.id);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.spot_id);
}

/** Spots every current member liked, with like counts. */
export async function fetchRoomMatches(roomId: string): Promise<{ spotId: string; likes: number }[]> {
  const { data, error } = await supabase.rpc('get_room_matches', { p_room: roomId });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({ spotId: r.spot_id, likes: Number(r.likes) }));
}

export async function fetchSpotsByIds(ids: string[]): Promise<Spot[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from('spots').select('*').in('id', ids);
  if (error) throw error;
  return (data ?? []).map(rowToSpot);
}

// ── Community spots (UGC — "dump your top places") ───────────────────────
export interface CommunitySpot {
  id: string;
  title: string;
  vibe: VibeId;
  kind: string | null;
  city: string | null;
  area: string | null;
  blurb: string | null;
}

/** Submit freeform favorite places → resolved + LLM-categorized + saved. */
export async function submitPlaces(
  text: string,
): Promise<{ saved: { title: string; vibe: VibeId; blurb: string; city: string }[]; notFound: string[] }> {
  const { data, error } = await supabase.functions.invoke('submit-places', { body: { places: text } });
  if (error) {
    // surface the function's own error message when present
    const msg = (await error.context?.json?.().catch(() => null))?.error;
    throw new Error(msg || error.message);
  }
  return data;
}

/** Approved community spots near a point (for surfacing in "Around you"). */
export async function fetchNearbyCommunitySpots(
  lat: number,
  lng: number,
  radiusKm = 3,
): Promise<(CommunitySpot & { lat: number; lng: number })[]> {
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  const { data, error } = await supabase
    .from('community_spots')
    .select('id, title, vibe, kind, city, area, blurb, lat, lng')
    .eq('status', 'approved')
    .gte('lat', lat - dLat)
    .lte('lat', lat + dLat)
    .gte('lng', lng - dLng)
    .lte('lng', lng + dLng)
    .limit(60);
  if (error) throw error;
  return (data ?? []) as (CommunitySpot & { lat: number; lng: number })[];
}

/** Flag a community spot for review (App Store 1.2 UGC moderation). */
export async function reportCommunitySpot(spotId: string, reason: string): Promise<void> {
  const { error } = await supabase.from('community_reports').insert({ spot_id: spotId, reason });
  if (error) throw error;
}

/** The current user's own submitted community spots. */
export async function fetchMyCommunitySpots(): Promise<CommunitySpot[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('community_spots')
    .select('id, title, vibe, kind, city, area, blurb')
    .eq('submitted_by', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CommunitySpot[];
}

// ── Published itineraries (users publish a whole day-plan for others) ─────
export interface PublishedItinerary {
  id: string;
  authorId: string;
  authorName: string | null;
  title: string;
  note: string | null;
  city: string | null;
  vibe: VibeId | null;
  stopSpotIds: string[];
  stopDays: number[] | null;
  stopCount: number;
  cover: string | null;
  createdAt: string;
}

function rowToItin(r: any): PublishedItinerary {
  return {
    id: r.id,
    authorId: r.author,
    authorName: r.author_name,
    title: r.title,
    note: r.note,
    city: r.city,
    vibe: r.vibe,
    stopSpotIds: r.stop_spot_ids ?? [],
    stopDays: r.stop_days ?? null,
    stopCount: r.stop_count ?? (r.stop_spot_ids ?? []).length,
    cover: r.cover,
    createdAt: r.created_at,
  };
}

/** Publish a saved collection as a shareable itinerary. */
export async function publishItinerary(input: {
  title: string;
  note?: string;
  city: string;
  vibe: VibeId;
  spotIds: string[];
  cover?: string | null;
}): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const ids = input.spotIds.slice(0, 30);
  if (ids.length === 0) throw new Error('Add at least one spot before publishing.');
  // snapshot the author's display name — profiles are read-own-only, so a feed
  // can't join to it; this is how "by <name>" renders for other viewers.
  const { data: prof } = await supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle();
  const { error } = await supabase.from('published_itineraries').insert({
    author: user.id,
    author_name: prof?.display_name ?? null,
    title: input.title.trim().slice(0, 80),
    note: input.note?.trim().slice(0, 500) || null,
    city: input.city,
    vibe: input.vibe,
    stop_spot_ids: ids,
    stop_count: ids.length,
    cover: input.cover ?? null,
  });
  if (error) throw error;
}

/** The current user's own published itineraries. */
export async function fetchMyItineraries(): Promise<PublishedItinerary[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('published_itineraries')
    .select('*')
    .eq('author', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToItin);
}

/** Unpublish / delete one of your own itineraries. */
export async function deleteMyItinerary(id: string): Promise<void> {
  const { error } = await supabase.from('published_itineraries').delete().eq('id', id);
  if (error) throw error;
}

/** A published itinerary + its stops resolved from the curated catalogue, in order. */
export async function fetchPublishedItinerary(id: string): Promise<{ itin: PublishedItinerary; stops: Spot[] } | null> {
  const { data, error } = await supabase.from('published_itineraries').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const itin = rowToItin(data);
  const spots = await fetchSpotsByIds(itin.stopSpotIds);
  const order = new Map(itin.stopSpotIds.map((sid, i) => [sid, i] as const));
  spots.sort((a, b) => (order.get(a.id) ?? 99) - (order.get(b.id) ?? 99));
  return { itin, stops: spots };
}

/** Flag a published itinerary for review (App Store 1.2 UGC moderation). */
export async function reportItinerary(id: string, reason: string): Promise<void> {
  const { error } = await supabase.from('itinerary_reports').insert({ itinerary_id: id, reason });
  if (error) throw error;
}

// ── Community feed (unified: published itineraries + community spots) ─────
export type FeedItem =
  | {
      kind: 'itinerary';
      id: string;
      title: string;
      authorId: string;
      authorName: string | null;
      city: string | null;
      vibe: VibeId | null;
      stopCount: number;
      cover: string | null;
      createdAt: string;
    }
  | {
      kind: 'spot';
      id: string; // google place_id
      title: string;
      authorId: string;
      vibe: VibeId;
      city: string | null;
      area: string | null;
      blurb: string | null;
      createdAt: string;
    };

/** Everything the community is publishing — trips + spots — newest first,
 *  with blocked authors filtered out. */
export async function fetchCommunityFeed(): Promise<FeedItem[]> {
  const [itins, spots, blocked] = await Promise.all([
    supabase
      .from('published_itineraries')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(60),
    supabase
      .from('community_spots')
      .select('id, title, vibe, city, area, blurb, submitted_by, created_at')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(60),
    fetchBlockedUserIds().catch(() => [] as string[]),
  ]);
  const blockedSet = new Set(blocked);
  const items: FeedItem[] = [];
  for (const r of itins.data ?? []) {
    if (blockedSet.has(r.author)) continue;
    items.push({
      kind: 'itinerary',
      id: r.id,
      title: r.title,
      authorId: r.author,
      authorName: r.author_name,
      city: r.city,
      vibe: r.vibe,
      stopCount: r.stop_count ?? 0,
      cover: r.cover,
      createdAt: r.created_at,
    });
  }
  for (const r of spots.data ?? []) {
    if (blockedSet.has(r.submitted_by)) continue;
    items.push({
      kind: 'spot',
      id: r.id,
      title: r.title,
      authorId: r.submitted_by,
      vibe: r.vibe,
      city: r.city,
      area: r.area,
      blurb: r.blurb,
      createdAt: r.created_at,
    });
  }
  items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return items;
}

// ── Room moderation (App Store Guideline 1.2 for UGC) ────────────────────

/** Flag a room member for an offensive name or behaviour. */
export async function reportRoomMember(roomId: string, reportedUserId: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from('room_reports')
    .insert({ room_id: roomId, reported_user_id: reportedUserId, reason });
  if (error) throw error;
}

/** Block a user — you stop seeing their name/content anywhere. */
export async function blockUser(blockedId: string): Promise<void> {
  const { error } = await supabase.from('blocked_users').upsert({ blocked_id: blockedId }, { onConflict: 'blocker_id,blocked_id' });
  if (error) throw error;
}

export async function fetchBlockedUserIds(): Promise<string[]> {
  const { data, error } = await supabase.from('blocked_users').select('blocked_id');
  if (error) throw error;
  return (data ?? []).map((r: any) => r.blocked_id);
}

/** Remove yourself from a room. */
export async function leaveRoom(roomId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase.from('room_members').delete().eq('room_id', roomId).eq('user_id', user.id);
  if (error) throw error;
}

// ── Profile ──────────────────────────────────────────────────────────────
export interface Profile {
  displayName: string | null;
}

/** The signed-in user's profile row (auto-created by the signup trigger). */
export async function fetchProfile(): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('display_name').maybeSingle();
  if (error) throw error;
  return data ? { displayName: data.display_name } : null;
}

export async function updateDisplayName(name: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const { error } = await supabase.from('profiles').update({ display_name: name }).eq('id', user.id);
  if (error) throw error;
}

// ── Passport / check-ins ─────────────────────────────────────────────────
export interface CheckinItem {
  spotId: string;
  title: string;
  kind: string;
  area: string;
  city: string;
  tone: string;
  photo: string;
}

export async function fetchCheckins(): Promise<CheckinItem[]> {
  const { data, error } = await supabase
    .from('checkins')
    .select('spot_id, city, spots(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .filter((r: any) => r.spots)
    .map((r: any) => ({
      spotId: r.spot_id,
      title: r.spots.title,
      kind: r.spots.kind ?? '',
      area: r.spots.area ?? '',
      city: r.city ?? r.spots.city ?? '',
      tone: r.spots.tone ?? '#E7DCCB',
      photo: r.spots.photo ?? '',
    }));
}

export async function checkIn(spotId: string, city: string, verified: boolean): Promise<void> {
  const { error } = await supabase
    .from('checkins')
    .upsert({ spot_id: spotId, city, verified }, { onConflict: 'user_id,spot_id' });
  if (error) throw error;
}

export async function removeCheckin(spotId: string): Promise<void> {
  const { error } = await supabase.from('checkins').delete().eq('spot_id', spotId);
  if (error) throw error;
}
