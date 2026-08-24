# Changelog

Notable changes to my-fpl, newest first. Loosely follows
[Keep a Changelog](https://keepachangelog.com/); dated entries instead of
version numbers since this app doesn't ship releases. History from before
this file existed (the original 8 build phases, automated gameweek
finalization, and cup competitions) is narrated in
[docs/plan.md](docs/plan.md) instead — this file picks up from there.

## 2026-08-24 — Fix stale icons after re-upload

- Icon uploads (`uploadIconFile` in `apps/api/src/domain/icons.ts`) now
  append a `?v=<timestamp>` cache-buster to the stored `iconUrl`. Uploads
  upsert to a stable per-entity storage path with a long browser cache
  lifetime, so re-uploading a new icon was previously invisible in a
  browser that had already cached the old one at that URL until the
  cache naturally expired.

## 2026-08-24 — Icon uploads for leagues, teams, and cups

- Added an uploadable icon per league, per manager ("team" icon — there's
  no separate team entity, so it lives on `profiles`), and per cup
  competition, stored in a new Supabase Storage `icons` bucket.
- New endpoints: `POST /leagues/:id/icon`, `POST /leagues/:id/cups/:cupId/icon`
  (both commissioner-only), `POST /profiles/me/icon`.
- Renamed the previously-unused `profiles.avatarUrl` column to `iconUrl`
  and wired it up, rather than adding a fourth near-duplicate picture
  field.

## 2026-08-24 — Season switcher dropdown

- The league history/season UI now lists every known season a
  commissioner can switch to directly (`GET /seasons`), instead of only
  offering blank text/date inputs framed as "start new" with no way to
  see past seasons' exact dates.
- Switching to an existing season sends its real stored dates
  automatically instead of requiring them to be retyped from memory.
