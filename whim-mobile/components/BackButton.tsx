import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { router } from 'expo-router';
import Icon from './Icon';
import { COLORS, SHADOWS } from '@/lib/theme';

// The one back button. Pushed screens render this; tab roots render GlassNav
// and no back button — see "Navigation model" in CLAUDE.md.
export default function BackButton({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      accessibilityLabel="Back"
      className="h-10 w-10 items-center justify-center rounded-full bg-white"
      style={[SHADOWS.soft, style]}
    >
      <Icon name="chevronLeft" size={20} color={COLORS.ink} strokeWidth={2.2} />
    </Pressable>
  );
}
