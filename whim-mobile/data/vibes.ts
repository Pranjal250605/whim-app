import type { VibeId } from '@/lib/types';

// Everything vibe-related lives here — adding a vibe means editing ONLY this
// file (plus curating spots for it). Screens must not define their own copies.

export const VIBES: { id: VibeId; label: string }[] = [
  { id: 'classics', label: 'The Classics' },
  { id: 'matcha', label: 'Matcha' },
  { id: 'nature', label: 'Nature' },
  { id: 'nightlife', label: 'After Dark' },
];

export const VIBE_LABEL: Record<VibeId, string> = Object.fromEntries(
  VIBES.map((v) => [v.id, v.label]),
) as Record<VibeId, string>;

// candy-pastel category dots (kept small so cobalt stays the hero)
export const VIBE_DOT: Record<VibeId, string> = {
  classics: '#E0A63C',
  matcha: '#5AA469',
  nature: '#3F93B8',
  nightlife: '#6B63D6',
};

// Home featured-card content per vibe.
export const FEATURED: Record<VibeId, { label: string; title: string; desc: string; caption: string; tone: string; photo: string }> = {
  classics: {
    label: 'The Classics',
    title: 'First-Timer Classics',
    desc: 'The icons you can’t miss — temples, towers and timeless landmarks.',
    caption: 'photo · iconic landmark',
    tone: '#E7DCCB',
    photo: 'https://images.pexels.com/photos/19867354/pexels-photo-19867354.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  matcha: {
    label: 'Matcha',
    title: 'Matcha & Minimalism',
    desc: 'A hand-picked loop of slow mornings, design shops and the city’s most photogenic cafés.',
    caption: 'photo · quiet café interior',
    tone: '#DCE3D8',
    photo: 'https://images.pexels.com/photos/33313174/pexels-photo-33313174.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  nature: {
    label: 'Nature',
    title: 'Nature & Calm',
    desc: 'Gardens, parks and quiet waterside walks to slow the whole day down.',
    caption: 'photo · green & quiet',
    tone: '#DDE2D6',
    photo: 'https://images.pexels.com/photos/18210743/pexels-photo-18210743.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
  nightlife: {
    label: 'After Dark',
    title: 'After Dark',
    desc: 'Neon streets, rooftop views and the city’s best late-night bites.',
    caption: 'photo · neon at night',
    tone: '#D7DEE4',
    photo: 'https://images.pexels.com/photos/18867525/pexels-photo-18867525.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  },
};
