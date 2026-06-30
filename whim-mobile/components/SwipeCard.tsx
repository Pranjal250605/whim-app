import { Dimensions, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { Spot, SwipeDirection } from '@/lib/types';
import SpotImage from './SpotImage';

const { width: SCREEN_W } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_W * 0.28;
const FLING_X = SCREEN_W * 1.6;

interface SwipeCardProps {
  spot: Spot;
  /** Stacking depth: 0 = top/interactive, 1+ = peeking underneath. */
  depth: number;
  isTop: boolean;
  onSwipe: (direction: SwipeDirection) => void;
}

/**
 * A single deck card. Only the top card receives the pan gesture; the cards
 * underneath are static, scaled-down peeks. Matches the prototype: white base
 * below the image, ADD/PASS stamps that fade in as you drag.
 */
export default function SwipeCard({ spot, depth, isTop, onSwipe }: SwipeCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const fly = (direction: SwipeDirection) => {
    'worklet';
    const toX = direction === 'right' ? FLING_X : -FLING_X;
    translateX.value = withTiming(toX, { duration: 280 }, () => {
      runOnJS(onSwipe)(direction);
    });
  };

  const pan = Gesture.Pan()
    .enabled(isTop)
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.25;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
        fly(e.translationX > 0 ? 'right' : 'left');
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(translateX.value, [-SCREEN_W, SCREEN_W], [-12, 12], Extrapolation.CLAMP);
    const peekScale = 1 - depth * 0.05;
    const peekY = depth * 14;
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value + peekY },
        { rotateZ: `${rotate}deg` },
        { scale: peekScale },
      ],
      zIndex: 10 - depth,
    };
  });

  const addStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));
  const passStampStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], Extrapolation.CLAMP),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View className="absolute inset-0" style={cardStyle}>
        <View className="flex-1 overflow-hidden rounded-card bg-white shadow-xl shadow-black/15">
          {/* image area — real photo when available, tone as the placeholder */}
          <View className="relative h-[54%] overflow-hidden" style={{ backgroundColor: spot.tone }}>
            <SpotImage uri={spot.photo} />
            <View className="absolute left-3.5 top-3.5 flex-row gap-2">
              {spot.tags.map((tag) => (
                <View key={tag} className="rounded-full bg-white/85 px-2.5 py-1">
                  <Text className="text-[11px] font-semibold text-ink">{tag}</Text>
                </View>
              ))}
            </View>

            {/* drag stamps */}
            <Animated.View
              className="absolute left-4 top-5 rounded-lg border-[3px] border-accent px-3 py-1"
              style={addStampStyle}
            >
              <Text className="text-lg font-extrabold tracking-widest text-accent">ADD</Text>
            </Animated.View>
            <Animated.View
              className="absolute right-4 top-5 rounded-lg border-[3px] border-muted px-3 py-1"
              style={passStampStyle}
            >
              <Text className="text-lg font-extrabold tracking-widest text-muted">PASS</Text>
            </Animated.View>
          </View>

          {/* crisp white text base — no dark overlay, per the brief */}
          <View className="flex-1 px-5 py-4">
            <Text className="font-serif text-2xl font-semibold text-ink">{spot.title}</Text>
            <Text className="mt-1 text-[13px] font-medium text-muted">
              {spot.kind} · {spot.area}
            </Text>
            <Text className="mt-3 text-sm leading-6 text-neutral-700">{spot.desc}</Text>
            <View className="mt-auto pt-3">
              <View className="flex-row items-center gap-1.5 self-start rounded-full bg-[#F4F1EB] px-3 py-1.5">
                <Text className="text-[12.5px] font-medium text-neutral-600">🕘 {spot.hours}</Text>
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}
