import { Pressable, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import Icon, { type IconName } from './Icon';

// Floating frosted tab bar from the design's Home. Real blur needs a native
// module (expo-blur); we approximate the "liquid glass" look with a translucent
// white fill + soft shadow, which needs no rebuild.
const ITEMS: { key: string; label: string; icon: IconName; route: Href }[] = [
  { key: 'discover', label: 'Discover', icon: 'discover', route: '/' },
  { key: 'hitlist', label: 'Hitlist', icon: 'heart', route: '/hitlist' },
  { key: 'route', label: 'Route', icon: 'route', route: '/itinerary' },
  { key: 'profile', label: 'Profile', icon: 'person', route: '/passport' },
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
          const color = on ? '#D97757' : '#B6B1A9';
          return (
            <Pressable key={it.key} onPress={() => router.navigate(it.route)} className="w-16 items-center gap-1 py-2">
              <Icon name={it.icon} size={23} color={color} strokeWidth={1.8} />
              <Text className="text-[10px] font-semibold" style={{ color }}>
                {it.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
