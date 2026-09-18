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
  { name: 'Naples', country: 'Italy', flag: '🇮🇹', lat: 40.8518, lng: 14.2681 },
  { name: 'Seville', country: 'Spain', flag: '🇪🇸', lat: 37.3891, lng: -5.9845 },
  { name: 'Valencia', country: 'Spain', flag: '🇪🇸', lat: 39.4699, lng: -0.3763 },
  { name: 'Porto', country: 'Portugal', flag: '🇵🇹', lat: 41.1579, lng: -8.6291 },
  { name: 'Zurich', country: 'Switzerland', flag: '🇨🇭', lat: 47.3769, lng: 8.5417 },
  { name: 'Geneva', country: 'Switzerland', flag: '🇨🇭', lat: 46.2044, lng: 6.1432 },
  { name: 'Brussels', country: 'Belgium', flag: '🇧🇪', lat: 50.8503, lng: 4.3517 },
  { name: 'Athens', country: 'Greece', flag: '🇬🇷', lat: 37.9838, lng: 23.7275 },
  { name: 'Warsaw', country: 'Poland', flag: '🇵🇱', lat: 52.2297, lng: 21.0122 },
  { name: 'Krakow', country: 'Poland', flag: '🇵🇱', lat: 50.0647, lng: 19.945 },
  { name: 'Helsinki', country: 'Finland', flag: '🇫🇮', lat: 60.1699, lng: 24.9384 },
  { name: 'Reykjavik', country: 'Iceland', flag: '🇮🇸', lat: 64.1466, lng: -21.9426 },
  { name: 'Lyon', country: 'France', flag: '🇫🇷', lat: 45.764, lng: 4.8357 },
  { name: 'Marseille', country: 'France', flag: '🇫🇷', lat: 43.2965, lng: 5.3698 },
  { name: 'Manchester', country: 'United Kingdom', flag: '🇬🇧', lat: 53.4808, lng: -2.2426 },
  { name: 'Glasgow', country: 'United Kingdom', flag: '🇬🇧', lat: 55.8642, lng: -4.2518 },
  { name: 'Bruges', country: 'Belgium', flag: '🇧🇪', lat: 51.2093, lng: 3.2247 },
  { name: 'Antwerp', country: 'Belgium', flag: '🇧🇪', lat: 51.2194, lng: 4.4025 },
  { name: 'Split', country: 'Croatia', flag: '🇭🇷', lat: 43.5081, lng: 16.4402 },
  { name: 'Zagreb', country: 'Croatia', flag: '🇭🇷', lat: 45.815, lng: 15.9819 },
  { name: 'Bologna', country: 'Italy', flag: '🇮🇹', lat: 44.4949, lng: 11.3426 },
  { name: 'Turin', country: 'Italy', flag: '🇮🇹', lat: 45.0703, lng: 7.6869 },
  { name: 'Rotterdam', country: 'Netherlands', flag: '🇳🇱', lat: 51.9244, lng: 4.4777 },
  { name: 'Gothenburg', country: 'Sweden', flag: '🇸🇪', lat: 57.7089, lng: 11.9746 },
  { name: 'Bordeaux', country: 'France', flag: '🇫🇷', lat: 44.8378, lng: -0.5792 },
  { name: 'Malaga', country: 'Spain', flag: '🇪🇸', lat: 36.7213, lng: -4.4214 },
  { name: 'Bilbao', country: 'Spain', flag: '🇪🇸', lat: 43.263, lng: -2.935 },
  { name: 'Cologne', country: 'Germany', flag: '🇩🇪', lat: 50.9375, lng: 6.9603 },
  { name: 'Tallinn', country: 'Estonia', flag: '🇪🇪', lat: 59.437, lng: 24.7536 },
  { name: 'Ljubljana', country: 'Slovenia', flag: '🇸🇮', lat: 46.0569, lng: 14.5058 },
  { name: 'Bratislava', country: 'Slovakia', flag: '🇸🇰', lat: 48.1486, lng: 17.1077 },
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
