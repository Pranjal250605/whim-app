import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { fetchPublishedItinerary, reportItinerary, blockUser, deleteMyItinerary, type PublishedItinerary } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { googleMapsDirectionsUrl, type RouteStop } from '@/lib/route';
import type { Spot } from '@/lib/types';
import RouteMap from '@/components/RouteMap';
import { VIBE_DOT, VIBE_LABEL } from '@/data/vibes';
import { COLORS, SHADOWS, press } from '@/lib/theme';
import { toast } from '@/lib/toast';
import BackButton from '@/components/BackButton';
import Icon from '@/components/Icon';

type State =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'missing' }
  | { kind: 'ready'; itin: PublishedItinerary; stops: Spot[]; mine: boolean };

// Read-only view of a published itinerary — resolves the author's ordered spot
// ids back to full spots, maps the route, and lists the stops in order.
export default function Trip() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [state, setState] = useState<State>({ kind: 'loading' });

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const [res, { data: { user } }] = await Promise.all([
        fetchPublishedItinerary(String(id)),
        supabase.auth.getUser(),
      ]);
      if (!res) {
        setState({ kind: 'missing' });
        return;
      }
      setState({ kind: 'ready', itin: res.itin, stops: res.stops, mine: user?.id === res.itin.authorId });
    } catch {
      setState({ kind: 'error' });
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (state.kind === 'loading') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={COLORS.accent} />
      </SafeAreaView>
    );
  }
  if (state.kind === 'error' || state.kind === 'missing') {
    return (
      <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
        <View className="flex-row items-center px-4 pt-1">
          <BackButton />
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center font-serif text-[22px] text-ink">
            {state.kind === 'missing' ? 'This trip is no longer available' : 'Couldn’t load this trip'}
          </Text>
          <Text className="mt-2.5 text-center text-[14px] leading-6 text-muted">
            {state.kind === 'missing' ? 'It may have been unpublished or removed.' : 'Check your connection and try again.'}
          </Text>
          {state.kind === 'error' && (
            <Pressable onPress={load} className="mt-6 rounded-2xl bg-ink px-6 py-3.5">
              <Text className="text-[15px] font-semibold text-white">Retry</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const { itin, stops, mine } = state;
  const mapStops: RouteStop[] = stops
    .filter((s) => s.lat != null && s.lng != null)
    .map((s, i) => ({ id: s.id, title: s.title, kind: s.kind, lat: s.lat as number, lng: s.lng as number, order: i + 1 }));

  const openInMaps = () => {
    const url = googleMapsDirectionsUrl(mapStops);
    if (url) Linking.openURL(url).catch(() => {});
  };
  const openStop = (s: Spot) =>
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.title} ${itin.city ?? ''}`)}&query_place_id=${s.id}`).catch(() => {});

  const moderate = () => {
    if (mine) {
      Alert.alert('Unpublish this trip?', 'It will be removed from the community feed. This can’t be undone.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unpublish',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMyItinerary(itin.id);
              toast('Trip unpublished.');
              router.back();
            } catch {
              toast('Couldn’t unpublish — try again.');
            }
          },
        },
      ]);
      return;
    }
    Alert.alert('Report or block?', 'We review reports within 24 hours and remove violations.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block this person',
        style: 'destructive',
        onPress: () => {
          blockUser(itin.authorId).catch(() => {});
          toast('Blocked — you won’t see their content.');
          router.back();
        },
      },
      {
        text: 'Report trip',
        style: 'destructive',
        onPress: () => {
          reportItinerary(itin.id, 'reported from trip view').catch(() => {});
          toast('Thanks — we’ll review this within 24 hours.');
          router.back();
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={[]}>
      <RouteMap key={itin.id} stops={mapStops} height={260} />

      <View className="absolute left-4 right-4 top-14 flex-row items-center justify-between">
        <BackButton />
        <Pressable
          onPress={moderate}
          accessibilityLabel={mine ? 'Unpublish' : 'Report'}
          className="h-9 items-center justify-center rounded-full bg-white/95 px-3.5"
          style={SHADOWS.soft}
        >
          <Text className="text-[12.5px] font-semibold text-ink">{mine ? 'Unpublish' : 'Report'}</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-5 pt-5" contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center gap-2">
          <Icon name="route" size={14} color={COLORS.accent} strokeWidth={2.2} />
          <Text className="font-mono text-[11px] tracking-[0.16em] text-accent">PUBLISHED TRIP</Text>
        </View>
        <Text className="mt-2 font-serif text-[27px] leading-[1.06] text-ink">{itin.title}</Text>
        <View className="mt-2 flex-row items-center gap-1.5">
          {itin.vibe && <View className="h-2 w-2 rounded-full" style={{ backgroundColor: VIBE_DOT[itin.vibe] }} />}
          <Text className="font-mono text-[10.5px] uppercase tracking-wide text-muted">
            {itin.authorName ? `by ${itin.authorName} · ` : ''}
            {stops.length} stops
            {itin.city ? ` · ${itin.city}` : ''}
            {itin.vibe ? ` · ${VIBE_LABEL[itin.vibe]}` : ''}
          </Text>
        </View>
        {itin.note ? <Text className="mt-3 text-[14.5px] leading-6 text-ink/80">{itin.note}</Text> : null}

        {mapStops.length > 0 && (
          <Pressable
            onPress={openInMaps}
            style={press(SHADOWS.accent)}
            className="mt-4 h-[52px] flex-row items-center justify-center gap-2 rounded-2xl bg-ink"
          >
            <Icon name="arrowRight" size={16} color="#fff" strokeWidth={2.2} />
            <Text className="text-[15px] font-semibold text-white">Open route in Maps</Text>
          </Pressable>
        )}

        <View className="mt-6">
          {stops.map((s, idx) => (
            <View key={s.id}>
              {idx > 0 && <View className="my-1 ml-3.5 h-5 border-l-2 border-dashed border-[#D7D1C6]" />}
              <Pressable
                onPress={() => openStop(s)}
                style={press(SHADOWS.soft)}
                className="flex-row items-center gap-3 rounded-2xl bg-white p-3.5"
              >
                <View className="h-7 w-7 items-center justify-center rounded-full bg-accent">
                  <Text className="text-[13px] font-bold text-white">{idx + 1}</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-serif text-[16.5px] text-ink" numberOfLines={1}>{s.title}</Text>
                  <Text className="text-xs text-muted" numberOfLines={1}>
                    {[s.kind, s.area].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Icon name="arrowRight" size={15} color="#B6B1A9" strokeWidth={2} />
              </Pressable>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
