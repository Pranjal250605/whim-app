import { ScrollView, Text, View, Pressable } from 'react-native';
import type { VibeId } from '@/lib/types';
import { seasonalCollections, isInSeason, type Collection } from '@/data/collections';
import { press, SHADOWS } from '@/lib/theme';

// Horizontal shelf of editorial collections on Discover. In-season ones lead.
// Tapping a card starts that collection's (city, vibe) deck.
export default function CollectionsShelf({ onPick }: { onPick: (c: Collection) => void }) {
  const items = seasonalCollections();

  return (
    <View className="mt-9">
      <View className="flex-row items-baseline justify-between px-0.5">
        <Text className="font-serif text-[22px] text-ink">Collections</Text>
        <Text className="font-mono text-[10.5px] tracking-[0.12em] text-muted">IN SEASON FIRST</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="-mx-5 mt-3.5"
        contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
      >
        {items.map((c) => {
          const seasonal = isInSeason(c);
          return (
            <Pressable
              key={c.id}
              onPress={() => onPick(c)}
              style={press(SHADOWS.card)}
              className="w-[172px] overflow-hidden rounded-[24px] p-4"
            >
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.tone }} />
              <View className="h-[192px] justify-between">
                <View className="flex-row items-start justify-between">
                  <Text className="flex-1 font-mono text-[9.5px] leading-[14px] tracking-[0.12em] text-white/70">
                    {c.eyebrow.toUpperCase()}
                  </Text>
                  {seasonal && (
                    <View className="ml-1 rounded-full bg-white/20 px-2 py-0.5">
                      <Text className="font-mono text-[8px] tracking-[0.1em] text-white">NOW</Text>
                    </View>
                  )}
                </View>

                <View>
                  <Text className="font-serif text-[25px] leading-[1.05] text-white">{c.title}</Text>
                  <Text className="mt-1.5 text-[12.5px] leading-[17px] text-white/75">{c.blurb}</Text>
                  <View className="mt-3 flex-row items-center gap-1.5">
                    <View className="h-1 w-1 rounded-full bg-white/60" />
                    <Text className="font-mono text-[10px] tracking-[0.08em] text-white/70">{c.city.toUpperCase()}</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
