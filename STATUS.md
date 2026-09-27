# Whim — Status Audit (2026-09-27)

Snapshot of what works, what doesn't, and what's in flight, from a full audit
session. Read after `CLAUDE.md` / `HANDOFF.md`. Update or delete sections as
items get resolved — this file is a working log, not a spec.

---

## TL;DR

- Every screen loads, no crashes, no app-log errors.
- **Broken / degraded:** transit directions (Google Routes) — every leg shows
  "est." fallback. Cause not yet confirmed (see §3.1).
- **Fixed this session (uncommitted):** "Open in Maps" on the day plan.
- **Hardened this session (uncommitted, NOT deployed):** `nearby-places` now
  logs Google errors and returns 502 instead of silently empty results.
- Near Me "showed nothing" earlier was **not a bug** — simulator location was
  unset/odd. Works fine with a real location (verified in Delhi).

---

## 1. Uncommitted changes in the working tree

| File | Change | State |
|---|---|---|
| `whim-mobile/lib/route.ts` | `googleMapsDirectionsUrl`: only add `travelmode=transit` for a single A→B leg; multi-stop routes omit travelmode | Done, typechecks. Needs commit |
| `whim-mobile/app/(tabs)/itinerary.tsx` | Open in Maps `.catch` now toasts "Couldn't open Maps." (was silent) | Done |
| `whim-mobile/app/room/[id]/plan.tsx` | Same toast + added `toast` import | Done |
| `whim-mobile/supabase/functions/nearby-places/index.ts` | `searchVibe` / `searchNearbyAll` return `null` on Google failure + `console.error` status/body; handler returns 502 `Places lookup failed` if **all** Google calls fail | Written, **not deployed**, not Deno-typechecked (no deno installed). Optional — Google was healthy, so this is hardening, not a fix |
| `whim-mobile/lib/route.ts` (2) | `orderSmart`: tries every first-block stop as the day's start, nearest-neighbour + 2-opt per time block, keeps the shortest — the old walk stays a candidate, so never longer. 5,000 random Tokyo plans: −15% avg km; Tokyo example 86→69 km; ≤0.1 ms/plan | Done, tsc clean. Needs simulator check + commit |
| `whim-mobile/lib/transit.ts` | `getTransit` skips the Edge Function when both stops are in Japan (Google Routes has no Japan transit; empty answers aren't cached, so each view re-billed Google) → straight to the "est." fallback | Done. **Ship only once §3.1 is confirmed** (dashboard shows 200s, not 502s) |
| `AGENTS.md` | Untracked (pre-existing) | Left alone |

Deploy command (user runs it, token must not go into a command string):
`cd whim-mobile && supabase functions deploy nearby-places --project-ref gvqldgkdtitueyijptmt`

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

### 3.1 Transit directions not returning (Google Routes) — UNRESOLVED
Symptom: Route screen legs show `~16 min · est.` → `transit-route` returned no
segments, app fell back to `estimateTransitMins`.
Two hypotheses:
1. **Google Routes API has no transit coverage for Japan** (believed, not
   verified). Would explain HANDOFF §5's "sometimes empty for Tokyo". If so:
   coverage gap, not a bug; fix = different transit provider for Japan, or
   label as estimate by design.
2. **`GOOGLE_MAPS_API_KEY` broken** (restricted/billing/quota).

**Next step:** Google Cloud console → Google Maps Platform → Metrics → switch
dropdown to **Routes API**. 2xx only → hypothesis 1. 4xx → key problem.
Also useful: test a day plan in a non-Japan city (e.g. Paris/London) — if
transit appears there, hypothesis 1 is confirmed.

Note `transit-route` returns HTTP 200 with `segments: []` when Google finds no
route, but **502 when Google itself errors** (bad key/billing/quota). So the
Supabase dashboard (Edge Functions → transit-route → Invocations) also decides
it: mostly 200s → hypothesis 1; 502s → hypothesis 2. External reports (Google dev
forum, other projects) say Google has no Japan transit via its APIs. Client-side
Japan skip written (§1). Also: no `departureTime` is sent, so late-night plans
anywhere may get no transit.

### 3.2 Smart-route stop order zig-zags (design, not a bug)
`orderSmart()` in `lib/route.ts` buckets stops by time-of-day (regex over the
freeform `hours` text), then nearest-neighbour **starting from the first saved
spot**. Observed Tokyo plan: centre → east → far west (Showa Park, Tachikawa)
→ back. Best start + 2-opt now implemented (§1). **Bigger remaining cause:**
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
