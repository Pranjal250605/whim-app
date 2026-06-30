import type { Spot, VibeId } from '@/lib/types';

// Mock deck ported from the Travelo design prototype. In production this is
// replaced by a Supabase query (see useWhimStore.setContext). Keeping it as a
// pure function means the swap is a one-line change.
const TOKYO_CLASSICS: Spot[] = [
  {
    id: 'senso',
    title: 'Sensō-ji Temple',
    kind: 'Temple',
    area: 'Asakusa',
    hours: 'Open 6:00 AM',
    tone: '#E7DCCB',
    photo: 'lantern gate at dawn',
    tags: ['Iconic', 'Sunrise'],
    desc: 'Tokyo’s oldest temple, framed by the giant Kaminarimon lantern and a lane of century-old snack stalls.',
    lat: 35.7148,
    lng: 139.7967,
    nearby: [
      { id: 'nakamise', title: 'Nakamise snack crawl', kind: 'Street food', mins: 3, tone: '#E9D7CE', photo: 'melon-pan stall' },
      { id: 'kappa', title: 'Kappabashi knife street', kind: 'Shopping', mins: 9, tone: '#DDE2D6', photo: 'handmade knives' },
      { id: 'sumida', title: 'Sumida riverwalk', kind: 'Stroll', mins: 6, tone: '#D7DEE4', photo: 'river & skytree' },
    ],
  },
  {
    id: 'meiji',
    title: 'Meiji Jingū',
    kind: 'Shrine',
    area: 'Harajuku',
    hours: 'Open at sunrise',
    tone: '#DCE3D8',
    photo: 'forest torii path',
    tags: ['Forest', 'Serene'],
    desc: 'A vast evergreen forest in the heart of the city, leading to one of Japan’s grandest Shinto shrines.',
    lat: 35.6764,
    lng: 139.6993,
    nearby: [
      { id: 'takeshita', title: 'Takeshita Street', kind: 'Shopping', mins: 7, tone: '#E9D7CE', photo: 'crepe stand' },
      { id: 'yoyogi', title: 'Yoyogi Park picnic', kind: 'Nature', mins: 5, tone: '#DDE2D6', photo: 'open lawn' },
      { id: 'omote', title: 'Omotesandō cafés', kind: 'Coffee', mins: 10, tone: '#E7DCCB', photo: 'pour-over bar' },
    ],
  },
  {
    id: 'shibuya',
    title: 'Shibuya Sky',
    kind: 'Observation',
    area: 'Shibuya',
    hours: 'Opens 10:00 AM',
    tone: '#D7DEE4',
    photo: 'rooftop at dusk',
    tags: ['Skyline', 'Sunset'],
    desc: 'An open-air rooftop 230m up. The whole city, and on clear evenings Mt. Fuji, glowing at golden hour.',
    lat: 35.6580,
    lng: 139.7016,
    nearby: [
      { id: 'cross', title: 'Shibuya Crossing', kind: 'Landmark', mins: 2, tone: '#E9D7CE', photo: 'scramble crossing' },
      { id: 'hachiko', title: 'Hachikō statue', kind: 'Photo stop', mins: 3, tone: '#E7DCCB', photo: 'bronze dog' },
      { id: 'vintage', title: 'Shibuya vintage shops', kind: 'Shopping', mins: 6, tone: '#DDE2D6', photo: 'denim racks' },
    ],
  },
];

/** Returns the curated deck for a (city, vibe). Mock today, API tomorrow. */
export function getDeck(_city: string, _vibe: VibeId | null): Spot[] {
  // TODO(backend): query Supabase: select * from spots where city = $1 and $2 = any(vibes)
  return TOKYO_CLASSICS;
}
