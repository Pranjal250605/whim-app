import * as Notifications from 'expo-notifications';

// Local (on-device) notifications — no Apple push account needed, works on the
// simulator. Foreground notifications show a banner.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotifyPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.status === 'granted';
}

/**
 * Schedule a reminder for tomorrow at 9am nudging the user toward their planned
 * day. Returns the fire time, or null if permission was denied.
 */
export async function scheduleTripReminder(
  city: string,
  vibeLabel: string,
  stopCount: number,
): Promise<Date | null> {
  const ok = await ensureNotifyPermission();
  if (!ok) return null;

  const when = new Date();
  when.setDate(when.getDate() + 1);
  when.setHours(9, 0, 0, 0);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Your ${city} day is ready ✦`,
      body: `${stopCount} stop${stopCount === 1 ? '' : 's'} on your ${vibeLabel} route — tap to open your plan and go.`,
      data: { route: '/itinerary' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
  });

  return when;
}
