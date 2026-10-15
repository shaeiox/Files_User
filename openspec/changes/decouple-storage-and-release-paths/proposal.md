# Proposal

Sibling of the admin change of the same name. The full analysis and decisions (D1–D7) are in
`D:\Projects\Admin-Files-Manager-fixed\openspec\changes\decouple-storage-and-release-paths\design.md`.
This file covers only the portal side.

## Why

Integration mode assumes `FILES_ROOT` is the same directory as the admin's `STORAGE_ROOT`
(`clientPathOf` builds `"/" + rel`). Nothing checks this, and a mismatch makes every governed
path *ungoverned*, which means allowed at `download`. It is a silent fail-open.

`RELEASE_PVM` is an OS path that must sit inside `FILES_ROOT`. Otherwise `releaseRel()` returns
`null` and release protection turns off.

Relative path variables resolve against the code directory, so state follows the release
directory.

## What Changes

- **Volume check (new, fail closed).** In integration mode, startup and every snapshot refresh
  look for a trusted `.dimension-volume` of `integration_settings.volume_id` at or above `FILES_ROOT`. A missing,
  unreadable or different marker refuses startup, or answers `503 POLICY_UNAVAILABLE` at runtime.
- **FILES_ROOT may be any folder of the admin storage, with nothing to match (new).** The portal
  climbs from `FILES_ROOT` to the first trusted marker of the volume (the storage-root marker, or
  the folder marker the admin published) and derives its position. Example: admin
  `C:\Users\eleven`, portal `C:\Users\eleven\Downloads` → `/Downloads`, with no admin setting.
  Portal path `rel` maps to `join(position, rel)`, so policies on that folder and on every ancestor
  apply. A copied, stale subfolder marker is not trusted.
- **Release folder from the database.** In integration mode the release folder is
  `integration_settings.release_client_path` (a full admin client path), used when it is inside
  the portal's position and resolved under `FILES_ROOT`. `RELEASE_PVM` is ignored, with a warning.
  Legacy mode is unchanged. Navbar folders outside the position are dropped.
- **Tunables from the database.** Session minutes, failed-attempt limit and lockout minutes come
  from the database, then env, then the default. They are re-read every snapshot, so no restart
  is needed.
- **Schema gate ≤ 5.** A v4 database is still accepted. No volume check is possible there, and
  the portal logs a warning. That compatibility is removed one release after rollout.
- **Production paths.** With `NODE_ENV=production`, relative `FILES_ROOT`, `ADMIN_DB_PATH`,
  `LOG_FILE`, `AUTH_USERS_FILE` and `RELEASE_PVM` refuse startup. A new `PORTAL_DATA_DIR` is the
  base for `users.json` and `portal.log` defaults.
- The admin stops editing this project's `.env`. Nothing here depends on that, so no portal change
  is needed for it.

## Non-goals

Several portal roots or tenants in one portal (designed in the admin change, D2; deferred). A
release volume outside `FILES_ROOT`: bind-mount it inside instead. Any change to access rules.
