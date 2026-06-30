import { Pressable, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

// Floating frosted tab bar from the design's Home. Real blur needs a native
// module (expo-blur); we approximate the "liquid glass" look with a translucent
// white fill + soft shadow, which needs no rebuild.
const ITEMS: { key: string; label: string; glyph: string; route: Href }[] = [
  { key: 'discover', label: 'Discover', glyph: '🧭', route: '/' },
  { key: 'hitlist', label: 'Hitlist', glyph: '❤️', route: '/hitlist' },
  { key: 'route', label: 'Route', glyph: '🗺️', route: '/itinerary' },
  { key: 'profile', label: 'Profile', glyph: '👤', route: '/settings' },
];

export default function GlassNav({ active }: { active: string }) {
  const router = useRouter();
  return (
    <View pointerEvents="box-none" className="absolute bottom-7 left-0 right-0 items-center">
      <View
        className="flex-row gap-1 rounded-full p-1.5"
        style={{
          backgroundColor: 'rgba(255,255,255,0.82)',
          shadowColor: '#1C1C1C',
          shadowOpacity: 0.13,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 8 },
        }}
      >
        {ITEMS.map((it) => {
          const on = it.key === active;
          return (
            <Pressable
              key={it.key}
              onPress={() => router.navigate(it.route)}
              className="w-16 items-center gap-0.5 py-2"
            >
              <Text style={{ fontSize: 19, opacity: on ? 1 : 0.45 }}>{it.glyph}</Text>
              <Text className="text-[10px] font-semibold" style={{ color: on ? '#D97757' : '#B6B1A9' }}>
                {it.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
