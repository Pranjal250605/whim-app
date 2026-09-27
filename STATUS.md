# Whim — Status Audit (2026-09-27)

Snapshot of what works, what doesn't, and what's in flight, from a full audit
session. Read after `CLAUDE.md` / `HANDOFF.md`. Update or delete sections as
items get resolved — this file is a working log, not a spec.

---

## TL;DR

- Every screen loads, no crashes, no app-log errors. One benign warning:
  "Unsupported dashed / dotted border style" (leg connector,
  `itinerary.tsx` `border-l-2 border-dashed` — iOS can't dash a single side).
- **Transit "est." in Japan = Google coverage gap, not a bug** (confirmed §3.1).
  Japan legs now skip Google and show the estimate instantly.
- **Committed + pushed 2026-09-27:** Open in Maps fix, smart-route best start +
  2-opt, Japan transit skip, nearby-places hardening (`e88e6be..66760a6`).
- **Still to deploy:** `nearby-places` (needs `supabase login` first).
- Near Me "showed nothing" earlier was **not a bug** — simulator location was
  unset/odd. Works fine with a real location (verified in Delhi).

---

## 1. Pending actions

- **Deploy `nearby-places`** (committed in `ef4d31c`, not live). The CLI is not
  logged in — run `supabase login` once (browser flow), then:
  `cd whim-mobile && supabase functions deploy nearby-places --project-ref gvqldgkdtitueyijptmt`
  Not Deno-typechecked locally (no deno installed) — watch the deploy output.
- **Decide on the opening-hours interpretation** (§3.2).
- `AGENTS.md` — untracked (pre-existing), left alone.

JS changes need only a Metro reload — no native rebuild.

---

## 2. Verified working

### Infrastructure (live checks)
| Service | Result |
|---|---|
| Supabase project | Healthy (dashboard, free tier, nano, Tokyo). NOT paused |
| Supabase Auth | `/auth/v1/health` 200 |
| All 10 Edge Functions deployed | 401 without JWT (correct); `seed-city` 403 without secret (correct) |
| Mapbox public token (app) | Valid; styles load |
| Mapbox download token (build) | Valid |
| Expo push service | Reachable |
| GitHub Pages (privacy/reset/confirm) | 200 |
| Google Places API (New) | Google Cloud metrics: 2xx only over 4 days |
| Anthropic key | Working — Near Me returns LLM blurbs + tips |
| `tsc --noEmit` | 0 errors |
| `npm run lint` | 10 "errors" are all false positives (ESLint can't resolve Deno `jsr:` imports in `supabase/functions`); 12 warnings (§4) |

### Screens (toured via deep links `whim:///<route>` + screenshots)
All render correctly: Discover, Swipe (deck exhausted for Tokyo·Nature — expected),
Hitlist, Route, Community, Profile/Passport, Near Me, Notifications, Settings,
Friends, Your spots, Add spots, Build trip, Rooms hub, Admin analytics
("Admins only" for non-admin — correct).

---

## 3. Open issues

### 3.1 Transit "est." legs (Google Routes) — RESOLVED: Japan coverage gap
Symptom: Route screen legs show `~16 min · est.` → `transit-route` returned no
segments, app fell back to `estimateTransitMins`.

Evidence (2026-09-27):
- `transit_cache` (read-only query): **0 Japan rows ever**, despite heavy Tokyo
  use; 36 non-Japan rows (31 with real transit lines). Empty answers aren't
  cached, so Japan never produced a single route.
- Live call through the app's session (Paris, Louvre → Notre-Dame):
  `source: "google"`, 22 min — **the key works**.
- External reports (Google dev forum, other projects): Google exposes no Japan
  transit via its APIs.

Fix shipped (`7d2dae0`): `getTransit` skips the Edge Function when both stops
are in Japan → instant estimate, no wasted billed calls. A real Japan provider
(NAVITIME/Jorudan, paid) is a post-launch option.

Notes: `transit-route` returns 200 + `segments: []` for "no route" but **502
when Google errors** — the Supabase Invocations view distinguishes the two.
No `departureTime` is sent, so late-night plans anywhere may get no transit.

### 3.2 Smart-route stop order zig-zags (design, not a bug)
`orderSmart()` in `lib/route.ts` buckets stops by time-of-day (regex over the
freeform `hours` text), then nearest-neighbour **starting from the first saved
spot**. Observed Tokyo plan: centre → east → far west (Showa Park, Tachikawa)
→ back. Best start + 2-opt shipped (`c2704dc`). **Bigger remaining cause:**
`timeSlot()` reads "Open morning" (= *opens* in the morning) as morning-only, so
7/16 Tokyo nature spots incl. far-west Showa Park are forced into one morning
block. Removing blocks entirely takes the example 69→49 km. Fixing the hours
interpretation (only sunrise/early = morning) is a product call — pending Pranjal.

### 3.3 Open in Maps — root cause (fixed, see §1)
Google Maps cannot route **transit through waypoints**: a multi-stop
`travelmode=transit` URL opened a blank route and the mobile web also dropped
stops. Reproduced on the simulator; the new URL (no travelmode for multi-stop)
showed all 6 stops. Mobile browsers officially support ≤3 waypoints (Google
docs) but 4 rendered fine in testing. Trade-off: multi-stop now defaults to
driving; a per-leg "Directions" (transit to next stop) would restore transit.

### 3.4 Near Me — earlier "nothing" (resolved, not a bug)
Caused by simulator location. Set one with
`xcrun simctl location booted set <lat>,<lng>` (e.g. Shibuya `35.6595,139.7005`).
Note: before the §1 hardening, ANY Google failure in `nearby-places` looked
identical to "Nothing in this vibe nearby" — deploy the hardening to make
future failures visible.

---

## 4. Code-quality items (lint warnings)
- `app/friends.tsx:85,89`, `app/u/[id].tsx:52` — `no-unused-expressions`; can hide
  a real bug (`cond && fn()` style). Check first.
- `app/admin-analytics.tsx:21` — `AdminAnalytics` redeclared.
- Unused: `View` in `app/room/join.tsx`, `VibeId` in `components/CollectionsShelf.tsx`,
  `dismissMatch` in `components/MicroDiscoveryModal.tsx`.
- Hook deps: `app/_layout.tsx:67,91`, `app/build-trip.tsx:120`, `app/nearby.tsx:128`,
  `app/sign-in.tsx:49`.

---

## 5. Not yet tested (need taps / accounts)
Screens were checked via deep links only; interactions weren't exercised:
swipe-to-save, check-in stamps (GPS), room create/join + realtime matches
(needs 2 accounts), publish trip, Add-your-spots submit, Build-trip place
search, push delivery, delete account (never on the real account).

---

## 6. Other observations
- Supabase dashboard: **"No backups"** on free tier → export `spots`
  (~2,770 rows, costly to regenerate) before launch, or move to Pro (also
  needed for leaked-password protection).
- Dashboard "No migrations" is expected — migrations were applied via SQL
  editor/API; `whim-mobile/supabase/migrations/` is the source of truth.
- Bundle id mismatch to be aware of: simulator dev build is `com.whim.app`,
  `app.json`/release is `com.pranjalrai.whim`.
- Build 12 still pending (15 Batch-4 cities live in DB, not in picker).

## 7. Handy commands from this session
```bash
# open any screen in the simulator app
xcrun simctl openurl booted "whim:///itinerary"     # hitlist, community, passport, nearby, settings, room, ...
# screenshot
xcrun simctl io booted screenshot /tmp/shot.png
# set simulator GPS
xcrun simctl location booted set 35.6595,139.7005
```
