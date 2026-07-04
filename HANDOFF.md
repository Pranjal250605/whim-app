# Whim — Engineering Handoff

> For any assistant/session continuing this project. Read CLAUDE.md first
> (architecture, conventions), then this file (hard-won rules, runbooks,
> compliance). ROADMAP.md holds the phased plan. Written 2026-07-04.
> The human is Pranjal — student, junior, wants mentorship-level guidance:
> explain trade-offs, flag pitfalls proactively, give checklists, and REVIEW
> GATES matter to him (nothing ships to prod data without his approval).

---

## 1. Security rules (non-negotiable, each learned the hard way)

**Secrets hygiene — the #1 rule.** Early in this project, Supabase access
tokens and Google API keys leaked in plaintext into `.claude/settings.local.json`
permission entries and shell history. Everything had to be rotated.
- NEVER put a token/key into a command string that permission systems may
  persist. Put it in a session temp file, `$(cat file)` it, delete the file
  in the same turn.
- NEVER commit secrets. `.gitignore` covers `.env*`, `.claude/`, `.agents/` —
  keep it that way. `.env.local` (Mapbox build token) and `.env.seed`
  (service key, Mapbox, Pexels) exist locally only.
- Server secrets live in Supabase Edge Function secrets
  (`supabase secrets set`). Current: `MAPBOX_TOKEN`, `GOOGLE_MAPS_API_KEY`
  (Routes-restricted key), `GOOGLE_PLACES_API_KEY` (Places-restricted key).
- Supabase personal access tokens can't be revoked via API — the user must
  delete them at supabase.com/dashboard/account/tokens. If one is used in a
  session, remind him to revoke it after.
- **Rotation is not done until the old credential is DEAD.** After one
  rotation, the old Google key kept serving for days because it was never
  deleted in the console. Always verify with a live call that the old
  credential fails.

**Database.** Every table RLS-enabled, default-deny, explicit policies with
`with check` on writes. New tables MUST ship policies in the same migration.
Membership checks use `security definer` helper functions with
`set search_path = ''` (prevents recursion + search-path hijack). Gotcha:
`revoke ... from public` also strips `service_role`'s implicit execute — a
security-definer RPC used by Edge Functions needs an explicit
`grant execute ... to service_role`. Client-callable RPCs get
`grant ... to authenticated` and are revoked from `anon`.

**Client.** Only the anon/publishable key ships. Never `service_role` in
client code. Never pass `user_id` from the client — RLS owns identity. Data
access goes through `lib/db.ts`. Sessions persist in the iOS Keychain
(chunked SecureStore adapter in `lib/supabase.ts`; AsyncStorage fallback only
on unsigned dev builds).

**Edge Functions.** Pattern (see `search-place` / `transit-route`): require
JWT → validate input strictly (types, ranges, lengths) → per-user daily cap
via `bump_edge_usage()` RPC **counted on billed cache-misses only** → 429
over cap → service key only inside the function. Any new billed function
follows this template.

**Google/Mapbox billing.** One key per API, API-restricted in the console,
daily quota caps set, billing alerts on. An authenticated attacker burning
credits is the realistic threat — the caps are the defense.

**Google Places photos.** Display-only, fetched live, with author
attribution. Google ToS prohibits storing/caching them (only `place_id` is
storable). NEVER mirror Places photos into Supabase Storage. Stored imagery
comes from Pexels (license OK) or Wikimedia (attribute per image).
"They won't mind, it's publicity" is not a license — Pranjal knows this now;
hold the line if it comes up again.

**Auth config.** Password min 8 (server + client), email confirmation ON,
refresh-token rotation ON. Enable leaked-password protection (HIBP) the day
the project is on Supabase Pro. Auth emails redirect to the GitHub Pages
site (`site_url` = https://pranjal250605.github.io/whim-app/), reset flow →
`/reset.html`.

**Check-in integrity.** Stamps require GPS proximity (~250 m,
`lib/verifyLocation.ts`). `__DEV__` bypasses but writes `verified=false`.
Any public/competitive stat must count `verified` stamps only.

---

## 2. Apple App Store compliance map

| Guideline | Status / rule |
|---|---|
| 4.2 minimum functionality | ✓ native app (Expo dev build; maps, gestures, notifications) |
| 5.1.1(v) account deletion | ✓ in-app (Settings → Danger zone → `delete-account` Edge Function) |
| Privacy policy | ✓ hosted (docs/privacy.html), linked in Settings. Update it if data practices change |
| Purpose strings | ✓ location when-in-use string in app.json — keep honest and specific |
| 4.8 Sign in with Apple | NOT currently required (email/password only). It becomes REQUIRED the moment any third-party login (Google etc.) is added. Code exists behind `APPLE_ENABLED` flag + needs paid account |
| 3.1.1 payments | Any future digital purchase (tips, premium guides, marketplace) MUST use Apple IAP. No external payment links/buttons in-app. Physical-world services are exempt — itinerary content is NOT physical |
| 1.2 UGC (future publishing phase) | Before shipping user-published itineraries/spots: report/flag button, content moderation queue, ability to block users, contact method. Plan exists in ROADMAP Phase 4 — do not ship UGC without the moderation kit |
| 5.1.2 data use | No ads, no tracking, no data sale. If analytics are added, choose privacy-light (no ATT needed) and disclose in privacy labels |
| Privacy nutrition labels (at submission) | Collected: email, display name, user content (saved spots/check-ins/votes), coarse "used but not stored" location. No tracking |
| 2.3 metadata | Screenshots/description must match the real app at review time |
| Local notifications only | until paid account + APNs; don't claim push features before then |

---

## 3. Runbooks

### Dataset pipeline (curated spots)
Files: `whim-mobile/data/curated/*.json` (one per city/country).
Flow: **draft → Pranjal reviews (table in chat) → seed → QA → mirror.**
```bash
cd whim-mobile
node --env-file=.env.seed scripts/seed-spots.mjs     # geocode + upsert
node --env-file=.env.seed scripts/mirror-photos.mjs  # ALWAYS after seed (seed refreshes Pexels hotlinks)
```
- Geocoding is Nominatim-POI-first (1 req/s — a full run takes 20+ min),
  Mapbox fallback, **locality/centroid results rejected** (they stack pins
  and break routing + check-in verification — this bug bit us at ~90 spots).
- Long runs: launch detached (`nohup sh -c '...' > log &` **from
  whim-mobile**, not a subdir) and watch with a Monitor until-loop. Bash
  tool calls die at 10 min.
- Stubborn geocodes: add `"geocodeQuery"` to the spot — plain OSM-friendly
  names ("Kinkaku-ji, Kyoto, Japan"), adjacent landmark, or street. Titles
  with parentheses/ampersands usually fail as-is.
- QA after every seed (scripts inline in git history, or rewrite):
  (a) distance from city center (>30 km = wrong city; allow-list genuine
  day-trip anchors), (b) **coordinate pile-ups** (identical lat/lng on
  multiple anchors = centroid collapse), (c) CDN coverage
  (`photo LIKE '%spot-photos%'`).
- Photos: Pexels → mirrored into public bucket `spot-photos` → `spots.photo`
  points at our CDN. ~310 nearby micros lack coords (logged "review" list) —
  harmless (micros show minutes, not pins); Places API can resolve them
  in-app later.

### App build/run
- JS-only change: Metro reload (`npm run start`, sim app reloads).
- Native change (new module, icon, splash, plugins): `npx expo prebuild
  --platform ios --clean --no-install` (needs `MAPBOX_DOWNLOAD_TOKEN` from
  `.env.local`), `pod install` in ios/, then unsigned build:
  `xcodebuild -workspace ios/Whim.xcworkspace -scheme Whim -configuration
  Debug -destination 'platform=iOS Simulator,id=<UDID>' -derivedDataPath
  ios/build CODE_SIGNING_ALLOWED=NO build`, `simctl install`. Simulator in
  use: iPhone 17 Pro `FFB760DA-1B15-4E82-A81F-720E176CD00D`.
- `ios/`+`android/` are gitignored (CNG) — regenerate, don't edit.

### Supabase changes
- Schema changes = numbered migration file in `whim-mobile/supabase/migrations/`
  (source of truth), applied via the management API `database/query` endpoint
  with a user-provided token (temp-file pattern) or SQL editor.
- Edge Function deploys: `SUPABASE_ACCESS_TOKEN=... supabase functions deploy
  <name> --project-ref gvqldgkdtitueyijptmt`.
- Project ref: `gvqldgkdtitueyijptmt`.

### GitHub Pages (docs/)
Auth/confirm/reset/privacy pages. Deploys on push from `main:/docs`; builds
can queue for minutes — re-kick with
`gh api -X POST repos/Pranjal250605/whim-app/pages/builds`. Keep the pages
self-consistent with the Field Notes tokens.

---

## 4. Working agreements (how Pranjal works)

- **Review gates:** dataset batches, destructive anything, and money
  decisions get his explicit go. Present batch drafts as compact tables.
- **Design:** Field Notes system only (see CLAUDE.md Design). New screens go
  through the `design-taste-frontend` skill with Field Notes as the
  constraint. He is the taste filter — one accent (cobalt), no AI-default
  palettes, honest decks over padded ones.
- Commit at each milestone with detailed messages; push when he says or per
  established flow. He tests on the simulator — restart it for him when asked
  (`simctl shutdown/boot` + launch `com.whim.app`, check Metro on :8081).
- Explain like a senior dev: trade-offs, why, checklists, next actions.

---

## 5. Known quirks & debt

- Google Routes TRANSIT sometimes returns empty for valid Tokyo pairs
  (pre-existing; app falls back to time estimates).
- Western cities (Paris/Nice/Berlin/Munich/London/Edinburgh/NYC/SF) are thin
  (~8 spots): deepen or cut before launch — decide with Pranjal.
- `Alert.prompt` used in Settings/sign-in is iOS-only (fine: iOS target).
- MicroDiscoveryModal is solo-store-coupled by design; Rooms skips it.
- Legacy serif fonts (Fraunces/Playfair) still in package.json — unused.
- Old `/Users/pranjal/whim app` (with space) folder is a dead shell; the repo
  is `/Users/pranjal/whim-app`. Never build from the spaced path.
- Rooms v1 lacks: leave-room, host close, majority thresholds (documented).
- Landmark sticker slot (ShareCard/PassportCard) waits on Pranjal choosing a
  licensed pack → `assets/landmarks/<city>.png` + `data/landmarks.ts` map.

## 6. State & what's next (2026-07-04)

Built: full solo loop · Group Rooms v1 + group day-plan · security hardening
· verified check-ins · Passport share card · onboarding · icon + animated
splash ("W stamp") · privacy/reset/confirm pages · Japan dataset (Tokyo 50,
Kyoto 47, Osaka 43, Fukuoka 27, Hiroshima 21 anchors; ~1,150 micros; verified
coords; photos on own CDN).

Next (ROADMAP.md): sticker pack (his asset) → Apple Developer account →
Sentry+analytics → TestFlight beta → push notifications → Apple Sign-In →
submission checklist → publishing/UGC phase (with the moderation kit).
