---
name: my-fpl-dev-stack
description: >
  Boot, verify, or troubleshoot the my-fpl local dev environment on this
  machine (Node/PATH setup, the local Supabase stack, the API/web/mobile
  dev servers, and a seeded-test-user auth token). Use this whenever you
  need to run the app locally, verify a change end-to-end in the browser,
  push a schema change with `pnpm db:push`, add or check a Supabase
  Storage bucket, or make an authenticated curl request against the API.
  Also use it if `db:push` hangs, a storage bucket 404s as "Bucket not
  found" even though it's declared in config.toml, or `pnpm lint` fails
  with a native-binding error unrelated to your change — these are known
  environment quirks with documented workarounds, not new bugs to
  re-diagnose from scratch.
---

# my-fpl local dev stack

This is the environment/tooling boot sequence for `my-fpl` specifically —
not the project's coding conventions (those are in `CLAUDE.md`). Follow
this before assuming something is broken; several steps below look like
failures but are known, machine-specific quirks with a one-line fix.

## 1. Fix PATH first

Plain `node`/`npm`/`docker` on PATH resolve to unusable installs on this
machine. Prepend the working versions before anything else:

```bash
export PATH="/c/Users/wkline/AppData/Roaming/nvm/v22.2.0:$PATH"
export PATH="/c/Users/wkline/AppData/Local/Programs/DockerDesktop/resources/bin:$PATH"
```

Corepack is also broken here (`Cannot find matching keyid`) — use the
globally-installed `pnpm`, don't invoke pnpm through corepack.

## 2. Make sure the local Supabase stack is up

```bash
supabase status
```

If services aren't running, `supabase start`. If the output says
**"Starting database from backup..."**, that's a restore of an existing
snapshot, not a fresh init — remember this for step 5, it changes what
you need to check.

## 3. Start the dev servers via the Browser preview tool, not Bash

`.claude/launch.json` already has entries for `web` (`:5173`), `api`
(`:4000`), and `mobile-web` (`:8081`). Use the Browser preview tool
(`preview_start` with `name: "web"` / `"api"` / `"mobile-web"`) so the
servers are drivable/inspectable from the browser — don't launch them
with a raw `pnpm dev` in Bash. If a port is already in use by a leftover
process from an earlier session, that's fine — check with
`preview_logs`/a `curl` health check before assuming you need to kill
and restart it.

For an authenticated request outside the browser (curl), see step 6.

## 4. Pushing a schema change (`pnpm db:push`)

`DATABASE_URL` is not auto-loaded into this shell — export it first:

```bash
export DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
```

**If your schema change includes a column rename** (or any change
`drizzle-kit` can't disambiguate from a drop+add), plain `pnpm db:push`
will hang forever on an interactive y/n prompt — there's no stdin to
answer it with in this shell. Work around it:

1. Write a one-off Node ESM script using the `postgres` package to run
   the exact DDL directly, e.g.:
   ```js
   import postgres from "postgres";
   const sql = postgres("postgresql://postgres:postgres@127.0.0.1:54322/postgres");
   await sql`ALTER TABLE profiles RENAME COLUMN avatar_url TO icon_url`;
   await sql.end();
   ```
2. Run it **from inside `packages/db`** (`node your-script.mjs`) so
   Node's ESM resolver finds the `postgres` package — running it from
   elsewhere (even with `cd` first) fails with `ERR_MODULE_NOT_FOUND`
   because ESM resolves relative to the script's own location, not cwd.
3. Delete the script, then run `drizzle-kit push < /dev/null` (piping
   from `/dev/null` prevents a hang on any *remaining* unambiguous
   prompts) and confirm it prints `No changes detected`.

For changes with no ambiguous renames, plain `pnpm db:push < /dev/null`
is enough.

## 5. Adding/using a Supabase Storage bucket

Buckets declared in `supabase/config.toml` under `[storage.buckets.<name>]`
are only provisioned by `supabase start` **on a fresh/reset stack** — not
when it restores from a backup snapshot (see step 2). If a bucket you just
declared 404s with `"Bucket not found"`, create it directly instead of
re-running `supabase start` (which won't help and risks disturbing seeded
data):

```bash
curl -X POST http://127.0.0.1:54321/storage/v1/bucket \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"id":"<name>","name":"<name>","public":true,"file_size_limit":<bytes>,"allowed_mime_types":["..."]}'
```

Match the `public`/`file_size_limit`/`allowed_mime_types` values to what
you put in `config.toml`, and get `SERVICE_ROLE_KEY` from
`apps/api/.env` or `supabase status`.

## 6. Getting an auth token for a seeded test user

There's a real seeded league ("The Premier Legends", commissioner Bob) —
see `CLAUDE.md`'s "Testing changes end-to-end" section for the current
recipe and where to find a password if it's not already known. The short
version:

```bash
curl -s -X POST "http://127.0.0.1:54321/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"bob@example.com","password":"<password>"}'
```

`$ANON_KEY` is in `apps/web/.env.local`. If the password isn't known,
reset it via the Auth admin API with `SERVICE_ROLE_KEY` — this is the
expected, documented way to regain access to these local-only test
accounts, not a workaround.

## 7. `pnpm lint` may fail regardless of your change

`oxlint` on this machine can fail with `Cannot find native binding`
(missing `@oxlint/binding-win32-x64-msvc`). This is a pre-existing,
unrelated environment issue — check whether it fails on a clean checkout
before treating a lint failure as evidence your change broke something.
