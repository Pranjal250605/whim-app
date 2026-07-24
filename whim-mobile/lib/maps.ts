import { Linking, Platform } from 'react-native';
import { toast } from './toast';

// Open turn-by-turn directions to a spot in the device's maps app. Uses precise
// coordinates when we have them, otherwise searches by name + area. Apple Maps on
// iOS (the App Store target), Google Maps URL as the cross-platform fallback.
export function openDirections(spot: { title: string; lat?: number; lng?: number; area?: string }): void {
  const hasCoords = spot.lat != null && spot.lng != null;
  const label = encodeURIComponent(spot.title);
  const query = encodeURIComponent(`${spot.title} ${spot.area ?? ''}`.trim());

  let url: string;
  if (Platform.OS === 'ios') {
    url = hasCoords
      ? `http://maps.apple.com/?daddr=${spot.lat},${spot.lng}&q=${label}`
      : `http://maps.apple.com/?q=${query}`;
  } else {
    url = hasCoords
      ? `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${query}`;
  }
  Linking.openURL(url).catch(() => toast('Couldn’t open Maps.'));
}
