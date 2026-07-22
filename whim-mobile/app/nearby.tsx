import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { fetchNearby, spotMeta, type NearbyResult, type NearbySpot } from '@/lib/nearby';
import { fetchNearbyCommunitySpots, reportCommunitySpot } from '@/lib/db';
import { placePhotoSource } from '@/lib/placePhoto';
import { VIBES, VIBE_DOT } from '@/data/vibes';
import { COLORS, SHADOWS, press } from '@/lib/theme';
import { toast } from '@/lib/toast';
import type { VibeId } from '@/lib/types';
import { distanceKm } from '@/lib/route';
import BackButton from '@/components/BackButton';
import Icon from '@/components/Icon';

type State =
  | { kind: 'loading' }
  | { kind: 'denied' }
  | { kind: 'error' }
  | { kind: 'ready'; data: NearbyResult };

// Live "Near you" discovery — real spots around the user's GPS, sorted into
// vibes. Separate from the curated decks; these come live from Places.
export default function Nearby() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [vibe, setVibe] = useState<VibeId>('classics');

  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setState({ kind: 'denied' });
      return;
    }
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = pos.coords;
      const [data, community] = await Promise.all([
        fetchNearby(lat, lng),
        fetchNearbyCommunitySpots(lat, lng).catch(() => []),
      ]);
      if (!data) {
        setState({ kind: 'error' });
        return;
      }
      // merge community "local picks" to the TOP of their vibe, deduped by id
      for (const c of community) {
        const bucket = data.vibes[c.vibe as VibeId];
        if (!bucket || bucket.some((s) => s.id === c.id)) continue;
        bucket.unshift({
          id: c.id, title: c.title, kind: c.kind ?? '', area: c.area ?? '',
          lat: c.lat, lng: c.lng, rating: null, ratingCount: 0, photoName: null,
          km: distanceKm({ lat, lng }, { lat: c.lat, lng: c.lng }),
          community: true, blurb: c.blurb,
        });
      }
      setState({ kind: 'ready', data });
    } catch {
      setState({ kind: 'error' });
    }
  }, []);

  const reportSpot = (s: NearbySpot) =>
    Alert.alert('Report this spot?', 'We review reports within 24 hours and remove violations.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Report',
        style: 'destructive',
        onPress: () => {
          reportCommunitySpot(s.id, 'reported from nearby').catch(() => {});
          setState((prev) =>
            prev.kind === 'ready'
              ? {
                  kind: 'ready',
                  data: {
                    ...prev.data,
                    vibes: Object.fromEntries(
                      Object.entries(prev.data.vibes).map(([k, list]) => [k, list.filter((x) => x.id !== s.id)]),
                    ) as typeof prev.data.vibes,
                  },
                }
              : prev,
          );
          toast('Thanks — we’ll review this within 24 hours.');
        },
      },
    ]);

  useEffect(() => {
    load();
  }, [load]);

  const openInMaps = (s: NearbySpot) => {
    const q = s.lat != null && s.lng != null ? `${s.lat},${s.lng}` : encodeURIComponent(s.title);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}&query_place_id=${s.id}`).catch(() => {});
  };

  const coordLabel =
    state.kind === 'ready'
      ? `${Math.abs(state.data.center[0]).toFixed(2)}°${state.data.center[0] >= 0 ? 'N' : 'S'}  ${Math.abs(
          state.data.center[1],
        ).toFixed(2)}°${state.data.center[1] >= 0 ? 'E' : 'W'}`
      : 'LOCATING…';

  const list = state.kind === 'ready' ? state.data.vibes[vibe] ?? [] : [];

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <View className="flex-row items-center gap-2.5 px-4 pb-1 pt-1">
        <BackButton />
        {state.kind === 'ready' && (
          <Pressable onPress={load} accessibilityLabel="Refresh" className="ml-auto rounded-full bg-white p-2.5" style={SHADOWS.soft}>
            <Icon name="pin" size={16} color={COLORS.accent} strokeWidth={2} />
          </Pressable>
        )}
      </View>

      <View className="px-5 pt-1">
        <View className="flex-row items-center gap-2">
          <View className="h-1.5 w-1.5 rounded-full bg-accent" />
          <Text className="font-mono text-[11px] tracking-[0.14em] text-accent">{coordLabel}</Text>
        </View>
        <Text className="mt-1 font-serif text-[32px] leading-[1.02] text-ink">Around you</Text>
        <Text className="mt-1 text-[13.5px] text-muted">Real spots near you right now — pick a vibe.</Text>
      </View>

      {/* vibe pills — same control as Home */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4 max-h-12" contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
        {VIBES.map((v) => {
          const on = v.id === vibe;
          const count = state.kind === 'ready' ? (state.data.vibes[v.id]?.length ?? 0) : 0;
          return (
            <Pressable
              key={v.id}
              onPress={() => setVibe(v.id)}
              style={press(on ? SHADOWS.accent : undefined)}
              className={`h-9 flex-row items-center gap-2 rounded-full border px-4 ${on ? 'border-accent bg-accent' : 'border-ink/10 bg-white'}`}
            >
              <View className="h-2 w-2 rounded-full" style={{ backgroundColor: on ? 'rgba(255,255,255,0.9)' : VIBE_DOT[v.id] }} />
              <Text className={`text-[13.5px] font-bold ${on ? 'text-white' : 'text-ink'}`}>{v.label}</Text>
              {state.kind === 'ready' && <Text className={`text-[12px] ${on ? 'text-white/80' : 'text-muted'}`}>{count}</Text>}
            </Pressable>
          );
        })}
      </ScrollView>

      {state.kind === 'loading' && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={COLORS.accent} />
          <Text className="mt-3 text-[13px] text-muted">Finding what’s around you…</Text>
        </View>
      )}

      {state.kind === 'denied' && (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center font-serif text-[22px] text-ink">Location is off</Text>
          <Text className="mt-2.5 text-center text-[14px] leading-6 text-muted">
            Turn on location access to discover spots right around you.
          </Text>
          <Pressable onPress={() => Linking.openSettings()} className="mt-6 rounded-2xl bg-ink px-6 py-3.5">
            <Text className="text-[15px] font-semibold text-white">Open Settings</Text>
          </Pressable>
        </View>
      )}

      {state.kind === 'error' && (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center font-serif text-[22px] text-ink">Couldn’t load nearby</Text>
          <Text className="mt-2.5 text-center text-[14px] leading-6 text-muted">Check your connection and try again.</Text>
          <Pressable onPress={load} className="mt-6 rounded-2xl bg-ink px-6 py-3.5">
            <Text className="text-[15px] font-semibold text-white">Retry</Text>
          </Pressable>
        </View>
      )}

      {state.kind === 'ready' &&
        (list.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-center font-serif text-[20px] text-ink">Nothing in this vibe nearby</Text>
            <Text className="mt-2 text-center text-[13.5px] leading-5 text-muted">Try another vibe, or refresh.</Text>
          </View>
        ) : (
          <FlatList
            data={list}
            keyExtractor={(s) => s.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={7}
            renderItem={({ item: s }) => {
              const photo = placePhotoSource({ photoName: s.photoName, placeId: s.id, w: 200 });
              return (
                <Pressable
                  onPress={() => openInMaps(s)}
                  onLongPress={s.community ? () => reportSpot(s) : undefined}
                  style={press(SHADOWS.soft)}
                  className="mb-3 flex-row items-center gap-3.5 rounded-[18px] bg-white p-3"
                >
                  <View className="h-[52px] w-[52px] overflow-hidden rounded-[13px]" style={{ backgroundColor: COLORS.accentSoft }}>
                    {photo ? (
                      <Image source={photo} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
                    ) : (
                      <View className="flex-1 items-center justify-center">
                        <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: VIBE_DOT[vibe] }} />
                      </View>
                    )}
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-1.5">
                      <Text className="flex-shrink text-[15.5px] font-bold text-ink" numberOfLines={1}>
                        {s.title}
                      </Text>
                      {s.community && (
                        <View className="rounded-full bg-accent/12 px-1.5 py-0.5">
                          <Text className="font-mono text-[8.5px] tracking-wide text-accent">LOCAL ✦</Text>
                        </View>
                      )}
                    </View>
                    <Text className="mt-0.5 text-[12.5px] text-muted" numberOfLines={1}>
                      {s.community && s.blurb ? s.blurb : `${s.kind}${spotMeta(s) ? `  ·  ${spotMeta(s)}` : ''}`}
                    </Text>
                  </View>
                  <Icon name="arrowRight" size={16} color="#B6B1A9" strokeWidth={2} />
                </Pressable>
              );
            }}
            ListFooterComponent={
              <Text className="mt-4 text-center font-mono text-[10.5px] tracking-[0.08em] text-muted">
                LIVE ✦ tap to open in Maps · long-press a LOCAL pick to report
              </Text>
            }
          />
        ))}
    </SafeAreaView>
  );
}
