import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { COLORS } from '@/lib/theme';

const MARK = require('../assets/splash-icon.png');
const MARK_ASPECT = 678 / 518; // splash-icon.png dimensions

/**
 * Hinge-style opening moment. The native splash shows the static W postmark;
 * this overlay renders the identical frame on top, hides the native splash,
 * then STAMPS the mark (press in + springy settle, a stamp hitting paper)
 * before fading out to reveal the app. Pure JS — no extra native deps.
 */
export default function AnimatedSplash({ onDone }: { onDone: () => void }) {
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  const fade = useSharedValue(1);

  useEffect(() => {
    // overlay is on screen and identical to the native splash — swap seamlessly
    SplashScreen.hideAsync().catch(() => {});
    scale.value = withSequence(
      withTiming(1.18, { duration: 240, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 9, stiffness: 210 }),
    );
    rotate.value = withSequence(
      withTiming(-4, { duration: 240, easing: Easing.out(Easing.quad) }),
      withSpring(0, { damping: 8, stiffness: 180 }),
    );
    fade.value = withDelay(
      950,
      withTiming(0, { duration: 300, easing: Easing.in(Easing.quad) }, (finished) => {
        if (finished) runOnJS(onDone)();
      }),
    );
  }, [scale, rotate, fade, onDone]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const markStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center', zIndex: 100 }, overlayStyle]}
    >
      <Animated.Image
        source={MARK}
        style={[{ width: 220, height: 220 / MARK_ASPECT }, markStyle]}
        resizeMode="contain"
      />
    </Animated.View>
  );
}
