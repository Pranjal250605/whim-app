import { create } from 'zustand';
import type { BucketAnchor, MicroActivity, Spot, VibeId } from '@/lib/types';
import { fetchDeck, fetchSavedSpots, removeSavedSpot, saveSpot } from '@/lib/db';
import { getDeck as getMockDeck } from '@/data/mockDeck';

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
  pendingMatch: Spot | null;
  bucketList: BucketAnchor[];
  hydrated: boolean;

  setContext: (city: string, vibe: VibeId) => Promise<void>;
  setCity: (city: string) => void;
  setVibe: (vibe: VibeId) => void;
  hydrate: () => Promise<void>;
  swipeLeft: () => void;
  swipeRight: () => void;
  dismissMatch: () => void;
  saveAnchorOnly: () => void;
  saveAnchorWithActivities: (activities: MicroActivity[]) => void;
  removeAnchor: (anchorId: string) => void;
  reset: () => void;
}

export const useWhimStore = create<WhimState>((set, get) => ({
  city: 'Tokyo',
  vibe: 'classics',
  deck: [],
  deckIndex: 0,
  pendingMatch: null,
  bucketList: [],
  hydrated: false,

  setContext: async (city, vibe) => {
    set({ city, vibe, deck: [], deckIndex: 0 });
    let deck: Spot[] = [];
    try {
      deck = await fetchDeck(city, vibe);
    } catch (e) {
      console.warn('[whim] fetchDeck failed, using mock:', e);
    }
    // dev fallback only for Tokyo, so other cities correctly show "no spots"
    // before the table is seeded (instead of showing Tokyo data everywhere)
    if (deck.length === 0 && city === 'Tokyo') deck = getMockDeck(city, vibe);
    set({ deck });
  },

  setCity: (city) => set({ city }),
  setVibe: (vibe) => set({ vibe }),

  hydrate: async () => {
    try {
      const bucketList = await fetchSavedSpots();
      set({ bucketList, hydrated: true });
    } catch (e) {
      console.warn('[whim] hydrate failed:', e);
      set({ hydrated: true });
    }
  },

  swipeLeft: () => set((s) => ({ deckIndex: s.deckIndex + 1 })),

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
    }));
    saveSpot(pendingMatch, [], city, vibe).catch((e) => console.warn('[whim] saveSpot failed:', e));
  },

  saveAnchorWithActivities: (activities) => {
    const { pendingMatch, city, vibe } = get();
    if (!pendingMatch) return;
    set((s) => ({
      bucketList: [...s.bucketList, { anchor: pendingMatch, microActivities: activities, city, vibe }],
      pendingMatch: null,
    }));
    saveSpot(pendingMatch, activities.map((a) => a.id), city, vibe).catch((e) =>
      console.warn('[whim] saveSpot failed:', e),
    );
  },

  removeAnchor: (anchorId) => {
    set((s) => ({ bucketList: s.bucketList.filter((b) => b.anchor.id !== anchorId) }));
    removeSavedSpot(anchorId).catch((e) => console.warn('[whim] removeSavedSpot failed:', e));
  },

  reset: () => set({ vibe: 'classics', deck: [], deckIndex: 0, pendingMatch: null, bucketList: [], hydrated: false }),
}));

// Derived selectors (kept here so components don't recompute):
export const selectActiveSpot = (s: WhimState): Spot | undefined => s.deck[s.deckIndex];
export const selectDeckDone = (s: WhimState): boolean =>
  s.deck.length > 0 && s.deckIndex >= s.deck.length;

// Hitlists are scoped to a single city + vibe ("collection"), so switching vibe
// or city shows a different list and they never mix.
export const scopedBucket = (bucketList: BucketAnchor[], city: string, vibe: VibeId): BucketAnchor[] =>
  bucketList.filter((b) => b.city === city && b.vibe === vibe);
