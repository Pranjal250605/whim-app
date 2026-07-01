import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { router } from 'expo-router';
import { useWhimStore, scopedBucket } from '@/store/useWhimStore';
import SpotImage from '@/components/SpotImage';
import type { VibeId } from '@/lib/types';

const VIBE_LABEL: Record<VibeId, string> = {
  classics: 'The Classics',
  matcha: 'Matcha',
  nature: 'Nature',
  nightlife: 'After Dark',
};

const shadowSoft = { shadowColor: '#1C1C1C', shadowOpacity: 0.06, shadowRadius: 18, shadowOffset: { width: 0, height: 6 } };

// Phase 4 input — the Hitlist, scoped to the current city + vibe. Saved anchors
// (with their chosen micro-activities); swipe a card left to remove; "Generate
// Smart Route" → itinerary.
export default function Hitlist() {
  const bucketList = useWhimStore((s) => s.bucketList);
  const removeAnchor = useWhimStore((s) => s.removeAnchor);
  const city = useWhimStore((s) => s.city);
  const vibe = useWhimStore((s) => s.vibe);
  const scoped = useMemo(() => scopedBucket(bucketList, city, vibe), [bucketList, city, vibe]);
  const count = scoped.length;
  const empty = count === 0;

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <View className="flex-row items-center gap-2.5 px-4 pt-1">
        <Pressable
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full bg-white"
          style={shadowSoft}
        >
          <Text className="text-lg text-ink">‹</Text>
        </Pressable>
      </View>

      <View className="px-5 pt-2">
        <Text className="font-serif text-[31px] text-ink">Your {city} Hitlist</Text>
        <Text className="mt-1 text-[13.5px] text-muted">{VIBE_LABEL[vibe]} · {count} saved · swipe a card left to remove</Text>
      </View>

      <ScrollView className="flex-1 px-[18px] pt-3" contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {empty ? (
          <View className="items-center px-8 pt-16">
            <Text className="font-serif text-[23px] text-ink">Nothing saved yet</Text>
            <Text className="mt-2.5 text-center text-[14px] leading-5 text-muted">
              Swipe right on spots you love and they’ll land here.
            </Text>
            <Pressable onPress={() => router.replace('/')} className="mt-6 rounded-2xl bg-ink px-6 py-3.5">
              <Text className="text-[15px] font-semibold text-white">Find spots</Text>
            </Pressable>
          </View>
        ) : (
          scoped.map((b) => (
            <View key={b.anchor.id} className="mb-4">
              <Swipeable
                renderRightActions={() => (
                  <View className="my-0.5 ml-2 flex-row items-center justify-end rounded-[20px] bg-[#C2603F] px-6">
                    <Text className="text-[14px] font-semibold text-white">🗑  Remove</Text>
                  </View>
                )}
                onSwipeableOpen={() => removeAnchor(b.anchor.id)}
              >
                <View className="flex-row items-center gap-3.5 rounded-[20px] bg-white p-3.5" style={shadowSoft}>
                  <View className="h-[60px] w-[60px] overflow-hidden rounded-[14px]" style={{ backgroundColor: b.anchor.tone }}>
                    <SpotImage uri={b.anchor.photo} />
                  </View>
                  <View className="flex-1">
                    <Text className="font-serif text-[18px] text-ink">{b.anchor.title}</Text>
                    <Text className="mt-0.5 text-[12.5px] text-muted">{b.anchor.kind} · {b.anchor.area}</Text>
                  </View>
                  <View className="rounded-full bg-[#F4EFE7] px-2.5 py-1">
                    <Text className="text-[10.5px] font-bold uppercase tracking-wide text-[#9c7a52]">Anchor</Text>
                  </View>
                </View>
              </Swipeable>

              {b.microActivities.map((a) => (
                <View
                  key={a.id}
                  className="ml-8 mt-2 flex-row items-center gap-3 rounded-[15px] border border-[#F0ECE3] bg-white px-3.5 py-2.5"
                >
                  <View className="h-1.5 w-1.5 rounded-full bg-accent" />
                  <View className="h-9 w-9 overflow-hidden rounded-[9px]" style={{ backgroundColor: a.tone }}>
                    <SpotImage uri={a.photo} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[14px] font-semibold text-ink">{a.title}</Text>
                    <Text className="mt-0.5 text-[11.5px] text-muted">{a.kind} · {a.mins} min away</Text>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {/* generate route */}
      <View className="absolute bottom-0 left-0 right-0 bg-canvas px-5 pb-9 pt-4">
        <Pressable
          disabled={empty}
          onPress={() => router.push('/itinerary')}
          className={`flex-row items-center justify-center gap-2 rounded-2xl py-[17px] ${empty ? 'bg-[#DCD8D0]' : 'bg-ink'}`}
          style={empty ? undefined : { shadowColor: '#1C1C1C', shadowOpacity: 0.2, shadowRadius: 26, shadowOffset: { width: 0, height: 10 } }}
        >
          <Text className="text-base font-semibold text-white">Generate Smart Route</Text>
          <Text className="text-base text-white">→</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
