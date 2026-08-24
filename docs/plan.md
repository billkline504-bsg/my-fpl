# Fantasy EPL Draft League App

## Context

The user wants a from-scratch app (empty repo) to run a head-to-head fantasy
EPL draft league among small private groups (up to 8 users/league), pulling
real player stats from the official Fantasy Premier League (FPL) API. Key
decisions confirmed with the user:

- **Stack**: React (web) + React Native/Expo (mobile), sharing TypeScript
  domain logic/types in a monorepo.
- **Auth**: Managed auth provider rather than hand-rolled auth.
- **Hosting**: Local/self-hosted for now (no cloud deploy yet), but the
  chosen approach should allow moving to a cloud host later without a
  rewrite.
- **Scale**: Small/personal — a handful of leagues, well under a few hundred
  users. Optimize for simplicity over scalability.
- **Draft model**: Real players are **exclusive per league** — once drafted
  or transferred onto a roster, no other member of the same league/season
  can own that player (classic fantasy-football draft-league mechanic, not
  official FPL's shared-ownership model).
- **Weekly scoring**: A user's gameweek score = sum of the **top 11 of their
  15 players by points**, constrained to include **at least 1 goalkeeper**
  (best-11-with-valid-formation, not a user-picked starting lineup).
- **Squad shape**: FPL-standard 15-man squad — exactly 2 GK / 5 DEF / 5 MID /
  3 FWD. No cap on players from the same real club.
- **Draft structure**: an initial draft (commissioner-configured pick count)
  before the season, and a second, smaller draft after the transfer window
  closes (also commissioner-configured pick count).

Given the size of this project, this plan covers the full architecture and
data model, then sequences the build into phases. This session will
implement the foundational phases (scaffolding, auth, leagues, FPL sync);
later phases (draft, transfers, scoring, mobile parity, stats) are laid out
as a clear roadmap to continue in follow-up sessions.

## Architecture

**Why Supabase, self-hosted**: it bundles Postgres + a managed auth service
(GoTrue: signup/login, email verification, password reset, JWT issuance) in
one Docker Compose stack runnable entirely on the user's machine via the
Supabase CLI (`supabase start`) — satisfying "managed auth" and
"local/self-hosted" simultaneously. The exact same project can later be
pushed to Supabase Cloud (`supabase link` + `supabase db push`) with no
application code changes, giving a clean path to real hosting later.

```
apps/
  web/      React + Vite + TypeScript + TanStack Router/Query + Tailwind
  mobile/   Expo (React Native) + TypeScript, shares UI logic patterns with web
  api/      Node.js + TypeScript + Fastify — all app business logic & FPL sync
packages/
  shared/   Zod schemas, shared TS types, scoring engine (pure functions),
            FPL API client/types, API request/response contracts
  db/       Drizzle ORM schema + migrations (Postgres, hosted in local Supabase)
supabase/   Supabase CLI project config (docker-compose-managed local stack)
```

- **pnpm workspaces + Turborepo** ties the monorepo together (shared
  TypeScript config, single install, cached builds).
- **Auth flow**: web/mobile use `@supabase/supabase-js` directly against the
  local Supabase Auth service for sign up / sign in / session refresh. All
  other app calls go to the Fastify API, authenticated by validating the
  Supabase-issued JWT (shared JWT secret) on each request — no custom
  password/session code to write or maintain.
- **Business logic lives in `apps/api`**, not the DB or the clients: draft
  turn validation, transfer-window enforcement, weekly scoring, standings.
  Postgres stores state; Fastify enforces rules.
- **FPL sync**: a scheduled job inside `apps/api` polls the public FPL
  endpoints (`bootstrap-static/`, `fixtures/`, `event/{id}/live/`) to
  populate/refresh `players`, `clubs`, `gameweeks`, and
  `player_gameweek_stats`. A manual "sync now" admin endpoint supplements
  the schedule.

## Data Model (Postgres, via Drizzle)

Core tables (columns abbreviated to essentials):

- `profiles` — 1:1 with Supabase `auth.users`; display name, avatar.
- `leagues` — name, commissioner_id, max_users=8, invite_code, season_id.
- `league_memberships` — league_id, user_id, joined_at.
- `seasons` — label (e.g. "2026/27"), start/end dates.
- `gameweeks` — season_id, number, deadline_time, is_current, is_finished
  (synced from FPL `bootstrap-static`).
- `clubs` — synced FPL real-world clubs (id, name, short_name).
- `players` — synced FPL players (fpl_id, name, club_id, position:
  GK/DEF/MID/FWD).
- `player_gameweek_stats` — player_id, gameweek_id, points, minutes, goals,
  assists, etc. (synced from FPL `event/{id}/live`).
- `draft_events` — league_id, season_id, type: `initial`|`post_transfer`,
  configured_pick_count, status, pick_order (array of user_id), current_pick.
- `draft_picks` — draft_event_id, user_id, player_id, pick_number,
  drafted_at. Enforces player exclusivity within the league/season.
- `rosters` — league_id, user_id, season_id (one active 15-man squad per
  user per league per season).
- `roster_players` — roster_id, player_id, position, added_via:
  `draft`|`transfer`, added_at, removed_at (nullable — history preserved).
  Unique constraint on (league_id, season_id, player_id) where
  removed_at IS NULL enforces exclusivity.
- `transfer_windows` — league_id, season_id, opens_at, closes_at,
  post_window_draft_pick_count.
- `transfers` — league_id, user_id, player_out_id, player_in_id,
  gameweek_id, created_at.
- `matchups` — league_id, season_id, gameweek_id, user_a_id, user_b_id,
  user_a_score, user_b_score, winner_id (nullable = tie). Schedule
  generated per season via round-robin (fits well under 8 users).
- `standings` (derived/cached) — league_id, season_id, user_id, played,
  wins, ties, losses, points (3/1/0), recalculated after each gameweek's
  scoring run.

## Key Subsystems & Where They Live

1. **Scoring engine** (`packages/shared/scoring`): pure function
   `computeTopEleven(playerScores: {playerId, position, points}[]) →
   {startingIds, totalPoints}` that maximizes points subject to ≥1 GK among
   the 11 (simple greedy: pick best GK, then best 10 of the rest by
   points). Unit-testable in isolation, reused by API scoring job and any
   future "what would my score have been" UI.
2. **Draft engine** (`apps/api/domain/draft`): turn order + pick validation
   (position caps 2/5/5/3, player not already owned in league/season),
   advances `current_pick`, supports both `initial` and `post_transfer`
   draft types with commissioner-set pick counts.
3. **Transfer service** (`apps/api/domain/transfers`): enforces window
   open/closed, squad-shape validity after swap, player exclusivity.
4. **FPL sync service** (`apps/api/domain/fplSync`): idempotent
   upsert-on-sync for clubs/players/gameweeks/stats; scheduled via
   `node-cron`.
5. **Standings/matchup engine** (`apps/api/domain/standings`): on
   gameweek-finalized, computes each roster's top-11 score, updates
   `matchups` scores/winner, recalculates `standings`.

## Build Phases

**Status: all phases (0–8) are complete** as of 2026-08-24. This section
is kept as a historical record of what each phase covered; see
[README.md](../README.md) for how to run/use the app today and
`git log` for exactly what shipped when.

- **Phase 0 — Scaffolding** ✅: pnpm/Turborepo monorepo, `apps/web` (Vite
  React skeleton), `apps/api` (Fastify skeleton + health check),
  `packages/shared`, `packages/db` (Drizzle config), local Supabase project
  (`supabase init` + `supabase start`), env wiring, root README with setup
  instructions. (Mobile app scaffold deferred to Phase 6 to avoid Expo
  setup overhead before the API/data model stabilize.)
- **Phase 1 — Auth & Leagues** ✅: Supabase Auth wired into web app (sign
  up/in/out); `profiles` sync trigger; Fastify JWT-verification middleware;
  league CRUD (create league, invite code join, view members, 8-user cap
  enforced) with a basic web UI.
- **Phase 2 — FPL Sync & Player Data** ✅: sync service, `clubs`/`players`/
  `gameweeks` tables populated, player list/search UI.
- **Phase 3 — Draft** ✅: draft_events/draft_picks, snake draft turn engine,
  live draft UI (web), commissioner controls to configure pick counts and
  start the draft.
- **Phase 4 — Rosters & Transfer Window** ✅: roster_players, transfer
  window open/close, add/drop UI respecting squad-shape rules, second
  ("post_transfer") draft.
- **Phase 5 — Scoring, Matchups & Standings** ✅: round-robin schedule
  generation, scoring engine wired to real synced stats, gameweek
  finalization, league table + head-to-head results UI. Gameweek
  finalization was originally commissioner-triggered only; it's now also
  automatic (see the note on auto-finalization below).
- **Phase 6 — Mobile App** ✅: Expo app in `apps/mobile` reusing
  `packages/shared`, parity with web for auth/leagues/draft/roster/
  standings.
- **Phase 7 — Stats & History** ✅: season-long player performance views
  (Players page + per-player stats panel), plus a commissioner "start next
  season" action so a league's per-season history actually has more than
  one season to show over time.
- **Phase 8 — Polish & Cloud-Readiness** ✅: error states surfaced for every
  primary query/mutation (not just silent empty states on failure), live
  polling for the draft-turn indicator and transfer-window "closing soon"
  flag, and README docs for migrating the local Supabase project to
  Supabase Cloud.

### Post-plan work: automated gameweek finalization

Beyond the original 8 phases: gameweek finalization no longer requires a
commissioner to remember to click a button. After every FPL sync (the
30-minute cron in
[apps/api/src/plugins/fplSyncSchedule.ts](../apps/api/src/plugins/fplSyncSchedule.ts),
or a manual "Sync from FPL" click), `autoFinalizeFinishedGameweeks` in
[apps/api/src/domain/standings.ts](../apps/api/src/domain/standings.ts)
finalizes every FPL-finished gameweek that still has an unfinalized
matchup, for every affected league. The manual "Finalize GW" button in the
Standings tab still exists as a commissioner override (e.g. to force a
recompute after a stat correction) but is no longer required for normal
operation.

This also surfaced and fixed a real bug: `getOrCreateDefaultSeason`
(used both by FPL sync and by new-league creation to pick "the" season)
used to pick whichever season row had the latest start date. Once a
league rolls onto a future season via "start next season" (Phase 7), that
heuristic broke — live FPL sync started misattributing gameweek/stat data
to the *future* season instead of the one actually being played. It now
picks whichever season's date range contains today, falling back to the
latest-start-date season only if none matches (e.g. no seasons exist yet).

## Verification

- `docker` running locally; `supabase start` boots Postgres/Auth/Studio
  without errors.
- `pnpm dev` runs `apps/api` (health check endpoint returns 200) and
  `apps/web` (Vite dev server loads).
- Manual browser test: sign up a user via the web app, confirm a `profiles`
  row is created, sign out/in, create a league, join it with a second test
  account via invite code, confirm the 8-user cap rejects a 9th join.
- `pnpm test` runs unit tests for the scoring engine, snake draft order,
  and round-robin schedule generation in `packages/shared`.
- `pnpm typecheck` typechecks every package/app.
