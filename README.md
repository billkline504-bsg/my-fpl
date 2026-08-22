## My-FPL Readme

A head-to-head fantasy EPL draft league app. See
[`docs/plan.md`](docs/plan.md) below for the full architecture; this file
covers day-to-day setup.

### Prerequisites

- Node.js 20+ (`.nvmrc` pins 22.2.0)
- pnpm 9 (`npm install -g pnpm@9` if you don't have it)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/), running
  (needed for the local Supabase stack)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm install -g supabase`)

### First-time setup

```bash
pnpm install

# Boots local Postgres + Auth + Studio in Docker. Requires Docker Desktop
# to be running first.
supabase start
```

`supabase start` prints a block of local URLs and keys. Copy the values into
env files based on the `.env.example` in each app:

- `apps/api/.env` — set `DATABASE_URL` (the "DB URL") and `SUPABASE_URL`
  (the "API URL"; the API verifies tokens via its JWKS endpoint, so no
  secret needs to be copied)
- `apps/web/.env.local` — set `VITE_SUPABASE_URL` (the "API URL") and
  `VITE_SUPABASE_ANON_KEY` (the "anon key")
- `apps/mobile/.env` — set `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`,
  and `EXPO_PUBLIC_API_URL` (a physical phone on the same Wi-Fi needs your
  machine's LAN IP instead of `127.0.0.1` for both URLs)

Then push the app's database schema (tables) into that local Postgres:

```bash
pnpm db:push
```

### Running the app

```bash
pnpm dev
```

This starts the API (default `http://localhost:4000`, health check at
`/health`) and the web app (default `http://localhost:5173`) together via
Turborepo. Sign up a user in the browser, create a league, and share the
invite code shown on the league card with a second account to test the
8-user cap.

For the mobile app:

```bash
pnpm --filter @my-fpl/mobile start
```

Then press `a`/`i` for an Android/iOS simulator, `w` for a browser preview
(via react-native-web — handy for quick checks, but a real device/simulator
is the real target), or scan the QR code in Expo Go on a physical device.

### Useful commands

- `pnpm test` — run unit tests across all packages (currently the scoring
  engine in `packages/shared`)
- `pnpm typecheck` — typecheck everything
- `pnpm db:studio` — open Drizzle Studio against your local database
- `supabase stop` — stop the local Supabase stack
- `supabase status` — reprint the local URLs/keys if you lose them

### Project layout

```
apps/
  web/      React + Vite web app
  mobile/   Expo (React Native) app — same screens/logic as web, native UI
  api/      Fastify API — all business logic, FPL sync, JWT auth
packages/
  shared/   Shared types, the API client, and the weekly scoring engine —
            used by web, mobile, AND the API (for types)
  db/       Drizzle ORM schema/migrations for the app's Postgres tables
supabase/   Local Supabase CLI project config
```
