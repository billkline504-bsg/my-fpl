# CLAUDE.md

Guidance for Claude Code sessions working in this repo. See
[README.md](README.md) for setup/run instructions and
[docs/plan.md](docs/plan.md) for the full architecture and build-phase
history (all 8 phases are complete as of 2026-08-24; anything beyond that
is new scope).

## What this is

A head-to-head fantasy EPL draft league app for small private groups (up
to 8 users/league). Real players are exclusive per league/season once
drafted — not official FPL's shared-ownership model. Weekly score = the
best valid 11-of-15 from each manager's squad (2 GK/5 DEF/5 MID/3 FWD),
requiring at least 1 GK.

## Stack & layout

pnpm/Turborepo monorepo. `apps/web` (React+Vite), `apps/mobile`
(Expo/React Native, same screens/logic as web), `apps/api` (Fastify — ALL
business logic and FPL sync lives here, not in the DB or the clients).
`packages/db` is the Drizzle ORM schema; `packages/shared` holds the API
client, shared types, and pure-function domain logic (scoring, snake
draft order, round-robin scheduling) used by web, mobile, and the API.
Local Supabase (Postgres + Auth) runs via the Supabase CLI in Docker.

## Commands

- `pnpm dev` — API (`:4000`) + web (`:5173`) via Turborepo.
- `pnpm --filter @my-fpl/mobile start` — Expo (press `w` for a quick
  browser preview via react-native-web, `a`/`i` for simulators).
- `pnpm test` — unit tests (currently `packages/shared` only: scoring
  engine, snake draft order, round-robin schedule).
- `pnpm typecheck` — typechecks every package/app. Run this after any
  change — it's fast and catches most cross-package breakage.
  `pnpm lint` runs oxlint (web app only so far).
- `pnpm db:push` — pushes `packages/db/src/schema.ts` straight to Postgres
  via `drizzle-kit push`. No migration files are checked in; this isn't a
  managed-migrations setup.
- `pnpm db:studio` — Drizzle Studio against the local DB.
- `supabase start` / `supabase stop` / `supabase status` — manage the
  local Postgres+Auth+Studio Docker stack.

## Conventions worth knowing

- **Business logic belongs in `apps/api/src/domain/*.ts`**, not in
  Postgres (no triggers/functions for app rules) and not in the clients.
  Routes (`apps/api/src/routes/*.ts`) stay thin: parse with zod, call a
  domain function, map known error classes to HTTP codes.
- **Everything that varies by season is scoped by `seasonId`**, not just
  `leagueId` — `rosters`, `draft_events`, `transfer_windows`, `matchups`,
  `standings` all carry their own `seasonId`. A league's *current* season
  lives at `leagues.seasonId` and moves forward via
  `startNextSeasonForLeague` (commissioner-only "start next season").
  **When adding a query that checks "does X already exist for this
  league," always scope it by the relevant `seasonId` too** — several
  bugs already came from forgetting this (draft/transfer-window/schedule
  existence checks incorrectly leaking across seasons after rollover;
  fixed in the season-rollover and auto-finalization work, but the
  pattern is easy to reintroduce in new code).
- **`getOrCreateDefaultSeason`** (`apps/api/src/domain/seasons.ts`) is
  what FPL sync and new-league creation use to pick "the current season."
  It picks whichever season's date range contains today, not "the most
  recently created season" — don't revert this to a naive `ORDER BY
  start_date DESC LIMIT 1`, that's exactly the bug it was fixed from (a
  future rolled-over season would silently steal live FPL sync data from
  the season actually being played).
- **Gameweek finalization is automatic**, not just commissioner-triggered:
  `autoFinalizeFinishedGameweeks` (`apps/api/src/domain/standings.ts`)
  runs after every FPL sync (the 30-min cron and the manual "Sync from
  FPL" button both trigger it) and finalizes any FPL-finished gameweek
  that still has an unfinalized matchup, for every affected league. The
  manual "Finalize GW" button is a commissioner override, kept for cases
  like forcing a recompute after FPL corrects a stat.
- **Web and mobile are near-exact structural mirrors** — same component
  names, same query keys, same domain logic via `packages/shared`'s API
  client. When fixing a bug or adding a feature in one, check whether the
  other needs the same change (e.g. the `SafeAreaView`-from-`react-native`
  web-incompatibility bug existed in three mobile screens at once).
- **Auth**: Supabase-issued JWTs are verified via JWKS
  (`createRemoteJWKSet` in `apps/api/src/plugins/authenticate.ts`), not a
  shared secret — this is what makes the local→Supabase Cloud migration
  (see README) config-only with no code changes.

## Known environment gotchas (this machine specifically)

- Plain `node`/`npm` on PATH resolve to an ancient install; prepend the
  right nvm version dir instead of relying on `nvm use`
  (e.g. `export PATH="/c/Users/wkline/AppData/Roaming/nvm/v22.2.0:$PATH"`).
- Corepack is broken here (`Cannot find matching keyid`) — use a
  globally-installed pnpm (`npm install -g pnpm@9`), not corepack.
- Docker Desktop's CLI dir isn't always on PATH in a fresh shell:
  `C:\Users\wkline\AppData\Local\Programs\DockerDesktop\resources\bin`.
- In this Git Bash environment, `node -e "require('/c/Users/...')"` fails
  — Node resolves a leading `/` relative to the current drive, not as an
  MSYS path. Use a Windows-style path (`C:/Users/...`) inside `-e` code.

## Testing changes end-to-end

There's no seeded test data script — a real league with real invite-code
joins, a completed draft, and a finalized gameweek was built up manually
across sessions (league: "The Premier Legends", commissioner: Bob). When
verifying a change that needs an authenticated request outside the
browser (e.g. curl), get a token via Supabase's password grant:
```bash
curl -s -X POST "http://127.0.0.1:54321/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"bob@example.com","password":"<reset-it-via-admin-api-if-unknown>"}'
```
(the anon key is in `apps/web/.env.local`). A test user's password can be
reset via the Supabase Auth admin API with the service role key from
`apps/api/.env` if it's not known.
