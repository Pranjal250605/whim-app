import { Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useToast } from '@/lib/toast';
import { SHADOWS } from '@/lib/theme';

// Renders the active toast as an ink pill floating above the tab bar.
// Mounted once at the root (app/_layout.tsx).
export default function ToastHost() {
  const message = useToast((s) => s.message);
  if (!message) return null;
  return (
    <View pointerEvents="none" className="absolute bottom-28 left-0 right-0 items-center px-8">
      <Animated.View
        entering={FadeInDown.springify().damping(18)}
        exiting={FadeOutDown.duration(180)}
        className="rounded-full bg-ink px-5 py-3"
        style={SHADOWS.nav}
      >
        <Text className="text-center text-[13.5px] font-semibold text-white">{message}</Text>
      </Animated.View>
    </View>
  );
}
