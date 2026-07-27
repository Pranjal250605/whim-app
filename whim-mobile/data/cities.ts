// Cities offered in the picker. Names must match the `city` values seeded into
// the spots table exactly. Coordinates power "Near me".
export interface City {
  name: string;
  country: string;
  flag: string;
  lat: number;
  lng: number;
}

export const CITIES: City[] = [
  { name: 'Tokyo', country: 'Japan', flag: '🇯🇵', lat: 35.681, lng: 139.767 },
  { name: 'Kyoto', country: 'Japan', flag: '🇯🇵', lat: 35.011, lng: 135.768 },
  { name: 'Osaka', country: 'Japan', flag: '🇯🇵', lat: 34.694, lng: 135.502 },
  { name: 'Fukuoka', country: 'Japan', flag: '🇯🇵', lat: 33.59, lng: 130.401 },
  { name: 'Hiroshima', country: 'Japan', flag: '🇯🇵', lat: 34.385, lng: 132.459 },
  { name: 'Berlin', country: 'Germany', flag: '🇩🇪', lat: 52.52, lng: 13.405 },
  { name: 'Munich', country: 'Germany', flag: '🇩🇪', lat: 48.135, lng: 11.582 },
  { name: 'Frankfurt', country: 'Germany', flag: '🇩🇪', lat: 50.1109, lng: 8.6821 },
  { name: 'Darmstadt', country: 'Germany', flag: '🇩🇪', lat: 49.8728, lng: 8.6512 },
  { name: 'Hannover', country: 'Germany', flag: '🇩🇪', lat: 52.3759, lng: 9.732 },
  { name: 'Hamburg', country: 'Germany', flag: '🇩🇪', lat: 53.5511, lng: 9.9937 },
  { name: 'Barcelona', country: 'Spain', flag: '🇪🇸', lat: 41.3874, lng: 2.1686 },
  { name: 'Madrid', country: 'Spain', flag: '🇪🇸', lat: 40.4168, lng: -3.7038 },
  { name: 'Oslo', country: 'Norway', flag: '🇳🇴', lat: 59.9139, lng: 10.7522 },
  { name: 'Amsterdam', country: 'Netherlands', flag: '🇳🇱', lat: 52.3676, lng: 4.9041 },
  { name: 'Rome', country: 'Italy', flag: '🇮🇹', lat: 41.9028, lng: 12.4964 },
  { name: 'Lisbon', country: 'Portugal', flag: '🇵🇹', lat: 38.7223, lng: -9.1393 },
  { name: 'Vienna', country: 'Austria', flag: '🇦🇹', lat: 48.2082, lng: 16.3738 },
  { name: 'Prague', country: 'Czechia', flag: '🇨🇿', lat: 50.0755, lng: 14.4378 },
  { name: 'Copenhagen', country: 'Denmark', flag: '🇩🇰', lat: 55.6761, lng: 12.5683 },
  { name: 'Stockholm', country: 'Sweden', flag: '🇸🇪', lat: 59.3293, lng: 18.0686 },
  { name: 'Dublin', country: 'Ireland', flag: '🇮🇪', lat: 53.3498, lng: -6.2603 },
  { name: 'Budapest', country: 'Hungary', flag: '🇭🇺', lat: 47.4979, lng: 19.0402 },
  { name: 'Milan', country: 'Italy', flag: '🇮🇹', lat: 45.4642, lng: 9.19 },
  { name: 'Florence', country: 'Italy', flag: '🇮🇹', lat: 43.7696, lng: 11.2558 },
  { name: 'Venice', country: 'Italy', flag: '🇮🇹', lat: 45.4408, lng: 12.3155 },
  // NOTE: Naples + Seville/Valencia/Porto/Zurich/Geneva/Brussels/Athens/Warsaw/
  // Krakow/Helsinki/Reykjavik/Lyon/Marseille/Manchester/Glasgow are seeded and
  // ready to re-add here once the Anthropic balance is topped up (seed-city).
  { name: 'Paris', country: 'France', flag: '🇫🇷', lat: 48.8566, lng: 2.3522 },
  { name: 'Nice', country: 'France', flag: '🇫🇷', lat: 43.7102, lng: 7.262 },
  { name: 'London', country: 'United Kingdom', flag: '🇬🇧', lat: 51.5072, lng: -0.1276 },
  { name: 'Edinburgh', country: 'United Kingdom', flag: '🇬🇧', lat: 55.9533, lng: -3.1883 },
  { name: 'New York', country: 'United States', flag: '🇺🇸', lat: 40.7484, lng: -73.9857 },
  { name: 'San Francisco', country: 'United States', flag: '🇺🇸', lat: 37.7749, lng: -122.4194 },
];

/** Cities grouped by country, preserving the order above. */
export function citiesByCountry(): { country: string; cities: City[] }[] {
  const order: string[] = [];
  const map = new Map<string, City[]>();
  for (const c of CITIES) {
    if (!map.has(c.country)) {
      map.set(c.country, []);
      order.push(c.country);
    }
    map.get(c.country)!.push(c);
  }
  return order.map((country) => ({ country, cities: map.get(country)! }));
}

/** Nearest city (by great-circle distance) to a lat/lng — for "Near me". */
export function nearestCity(lat: number, lng: number): City {
  const d = (c: City) => {
    const R = 6371;
    const dLat = ((c.lat - lat) * Math.PI) / 180;
    const dLng = ((c.lng - lng) * Math.PI) / 180;
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat * Math.PI) / 180) * Math.cos((c.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  return CITIES.reduce((best, c) => (d(c) < d(best) ? c : best), CITIES[0]);
}
