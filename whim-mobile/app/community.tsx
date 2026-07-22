import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { fetchCommunityFeed, reportCommunitySpot, reportItinerary, blockUser, type FeedItem } from '@/lib/db';
import { placePhotoSource } from '@/lib/placePhoto';
import { VIBE_DOT, VIBE_LABEL } from '@/data/vibes';
import { COLORS, SHADOWS, press } from '@/lib/theme';
import { toast } from '@/lib/toast';
import BackButton from '@/components/BackButton';
import Icon from '@/components/Icon';

type State = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; items: FeedItem[] };
type Filter = 'all' | 'itinerary' | 'spot';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Everything' },
  { id: 'itinerary', label: 'Trips' },
  { id: 'spot', label: 'Spots' },
];

function ago(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return `${Math.floor(s / 604800)}w`;
}

// The community discovery feed — everything people publish (full itineraries +
// individual spots) in one place, newest first. Report + block for 1.2.
export default function Community() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const items = await fetchCommunityFeed();
      setState({ kind: 'ready', items });
    } catch {
      setState({ kind: 'error' });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const removeLocally = (id: string) =>
    setState((prev) => (prev.kind === 'ready' ? { kind: 'ready', items: prev.items.filter((i) => i.id !== id) } : prev));

  const moderate = (item: FeedItem) => {
    const what = item.kind === 'itinerary' ? 'trip' : 'spot';
    Alert.alert('Report or block?', `We review reports within 24 hours and remove violations.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block this person',
        style: 'destructive',
        onPress: () => {
          blockUser(item.authorId).catch(() => {});
          removeLocally(item.id);
          toast('Blocked — you won’t see their content.');
        },
      },
      {
        text: `Report ${what}`,
        style: 'destructive',
        onPress: () => {
          (item.kind === 'itinerary' ? reportItinerary(item.id, 'reported from feed') : reportCommunitySpot(item.id, 'reported from feed')).catch(() => {});
          removeLocally(item.id);
          toast('Thanks — we’ll review this within 24 hours.');
        },
      },
    ]);
  };

  const open = (item: FeedItem) => {
    if (item.kind === 'itinerary') {
      router.push(`/trip/${item.id}`);
    } else {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.title)}&query_place_id=${item.id}`).catch(() => {});
    }
  };

  const items = state.kind === 'ready' ? state.items.filter((i) => filter === 'all' || i.kind === filter) : [];

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <View className="flex-row items-center gap-2.5 px-4 pb-1 pt-1">
        <BackButton />
      </View>

      <View className="px-5 pt-1">
        <View className="flex-row items-center gap-2">
          <View className="h-1.5 w-1.5 rounded-full bg-accent" />
          <Text className="font-mono text-[11px] tracking-[0.16em] text-accent">COMMUNITY</Text>
        </View>
        <Text className="mt-1 font-serif text-[32px] leading-[1.02] text-ink">What people are sharing</Text>
        <Text className="mt-1 text-[13.5px] text-muted">Real trips and spots, published by Whim travelers.</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4 max-h-12" contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
        {FILTERS.map((f) => {
          const on = f.id === filter;
          return (
            <Pressable
              key={f.id}
              onPress={() => setFilter(f.id)}
              style={press(on ? SHADOWS.accent : undefined)}
              className={`h-9 items-center justify-center rounded-full border px-4 ${on ? 'border-accent bg-accent' : 'border-ink/10 bg-white'}`}
            >
              <Text className={`text-[13.5px] font-bold ${on ? 'text-white' : 'text-ink'}`}>{f.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        className="flex-1 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.accent} />}
      >
        {state.kind === 'loading' && (
          <View className="items-center pt-20">
            <ActivityIndicator color={COLORS.accent} />
            <Text className="mt-3 text-[13px] text-muted">Loading the community…</Text>
          </View>
        )}

        {state.kind === 'error' && (
          <View className="items-center px-8 pt-16">
            <Text className="text-center font-serif text-[22px] text-ink">Couldn’t load the feed</Text>
            <Text className="mt-2.5 text-center text-[14px] leading-6 text-muted">Check your connection and try again.</Text>
            <Pressable onPress={load} className="mt-6 rounded-2xl bg-ink px-6 py-3.5">
              <Text className="text-[15px] font-semibold text-white">Retry</Text>
            </Pressable>
          </View>
        )}

        {state.kind === 'ready' &&
          (items.length === 0 ? (
            <View className="items-center px-8 pt-16">
              <Text className="text-center font-serif text-[21px] text-ink">Nothing here yet</Text>
              <Text className="mt-2 text-center text-[13.5px] leading-5 text-muted">
                Be the first — build an itinerary and hit Publish, or add your spots.
              </Text>
            </View>
          ) : (
            items.map((item) =>
              item.kind === 'itinerary' ? (
                <Pressable
                  key={item.id}
                  onPress={() => open(item)}
                  onLongPress={() => moderate(item)}
                  style={press(SHADOWS.soft)}
                  className="mb-3 overflow-hidden rounded-[18px] bg-white"
                >
                  <View className="h-[116px] w-full bg-accent-soft">
                    {item.cover ? (
                      <Image source={{ uri: item.cover }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
                    ) : (
                      <View className="flex-1 items-center justify-center">
                        <Icon name="route" size={26} color={COLORS.accent} strokeWidth={1.8} />
                      </View>
                    )}
                    <View
                      className="absolute left-3 top-3 flex-row items-center gap-1.5 rounded-full px-2.5 py-1"
                      style={{ backgroundColor: item.authorName === 'Whim' ? COLORS.accent : 'rgba(0,0,0,0.45)' }}
                    >
                      <Icon name="route" size={12} color="#fff" strokeWidth={2.2} />
                      <Text className="font-mono text-[9.5px] tracking-[0.12em] text-white">
                        {item.authorName === 'Whim' ? "EDITORS’ PICK" : 'ITINERARY'}
                      </Text>
                    </View>
                  </View>
                  <View className="p-4">
                    <Text className="font-serif text-[19px] leading-[1.15] text-ink" numberOfLines={2}>
                      {item.title}
                    </Text>
                    <View className="mt-1.5 flex-row items-center gap-1.5">
                      {item.vibe && <View className="h-2 w-2 rounded-full" style={{ backgroundColor: VIBE_DOT[item.vibe] }} />}
                      <Text className="flex-1 font-mono text-[10.5px] uppercase tracking-wide text-muted" numberOfLines={1}>
                        {item.authorName ? `by ${item.authorName} · ` : ''}
                        {item.stopCount} stops
                        {item.city ? ` · ${item.city}` : ''}
                        {item.vibe ? ` · ${VIBE_LABEL[item.vibe]}` : ''}
                      </Text>
                      <Text className="font-mono text-[10px] text-muted">{ago(item.createdAt)}</Text>
                    </View>
                  </View>
                </Pressable>
              ) : (
                <Pressable
                  key={item.id}
                  onPress={() => open(item)}
                  onLongPress={() => moderate(item)}
                  style={press(SHADOWS.soft)}
                  className="mb-3 flex-row items-center gap-3.5 rounded-[18px] bg-white p-3"
                >
                  <View className="h-[52px] w-[52px] overflow-hidden rounded-[13px]" style={{ backgroundColor: COLORS.accentSoft }}>
                    {(() => {
                      const photo = placePhotoSource({ placeId: item.id, w: 200 });
                      return photo ? (
                        <Image source={photo} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
                      ) : (
                        <View className="flex-1 items-center justify-center">
                          <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: VIBE_DOT[item.vibe] }} />
                        </View>
                      );
                    })()}
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-1.5">
                      <Text className="flex-shrink text-[15.5px] font-bold text-ink" numberOfLines={1}>
                        {item.title}
                      </Text>
                      <View className="rounded-full bg-accent/12 px-1.5 py-0.5">
                        <Text className="font-mono text-[8.5px] tracking-wide text-accent">LOCAL ✦</Text>
                      </View>
                    </View>
                    <Text className="mt-0.5 text-[12.5px] text-muted" numberOfLines={1}>
                      {item.blurb || [VIBE_LABEL[item.vibe], item.city].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <Icon name="arrowRight" size={16} color="#B6B1A9" strokeWidth={2} />
                </Pressable>
              ),
            )
          ))}

        {state.kind === 'ready' && items.length > 0 && (
          <Text className="mt-4 text-center font-mono text-[10.5px] tracking-[0.08em] text-muted">
            ✦ tap a trip to open it · long-press to report
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
