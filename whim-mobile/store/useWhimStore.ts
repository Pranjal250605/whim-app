import { create } from 'zustand';
import type { BucketAnchor, MicroActivity, Spot, VibeId } from '@/lib/types';
import {
  checkIn,
  clearSavedSpots,
  fetchCheckins,
  fetchDeck,
  fetchProfile,
  fetchSavedSpots,
  removeCheckin,
  removeSavedSpot,
  saveSpot,
  updateDisplayName,
  type CheckinItem,
  type Profile,
} from '@/lib/db';
import { getDeck as getMockDeck } from '@/data/mockDeck';
import { toast } from '@/lib/toast';

// Swipe history is scoped per collection so clearing / re-dealing one
// city+vibe never affects another.
const ctxKey = (city: string, vibe: VibeId) => `${city}|${vibe}`;

/**
 * Single source of truth for the whole user loop (Phases 1–4).
 *
 * State is updated optimistically for snappy UI, and persisted to Supabase in
 * the background. If a write fails (e.g. offline, or spots not seeded yet) the
 * local state still works and we just warn — the next hydrate reconciles.
 */
interface WhimState {
  city: string;
  vibe: VibeId;
  deck: Spot[];
  deckIndex: number;
  deckSourceCount: number; // spots available for this context, before filtering decided ones
  deckLoading: boolean;
  passedIds: Record<string, string[]>; // per-collection swipe-away history (session only)
  pendingMatch: Spot | null;
  bucketList: BucketAnchor[];
  checkins: CheckinItem[];
  profile: Profile | null;
  hydrated: boolean;
  notificationsSeen: boolean;

  setContext: (city: string, vibe: VibeId) => Promise<void>;
  renameProfile: (name: string) => void;
  toggleCheckin: (spot: Spot, city: string) => void;
  setCity: (city: string) => void;
  setVibe: (vibe: VibeId) => void;
  markNotificationsSeen: () => void;
  hydrate: () => Promise<void>;
  swipeLeft: () => void;
  swipeRight: () => void;
  dismissMatch: () => void;
  saveAnchorOnly: () => void;
  saveAnchorWithActivities: (activities: MicroActivity[]) => void;
  removeAnchor: (anchorId: string) => void;
  clearCollection: () => void;
  reset: () => void;
}

export const useWhimStore = create<WhimState>((set, get) => ({
  city: 'Tokyo',
  vibe: 'classics',
  deck: [],
  deckIndex: 0,
  deckSourceCount: 0,
  deckLoading: false,
  passedIds: {},
  pendingMatch: null,
  bucketList: [],
  checkins: [],
  profile: null,
  hydrated: false,
  notificationsSeen: false,

  setContext: async (city, vibe) => {
    set({ city, vibe, deck: [], deckIndex: 0, deckLoading: true });
    let all: Spot[] = [];
    try {
      all = await fetchDeck(city, vibe);
    } catch (e) {
      console.warn('[whim] fetchDeck failed, using mock:', e);
    }
    // dev fallback only for Tokyo, so other cities correctly show "no spots"
    if (all.length === 0 && city === 'Tokyo') all = getMockDeck(city, vibe);
    // deck memory: skip spots already saved (in this collection) or passed
    const s = get();
    const saved = s.bucketList.filter((b) => b.city === city && b.vibe === vibe).map((b) => b.anchor.id);
    const decided = new Set<string>([...(s.passedIds[ctxKey(city, vibe)] ?? []), ...saved]);
    const deck = all.filter((sp) => !decided.has(sp.id));
    set({ deck, deckSourceCount: all.length, deckLoading: false });
  },

  setCity: (city) => set({ city }),
  setVibe: (vibe) => set({ vibe }),
  markNotificationsSeen: () => set({ notificationsSeen: true }),

  hydrate: async () => {
    try {
      const [bucketList, checkins, profile] = await Promise.all([
        fetchSavedSpots(),
        fetchCheckins(),
        fetchProfile(),
      ]);
      set({ bucketList, checkins, profile, hydrated: true });
    } catch (e) {
      console.warn('[whim] hydrate failed:', e);
      set({ hydrated: true });
    }
  },

  renameProfile: (name) => {
    const trimmed = name.trim().slice(0, 60);
    if (!trimmed) return;
    set({ profile: { displayName: trimmed } });
    updateDisplayName(trimmed).catch((e) => {
      console.warn('[whim] updateDisplayName failed:', e);
      toast('Couldn’t save your name — check your connection.');
    });
  },

  toggleCheckin: (spot, city) => {
    const isIn = get().checkins.some((c) => c.spotId === spot.id);
    if (isIn) {
      set((s) => ({ checkins: s.checkins.filter((c) => c.spotId !== spot.id) }));
      removeCheckin(spot.id).catch((e) => {
        console.warn('[whim] removeCheckin failed:', e);
        toast('Couldn’t remove that stamp — check your connection.');
      });
    } else {
      const item: CheckinItem = {
        spotId: spot.id,
        title: spot.title,
        kind: spot.kind,
        area: spot.area,
        city,
        tone: spot.tone,
        photo: spot.photo,
      };
      set((s) => ({ checkins: [item, ...s.checkins] }));
      checkIn(spot.id, city).catch((e) => {
        console.warn('[whim] checkIn failed:', e);
        toast('Couldn’t stamp that check-in — check your connection.');
      });
    }
  },

  swipeLeft: () =>
    set((s) => {
      const spot = s.deck[s.deckIndex];
      if (!spot) return { deckIndex: s.deckIndex + 1 };
      const key = ctxKey(s.city, s.vibe);
      return {
        deckIndex: s.deckIndex + 1,
        passedIds: { ...s.passedIds, [key]: [...(s.passedIds[key] ?? []), spot.id] },
      };
    }),

  swipeRight: () =>
    set((s) => {
      const spot = s.deck[s.deckIndex];
      if (!spot) return s;
      return { deckIndex: s.deckIndex + 1, pendingMatch: spot };
    }),

  dismissMatch: () => set({ pendingMatch: null }),

  saveAnchorOnly: () => {
    const { pendingMatch, city, vibe } = get();
    if (!pendingMatch) return;
    set((s) => ({
      bucketList: [...s.bucketList, { anchor: pendingMatch, microActivities: [], city, vibe }],
      pendingMatch: null,
      notificationsSeen: false,
    }));
    saveSpot(pendingMatch, [], city, vibe).catch((e) => {
      console.warn('[whim] saveSpot failed:', e);
      toast('Couldn’t save that spot — check your connection.');
    });
  },

  saveAnchorWithActivities: (activities) => {
    const { pendingMatch, city, vibe } = get();
    if (!pendingMatch) return;
    set((s) => ({
      bucketList: [...s.bucketList, { anchor: pendingMatch, microActivities: activities, city, vibe }],
      pendingMatch: null,
      notificationsSeen: false,
    }));
    saveSpot(pendingMatch, activities.map((a) => a.id), city, vibe).catch((e) => {
      console.warn('[whim] saveSpot failed:', e);
      toast('Couldn’t save that spot — check your connection.');
    });
  },

  removeAnchor: (anchorId) => {
    set((s) => ({ bucketList: s.bucketList.filter((b) => b.anchor.id !== anchorId) }));
    removeSavedSpot(anchorId).catch((e) => {
      console.warn('[whim] removeSavedSpot failed:', e);
      toast('Couldn’t remove that spot — check your connection.');
    });
  },

  // Delete the current city+vibe collection and forget swipe history, so the
  // deck deals fresh from the top next time.
  clearCollection: () => {
    const { city, vibe } = get();
    set((s) => {
      // forget swipe history for THIS collection only — others keep theirs
      const { [ctxKey(city, vibe)]: _cleared, ...rest } = s.passedIds;
      return {
        bucketList: s.bucketList.filter((b) => !(b.city === city && b.vibe === vibe)),
        passedIds: rest,
        deck: [],
        deckIndex: 0,
        deckSourceCount: 0,
      };
    });
    clearSavedSpots(city, vibe).catch((e) => {
      console.warn('[whim] clearSavedSpots failed:', e);
      toast('Couldn’t clear this collection — check your connection.');
    });
  },

  reset: () =>
    set({ vibe: 'classics', deck: [], deckIndex: 0, deckSourceCount: 0, deckLoading: false, passedIds: {}, pendingMatch: null, bucketList: [], checkins: [], profile: null, hydrated: false, notificationsSeen: false }),
}));

// Derived selectors (kept here so components don't recompute):
export const selectActiveSpot = (s: WhimState): Spot | undefined => s.deck[s.deckIndex];
export const selectDeckDone = (s: WhimState): boolean =>
  s.deckSourceCount > 0 && s.deckIndex >= s.deck.length;

// Hitlists are scoped to a single city + vibe ("collection"), so switching vibe
// or city shows a different list and they never mix.
export const scopedBucket = (bucketList: BucketAnchor[], city: string, vibe: VibeId): BucketAnchor[] =>
  bucketList.filter((b) => b.city === city && b.vibe === vibe);
