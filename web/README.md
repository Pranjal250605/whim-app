# BeWhim — website (`web/`)

The marketing / landing site for the BeWhim iOS app. Everything for the site lives
in this folder — pick the framework you like (Vite, Next.js, Astro…) and scaffold
it here, e.g. `npm create vite@latest .` from inside `web/`.

## Ground rules

- **Stay inside `web/`.** The rest of the repo is the iOS app (`whim-mobile/`),
  its backend (`whim-mobile/supabase/`) and the auth pages (`docs/`).
- **Never edit `docs/`.** GitHub Pages serves `main:/docs`, and three files there
  are live parts of the app, not website pages:
  - `docs/index.html` — email-confirmation landing (Supabase `site_url`)
  - `docs/reset.html` — password-reset form
  - `docs/privacy.html` — the Privacy Policy linked in the app (required by Apple)

  Breaking them breaks sign-up and password reset. Link to them from the site
  instead (`https://pranjal250605.github.io/whim-app/privacy.html`).
- **Hosting:** deploy `web/` separately (Vercel / Netlify / Cloudflare Pages —
  set the project root to `web/`). Don't publish it through the `docs/` Pages site.
- **No secrets.** This repo is public. The site shouldn't need any keys; if it
  ever reads BeWhim data, the only key allowed is the public Supabase anon key via
  env vars (`VITE_…` / `NEXT_PUBLIC_…`), never committed. Service keys, Google
  and Mapbox tokens stay with Pranjal.

## Brand — "Field Notes"

The product name is **BeWhim** — use it everywhere on the site. ("Whim" is only an
internal name: repo, bundle id, `whim://` links.)

Match the app so the site and App Store listing feel like one product:
- Type: **Bricolage Grotesque** (headings) + **IBM Plex Mono** (labels, coordinates).
- Color: cobalt **`#2740E0`** (the one accent) on warm paper **`#F0EEE8`**, ink **`#17150F`**.
- No serifs, no second accent colour, no generic gradient-blob hero.

The App Store link, screenshots and privacy URL come from Pranjal.

## Workflow

- Work on the branch Linear generates for your issue: open the issue →
  "Copy git branch name" (Cmd/Ctrl+Shift+.), e.g. `yourname/whi-19-landing-page-v1`.
  Linear then links the branch and PR to the issue automatically. Site issues
  live in the **Website** project (label `Site`) at linear.app/bewhim.
- Open a PR into `main`. Changes under `web/` are reviewed by the site team;
  anything outside `web/` needs Pranjal's review (see `.github/CODEOWNERS`).
