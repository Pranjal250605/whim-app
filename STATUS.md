# Whim — Status Audit (2026-09-27)

Snapshot of what works, what doesn't, and what's in flight, from a full audit
session. Read after `CLAUDE.md` / `HANDOFF.md`. Update or delete sections as
items get resolved — this file is a working log, not a spec.

---

## TL;DR

- Every screen loads, no crashes, no app-log errors or warnings.
- **Transit "est." in Japan = Google coverage gap, not a bug** (confirmed §3.1).
  Japan legs now skip Google and show the estimate instantly.
- **Committed + pushed 2026-09-27:** Open in Maps fix, smart-route best start +
  2-opt, Japan transit skip, nearby-places hardening (`e88e6be..66760a6`).
- **`nearby-places` hardening deployed** 2026-09-27 and verified live (fresh
  Places lookup → 200 with results; no-JWT → 401).
- **Near Me cold load ~42 s → ~12–14 s server-side** (parallel LLM
  enrichment, deployed). One app-side stall lead open (§3.5).
- **Route order fixed:** hours read as constraints + best start + 2-opt
  (Tokyo example 86 → 49 km). Dashed leg connector restored.
- Near Me "showed nothing" earlier was **not a bug** — simulator location was
  unset/odd. Works fine with a real location (verified in Delhi).

---

## 1. Pending actions

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

### 3.5 Near Me cold load — IMPROVED, one lead open
Before: ~42 s cold (one Haiku call writing ~60 rows of JSON).
Now (`2ef4d43`, deployed): parallel enrichment in vibe-grouped chunks of 12,
15 s per-chunk timeout. Server-Timing on a cold Tokyo load: auth ~0.5 s,
cache ~0.4–0.9 s, cap ~0.5 s, places ~1.2 s, reviews ~0.9 s, **llm ~10 s**
→ server total ~12–14 s. Cache hit: ~1.4 s server, ~1–2 s in the app.
Platform cold start is NOT the problem (idle functions boot in ~0.35 s).

Open lead: some first requests stalled 10–35 s *inside the app* before the
request left, while the login token was near/at refresh (all concurrent
invokes finished at the same instant). With a valid token, a post-idle call
took 2.0 s. Re-test around a token refresh (tokens last 1 h) before chasing it.

Next speed step (not built): two-phase load — return Places results at ~3 s,
then fill blurbs/tips when the LLM finishes. Would make first paint ~4x faster.

Measuring tip: the app's debugger (Metro `/json/list` → CDP) replays OLD
console warnings on connect — compare timestamps before trusting counts.

### 3.2 Smart-route stop order — RESOLVED
Best start + 2-opt (`c2704dc`) and hours-as-constraints (`167b578`): only
"best early" spots are Morning (6), opening >= 4 PM / after-dark spots are
Evening (68), the rest (incl. 258 "open(s) morning") Daytime. Tokyo example
86 → 49 km; 5,000 random plans −39%. Leg connector is now a real dashed line
(`DashedRail`, `f90b254`) — the "Unsupported dashed / dotted border" warning
is gone.

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
