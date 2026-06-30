import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useWhimStore } from '@/store/useWhimStore';
import { CITIES } from '@/data/cities';
import CityPicker from '@/components/CityPicker';
import type { Vibe, VibeId } from '@/lib/types';

// Phase 1 — Context & Vibe selection. Picks city + vibe, seeds the deck, and
// routes to the swipe screen.
const VIBES: Vibe[] = [
  { id: 'classics', label: 'First-Timer Classics' },
  { id: 'matcha', label: 'Matcha & Minimalism' },
  { id: 'nature', label: 'Nature & Calm' },
  { id: 'nightlife', label: 'Cyberpunk Nights' },
];

export default function Home() {
  const city = useWhimStore((s) => s.city);
  const setContext = useWhimStore((s) => s.setContext);
  const setCity = useWhimStore((s) => s.setCity);
  const hydrate = useWhimStore((s) => s.hydrate);
  const hydrated = useWhimStore((s) => s.hydrated);
  const [vibe, setVibe] = useState<VibeId>('classics');
  const [pickerOpen, setPickerOpen] = useState(false);

  const flag = CITIES.find((c) => c.name === city)?.flag ?? '';

  // load this user's saved spots from Supabase once per session
  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  const start = async () => {
    await setContext(city, vibe);
    router.push('/swipe');
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pt-2">
        <Text className="font-serif text-2xl font-bold text-ink">Whim</Text>
        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityLabel="Settings"
          className="h-9 w-9 items-center justify-center rounded-full bg-[#DCE3D8]"
        >
          <Text className="text-[13px] font-semibold text-[#5b6b5b]">JL</Text>
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 40 }}>
        <Text className="mt-5 font-serif text-[33px] font-semibold leading-tight text-ink">I’m going to</Text>
        <Pressable
          onPress={() => setPickerOpen(true)}
          className="mt-2 flex-row items-center gap-2 self-start rounded-2xl border border-ink/10 bg-white px-4 py-2 shadow-sm shadow-black/5"
        >
          <Text className="font-serif text-[26px] font-semibold text-ink">
            {flag}  {city}
          </Text>
          <Text className="text-[18px] text-muted">⌄</Text>
        </Pressable>
        <Text className="mt-4 text-[15px] text-muted">Select a vibe to start discovering.</Text>

        <View className="mt-6 gap-2.5">
          {VIBES.map((v) => {
            const active = v.id === vibe;
            return (
              <Pressable
                key={v.id}
                onPress={() => setVibe(v.id)}
                className={`rounded-full border px-5 py-3.5 ${active ? 'border-ink bg-ink' : 'border-ink/15 bg-transparent'}`}
              >
                <Text className={`text-[15px] font-semibold ${active ? 'text-white' : 'text-ink'}`}>{v.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={start} className="mt-8 flex-row items-center justify-center gap-2 rounded-2xl bg-ink py-4">
          <Text className="text-base font-semibold text-white">Start Swiping  →</Text>
        </Pressable>
      </ScrollView>

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
