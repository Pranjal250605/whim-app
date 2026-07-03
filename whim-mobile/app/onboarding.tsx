import { useRef, useState } from 'react';
import { Dimensions, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Icon, { type IconName } from '@/components/Icon';
import { COLORS, SHADOWS, press } from '@/lib/theme';
import { setOnboarded } from '@/lib/onboarding';

const { width: W } = Dimensions.get('window');

const SLIDES: { icon: IconName; eyebrow: string; title: string; body: string }[] = [
  {
    icon: 'discover',
    eyebrow: '01 · DISCOVER',
    title: 'Swipe the city.',
    body: 'Pick a city and a vibe. We deal you a deck of curated spots — keep what you love, skip the rest.',
  },
  {
    icon: 'heart',
    eyebrow: '02 · SAVE',
    title: 'Build your Hitlist.',
    body: 'Right-swipes land in your Hitlist, with tiny detours worth a wander nearby.',
  },
  {
    icon: 'route',
    eyebrow: '03 · GO',
    title: 'Get the perfect day.',
    body: 'One tap turns your list into an hours-smart route on a map — go solo, or swipe together with friends.',
  },
];

// First-run intro (shown once, before sign-in). Swipe through, or skip.
export default function Onboarding() {
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const last = page === SLIDES.length - 1;

  const finish = async () => {
    await setOnboarded();
    router.replace('/sign-in');
  };

  const next = () => {
    if (last) void finish();
    else scrollRef.current?.scrollTo({ x: (page + 1) * W, animated: true });
  };

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <View className="flex-row justify-end px-6 pt-2">
        <Pressable onPress={finish} hitSlop={10}>
          <Text className="text-[14px] font-semibold text-muted">Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / W))}
      >
        {SLIDES.map((s) => (
          <View key={s.eyebrow} style={{ width: W }} className="justify-center px-9">
            <View className="h-20 w-20 items-center justify-center rounded-[26px] bg-white" style={SHADOWS.soft}>
              <Icon name={s.icon} size={36} color={COLORS.accent} strokeWidth={1.7} />
            </View>
            <Text className="mt-8 font-mono text-[11px] tracking-[0.2em] text-accent">{s.eyebrow}</Text>
            <Text className="mt-2 font-serif text-[40px] leading-[1.02] text-ink">{s.title}</Text>
            <Text className="mt-3.5 text-[16px] leading-7 text-muted">{s.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View className="items-center gap-6 px-9 pb-6">
        <View className="flex-row gap-2">
          {SLIDES.map((_, i) => (
            <View
              key={i}
              className="h-2 rounded-full"
              style={{ width: i === page ? 22 : 8, backgroundColor: i === page ? COLORS.accent : 'rgba(23,21,15,0.15)' }}
            />
          ))}
        </View>
        <Pressable onPress={next} style={press(SHADOWS.accent)} className="h-14 w-full items-center justify-center rounded-full bg-accent">
          <Text className="text-[16px] font-bold text-white">{last ? 'Get started' : 'Next'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
