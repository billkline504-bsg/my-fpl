# Onboarding: setting up your machine for my-fpl

This is a from-zero, command-by-command guide to installing and
configuring every tool this project needs on your machine. If you already
have some of these tools, skip to the relevant section to verify your
version, or skip straight to [README.md](README.md) if everything below
is already installed.

Commands below are given for **Windows (PowerShell)** since that's this
project's primary dev environment, with **macOS/Linux** alternatives noted
where the install step differs. Where a command is identical either way,
it's only shown once.

## What you're installing, and why

| Tool | Why this project needs it |
|---|---|
| Git | Clone the repo, track your changes |
| Node.js | Runs the web/API build tools and the API server itself |
| pnpm | This is a pnpm workspace (monorepo) — npm/yarn won't manage it correctly |
| Docker Desktop | Runs Postgres + Auth + Storage locally, via the Supabase CLI |
| Supabase CLI | Boots/manages that local Docker stack, one command |
| Expo Go (mobile, optional) | Lets you run the mobile app on your phone without a native build |

---

## 1. Git

**What it is:** version control — how you'll get this code and track
changes to it.

**Install (Windows):** download and run the installer from
[git-scm.com](https://git-scm.com/download/win). Accept the defaults
unless you have a reason not to.

**Install (macOS):** `brew install git` (via [Homebrew](https://brew.sh)),
or it's often preinstalled.

**Install (Linux):** `sudo apt install git` (Debian/Ubuntu) or your
distro's equivalent.

**Verify:**

```bash
git --version
```

You should see something like `git version 2.x.x`.

---

## 2. Node.js

**What it is:** the JavaScript runtime that runs the API server and the
web app's build tooling. This project pins **Node 22.2.0** (see
[`.nvmrc`](.nvmrc)) — using a version manager instead of a single global
install is strongly recommended, because it's common to need different
Node versions across projects, and because (at least on this kind of
setup) a single global Node install can silently be an old, stale version
that shadows the one you think you're using.

**Install a version manager:**

- **Windows** — [nvm-windows](https://github.com/coreybutler/nvm-windows):
  download and run `nvm-setup.exe` from its
  [releases page](https://github.com/coreybutler/nvm-windows/releases).
- **macOS/Linux** — [nvm](https://github.com/nvm-sh/nvm):
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  ```
  then restart your shell.

**Install and use the pinned Node version**, from the repo root (after
you've cloned it — see step 6):

```bash
nvm install 22.2.0
nvm use 22.2.0
```

**Verify:**

```bash
node --version
# should print v22.2.0
```

> **Known gotcha on Windows:** `nvm use` sometimes silently does nothing
> in some terminal/shell setups (no output, and `node --version` still
> shows an old version) — this has been observed with nvm-windows in
> non-interactive or embedded terminal sessions. If that happens, find
> where nvm installed that version (typically
> `%APPDATA%\nvm\v22.2.0` on Windows) and prepend it to your `PATH`
> directly for that session instead of relying on `nvm use`:
> ```bash
> # Git Bash / WSL style path:
> export PATH="/c/Users/<you>/AppData/Roaming/nvm/v22.2.0:$PATH"
> ```
> ```powershell
> # PowerShell:
> $env:PATH = "$env:APPDATA\nvm\v22.2.0;$env:PATH"
> ```

---

## 3. pnpm

**What it is:** the package manager this monorepo uses (not npm, not
yarn) — it understands the `pnpm-workspace.yaml` at the repo root that
ties `apps/*` and `packages/*` together with a single install.

**Install:**

```bash
npm install -g pnpm@9
```

> **Known gotcha:** you may see guidance elsewhere to use `corepack
> enable` to manage pnpm's version instead of installing it globally.
> On at least this kind of setup, corepack can fail with `Cannot find
> matching keyid` (an npm registry signing-key verification issue) —
> if you hit that, skip corepack entirely and use the global install
> above instead.

**Verify:**

```bash
pnpm --version
# should print 9.x.x
```

---

## 4. Docker Desktop

**What it is:** runs the local Postgres + Auth + Storage stack that the
Supabase CLI manages, as a set of containers. You don't interact with
Docker directly day-to-day — the Supabase CLI drives it — but it has to
be installed and running.

**Install:** download from
[docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/)
and run the installer.

- **Windows:** the installer will prompt to enable WSL2 if it isn't
  already — accept that, it's required.
- **macOS:** choose the installer matching your chip (Apple Silicon vs
  Intel).

**Start Docker Desktop** (it must be running, like an application, before
you use the Supabase CLI) and wait for its status indicator to show
"running"/green — this can take a minute or two on first launch.

**Verify** (in a terminal, once Docker Desktop shows as running):

```bash
docker ps
# should print an empty table header, not an error/hang
```

> **Known gotcha on Windows:** right after a *first* install of Docker
> Desktop, `docker ps`/`docker version` can hang indefinitely with the
> backend never starting — especially if a WSL2 kernel update happened
> in the same session. This is Windows' standard "a pending file
> operation needs a reboot to complete" state. If `docker ps` just hangs
> forever on a fresh install: quit Docker Desktop, **reboot Windows**,
> then relaunch Docker Desktop.
>
> Also on Windows: Docker's CLI can end up installed but not on your
> `PATH` in a given shell — if `docker` isn't found, its default
> location is
> `%LOCALAPPDATA%\Programs\DockerDesktop\resources\bin`, which you can
> add to `PATH` for that session:
> ```bash
> export PATH="/c/Users/<you>/AppData/Local/Programs/DockerDesktop/resources/bin:$PATH"
> ```

---

## 5. Supabase CLI

**What it is:** one command (`supabase start`) that boots the entire
local Postgres + Auth + Storage + Studio stack in Docker, matching what
a real Supabase Cloud project provides. This project's API verifies auth
tokens the same way against local or cloud Supabase (see
[CLAUDE.md](CLAUDE.md)), so everything you set up locally here transfers
directly if you later move to Supabase Cloud (see README's "Deploying to
Supabase Cloud" section).

**Install:**

```bash
npm install -g supabase
```

**Verify:**

```bash
supabase --version
```

---

## 6. Expo Go (optional — only if you want to run the mobile app on a phone)

**What it is:** an app on your phone that can load and run this repo's
Expo (React Native) app without you needing a full native Android/iOS
build toolchain installed.

**Install:** search "Expo Go" in the
[App Store](https://apps.apple.com/app/expo-go/id982107779) (iOS) or
[Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
(Android), on your phone.

No separate CLI install is needed beyond this repo's own dependencies
(`expo` is already a dependency of `apps/mobile`, installed by `pnpm
install` in the next section) — running `pnpm --filter @my-fpl/mobile
start` gives you a QR code to scan with the Expo Go app, or `w` in that
same terminal for a quick browser-based preview with no phone needed.

---

## 7. Putting it together: cloning and first-time setup

With every tool above installed and verified, here's the full sequence
from an empty machine to a running app. (This duplicates
[README.md](README.md)'s "First-time setup" — that's the reference to
come back to later; this walks through it once, in full, with what each
step actually does.)

**Clone the repo:**

```bash
git clone <this-repo's-url>
cd my-fpl
```

**Use the right Node version and install dependencies:**

```bash
nvm use 22.2.0
pnpm install
```

`pnpm install` reads `pnpm-workspace.yaml` and every `apps/*/package.json`
+ `packages/*/package.json`, and installs everything for the whole
monorepo in one pass — you don't run `pnpm install` separately inside
`apps/web`, `apps/api`, etc.

**Make sure Docker Desktop is running** (launch it like any other app,
wait for its "running" status), then boot the local Supabase stack:

```bash
supabase start
```

The first run downloads several Docker images, so it can take a few
minutes. When it finishes, it prints a block like:

```
         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
    Inbucket URL: http://127.0.0.1:54324
      JWT secret: ...
        anon key: eyJ...
service_role key: eyJ...
```

Keep this output visible — you need several of these values next. (If
you lose it, `supabase status` reprints the same block.)

**Create your env files** from each app's `.env.example`, filling in
values from the block above:

- `apps/api/.env`:
  - `DATABASE_URL` = the **DB URL** above
  - `SUPABASE_URL` = the **API URL** above
  - `SUPABASE_SERVICE_ROLE_KEY` = the **service_role key** above
- `apps/web/.env.local`:
  - `VITE_SUPABASE_URL` = the **API URL** above
  - `VITE_SUPABASE_ANON_KEY` = the **anon key** above
  - `VITE_API_URL` = `http://127.0.0.1:4000` (where the API will run)
- `apps/mobile/.env` (only if you're setting up the mobile app):
  - `EXPO_PUBLIC_SUPABASE_URL` = the **API URL** above
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY` = the **anon key** above
  - `EXPO_PUBLIC_API_URL` = `http://127.0.0.1:4000`
  - If you're testing on a *physical phone* rather than a simulator or
    the `w` browser preview, replace `127.0.0.1` in both URLs above with
    your computer's LAN IP (e.g. `192.168.1.42`) — a phone on your Wi-Fi
    can't reach `127.0.0.1`, that always means "this same device."

**Push the database schema** (creates all the app's tables in that local
Postgres):

```bash
pnpm db:push
```

**Run the app:**

```bash
pnpm dev
```

This starts the API on `http://localhost:4000` (health check at
`/health`) and the web app on `http://localhost:5173`, together.

**Verify everything's working:** open `http://localhost:5173`, sign up a
user, create a league. See [README.md](README.md)'s "Using the app"
section for the full walkthrough from there (draft, transfer windows,
etc.).

---

## Troubleshooting quick-reference

| Symptom | Likely cause | Fix |
|---|---|---|
| `node --version` shows the wrong version after `nvm use` | nvm silently no-op'd | Prepend the version's install dir to `PATH` directly (see step 2) |
| `pnpm install -g pnpm` / `corepack enable` fails with `Cannot find matching keyid` | broken corepack signing-key check | Skip corepack; `npm install -g pnpm@9` instead |
| `docker ps` hangs forever, especially right after installing Docker Desktop | pending Windows reboot from the install | Quit Docker Desktop, reboot, relaunch |
| `docker: command not found` in a terminal, even though Docker Desktop is installed | Docker's CLI dir isn't on this shell's `PATH` | Add `...\DockerDesktop\resources\bin` to `PATH` for that session |
| `supabase start` never finishes / errors about Docker | Docker Desktop isn't running yet, or isn't finished starting | Make sure Docker Desktop's own status shows "running" first |
| Mobile app can't reach the API from a physical phone | `127.0.0.1` in `apps/mobile/.env` means "the phone itself," not your computer | Use your computer's LAN IP instead in `apps/mobile/.env` |
| API returns 401 on every request | Auth token mismatch/expired, or `SUPABASE_URL` misconfigured | Confirm `apps/api/.env`'s `SUPABASE_URL` matches the "API URL" from `supabase status` |

For anything not covered here, [CLAUDE.md](CLAUDE.md) has more on this
project's conventions and known gotchas, and [README.md](README.md) is
the day-to-day reference once your machine is set up.
