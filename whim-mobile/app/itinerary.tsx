import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useWhimStore } from '@/store/useWhimStore';
import { orderByProximity, type RouteStop } from '@/lib/route';
import { getTransit, type TransitResult } from '@/lib/transit';
import RouteMap from '@/components/RouteMap';
import GlassNav from '@/components/GlassNav';

function vehicleEmoji(v?: string): string {
  switch ((v ?? '').toUpperCase()) {
    case 'BUS':
      return '🚌';
    case 'TRAM':
    case 'LIGHT_RAIL':
      return '🚊';
    case 'HEAVY_RAIL':
    case 'RAIL':
    case 'COMMUTER_TRAIN':
    case 'HIGH_SPEED_TRAIN':
      return '🚆';
    case 'FERRY':
      return '⛴️';
    default:
      return '🚇'; // subway / metro
  }
}

// Rough transit-time estimate (used until the Google key is wired up).
function estimateMins(a: RouteStop, b: RouteStop): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  const km = 2 * R * Math.asin(Math.sqrt(h));
  return Math.max(5, Math.round(km * 3) + 3);
}

function legText(leg: TransitResult): string {
  const transit = leg.segments.filter((s) => s.mode === 'transit');
  if (transit.length === 0) return `🚶 ${leg.totalDuration ?? 'walk'}`;
  const lines = transit.map((t) => `${vehicleEmoji(t.vehicle)} ${t.line ?? 'Line'}`).join('  →  ');
  return leg.totalDuration ? `${lines}  ·  ${leg.totalDuration}` : lines;
}

// Phase 4 — Itinerary. Orders the saved anchors, maps them, lists them as a
// timeline, and shows the transit connection (real line names via Google, or a
// time estimate as a fallback) between each pair of stops.
export default function ItineraryScreen() {
  const bucketList = useWhimStore((s) => s.bucketList);

  const stops = useMemo(() => orderByProximity(bucketList), [bucketList]);
  const byId = useMemo(() => Object.fromEntries(bucketList.map((b) => [b.anchor.id, b])), [bucketList]);

  const [legs, setLegs] = useState<Record<number, TransitResult | null>>({});

  useEffect(() => {
    let cancelled = false;
    setLegs({});
    if (stops.length < 2) return;
    (async () => {
      const entries = await Promise.all(
        stops.slice(0, -1).map((s, i) => getTransit(s, stops[i + 1]).then((r) => [i, r] as const)),
      );
      if (!cancelled) setLegs(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
  }, [stops]);

  const renderConnector = (idx: number) => {
    const loaded = idx in legs;
    const leg = legs[idx];
    let label: string;
    if (!loaded) label = 'Finding transit…';
    else if (leg) label = legText(leg);
    else label = `🚇 ~${estimateMins(stops[idx], stops[idx + 1])} min · est.`;
    return (
      <View className="my-1 ml-3.5 flex-row items-center border-l-2 border-dashed border-[#D7D1C6] py-1 pl-4">
        <View className="rounded-full bg-[#EFEBE3] px-3 py-1.5">
          <Text className="text-[11.5px] font-medium text-muted">{label}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <RouteMap stops={stops} height={280} />

      {/* back button floating over the map */}
      <View className="absolute left-4 z-10" style={{ top: 6 }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Back"
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: 'rgba(255,255,255,0.92)', shadowColor: '#1C1C1C', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 3 } }}
        >
          <Text className="text-lg text-ink">‹</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-5 pt-5" contentContainerStyle={{ paddingBottom: 120 }}>
        <Text className="font-serif text-2xl text-ink">Your optimised day</Text>
        <Text className="mb-5 mt-1 text-[13px] text-muted">{stops.length} stops · with transit</Text>

        {stops.map((stop, idx) => {
          const entry = byId[stop.id];
          return (
            <View key={stop.id}>
              {idx > 0 && renderConnector(idx - 1)}

              <View className="flex-row items-center gap-3 rounded-2xl bg-white p-3.5 shadow-sm shadow-black/5">
                <View className="h-7 w-7 items-center justify-center rounded-full bg-accent">
                  <Text className="text-[13px] font-bold text-white">{stop.order}</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-serif text-[16.5px] text-ink">{stop.title}</Text>
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

      <GlassNav active="route" />
    </SafeAreaView>
  );
}
