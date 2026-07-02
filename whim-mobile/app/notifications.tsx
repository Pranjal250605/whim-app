import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useWhimStore } from '@/store/useWhimStore';
import { VIBE_LABEL } from '@/data/vibes';
import { COLORS, SHADOWS } from '@/lib/theme';
import Icon, { type IconName } from '@/components/Icon';
import BackButton from '@/components/BackButton';
import type { VibeId } from '@/lib/types';

interface Notif {
  id: string;
  icon: IconName;
  title: string;
  body: string;
  time: string;
  onPress: () => void;
}

export default function Notifications() {
  const bucketList = useWhimStore((s) => s.bucketList);
  const setCity = useWhimStore((s) => s.setCity);
  const setVibe = useWhimStore((s) => s.setVibe);

  // one entry per city+vibe collection the user has started
  const collections = useMemo(() => {
    const map = new Map<string, { city: string; vibe: VibeId; count: number }>();
    bucketList.forEach((b) => {
      const key = `${b.city}|${b.vibe}`;
      const prev = map.get(key);
      map.set(key, { city: b.city, vibe: b.vibe, count: (prev?.count ?? 0) + 1 });
    });
    return [...map.values()];
  }, [bucketList]);

  const notifs = useMemo<Notif[]>(() => {
    const list: Notif[] = [];
    collections.forEach((c) => {
      const ready = c.count >= 2;
      list.push({
        id: `col-${c.city}-${c.vibe}`,
        icon: ready ? 'route' : 'heart',
        title: ready ? `Your ${c.city} route is ready` : `${c.city} · ${VIBE_LABEL[c.vibe]} hitlist started`,
        body: ready
          ? `${c.count} spots saved in ${VIBE_LABEL[c.vibe]}. Generate a smart route and open it in Maps.`
          : `${c.count} spot saved in ${VIBE_LABEL[c.vibe]}. Add a few more, then build a route.`,
        time: 'Today',
        onPress: () => {
          setCity(c.city);
          setVibe(c.vibe);
          router.push(ready ? '/itinerary' : '/hitlist');
        },
      });
    });
    list.push({
      id: 'welcome',
      icon: 'discover',
      title: 'Welcome to Whim ✨',
      body: 'Swipe right to save a spot, left to skip. Build a day, then open the whole route in Maps.',
      time: 'Getting started',
      onPress: () => router.replace('/'),
    });
    return list;
  }, [collections, setCity, setVibe]);

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <View className="flex-row items-center gap-2.5 px-4 pt-1">
        <BackButton />
      </View>

      <View className="px-5 pt-2">
        <Text className="font-serif text-[31px] text-ink">Notifications</Text>
      </View>

      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {notifs.map((n) => (
          <Pressable
            key={n.id}
            onPress={n.onPress}
            style={({ pressed }) => [SHADOWS.soft, pressed ? { transform: [{ scale: 0.98 }], opacity: 0.96 } : null]}
            className="mb-3 flex-row gap-3.5 rounded-2xl bg-white p-4"
          >
            <View className="h-11 w-11 items-center justify-center rounded-full bg-accent/12">
              <Icon name={n.icon} size={20} color={COLORS.accent} strokeWidth={1.9} />
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-bold text-ink">{n.title}</Text>
              <Text className="mt-0.5 text-[13px] leading-5 text-muted">{n.body}</Text>
              <Text className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{n.time}</Text>
            </View>
            <Icon name="arrowRight" size={16} color="#B6B1A9" strokeWidth={2} />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
