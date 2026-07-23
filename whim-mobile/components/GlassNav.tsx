import { Pressable, Text, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Icon, { type IconName } from './Icon';
import { COLORS, SHADOWS } from '@/lib/theme';

// Floating frosted tab bar. Used as the Tabs navigator's `tabBar`, so the tab
// screens persist across switches (no remount). Rendered in a fixed order.
const ITEMS: { name: string; label: string; icon: IconName }[] = [
  { name: 'index', label: 'Discover', icon: 'discover' },
  { name: 'hitlist', label: 'Hitlist', icon: 'heart' },
  { name: 'itinerary', label: 'Route', icon: 'route' },
  { name: 'community', label: 'Community', icon: 'community' },
  { name: 'passport', label: 'Profile', icon: 'person' },
];

export default function GlassNav({ state, navigation }: BottomTabBarProps) {
  return (
    <View pointerEvents="box-none" className="absolute bottom-7 left-0 right-0 items-center">
      <View className="flex-row gap-0.5 rounded-full p-1.5" style={{ backgroundColor: 'rgba(255,255,255,0.96)', ...SHADOWS.nav }}>
        {ITEMS.map((item) => {
          const routeIndex = state.routes.findIndex((r) => r.name === item.name);
          const route = state.routes[routeIndex];
          if (!route) return null;
          const on = state.index === routeIndex;
          const color = on ? COLORS.accent : COLORS.inactive;
          return (
            <Pressable
              key={item.name}
              accessibilityRole="button"
              accessibilityState={on ? { selected: true } : {}}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!on && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              className="w-[58px] items-center gap-1 py-2"
            >
              <Icon name={item.icon} size={23} color={color} strokeWidth={1.8} />
              <Text className="text-[10px] font-semibold" style={{ color }}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
