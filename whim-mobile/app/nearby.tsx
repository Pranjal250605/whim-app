import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { fetchNearby, spotMeta, type NearbyResult, type NearbySpot } from '@/lib/nearby';
import { VIBES, VIBE_DOT } from '@/data/vibes';
import { COLORS, SHADOWS, press } from '@/lib/theme';
import type { VibeId } from '@/lib/types';
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
      const data = await fetchNearby(pos.coords.latitude, pos.coords.longitude);
      setState(data ? { kind: 'ready', data } : { kind: 'error' });
    } catch {
      setState({ kind: 'error' });
    }
  }, []);

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

      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {state.kind === 'loading' && (
          <View className="items-center pt-20">
            <ActivityIndicator color={COLORS.accent} />
            <Text className="mt-3 text-[13px] text-muted">Finding what’s around you…</Text>
          </View>
        )}

        {state.kind === 'denied' && (
          <View className="items-center px-8 pt-16">
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
          <View className="items-center px-8 pt-16">
            <Text className="text-center font-serif text-[22px] text-ink">Couldn’t load nearby</Text>
            <Text className="mt-2.5 text-center text-[14px] leading-6 text-muted">Check your connection and try again.</Text>
            <Pressable onPress={load} className="mt-6 rounded-2xl bg-ink px-6 py-3.5">
              <Text className="text-[15px] font-semibold text-white">Retry</Text>
            </Pressable>
          </View>
        )}

        {state.kind === 'ready' &&
          (list.length === 0 ? (
            <View className="items-center px-8 pt-14">
              <Text className="text-center font-serif text-[20px] text-ink">Nothing in this vibe nearby</Text>
              <Text className="mt-2 text-center text-[13.5px] leading-5 text-muted">Try another vibe, or refresh.</Text>
            </View>
          ) : (
            list.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => openInMaps(s)}
                style={press(SHADOWS.soft)}
                className="mb-3 flex-row items-center gap-3.5 rounded-[18px] bg-white p-3.5"
              >
                <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: COLORS.accentSoft }}>
                  <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: VIBE_DOT[vibe] }} />
                </View>
                <View className="flex-1">
                  <Text className="text-[15.5px] font-bold text-ink" numberOfLines={1}>
                    {s.title}
                  </Text>
                  <Text className="mt-0.5 text-[12.5px] text-muted" numberOfLines={1}>
                    {s.kind}
                    {spotMeta(s) ? `  ·  ${spotMeta(s)}` : ''}
                  </Text>
                </View>
                <Icon name="arrowRight" size={16} color="#B6B1A9" strokeWidth={2} />
              </Pressable>
            ))
          ))}

        {state.kind === 'ready' && (
          <Text className="mt-4 text-center font-mono text-[10.5px] tracking-[0.08em] text-muted">
            LIVE ✦ tap a spot to open it in Maps
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
