# Whim — Product Overview

**Whim is a travel-discovery app: "Tinder for places to go."**

You swipe through hand-picked spots in a city, save the ones you love, and Whim turns them into a route you can actually walk. Plan solo, or swipe together with friends and let your mutual likes become the plan.

- **Platform:** iOS (currently on TestFlight)
- **Version:** 1.0.0 (Build 11)
- **One line:** Swipe. Save. Go.

---

## How it works — the core loop

1. **Discover** — Pick a city and a vibe. Whim deals a curated deck of spots for that mood.
2. **Swipe** — Swipe right to save, left to pass. Undo a mistake; super-save a sure thing.
3. **Save** — Spots you love land on your Hitlist, with optional micro-stops (coffee, viewpoints) attached nearby.
4. **Route** — Whim orders your list by proximity, opening hours, and transit into a smart, walkable day.
5. **Share** — Publish the trip to the community, or export a card to your stories.

---

## Full feature set

### Discovery & content
- **Vibes** — every city is curated into four moods: The Classics, Matcha, Nature, and After Dark.
- **Seasonal collections** — 12 editorial decks (e.g. Riviera Summer, Blossom Chase, London at Christmas); in-season ones lead automatically.
- **Near me** — live GPS discovery of real places around you, sorted into vibes.
- **Add your spots** — paste your own favorite places and AI sorts them into the right vibe.

### The swipe deck
- Swipe or tap to save / pass, with haptic feedback.
- **Undo** the last card, and **Super-save** straight to your Hitlist.
- **Micro-Discovery** — attach nearby stops (coffee, shops, viewpoints) to an anchor spot.
- Real Google photos with a stock fallback — never a blank card.

### Planning a trip
- **Hitlist** — your saved spots, scoped per city + vibe; swipe to remove, one tap for **Directions** to any spot in Maps.
- **Smart Route** — proximity ordering, best time of day per stop, and transit legs between stops.
- **Trip reminders** and a whole-route hand-off to Maps.
- **Publish** a trip to the community, or build one from scratch for any city.

### Social & community
- **Plan with friends (Rooms)** — join a room by code, swipe together, and mutual likes become live matches.
- **Community feed** — real trips and spots from other travelers, filterable by Everything / Trips / Spots.
- **Editors' Picks** — curated multi-day itineraries for every city.
- **Moderation** — report / block / leave across all shared content.

### Profile (Passport)
- **Check-ins** verified by GPS proximity (~250 m) — proof you were actually there.
- **City badges** — earn Bronze / Silver / Gold at 1 / 3 / 5 check-ins in a city.
- **Friends** with @handles; follow people to see their trips.
- Share a passport card to your stories.

### On the ground
- **Offline mode** — your Hitlist, Passport, and profile work with no connection.
- **Push notifications** when a friend earns a city badge.
- Opening hours on every card; directions always a tap away.
- Live transit times and estimated legs between stops.

---

## Coverage (as of Build 11)

**48 cities across 24 countries · ~2,160 curated spots · 4 vibes per city**

| Region | Cities |
|--------|--------|
| **Japan** | Tokyo, Kyoto, Osaka, Fukuoka, Hiroshima |
| **USA** | New York, San Francisco |
| **Europe** | 41 cities — London, Paris, Rome, Barcelona, Berlin, Amsterdam, Vienna, Prague, Lisbon, Copenhagen and more |

New cities are curated server-side by the `seed-city` Edge Function (Google Places + an LLM editorial pass); spots are matched to real Google place IDs, so imagery is live and real.

---

## Under the hood

**App**
- Expo (SDK 52), React Native, New Architecture, Hermes
- expo-router (tab navigation, screens persist across switches)
- NativeWind, Reanimated, Gesture Handler
- Zustand for state (persisted for offline), TanStack Query for caching
- Self-hosted analytics + crash logging, with an in-app admin dashboard

**Backend & data**
- Supabase — Postgres with row-level security (default-deny), Edge Functions, Storage, Realtime, Auth
- Google Places (search / nearby / details / photos) and Google Routes (transit)
- Anthropic (Claude Haiku) — sorts user-added spots into vibes
- Mapbox maps, Pexels stock-photo fallback
- Photo and nearby caching, plus daily circuit-breakers on paid APIs

---

## Design, accounts & trust

**Design — "Field Notes" system**
Editorial-meets-playful, built on travel-document textures: a serif for headlines, monospace for coordinate-style labels, and one confident cobalt accent (#2740E0) on warm canvas (#F0EEE8). Display type is Bricolage Grotesque; labels are IBM Plex Mono.

**Accounts & safety**
- Sign in with Apple or email; keychain-backed sessions
- In-app forgot-password flow
- Report / block / leave moderation across rooms and community
- In-app account deletion; Terms of Service and Privacy Policy
- Location used only for "Near me" and verified check-ins, with permission

---

*Whim ✦ swipe. save. go. — v1.0.0, Build 11 (TestFlight)*
