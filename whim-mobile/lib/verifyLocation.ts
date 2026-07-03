import * as Location from 'expo-location';
import type { Spot } from './types';
import { distanceKm } from './route';

const STAMP_RADIUS_KM = 0.25; // within ~250 m of the spot counts as "there"

export type ProximityResult = 'near' | 'far' | 'unknown';

/**
 * Is the device physically at this spot? Backs verified check-ins — Passport
 * numbers are only worth flexing if they can't be stamped from the sofa.
 * 'unknown' = no permission / no fix / spot has no coords; callers decide
 * how forgiving to be.
 */
export async function isNearSpot(spot: Spot): Promise<ProximityResult> {
  if (spot.lat == null || spot.lng == null) return 'unknown';
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return 'unknown';
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const km = distanceKm(
      { lat: pos.coords.latitude, lng: pos.coords.longitude },
      { lat: spot.lat, lng: spot.lng },
    );
    return km <= STAMP_RADIUS_KM ? 'near' : 'far';
  } catch {
    return 'unknown';
  }
}
