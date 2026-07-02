# Whim

A travel-discovery iOS app: swipe through curated spots for a city + "vibe", save
the ones you like into a **Hitlist**, and get an auto-sequenced day plan you can
route on a map and share. Think "Tinder for places to go." Target: the App Store.

> **Repo layout:** this git repo (`whim-app`) is a small monorepo. The Expo app
> lives in **`whim-mobile/`** — that's where you run every command. `.agents/`
> holds installed design skills (see [Design](#design)). `docs/` is the GitHub
> Pages site (Supabase auth emails redirect there — it's the `site_url`).

---

## Running the app

All commands run from `whim-mobile/`:

```bash
cd whim-mobile
npm run start      # expo start (Metro dev server on :8081)
npm run ios        # expo run:ios — native dev build on the simulator
npm run lint       # expo lint
```

This app uses **native modules** (Mapbox, notifications, Apple auth), so it needs
a **dev build** — it does **not** run in plain Expo Go. Use `npm run ios` (or an
already-installed dev build + `npm run start`). The simulator target in use is an
iPhone 17 Pro; the launched app bundle id is `com.whim.app`.

Env vars (never commit these — see [Security](#security)):
- `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` — client, safe to ship
- `MAPBOX_DOWNLOAD_TOKEN` — build-time only (native SDK download), injected via `app.config.js`

---

## Tech stack

- **Expo SDK 52** + **expo-router v4** (file-based routing, new architecture on)
- **React Native 0.76**, React 18
- **NativeWind v4** (Tailwind for RN) — styling via `className`
- **Zustand** — single app store (`store/useWhimStore.ts`)
- **Supabase** — Postgres + Auth + Edge Functions, all tables behind **RLS**
- **Mapbox** (`@rnmapbox/maps`) — the day-plan map
- **Reanimated + Gesture Handler** — the swipe deck
- Native: `expo-location`, `expo-notifications` (local), `expo-apple-authentication`,
  `expo-secure-store`, `expo-haptics`, `expo-sharing` + `react-native-view-shot`

---

## Architecture

### Routing (`app/`)
File-based via expo-router. `app/_layout.tsx` is the root: it loads fonts, wires
providers (SafeArea, BottomSheet, GestureHandler, `AuthProvider`), and acts as the
**auth gate** — redirects to `sign-in` when logged out, and deep-links notification
taps to their target route. Screens: `index` (home), `swipe`, `hitlist`,
`itinerary`, `passport`, `notifications`, `settings`, `sign-in`.

### State (`store/useWhimStore.ts`)
One Zustand store is the source of truth for the whole user loop. It updates
**optimistically** for a snappy UI, then persists to Supabase in the background;
if a write fails it warns and the next `hydrate()` reconciles. Key concepts:
- **Context** = `city` + `vibe`. Switching either deals a different deck and shows
  a different Hitlist — collections never bleed across contexts.
- **Deck memory**: spots already saved or passed this session are filtered out.
- Selectors (`selectActiveSpot`, `selectDeckDone`, `scopedBucket`) live in the store file.

### Data layer (`lib/`)
- `supabase.ts` — the client (anon key only). Sessions persist in the iOS Keychain
  (chunked expo-secure-store adapter), falling back to AsyncStorage on unsigned dev
  builds that lack the keychain entitlement.
- `db.ts` — thin typed data-access over Supabase. **Never passes `user_id`** —
  RLS scopes every read/write to the logged-in user automatically.
- `auth.tsx` — `AuthProvider` / `useAuth`; wipes in-memory state when the user
  identity changes so one account never sees another's data.
- `route.ts` — `orderSmart()`: buckets saved spots into morning/daytime/evening by
  opening hours, then nearest-neighbour walks each block. Pure, framework-agnostic.
- `types.ts` — domain model (`Spot`, `MicroActivity`, `BucketAnchor`, `VibeId`).
- `geocode.ts`, `mapbox.ts`, `transit.ts`, `notify.ts`, `haptics.ts` — helpers.

### Backend (`supabase/`)
- `migrations/` — schema, applied in order. Every table has **RLS enabled** with
  explicit policies (default-deny). `spots` is public-read, client-write-never.
  `saved_spots`, `checkins` are own-rows-only. A signup trigger auto-creates a
  `profiles` row.
- `functions/` — Edge Functions (`search-place`, `transit-route`, `delete-account`)
  run server-side with the service key for things the client must not do directly.

### The user loop (the "phases" referenced in code)
1. Pick city + vibe → fetch curated deck (`fetchDeck`).
2. Swipe the deck; right-swipe → `pendingMatch`.
3. Save anchor (± nearby micro-activities) → `saved_spots` (the Hitlist).
4. Rehydrate the nested Hitlist; sequence it into a day plan; map + share it.
Check-ins (the "Passport") record spots actually visited.

---

## Design

**System — "Field Notes" (v2):** editorial travel-journal look.
- Type: **Bricolage Grotesque** (display/headings) + **IBM Plex Mono** (labels/coords).
- Color: cobalt **`#2740E0`** accent on a warm paper canvas **`#F0EEE8`**, ink `#17150F`.
- This replaced an earlier AI-generic cream/serif/terracotta direction — do **not**
  reintroduce serifs (Fraunces/Playfair are still in deps but are legacy; prefer Bricolage).
- Tailwind tokens live in `tailwind.config.js` (`bg-canvas`, etc.).

**Design skill — `design-taste-frontend`** (installed via `npx skills add Leonxlnx/taste-skill`,
lives in `.agents/skills/`). It's an anti-slop frontend skill: reads the brief, infers a
non-templated design direction, audit-first on redesigns, strict pre-flight check.
- **Use it** when building or redesigning any new screen/component, so UI stays on the
  premium "Field Notes" bar and never drifts back to generic AI defaults.
- Feed it the existing system above as the constraint — it should *extend* Field Notes
  (Bricolage + cobalt + paper), not invent a fresh palette.
- The pinned v1 is also installed as `design-taste-frontend-v1` if exact-legacy behavior
  is ever needed; other taste skills in `.agents/skills/` (imagegen, brandkit, etc.) are
  image-only references, not code generators.

---

## Security

- **Only the anon/publishable Supabase key ships in the app.** It's public by design
  and safe *only* because every table has RLS. **Never** put the `service_role`/secret
  key in client code — that belongs in Edge Functions.
- Secrets come from env vars, never hardcoded. `EXPO_PUBLIC_*` vars are inlined at build
  time — fine for the anon key, never for a real secret.
- `.gitignore` already excludes `.env*`, `.claude/`, `.agents/`, `skills-lock.json`,
  and `supabase/.temp/`. Keep it that way.
- New tables **must** enable RLS with explicit policies before shipping.

---

## Planned feature — Group Rooms ("swipe places together")

> **Status: designed, not yet built.** Documented here so implementation stays
> consistent with the architecture above.

**Idea:** friends create a **room**, everyone swipes the same city/vibe deck, and the
room surfaces the spots the group *mutually* wants — a shared Hitlist and day plan the
whole group agreed on. Tinder-style "it's a match", but for a friend group's trip.

**Flow**
1. A host creates a room for a `city` (+ optional `vibe`) → gets a short **invite code**.
2. Friends join by code (must be signed in).
3. Each member swipes the deck; a right-swipe is a **vote** for that spot.
4. A spot becomes a **group match** when it clears a threshold — default **everyone
   currently in the room** liked it (configurable to majority later).
5. Matches stream in live (Supabase **Realtime**) into a shared room Hitlist, which
   feeds the same `orderSmart()` day-plan + map + share flow.

**Proposed schema** (new migration, all RLS-enabled):
- `rooms(id, code unique, host_id, name, city, vibe, status, created_at)`
- `room_members(room_id, user_id, joined_at, unique(room_id,user_id))`
- `room_votes(room_id, user_id, spot_id, liked bool, created_at, unique(room_id,user_id,spot_id))`
- Group matches derived from `room_votes` (a view or RPC): spots where like-count meets
  the threshold for that room's member count.

**RLS shape:** a user may read a room + its members/votes/matches **only if they are a
member** of that room; may write **only their own** vote rows; host manages the room.
Prefer a `security definer` helper (`is_room_member(room_id)`) to avoid recursive policies.

**Client work:** extend `db.ts` with room CRUD + vote writes; add a `room` slice (or a
sibling store) mirroring the optimistic pattern; subscribe to a Realtime channel per room
to update matches; new routes under `app/room/` (create, join-by-code, lobby, group deck,
group hitlist). Reuse `SwipeDeck`, `RouteMap`, and `ShareCard` — build the group layer
with the `design-taste-frontend` skill so it matches Field Notes.

---

## Conventions & gotchas

- Data access goes through `lib/db.ts`; don't scatter raw Supabase calls in components.
- Never pass `user_id` from the client — RLS handles ownership.
- Keep new state optimistic + background-persisted, matching the store pattern.
- Style with NativeWind `className`; pull colors from Tailwind tokens, not hex literals in JSX.
- Native module added? It needs a rebuild (`npm run ios`), not just a Metro reload.
- Local notifications only (no Apple Push account) — works on the simulator.
