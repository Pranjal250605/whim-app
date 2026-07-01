import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useWhimStore, scopedBucket } from '@/store/useWhimStore';
import { CITIES } from '@/data/cities';
import CityPicker from '@/components/CityPicker';
import GlassNav from '@/components/GlassNav';
import SpotImage from '@/components/SpotImage';
import Icon from '@/components/Icon';
import type { VibeId } from '@/lib/types';

// Phase 1 — Context & Vibe. Bold editorial-meets-playful home.
const VIBES: { id: VibeId; label: string }[] = [
  { id: 'classics', label: 'The Classics' },
  { id: 'matcha', label: 'Matcha' },
  { id: 'nature', label: 'Nature' },
  { id: 'nightlife', label: 'After Dark' },
];

const FEATURED: Record<VibeId, { label: string; title: string; desc: string; caption: string; tone: string; photo: string }> = {
  classics: {
    label: 'The Classics',
    title: 'First-Timer Classics',
    desc: 'The icons you can’t miss — temples, towers and timeless landmarks.',
    caption: 'photo · iconic landmark',
    tone: '#E7DCCB',
    photo: 'https://images.pexels.com/photos/19867354/pexels-photo-19867354.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  matcha: {
    label: 'Matcha',
    title: 'Matcha & Minimalism',
    desc: 'A hand-picked loop of slow mornings, design shops and the city’s most photogenic cafés.',
    caption: 'photo · quiet café interior',
    tone: '#DCE3D8',
    photo: 'https://images.pexels.com/photos/33313174/pexels-photo-33313174.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  nature: {
    label: 'Nature',
    title: 'Nature & Calm',
    desc: 'Gardens, parks and quiet waterside walks to slow the whole day down.',
    caption: 'photo · green & quiet',
    tone: '#DDE2D6',
    photo: 'https://images.pexels.com/photos/18210743/pexels-photo-18210743.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  nightlife: {
    label: 'After Dark',
    title: 'After Dark',
    desc: 'Neon streets, rooftop views and the city’s best late-night bites.',
    caption: 'photo · neon at night',
    tone: '#D7DEE4',
    photo: 'https://images.pexels.com/photos/18867525/pexels-photo-18867525.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
};

const shadowSoft = { shadowColor: '#1C1C1C', shadowOpacity: 0.06, shadowRadius: 18, shadowOffset: { width: 0, height: 6 } };
const shadowCard = { shadowColor: '#1C1C1C', shadowOpacity: 0.16, shadowRadius: 34, shadowOffset: { width: 0, height: 20 } };
const shadowAccent = { shadowColor: '#D97757', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } };

// springy press feedback (Gen-Z tactility)
const press =
  (base?: object) =>
  ({ pressed }: { pressed: boolean }) =>
    [base, pressed ? { transform: [{ scale: 0.97 }], opacity: 0.96 } : null];

export default function Home() {
  const city = useWhimStore((s) => s.city);
  const setContext = useWhimStore((s) => s.setContext);
  const setCity = useWhimStore((s) => s.setCity);
  const hydrate = useWhimStore((s) => s.hydrate);
  const hydrated = useWhimStore((s) => s.hydrated);
  const vibe = useWhimStore((s) => s.vibe);
  const setVibe = useWhimStore((s) => s.setVibe);
  const bucketList = useWhimStore((s) => s.bucketList);
  const notificationsSeen = useWhimStore((s) => s.notificationsSeen);
  const markNotificationsSeen = useWhimStore((s) => s.markNotificationsSeen);
  const [pickerOpen, setPickerOpen] = useState(false);

  const f = FEATURED[vibe];
  const savedHere = useMemo(() => scopedBucket(bucketList, city, vibe).length, [bucketList, city, vibe]);

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  const start = async () => {
    await setContext(city, vibe);
    router.push('/swipe');
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      {/* header */}
      <View className="flex-row items-center justify-between px-5 pt-1">
        <Text style={{ fontFamily: 'Fraunces_900Black', fontSize: 27, color: '#1C1C1C', letterSpacing: -0.5 }}>Whim</Text>
        <View className="flex-row items-center gap-4">
          <Pressable
            onPress={() => {
              markNotificationsSeen();
              router.push('/notifications');
            }}
            accessibilityLabel="Notifications"
            className="relative p-1"
          >
            <Icon name="bell" size={24} color="#1C1C1C" strokeWidth={1.7} />
            {!notificationsSeen && (
              <View className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-canvas bg-accent" />
            )}
          </Pressable>
          <Pressable onPress={() => router.push('/settings')} accessibilityLabel="Account" className="h-9 w-9 items-center justify-center rounded-full bg-[#DCE3D8]">
            <Text className="text-[13px] font-semibold text-[#5b6b5b]">JL</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
        {/* eyebrow */}
        <Text className="mt-6 text-[12px] font-bold uppercase tracking-[0.22em] text-accent">Where to?</Text>

        {/* greeting + city chip */}
        <Text className="mt-2 font-serif text-[40px] leading-[0.98] text-ink">I’m going to</Text>
        <Pressable
          onPress={() => setPickerOpen(true)}
          style={press(shadowSoft)}
          className="mt-3 flex-row items-center gap-2.5 self-start rounded-full bg-white py-2 pl-5 pr-2"
        >
          <Text className="font-serif text-[28px] text-ink" style={{ lineHeight: 30, marginTop: 3 }}>
            {city}
          </Text>
          <View className="h-8 w-8 items-center justify-center rounded-full bg-ink/5">
            <Icon name="chevronDown" size={16} color="#1C1C1C" strokeWidth={2.6} />
          </View>
        </Pressable>

        <Text className="mt-4 text-[15px] text-muted">Pick a vibe to start discovering.</Text>

        {/* vibe pills — vibrant active */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 mt-5" contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
          {VIBES.map((v) => {
            const on = v.id === vibe;
            return (
              <Pressable
                key={v.id}
                onPress={() => setVibe(v.id)}
                style={press(on ? shadowAccent : undefined)}
                className={`rounded-full border px-5 py-3 ${on ? 'border-accent bg-accent' : 'border-ink/12 bg-white'}`}
              >
                <Text className={`text-[14.5px] font-bold ${on ? 'text-white' : 'text-ink'}`}>{v.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* featured hero card with stacked-paper effect */}
        <View className="mt-9">
          <View className="absolute left-[18px] right-[18px] -top-3 h-8 rounded-[24px] bg-white" style={{ opacity: 0.7, ...shadowSoft }} />
          <View className="absolute left-2 right-2 -top-1.5 h-8 rounded-3xl bg-white" style={{ opacity: 0.85, ...shadowSoft }} />
          <View className="overflow-hidden rounded-[28px] bg-white" style={shadowCard}>
            <View className="h-[186px] justify-end overflow-hidden" style={{ backgroundColor: f.tone }}>
              <SpotImage uri={f.photo} />
              <View className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5">
                <Text className="text-[11.5px] font-bold uppercase tracking-wide text-[#5b6b5b]">{f.label}</Text>
              </View>
              <Text className="font-mono p-4 text-[11px] text-white/85">{f.caption}</Text>
            </View>
            <View className="p-5">
              <Text className="font-serif text-[27px] leading-[1.05] text-ink">{f.title}</Text>
              <Text className="mt-2.5 text-[14.5px] leading-6 text-muted">{f.desc}</Text>
              {/* island CTA with nested arrow */}
              <Pressable onPress={start} style={press()} className="mt-5 flex-row items-center gap-3 self-start rounded-full bg-ink py-2 pl-6 pr-2">
                <Text className="text-[15px] font-bold text-white">Start Swiping</Text>
                <View className="h-9 w-9 items-center justify-center rounded-full bg-white/15">
                  <Icon name="arrowRight" size={16} color="#fff" strokeWidth={2.6} />
                </View>
              </Pressable>
            </View>
          </View>
        </View>

        {/* continue an existing collection */}
        {savedHere > 0 && (
          <Pressable
            onPress={() => router.push('/hitlist')}
            style={press()}
            className="mt-4 flex-row items-center justify-between rounded-2xl border border-accent/25 bg-accent/10 px-4 py-3.5"
          >
            <View className="flex-1">
              <Text className="text-[14.5px] font-bold text-ink">
                Continue your {city} · {f.label} list
              </Text>
              <Text className="mt-0.5 text-[12.5px] text-muted">
                {savedHere} spot{savedHere > 1 ? 's' : ''} saved · tap to review
              </Text>
            </View>
            <View className="h-8 w-8 items-center justify-center rounded-full bg-accent">
              <Icon name="arrowRight" size={16} color="#fff" strokeWidth={2.4} />
            </View>
          </Pressable>
        )}
      </ScrollView>

      <GlassNav active="discover" />

      <CityPicker
        visible={pickerOpen}
        current={city}
        onSelect={(c) => {
          setCity(c);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
}
