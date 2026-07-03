# Whim — Implementation Roadmap

> Written 2026-07-03. Order matters: each phase feeds the next. "You" = Pranjal
> (decisions, taste, review, purchases); build tasks are pair-work with Claude.

---

## Phase 1 — Charm & shareability (now, pre-launch)

### 1.1 Landmark stickers on the ShareCard  · small
The share card gets a city illustration (option 1: one consistent sticker pack).
- **You:** pick ONE sticker pack you love (Flaticon/Iconscout "landmarks" style
  packs; must cover Tokyo, Kyoto, Osaka, Fukuoka, Hiroshima + the western
  cities). Check the license allows app redistribution; note attribution if
  required. Export PNGs (~512px) into `whim-mobile/assets/landmarks/<city>.png`
  (lowercase, e.g. `tokyo.png`).
- **Build:** `data/landmarks.ts` (city → `require(...)`, missing city = no art);
  render in `ShareCard` — corner-placed, slightly rotated (postmark language);
  bundled assets only (remote URLs race the view-shot capture). Attribution
  line in Settings → About if the license needs it.
- **Same asset reused later:** itinerary header, city picker rows.
- **One style rule:** never mix packs. A city with no matching sticker gets
  nothing rather than an off-style substitute.

### 1.2 Verified check-ins  · small · ✅ DONE (2026-07-03)
Passport numbers must be honest before they're public flex.
- At check-in, `expo-location` verifies you're within ~250 m of the spot
  (spots have lat/lng). Out of range → friendly "get closer to stamp this".
- Store `verified` flag on `checkins` (migration 0008) so legacy stamps keep
  working; only verified ones count toward public stats later.
- Simulator caveat: location is mocked, so keep a `__DEV__` bypass.

### 1.3 Passport share card ("Strava flex")  · medium · ✅ DONE (2026-07-03)
- New `PassportCard` (reuse ShareCard machinery + view-shot): stamps grid,
  cities/spots counts, vibe split ("62% After Dark"), coordinate eyebrow,
  postmark, landmark stickers of stamped cities.
- Share button on the Passport screen. This is the acquisition loop: every
  share is an ad.
- Later (post-launch, needs users): percentiles, streaks, yearly "Wrapped".

### 1.4 First-run experience  · medium · ✅ DONE (2026-07-03)
Onboarding, featured-photo fix, cobalt "W ✦" postmark app icon + splash, and a
Hinge-style animated stamp intro (`AnimatedSplash`).
- **You:** app icon direction (Field Notes: cobalt postmark "W ✦" on putty?
  — decide together, then produce at required sizes).
- **Build:** icon + splash wired in `app.json`; 3-screen onboarding
  (swipe → save → route) shown once (AsyncStorage flag); fix the featured-card
  photo being Tokyo regardless of city (key `FEATURED` art per city or use
  the landmark set).

---

## Phase 2 — Content depth (parallel with Phase 1, ongoing)

The product IS the curation. Launch narrative: deep Japan, credible elsewhere.
- Japan decks to ~15–20 spots per city×vibe where sensible (Claude drafts,
  **you review every spot** — the taste filter is the moat).
- Western cities: either grow to the same bar or cut from the launch city list
  (a thin deck is worse than no deck).
- Photos: move spot photography from Pexels hotlinks → Supabase Storage
  (`spots` bucket, public-read) via a script; faster, stable, license-clean.
- Seed pipeline unchanged: `data/curated/*.json` → `seed-spots.mjs`.

---

## Phase 3 — The Apple account unlock (buy when Phase 1 is ~half done)

- **You:** Apple Developer Program (₹~8,200/yr).
- Then, in order:
  1. Signed device build → keychain sessions activate automatically.
  2. **TestFlight** beta — friends testing Rooms is the perfect beta cohort.
  3. Push notifications (APNs + Supabase Edge trigger): "It's a match ✦"
     while the app is closed — Rooms' retention loop.
  4. Apple Sign-In (provider config in Supabase + re-enable the button).
- Alongside: crash reporting (Sentry) + privacy-light analytics (Aptabase or
  PostHog) BEFORE the beta, so feedback comes with data.

---

## Phase 4 — Publishing: the free marketplace seed (post-launch)

UGC solves content scale. Free first; money later only if demand shows.
- **Schema (0009):** `published_itineraries` (owner, title, city, days jsonb,
  cover, status draft/live), `user_spots` (status pending/approved/rejected —
  approved ones join the public `spots` catalogue), `itinerary_saves`
  (remix counter). All RLS: public-read for `live`/`approved`, own-rows write.
- **Flows:** "Publish" from any itinerary → public page (also a web view on
  GitHub Pages for link sharing); "Remix into my Hitlist"; add-your-own-spot
  (geocoded via the existing `search-place` function) → review queue.
- **Moderation:** report button + your review queue (LLM-assisted pre-screen).
- **Creator identity:** display names on published guides (already built).

## Phase 5 — Money & social (only when Phase 4 shows real traction)

- Tipping / single "Supporter" IAP first (Apple IAP mandatory for digital
  goods; 15% small-business rate). No creator payouts yet.
- Full marketplace (creator payouts) requires: registered entity, KYC,
  Razorpay Route/Stripe Connect, GST/TDS, refunds, creator agreements.
  **Do not start this as a feature; start it as a company decision.**
- Public profiles, follows, city leaderboards ("top Tokyo explorer") — needs
  verified check-ins (1.2) + real user base.

---

## Standing checklist (before App Store submission)

- [x] RLS everywhere · rate-capped edge functions · keychain sessions
- [x] In-app account deletion (5.1.1(v)) · privacy policy hosted & linked
- [x] Password reset flow
- [x] App icon + splash + onboarding (+ animated stamp intro)
- [ ] Location permission copy reviewed (already decent in app.json)
- [ ] App Privacy "nutrition labels" (data types: email, name, user content)
- [ ] Screenshots (6.7" + 6.1"), support URL (GitHub Pages), age rating
- [ ] Supabase Pro when affordable → enable leaked-password protection
- [ ] Google/Mapbox billing alerts (set) · Routes API quota cap (verify)
