import * as Haptics from 'expo-haptics';

// Thin, crash-safe wrappers. Guarded so they no-op if the native module isn't
// present yet (and they simply do nothing on the simulator, which has no haptic
// engine — they're felt on real devices).
const safe = (fn: () => unknown) => {
  try {
    fn();
  } catch {
    /* haptics unavailable */
  }
};

export const hapticLight = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
export const hapticMedium = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
export const hapticSelect = () => safe(() => Haptics.selectionAsync());
export const hapticSuccess = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
