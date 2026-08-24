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

### Deploying to Supabase Cloud

This project is built to move from local, self-hosted Supabase to
[Supabase Cloud](https://supabase.com) without any application code changes
— the API verifies auth tokens by fetching the JWKS from whatever
`SUPABASE_URL` it's given
([apps/api/src/plugins/authenticate.ts](apps/api/src/plugins/authenticate.ts)),
so it works identically against the local stack or a cloud project. Only
config changes are needed:

1. **Create a Supabase Cloud project** at [supabase.com](https://supabase.com).
   From its dashboard, note down:
   - **Settings → API**: the Project URL and the `anon` public key.
   - **Settings → Database**: a connection string (the "Direct connection"
     one works fine — this app is a long-running server, not serverless, so
     it doesn't need the pooler).
2. **Push the schema** to the cloud database — no Supabase CLI migrations
   are used here, just Drizzle:
   ```bash
   DATABASE_URL="<cloud-connection-string>" pnpm db:push
   ```
3. **Update env vars** to point at the cloud project instead of localhost,
   following the same variables described in "First-time setup" above:
   - `apps/api/.env` — `DATABASE_URL` (cloud connection string),
     `SUPABASE_URL` (`https://<project-ref>.supabase.co`),
     `SUPABASE_SERVICE_ROLE_KEY` (from Settings → API).
   - `apps/web/.env.local` (or your production env) — `VITE_SUPABASE_URL`,
     `VITE_SUPABASE_ANON_KEY`, and `VITE_API_URL` pointing at wherever you
     host the API (see below).
   - `apps/mobile/.env` — the same three values with the `EXPO_PUBLIC_`
     prefix.
4. **Host the API and web app separately** — Supabase Cloud only hosts
   Postgres/Auth/Storage, not this repo's Fastify API or Vite web app.
   `apps/api` is a plain Node/Fastify server (deployable to Fly.io, Render,
   Railway, a VPS, etc.); `apps/web` builds to static files
   (`pnpm --filter @my-fpl/web build`) deployable to any static host
   (Vercel, Netlify, Cloudflare Pages).
5. **Know the FPL sync cron's limitation**: the scheduled sync
   ([apps/api/src/plugins/fplSyncSchedule.ts](apps/api/src/plugins/fplSyncSchedule.ts))
   runs via `node-cron` inside the API process, so it only fires while that
   process stays alive. On a host that sleeps/restarts the process (most
   serverless platforms), point an external scheduler (e.g. a cron job or
   GitHub Actions schedule) at the existing manual "Sync from FPL" endpoint
   (`POST /fpl/sync`) instead of relying on the in-process cron.
6. **Bringing over existing local data** (optional): if you want your local
   dev league/draft data in the cloud project instead of starting fresh, use
   `pg_dump`/`pg_restore` (or `supabase db dump`) against the local and cloud
   connection strings.

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
