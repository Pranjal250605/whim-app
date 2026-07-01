import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useWhimStore, scopedBucket } from '@/store/useWhimStore';
import CityPicker from '@/components/CityPicker';
import GlassNav from '@/components/GlassNav';
import SpotImage from '@/components/SpotImage';
import Icon from '@/components/Icon';
import type { VibeId } from '@/lib/types';

// Phase 1 — Context & Vibe. Faithful port of the design's Home screen.
const VIBES: { id: VibeId; label: string }[] = [
  { id: 'classics', label: 'The Classics' },
  { id: 'matcha', label: 'Matcha' },
  { id: 'nature', label: 'Nature' },
  { id: 'nightlife', label: 'After Dark' },
];

// Each vibe gets its own featured collection card (photo + title + blurb).
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
const shadowCard = { shadowColor: '#1C1C1C', shadowOpacity: 0.14, shadowRadius: 30, shadowOffset: { width: 0, height: 18 } };

export default function Home() {
  const city = useWhimStore((s) => s.city);
  const setContext = useWhimStore((s) => s.setContext);
  const setCity = useWhimStore((s) => s.setCity);
  const hydrate = useWhimStore((s) => s.hydrate);
  const hydrated = useWhimStore((s) => s.hydrated);
  const vibe = useWhimStore((s) => s.vibe);
  const setVibe = useWhimStore((s) => s.setVibe);
  const bucketList = useWhimStore((s) => s.bucketList);
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
        <Text style={{ fontFamily: 'PlayfairDisplay_700Bold', fontSize: 26, color: '#1C1C1C' }}>Whim</Text>
        <View className="flex-row items-center gap-4">
          <View className="relative">
            <Icon name="bell" size={24} color="#1C1C1C" strokeWidth={1.7} />
            <View className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-canvas bg-accent" />
          </View>
          <Pressable
            onPress={() => router.push('/settings')}
            accessibilityLabel="Account"
            className="h-9 w-9 items-center justify-center rounded-full bg-[#DCE3D8]"
          >
            <Text className="text-[13px] font-semibold text-[#5b6b5b]">JL</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
        <Text className="mt-5 font-serif text-[33px] text-ink">I’m going to</Text>
        <Pressable
          onPress={() => setPickerOpen(true)}
          className="mt-2 flex-row items-center gap-2 self-start rounded-2xl border border-ink/10 bg-white px-4 py-2"
          style={shadowSoft}
        >
          <Text className="font-serif text-[26px] text-ink">{city}</Text>
          <Icon name="chevronDown" size={16} color="#8E8E93" strokeWidth={2.4} />
        </Pressable>
        <Text className="mt-4 text-[15px] text-muted">Select a vibe to start discovering.</Text>

        {/* vibe pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="-mx-5 mt-5"
          contentContainerStyle={{ paddingHorizontal: 20, gap: 9 }}
        >
          {VIBES.map((v) => {
            const on = v.id === vibe;
            return (
              <Pressable
                key={v.id}
                onPress={() => setVibe(v.id)}
                className={`rounded-full border px-[18px] py-2.5 ${on ? 'border-ink bg-ink' : 'border-ink/15 bg-transparent'}`}
              >
                <Text className={`text-[14px] font-semibold ${on ? 'text-white' : 'text-ink'}`}>{v.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* featured hero card — changes per vibe */}
        <View className="mt-8">
          <View className="absolute left-[18px] right-[18px] -top-3 h-8 rounded-[22px] bg-white" style={{ opacity: 0.7, ...shadowSoft }} />
          <View className="absolute left-2 right-2 -top-1.5 h-8 rounded-3xl bg-white" style={{ opacity: 0.85, ...shadowSoft }} />
          <View className="overflow-hidden rounded-[26px] bg-white" style={shadowCard}>
            <View className="h-[178px] justify-end overflow-hidden" style={{ backgroundColor: f.tone }}>
              <SpotImage uri={f.photo} />
              <View className="absolute left-3.5 top-3.5 rounded-full bg-white/85 px-3 py-1">
                <Text className="text-[11.5px] font-semibold text-[#5b6b5b]">{f.label}</Text>
              </View>
              <Text className="font-mono p-3.5 text-[11px] text-white/80">{f.caption}</Text>
            </View>
            <View className="p-5">
              <Text className="font-serif text-[25px] text-ink">{f.title}</Text>
              <Text className="mt-2.5 text-[14.5px] leading-6 text-muted">{f.desc}</Text>
              <Pressable onPress={start} className="mt-5 flex-row items-center gap-2 self-start rounded-2xl bg-ink px-[22px] py-3.5">
                <Text className="text-[15px] font-semibold text-white">Start Swiping</Text>
                <Icon name="arrowRight" size={17} color="#fff" strokeWidth={2.2} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* continue an existing collection for this city + vibe */}
        {savedHere > 0 && (
          <Pressable
            onPress={() => router.push('/hitlist')}
            className="mt-4 flex-row items-center justify-between rounded-2xl border border-ink/10 bg-white px-4 py-3.5"
            style={shadowSoft}
          >
            <View className="flex-1">
              <Text className="text-[14.5px] font-semibold text-ink">
                Continue your {city} · {f.label} list
              </Text>
              <Text className="mt-0.5 text-[12.5px] text-muted">
                {savedHere} spot{savedHere > 1 ? 's' : ''} saved · tap to review
              </Text>
            </View>
            <Icon name="arrowRight" size={18} color="#8E8E93" strokeWidth={2} />
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
