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
  compare `FILES_ROOT/.dimension-volume` with `integration_settings.volume_id`. A missing,
  unreadable or different marker refuses startup, or answers `503 POLICY_UNAVAILABLE` at runtime.
- **Release folder from the database.** In integration mode the release folder is
  `integration_settings.release_client_path`, resolved under `FILES_ROOT`. `RELEASE_PVM` is
  ignored, with a warning. Legacy mode is unchanged.
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

Serving a subtree of the admin storage. A release volume outside `FILES_ROOT`: bind-mount it
inside instead. Any change to access rules.
