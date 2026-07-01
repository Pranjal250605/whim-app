import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useWhimStore, scopedBucket } from '@/store/useWhimStore';
import SwipeDeck from '@/components/SwipeDeck';
import MicroDiscoveryModal from '@/components/MicroDiscoveryModal';

// Phase 2 host screen. Owns the deck + the post-match modal overlay.
export default function SwipeScreen() {
  const vibe = useWhimStore((s) => s.vibe);
  const city = useWhimStore((s) => s.city);
  const bucketList = useWhimStore((s) => s.bucketList);
  // count only what's saved in this city + vibe collection
  const matchCount = useMemo(() => scopedBucket(bucketList, city, vibe).length, [bucketList, city, vibe]);

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <View className="flex-row items-center gap-2.5 px-4 pb-1">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm shadow-black/5"
        >
          <Text className="text-lg text-ink">‹</Text>
        </Pressable>
        <Text className="flex-1 text-center text-base font-semibold text-ink">
          Discovering {city}
        </Text>
        <Pressable
          onPress={() => router.push('/itinerary')}
          className="h-10 min-w-10 items-center justify-center rounded-full bg-white px-3 shadow-sm shadow-black/5"
        >
          <Text className="text-sm font-semibold text-accent">{matchCount}</Text>
        </Pressable>
      </View>

      <View className="flex-1 px-4 pt-3">
        <SwipeDeck />
      </View>

      {/* Phase 3 overlay — auto-opens on swipe-right via the store */}
      <MicroDiscoveryModal />
    </SafeAreaView>
  );
}
