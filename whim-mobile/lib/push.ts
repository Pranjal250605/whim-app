import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Remote push. registerForPush stores this device's Expo push token; a friend
// earning a badge then notifies their followers via the send-push function.
//
// NOTE: delivery needs Apple push credentials (APNs key) configured with Expo
// and a build with the push capability. Until that's set up this registers
// nothing (getExpoPushTokenAsync throws → caught) — the plumbing is ready and
// silent, not broken.

export async function registerForPush(): Promise<void> {
  try {
    // Register silently only if notifications are already allowed — don't pop a
    // permission prompt on app open (the trip-reminder flow asks in context).
    const { granted } = await Notifications.getPermissionsAsync();
    if (!granted) return;

    const projectId = (Constants.expoConfig as any)?.extra?.eas?.projectId ?? (Constants as any)?.easConfig?.projectId;
    const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
    if (!token) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('push_tokens').upsert({ user_id: user.id, token, platform: Platform.OS }, { onConflict: 'user_id,token' });
  } catch {
    /* push not available yet (no APNs credentials / capability) — safe to ignore */
  }
}

/** Tell the backend to notify our followers that we just earned a city badge.
 *  Server verifies we actually hold the badge, so it can't be spoofed. */
export function notifyBadgeEarned(city: string): void {
  supabase.functions.invoke('send-push', { body: { city } }).catch(() => {});
}
