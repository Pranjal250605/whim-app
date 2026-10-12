# Whim — agent instructions

**Read [`CLAUDE.md`](CLAUDE.md)** — it is the single source of truth for every
coding agent (Codex, Claude, others): architecture, conventions, security rules.
Then `HANDOFF.md` (hard rules, runbooks) and `STATUS.md` (current state).

This file is only a pointer so the instructions can't drift between tools.
Don't copy content here — edit `CLAUDE.md` instead.

Quick orientation:
- `whim-mobile/` — the Expo iOS app + Supabase backend (Pranjal).
- `web/` — the marketing site (site team). See `web/README.md`.
- `docs/` — live auth/privacy pages on GitHub Pages. Don't edit without Pranjal.
- Work on the branch Linear generates for the issue ("Copy git branch name",
  e.g. `prai2702/whi-12-short-title`) and open a PR into `main` — never push to
  `main` directly. Linear team key: `WHI` (workspace: linear.app/bewhim).
