import { create } from 'zustand';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Spot, SwipeDirection } from '@/lib/types';
import {
  blockUser,
  castRoomVote,
  fetchBlockedUserIds,
  fetchDeck,
  fetchMyRoomVotes,
  fetchRoom,
  fetchRoomMatches,
  fetchRoomMembers,
  fetchSpotsByIds,
  leaveRoom,
  reportRoomMember,
  type Room,
  type RoomMember,
} from '@/lib/db';
import { toast } from '@/lib/toast';
import { hapticSuccess } from '@/lib/haptics';

let blockedIds = new Set<string>();
const visible = (members: RoomMember[]) => members.filter((m) => !blockedIds.has(m.userId));

export interface RoomMatch {
  spot: Spot;
  likes: number;
}

/**
 * State for the room the user is currently inside. Mirrors the solo store's
 * optimistic pattern: swipes advance instantly, the vote persists in the
 * background, and Realtime (votes + members) keeps matches live for everyone.
 */
interface RoomState {
  room: Room | null;
  members: RoomMember[];
  matches: RoomMatch[];
  deck: Spot[];
  deckIndex: number;
  deckSourceCount: number;
  loading: boolean; // initial room load (deck + members + matches)

  enter: (roomId: string) => Promise<void>;
  leave: () => void;
  vote: (direction: SwipeDirection) => void;
  refreshMatches: () => Promise<void>;
  refreshMembers: () => Promise<void>;
  reportMember: (userId: string, reason: string) => void;
  blockMember: (userId: string) => void;
  leaveCurrentRoom: () => Promise<void>;
}

let channel: RealtimeChannel | null = null;
// distinguishes "first matches fetch after entering" (quiet) from live updates
let matchesHydrated = false;

export const useRoomStore = create<RoomState>((set, get) => ({
  room: null,
  members: [],
  matches: [],
  deck: [],
  deckIndex: 0,
  deckSourceCount: 0,
  loading: false,

  enter: async (roomId) => {
    get().leave(); // drop any previous room subscription
    matchesHydrated = false;
    set({ room: null, members: [], matches: [], deck: [], deckIndex: 0, deckSourceCount: 0, loading: true });
    try {
      const room = await fetchRoom(roomId);
      const [members, all, myVotes, blocked] = await Promise.all([
        fetchRoomMembers(roomId),
        fetchDeck(room.city, room.vibe),
        fetchMyRoomVotes(roomId),
        fetchBlockedUserIds().catch(() => []),
      ]);
      blockedIds = new Set(blocked);
      const voted = new Set(myVotes);
      set({
        room,
        members: visible(members),
        deck: all.filter((s) => !voted.has(s.id)),
        deckSourceCount: all.length,
        loading: false,
      });
      await get().refreshMatches();

      // live updates: any vote or membership change re-derives the matches.
      // RLS scopes postgres_changes, so only members receive these events.
      channel = supabase
        .channel(`room-${roomId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'room_votes', filter: `room_id=eq.${roomId}` },
          () => void get().refreshMatches(),
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'room_members', filter: `room_id=eq.${roomId}` },
          () => {
            void get().refreshMembers();
            void get().refreshMatches(); // the "everyone" threshold changed
          },
        )
        .subscribe();
    } catch (e) {
      console.warn('[whim] enter room failed:', e);
      set({ loading: false });
      toast('Couldn’t open that room — try again.');
    }
  },

  leave: () => {
    if (channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
    set({ room: null, members: [], matches: [], deck: [], deckIndex: 0, deckSourceCount: 0, loading: false });
  },

  vote: (direction) => {
    const { room, deck, deckIndex } = get();
    const spot = deck[deckIndex];
    if (!room || !spot) return;
    set({ deckIndex: deckIndex + 1 }); // optimistic — deck never waits
    castRoomVote(room.id, spot.id, direction === 'right').catch((e) => {
      console.warn('[whim] castRoomVote failed:', e);
      toast('Couldn’t send your vote — check your connection.');
    });
  },

  refreshMatches: async () => {
    const { room, matches: previous } = get();
    if (!room) return;
    try {
      const raw = await fetchRoomMatches(room.id);
      const spots = await fetchSpotsByIds(raw.map((m) => m.spotId));
      const byId = new Map(spots.map((s) => [s.id, s]));
      const matches = raw
        .filter((m) => byId.has(m.spotId))
        .map((m) => ({ spot: byId.get(m.spotId)!, likes: m.likes }));
      // celebrate matches that are new since the last refresh (quiet on the
      // initial fetch after entering, loud for live arrivals — even the first)
      const known = new Set(previous.map((m) => m.spot.id));
      const fresh = matches.find((m) => !known.has(m.spot.id));
      if (fresh && matchesHydrated) {
        hapticSuccess();
        toast(`It’s a match ✦ ${fresh.spot.title}`);
      }
      matchesHydrated = true;
      set({ matches });
    } catch (e) {
      console.warn('[whim] refreshMatches failed:', e);
    }
  },

  refreshMembers: async () => {
    const { room } = get();
    if (!room) return;
    try {
      set({ members: visible(await fetchRoomMembers(room.id)) });
    } catch (e) {
      console.warn('[whim] refreshMembers failed:', e);
    }
  },

  reportMember: (userId, reason) => {
    const { room } = get();
    if (!room) return;
    reportRoomMember(room.id, userId, reason)
      .then(() => toast('Thanks — we’ll review this within 24 hours.'))
      .catch((e) => {
        console.warn('[whim] reportRoomMember failed:', e);
        toast('Couldn’t send that report — try again.');
      });
  },

  blockMember: (userId) => {
    // hide them immediately, then persist
    blockedIds.add(userId);
    set((s) => ({ members: visible(s.members) }));
    blockUser(userId).catch((e) => {
      console.warn('[whim] blockUser failed:', e);
      toast('Couldn’t block — check your connection.');
    });
    toast('Blocked — you won’t see them again.');
  },

  leaveCurrentRoom: async () => {
    const { room } = get();
    if (!room) return;
    try {
      await leaveRoom(room.id);
      get().leave();
    } catch (e) {
      console.warn('[whim] leaveRoom failed:', e);
      toast('Couldn’t leave the room — try again.');
    }
  },
}));
