# Whim / BeWhim — App Store submission copy & checklist

> Store listing name is currently **BeWhim** (because "Whim" alone was taken).
> The app shows **"Whim"** on the home screen. Decide the final brand before
> public launch (keep "Whim" in-app + a descriptive store name, or adopt
> "BeWhim/Bewhimsy" everywhere — see naming note at bottom).

---

## A. TestFlight Beta App Review — "Test Information" (paste now)

**Beta App Description**
> Whim is a travel-discovery app. Pick a city and a vibe, swipe a deck of curated
> places, save the ones you like, and turn your favorites into an auto-sequenced
> day plan on a map. You can also create a room and plan a trip together with
> friends — everyone swipes the same deck and the spots you all like become the plan.
> Sign in with the provided account to explore the full flow.

**What to Test**
> Sign in → pick a city + vibe on Home → swipe the deck (right = save, left = skip)
> → open the Hitlist → "Generate Smart Route" for the map + timeline → try "Plan
> with friends" to create a room. Also try "Forgot password?" on the sign-in screen,
> and (in a room) tap a member to Report/Block.

**Sign-In (demo account — required)**
- User Name: `appreview@bewhimsy.app`
- Password: `WhimBeta#2026`

**Feedback email:** `prai2702@gmail.com` (or `hello@bewhimsy.app`)
**Contact:** Pranjal Rai · phone on file · `hello@bewhimsy.app`

---

## B. Public App Store listing (fill before public submission)

**Subtitle** (max 30 chars)
> Swipe cities into a day plan

**Promotional Text** (max 170 chars — editable anytime without review)
> Discover a city by swiping the spots that match your vibe, then turn your
> favorites into a smart day plan — on your own or together with friends.

**Description** (max 4000 chars)
> **Plan your trip the fun way — swipe, save, go.**
>
> Whim turns trip planning into something you actually enjoy. Pick a city and a
> vibe — The Classics, Matcha & cafés, Nature, or After Dark — and swipe through
> a hand-curated deck of real places. Swipe right to save, left to skip. No endless
> tabs, no research rabbit holes.
>
> **Build the perfect day, automatically.**
> Everything you save lands in your Hitlist. One tap sequences it into a smart day
> plan — ordered by opening hours and travel time, drawn on a map, with real
> transit between stops. Open it in Maps or share it as a beautiful card.
>
> **Plan together with friends.**
> Create a room, share the code, and everyone swipes the same deck. The spots you
> all love become group matches in real time — then become a shared day plan the
> whole crew agreed on. It's the group-trip argument, solved.
>
> **Collect the places you've been.**
> Check in as you visit and your Passport fills with stamps — a travel diary you
> can share.
>
> **Curated, not scraped.** Every city is hand-picked, with deep decks for Tokyo,
> Kyoto, Osaka, Fukuoka, Hiroshima, New York, and San Francisco — and more on the way.
>
> Swipe. Save. Go.

**Keywords** (max 100 chars, comma-separated, no spaces)
> travel,trip planner,itinerary,city guide,things to do,day plan,swipe,vacation,explore,map,rooms

**Category:** Primary: Travel · Secondary: (optional) Lifestyle
**Support URL:** https://pranjal250605.github.io/whim-app/privacy.html  *(replace with a real support/landing page on bewhimsy.app when built)*
**Marketing URL** (optional): https://bewhimsy.app  *(once a landing page exists)*
**Copyright:** 2026 Pranjal Rai

**What's New** (for updates)
> First release — swipe cities, build smart day plans, and plan trips together in rooms.

---

## C. Non-copy items to complete before PUBLIC submission

- [ ] **App Privacy "nutrition labels"** (App Store Connect → App Privacy). Declare:
      Email address, Name (contact info) · User content (saved spots, rooms, votes,
      check-ins) · Coarse Location (used, **not** linked to identity, **not** tracked).
      No tracking, no ads, no data sale.
- [ ] **Age rating** questionnaire (likely 4+; UGC in rooms may push to 12+ — answer
      honestly: user-generated content = yes, mild).
- [ ] **Screenshots** — 6.7" (1290×2796) and 6.5" (1242×2688) iPhone. Capture: Home,
      swipe deck, itinerary map, a room lobby, Passport. (I can generate these from
      the simulator.)
- [ ] **Build with moderation** (build 2+) selected for the version.
- [ ] **Final brand/name decision** (see below).
- [ ] EU trader status = Active (currently In Review).

## D. Naming decision (before public launch)
"Whim" is taken on the App Store and as a domain. Options:
1. Keep **"Whim"** in-app + descriptive store name (e.g. "Whim: Travel Discovery").
2. Adopt **"BeWhim / Bewhimsy"** everywhere (matches the `bewhimsy.app` domain;
   more distinctive and ownable). Requires updating the in-app wordmark.
Pick one, then align: app.json `name`, in-app wordmarks, store listing.
