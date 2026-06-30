import { Pressable, Text, View } from 'react-native';
import { useWhimStore, selectDeckDone } from '@/store/useWhimStore';
import type { SwipeDirection } from '@/lib/types';
import SwipeCard from './SwipeCard';
import Icon from './Icon';

const VISIBLE = 3; // how many cards render in the stack at once

/**
 * Phase 2 — the swipe deck. Renders up to VISIBLE cards (top one interactive),
 * drives the store on each swipe, and shows the empty state when the deck runs
 * out. Swiping right delegates to the store, which opens the Micro-Discovery
 * modal via `pendingMatch`.
 */
export default function SwipeDeck() {
  const deck = useWhimStore((s) => s.deck);
  const deckIndex = useWhimStore((s) => s.deckIndex);
  const swipeLeft = useWhimStore((s) => s.swipeLeft);
  const swipeRight = useWhimStore((s) => s.swipeRight);
  const done = useWhimStore(selectDeckDone);

  const handleSwipe = (direction: SwipeDirection) => {
    if (direction === 'right') swipeRight();
    else swipeLeft();
  };

  if (deck.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center font-serif text-2xl font-semibold text-ink">No spots here yet.</Text>
        <Text className="mt-2.5 text-center text-[15px] leading-6 text-muted">
          We haven’t curated this vibe for this city yet — try another vibe or city.
        </Text>
      </View>
    );
  }

  if (done) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center font-serif text-2xl font-semibold text-ink">That’s the lot.</Text>
        <Text className="mt-2.5 text-center text-[15px] leading-6 text-muted">
          You’ve been through every spot in this vibe. Review your hitlist to build a route.
        </Text>
      </View>
    );
  }

  // Render back-to-front so the top card (depth 0) paints last / on top.
  const cards = [];
  for (let depth = VISIBLE - 1; depth >= 0; depth--) {
    const spot = deck[deckIndex + depth];
    if (!spot) continue;
    cards.push(
      <SwipeCard
        // key by spot id so React reuses the right node as the stack shifts
        key={spot.id}
        spot={spot}
        depth={depth}
        isTop={depth === 0}
        onSwipe={handleSwipe}
      />,
    );
  }

  return (
    <View className="flex-1">
      <View className="relative flex-1">{cards}</View>

      {/* explicit action buttons (mirror the swipe gestures, a11y-friendly) */}
      <View className="flex-row items-center justify-center gap-8 py-6">
        <Pressable
          accessibilityLabel="Pass"
          onPress={() => handleSwipe('left')}
          className="h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg shadow-black/10"
        >
          <Icon name="close" size={26} color="#9A9A9A" strokeWidth={2.6} />
        </Pressable>
        <Pressable
          accessibilityLabel="Add to hitlist"
          onPress={() => handleSwipe('right')}
          className="h-[72px] w-[72px] items-center justify-center rounded-full bg-accent shadow-xl shadow-accent/40"
        >
          <Icon name="heartFilled" size={32} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}
