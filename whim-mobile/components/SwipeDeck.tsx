import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { Spot, SwipeDirection } from '@/lib/types';
import { hapticLight, hapticMedium } from '@/lib/haptics';
import { COLORS } from '@/lib/theme';
import SwipeCard from './SwipeCard';
import Icon from './Icon';

const VISIBLE = 3; // how many cards render in the stack at once

export interface SwipeDeckProps {
  deck: Spot[];
  /** Index of the top (interactive) card. */
  index: number;
  /** Spots available before deck-memory filtering — 0 means "nothing curated here". */
  sourceCount: number;
  loading: boolean;
  onSwipe: (direction: SwipeDirection) => void;
  /** Shown on the all-done state (e.g. review the hitlist / see group matches). */
  doneAction?: { label: string; onPress: () => void };
  /** Copy overrides so group decks can speak in "we" instead of "you". */
  emptyCopy?: { title: string; body: string };
  doneCopy?: { title: string; body: string };
}

/**
 * The swipe deck — PRESENTATIONAL. It owns gestures, stack rendering, progress
 * and haptics, but knows nothing about where the deck comes from or what a
 * swipe means (solo save vs. room vote). The host screen wires it to a store.
 */
export default function SwipeDeck({
  deck,
  index,
  sourceCount,
  loading,
  onSwipe,
  doneAction,
  emptyCopy,
  doneCopy,
}: SwipeDeckProps) {
  const handleSwipe = (direction: SwipeDirection) => {
    if (direction === 'right') hapticMedium();
    else hapticLight();
    onSwipe(direction);
  };

  if (loading && deck.length === 0) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={COLORS.accent} />
      </View>
    );
  }

  // no data for this context at all (vs. "you've decided on them all")
  if (sourceCount === 0) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center font-serif text-2xl text-ink">{emptyCopy?.title ?? 'No spots here yet.'}</Text>
        <Text className="mt-2.5 text-center text-[15px] leading-6 text-muted">
          {emptyCopy?.body ?? 'We haven’t curated this vibe for this city yet — try another vibe or city.'}
        </Text>
      </View>
    );
  }

  if (index >= deck.length) {
    return (
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center font-serif text-2xl text-ink">{doneCopy?.title ?? 'That’s the lot.'}</Text>
        <Text className="mt-2.5 text-center text-[15px] leading-6 text-muted">
          {doneCopy?.body ?? 'You’ve been through every spot in this collection.'}
        </Text>
        {doneAction && (
          <Pressable onPress={doneAction.onPress} className="mt-6 rounded-2xl bg-ink px-6 py-3.5">
            <Text className="text-[15px] font-semibold text-white">{doneAction.label}</Text>
          </Pressable>
        )}
      </View>
    );
  }

  // Render back-to-front so the top card (depth 0) paints last / on top.
  const cards = [];
  for (let depth = VISIBLE - 1; depth >= 0; depth--) {
    const spot = deck[index + depth];
    if (!spot) continue;
    cards.push(
      <SwipeCard key={spot.id} spot={spot} depth={depth} isTop={depth === 0} onSwipe={handleSwipe} />,
    );
  }

  const total = deck.length;
  const position = Math.min(index + 1, total);

  return (
    <View className="flex-1">
      {/* progress */}
      <View className="mb-3 flex-row items-center gap-3 px-1">
        <View className="h-1 flex-1 overflow-hidden rounded-full bg-[#EAE6DE]">
          <View className="h-full rounded-full bg-accent" style={{ width: `${(index / total) * 100}%` }} />
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
