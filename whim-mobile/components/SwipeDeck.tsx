import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useWhimStore, selectDeckDone } from '@/store/useWhimStore';
import type { SwipeDirection } from '@/lib/types';
import { hapticLight, hapticMedium } from '@/lib/haptics';
import SwipeCard from './SwipeCard';
import Icon from './Icon';

const VISIBLE = 3; // how many cards render in the stack at once

/**
 * Phase 2 — the swipe deck. Renders up to VISIBLE cards (top one interactive)
 * and drives the store on each swipe. The deck has memory: spots already saved
 * or passed are filtered out (in the store), so you never re-swipe them.
 */
export default function SwipeDeck() {
  const deck = useWhimStore((s) => s.deck);
  const deckIndex = useWhimStore((s) => s.deckIndex);
  const deckSourceCount = useWhimStore((s) => s.deckSourceCount);
  const deckLoading = useWhimStore((s) => s.deckLoading);
  const swipeLeft = useWhimStore((s) => s.swipeLeft);
  const swipeRight = useWhimStore((s) => s.swipeRight);
  const done = useWhimStore(selectDeckDone);

  const handleSwipe = (direction: SwipeDirection) => {
    if (direction === 'right') {
      hapticMedium();
      swipeRight();
    } else {
      hapticLight();
      swipeLeft();
    }
  };

  if (deckLoading && deck.length === 0) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#2740E0" />
      </View>
    );
  }

  // no data for this city+vibe at all (vs. "you've decided on them all")
  if (deckSourceCount === 0) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center font-serif text-2xl text-ink">No spots here yet.</Text>
        <Text className="mt-2.5 text-center text-[15px] leading-6 text-muted">
          We haven’t curated this vibe for this city yet — try another vibe or city.
        </Text>
      </View>
    );
  }

  if (done) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center font-serif text-2xl text-ink">That’s the lot.</Text>
        <Text className="mt-2.5 text-center text-[15px] leading-6 text-muted">
          You’ve been through every spot in this collection.
        </Text>
        <Pressable onPress={() => router.push('/hitlist')} className="mt-6 rounded-2xl bg-ink px-6 py-3.5">
          <Text className="text-[15px] font-semibold text-white">Review your hitlist</Text>
        </Pressable>
      </View>
    );
  }

  // Render back-to-front so the top card (depth 0) paints last / on top.
  const cards = [];
  for (let depth = VISIBLE - 1; depth >= 0; depth--) {
    const spot = deck[deckIndex + depth];
    if (!spot) continue;
    cards.push(
      <SwipeCard key={spot.id} spot={spot} depth={depth} isTop={depth === 0} onSwipe={handleSwipe} />,
    );
  }

  const total = deck.length;
  const position = Math.min(deckIndex + 1, total);

  return (
    <View className="flex-1">
      {/* progress */}
      <View className="mb-3 flex-row items-center gap-3 px-1">
        <View className="h-1 flex-1 overflow-hidden rounded-full bg-[#EAE6DE]">
          <View className="h-full rounded-full bg-accent" style={{ width: `${(deckIndex / total) * 100}%` }} />
        </View>
        <Text className="text-[12px] font-medium text-muted" style={{ fontVariant: ['tabular-nums'] }}>
          {position} / {total}
        </Text>
      </View>

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
