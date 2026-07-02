import type { PressableStateCallbackType, StyleProp, ViewStyle } from 'react-native';

// Single source of truth for Field Notes tokens used in JS (icon colors,
// shadows, inline styles). Class-based styling should keep using the Tailwind
// tokens in tailwind.config.js — keep both files in sync.
export const COLORS = {
  canvas: '#F0EEE8',
  ink: '#17150F',
  muted: '#7C766A',
  accent: '#2740E0',
  accentSoft: '#DFE2FB',
  destructive: '#D23B2C',
  inactive: '#AEA89C', // idle tab items, placeholder strokes
  white: '#FFFFFF',
} as const;

export const SHADOWS = {
  soft: { shadowColor: COLORS.ink, shadowOpacity: 0.06, shadowRadius: 18, shadowOffset: { width: 0, height: 6 } },
  card: { shadowColor: COLORS.ink, shadowOpacity: 0.16, shadowRadius: 34, shadowOffset: { width: 0, height: 20 } },
  accent: { shadowColor: COLORS.accent, shadowOpacity: 0.32, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  nav: { shadowColor: COLORS.ink, shadowOpacity: 0.13, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
} as const;

// Springy press feedback (Gen-Z tactility) — spread into Pressable's `style`.
export const press =
  (base?: StyleProp<ViewStyle>) =>
  ({ pressed }: PressableStateCallbackType): StyleProp<ViewStyle> =>
    [base, pressed ? { transform: [{ scale: 0.97 }], opacity: 0.96 } : null];
