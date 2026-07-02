import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import Icon from '@/components/Icon';
import ShareCard from '@/components/ShareCard';
import { scheduleTripReminder } from '@/lib/notify';
import { VIBE_LABEL } from '@/data/vibes';
import { COLORS } from '@/lib/theme';
import { useWhimStore, scopedBucket } from '@/store/useWhimStore';
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
  const city = useWhimStore((s) => s.city);
  const vibe = useWhimStore((s) => s.vibe);
  const clearCollection = useWhimStore((s) => s.clearCollection);
  const checkins = useWhimStore((s) => s.checkins);
  const toggleCheckin = useWhimStore((s) => s.toggleCheckin);

  const scoped = useMemo(() => scopedBucket(bucketList, city, vibe), [bucketList, city, vibe]);
  const stops = useMemo(() => orderByProximity(scoped), [scoped]);
  const byId = useMemo(() => Object.fromEntries(scoped.map((b) => [b.anchor.id, b])), [scoped]);

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

  // Hand the whole route off to Google Maps (opens the app if installed).
  const openInMaps = () => {
    if (stops.length === 0) return;
    const pt = (s: RouteStop) => `${s.lat},${s.lng}`;
    let url: string;
    if (stops.length === 1) {
      url = `https://www.google.com/maps/search/?api=1&query=${pt(stops[0])}`;
    } else {
      const waypoints = stops.slice(1, -1).map(pt).join('|');
      url =
        `https://www.google.com/maps/dir/?api=1&origin=${pt(stops[0])}&destination=${pt(stops[stops.length - 1])}` +
        (waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : '') +
        `&travelmode=transit`;
    }
    Linking.openURL(url).catch(() => {});
  };

  const shareRef = useRef<View>(null);
  const shareTrip = async () => {
    try {
      const uri = await captureRef(shareRef, { format: 'png', quality: 1, result: 'tmpfile' });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your Whim day' });
      }
    } catch (e) {
      console.warn('[whim] share failed:', e);
    }
  };

  const remindMe = async () => {
    const when = await scheduleTripReminder(city, VIBE_LABEL[vibe], stops.length);
    if (when) {
      Alert.alert('Reminder set 🔔', `We’ll nudge you tomorrow at 9:00 AM about your ${city} day.`);
    } else {
      Alert.alert('Notifications are off', 'Enable notifications in Settings to get a reminder about your trip.');
    }
  };

  const confirmClear = () =>
    Alert.alert(
      'Delete this itinerary?',
      `This clears all ${stops.length} stops and lets you build a new route. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete & start fresh', style: 'destructive', onPress: () => clearCollection() },
      ],
    );

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={[]}>
      <RouteMap stops={stops} height={280} />

      <ScrollView className="flex-1 px-5 pt-5" contentContainerStyle={{ paddingBottom: 120 }}>
        <Text className="font-serif text-2xl text-ink">Your optimised day</Text>
        <Text className="mt-1 text-[13px] text-muted">{stops.length} stops · timed by opening hours & transit</Text>

        {stops.length > 0 && (
          <View className="mt-3">
            <View className="flex-row gap-2.5">
              <Pressable
                onPress={openInMaps}
                className="h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-ink"
              >
                <Icon name="arrowRight" size={16} color="#fff" strokeWidth={2.2} />
                <Text className="text-[15px] font-semibold text-white">Open in Maps</Text>
              </Pressable>
              <Pressable
                onPress={shareTrip}
                accessibilityLabel="Share day"
                className="h-[52px] w-[52px] items-center justify-center rounded-2xl border border-ink/12 bg-white"
              >
                <Icon name="share" size={20} color={COLORS.ink} strokeWidth={2} />
              </Pressable>
              <Pressable
                onPress={remindMe}
                accessibilityLabel="Remind me"
                className="h-[52px] w-[52px] items-center justify-center rounded-2xl border border-ink/12 bg-white"
              >
                <Icon name="bell" size={20} color={COLORS.ink} strokeWidth={2} />
              </Pressable>
            </View>
            <Pressable onPress={confirmClear} className="mb-5 mt-3 items-center py-1">
              <Text className="text-[13px] font-semibold text-[#D23B2C]">Delete itinerary & start fresh</Text>
            </Pressable>
          </View>
        )}

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
                {stop.bestTime && (
                  <View className="rounded-full bg-accent/12 px-2.5 py-1">
                    <Text className="text-[10.5px] font-bold uppercase tracking-wide text-accent">{stop.bestTime}</Text>
                  </View>
                )}
                {entry && (
                  <Pressable
                    onPress={() => toggleCheckin(entry.anchor, city)}
                    hitSlop={8}
                    accessibilityLabel="Check in"
                    className={`h-9 w-9 items-center justify-center rounded-full border ${
                      checkins.some((c) => c.spotId === stop.id) ? 'border-accent bg-accent' : 'border-ink/15 bg-white'
                    }`}
                  >
                    <Icon name="check" size={16} color={checkins.some((c) => c.spotId === stop.id) ? '#fff' : '#C9C4BC'} strokeWidth={2.6} />
                  </Pressable>
                )}
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

      {/* off-screen card captured for sharing */}
      <View ref={shareRef} collapsable={false} style={{ position: 'absolute', left: -9999, top: 0 }}>
        <ShareCard city={city} vibeLabel={VIBE_LABEL[vibe]} stops={stops} />
      </View>
    </SafeAreaView>
  );
}
