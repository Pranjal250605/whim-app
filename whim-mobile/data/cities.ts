// Cities offered in the picker. Kept in sync with data/curated/*.json — these
// names must match the `city` values seeded into the spots table exactly.
export interface City {
  name: string;
  country: string;
  flag: string;
}

export const CITIES: City[] = [
  { name: 'Tokyo', country: 'Japan', flag: '🇯🇵' },
  { name: 'Kyoto', country: 'Japan', flag: '🇯🇵' },
  { name: 'Osaka', country: 'Japan', flag: '🇯🇵' },
  { name: 'Fukuoka', country: 'Japan', flag: '🇯🇵' },
  { name: 'Hiroshima', country: 'Japan', flag: '🇯🇵' },
  { name: 'Berlin', country: 'Germany', flag: '🇩🇪' },
  { name: 'Munich', country: 'Germany', flag: '🇩🇪' },
  { name: 'Paris', country: 'France', flag: '🇫🇷' },
  { name: 'Nice', country: 'France', flag: '🇫🇷' },
  { name: 'London', country: 'United Kingdom', flag: '🇬🇧' },
  { name: 'Edinburgh', country: 'United Kingdom', flag: '🇬🇧' },
  { name: 'New York', country: 'United States', flag: '🇺🇸' },
  { name: 'San Francisco', country: 'United States', flag: '🇺🇸' },
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
