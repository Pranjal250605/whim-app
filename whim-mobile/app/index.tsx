import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useWhimStore } from '@/store/useWhimStore';
import { CITIES } from '@/data/cities';
import CityPicker from '@/components/CityPicker';
import GlassNav from '@/components/GlassNav';
import type { VibeId } from '@/lib/types';

// Phase 1 — Context & Vibe. Faithful port of the design's Home screen.
const VIBES: { id: VibeId; label: string }[] = [
  { id: 'classics', label: 'The Classics' },
  { id: 'matcha', label: 'Matcha' },
  { id: 'nature', label: 'Nature' },
  { id: 'nightlife', label: 'After Dark' },
];

const shadowSoft = { shadowColor: '#1C1C1C', shadowOpacity: 0.06, shadowRadius: 18, shadowOffset: { width: 0, height: 6 } };
const shadowCard = { shadowColor: '#1C1C1C', shadowOpacity: 0.14, shadowRadius: 30, shadowOffset: { width: 0, height: 18 } };

export default function Home() {
  const city = useWhimStore((s) => s.city);
  const setContext = useWhimStore((s) => s.setContext);
  const setCity = useWhimStore((s) => s.setCity);
  const hydrate = useWhimStore((s) => s.hydrate);
  const hydrated = useWhimStore((s) => s.hydrated);
  const [vibe, setVibe] = useState<VibeId>('classics');
  const [pickerOpen, setPickerOpen] = useState(false);

  const flag = CITIES.find((c) => c.name === city)?.flag ?? '';
  const vibeLabel = VIBES.find((v) => v.id === vibe)?.label ?? '';

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
        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityLabel="Account"
          className="h-9 w-9 items-center justify-center rounded-full bg-[#DCE3D8]"
        >
          <Text className="text-[13px] font-semibold text-[#5b6b5b]">JL</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
        <Text className="mt-5 font-serif text-[33px] text-ink">I’m going to</Text>
        <Pressable
          onPress={() => setPickerOpen(true)}
          className="mt-2 flex-row items-center gap-2 self-start rounded-2xl border border-ink/10 bg-white px-4 py-2"
          style={shadowSoft}
        >
          <Text className="font-serif text-[26px] text-ink">{flag}  {city}</Text>
          <Text className="text-[16px] text-muted">⌄</Text>
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

        {/* featured hero card with stacked-paper effect */}
        <View className="mt-8">
          <View className="absolute left-[18px] right-[18px] -top-3 h-8 rounded-[22px] bg-white" style={{ opacity: 0.7, ...shadowSoft }} />
          <View className="absolute left-2 right-2 -top-1.5 h-8 rounded-3xl bg-white" style={{ opacity: 0.85, ...shadowSoft }} />
          <View className="overflow-hidden rounded-[26px] bg-white" style={shadowCard}>
            <View className="h-[178px] justify-end" style={{ backgroundColor: '#DCE3D8' }}>
              <View className="absolute left-3.5 top-3.5 rounded-full bg-white/85 px-3 py-1">
                <Text className="text-[11.5px] font-semibold text-[#5b6b5b]">{vibeLabel}</Text>
              </View>
              <Text className="font-mono p-3.5 text-[11px] text-ink/40">photo · quiet café interior</Text>
            </View>
            <View className="p-5">
              <Text className="font-serif text-[25px] text-ink">Matcha &amp; Minimalism</Text>
              <Text className="mt-2.5 text-[14.5px] leading-6 text-muted">
                A hand-picked loop of slow mornings, design shops and the city’s most photogenic cafés.
              </Text>
              <Pressable onPress={start} className="mt-5 flex-row items-center gap-2 self-start rounded-2xl bg-ink px-[22px] py-3.5">
                <Text className="text-[15px] font-semibold text-white">Start Swiping</Text>
                <Text className="text-[15px] text-white">→</Text>
              </Pressable>
            </View>
          </View>
        </View>
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
