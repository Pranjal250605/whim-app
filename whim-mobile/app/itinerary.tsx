import { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWhimStore } from '@/store/useWhimStore';
import { orderByProximity } from '@/lib/route';
import RouteMap from '@/components/RouteMap';

// Phase 4 — Itinerary. Orders the saved anchors by proximity (local heuristic),
// shows them on the Mapbox map, then lists them as a vertical timeline.
export default function ItineraryScreen() {
  const bucketList = useWhimStore((s) => s.bucketList);

  const stops = useMemo(() => orderByProximity(bucketList), [bucketList]);
  // index anchors so the timeline can show each stop's chosen micro-activities
  const byId = useMemo(
    () => Object.fromEntries(bucketList.map((b) => [b.anchor.id, b])),
    [bucketList],
  );

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <RouteMap stops={stops} height={280} />

      <ScrollView className="flex-1 px-5 pt-5" contentContainerStyle={{ paddingBottom: 60 }}>
        <Text className="font-serif text-2xl font-semibold text-ink">Your optimised day</Text>
        <Text className="mb-5 mt-1 text-[13px] text-muted">
          {stops.length} stops · walking-optimised
        </Text>

        {stops.map((stop) => {
          const entry = byId[stop.id];
          return (
            <View key={stop.id} className="mb-4">
              <View className="flex-row items-center gap-3 rounded-2xl bg-white p-3.5 shadow-sm shadow-black/5">
                <View className="h-7 w-7 items-center justify-center rounded-full bg-accent">
                  <Text className="text-[13px] font-bold text-white">{stop.order}</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-serif text-[16.5px] font-semibold text-ink">{stop.title}</Text>
                  <Text className="text-xs text-muted">{stop.kind}</Text>
                </View>
              </View>
              {entry?.microActivities.map((a) => (
                <View
                  key={a.id}
                  className="ml-8 mt-2 flex-row items-center gap-2 rounded-xl border border-[#F0ECE3] bg-white px-3 py-2.5"
                >
                  <View className="h-1.5 w-1.5 rounded-full bg-accent" />
                  <Text className="text-sm font-semibold text-ink">{a.title}</Text>
                  <Text className="text-[11.5px] text-muted">· {a.mins} min</Text>
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
