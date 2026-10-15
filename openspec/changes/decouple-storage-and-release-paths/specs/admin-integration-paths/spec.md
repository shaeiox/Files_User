# Spec Delta

## Purpose

How the portal binds to the admin's storage and release folder in integration mode. Identity is
proven, never assumed from equal paths.

## ADDED Requirements

### Requirement: Integration Mode Verifies The Storage Volume

In integration mode against a v5 admin database, the portal SHALL compare the UUID in
`FILES_ROOT/.dimension-volume` with `integration_settings.volume_id`. It SHALL refuse to serve
governed content when they differ.

#### Scenario: Matching volume

- **WHEN** the marker exists and holds the stored UUID
- **THEN** integration mode starts and policies apply with `client_path = "/" + rel`

#### Scenario: Wrong root at startup

- **WHEN** `FILES_ROOT` holds no marker, an unreadable marker, or a different UUID
- **THEN** startup is refused with a message naming `FILES_ROOT` and the expected UUID
- **AND** the portal never falls back to legacy mode

#### Scenario: Volume changes while running

- **WHEN** a snapshot refresh finds the marker missing or different
- **THEN** content endpoints answer `503 POLICY_UNAVAILABLE` until a refresh matches again

#### Scenario: v4 database during rollout

- **WHEN** the admin database is schema v4
- **THEN** the portal runs as before and logs a warning that the volume is unverified

#### Scenario: The marker is never served

- **WHEN** a caller lists, searches, downloads, hashes or zips `.dimension-volume`
- **THEN** it is absent from listings and refused as a missing path
- **AND** the same holds for every hidden entry (any dot-prefixed segment), which closes a gap where
  `/api/download` and `/api/hash` served dotfiles by name

### Requirement: FILES_ROOT May Be Any Folder Of The Admin Storage

The portal SHALL derive which admin folder its canonical `FILES_ROOT` is, from the nearest trusted
marker of this volume at or above it, without any matching setting. It SHALL map portal path `rel`
to admin client path `join(position, rel)`. Trusted markers are the storage-root marker and the
folder marker the admin published.

#### Scenario: Portal in a subfolder, nothing configured in the admin

- **WHEN** the admin `STORAGE_ROOT` holds the storage-root marker, `FILES_ROOT` is its `Downloads` folder, and `portal_root_client_path` is unset
- **THEN** integration mode starts with position `/Downloads`
- **AND** portal path `docs/a.txt` is decided as admin client path `/Downloads/docs/a.txt`, under the policies on `/`, `/Downloads`, `/Downloads/docs` and the file

#### Scenario: Deeper subfolder

- **WHEN** `FILES_ROOT` is `STORAGE_ROOT/Downloads/team/a`
- **THEN** the position is `/Downloads/team/a`

#### Scenario: Isolated host with a published folder marker

- **WHEN** only the folder is visible, it holds a marker with `clientPath "/Downloads"`, and the admin published `/Downloads`
- **THEN** the position is `/Downloads` (or below it, for a `FILES_ROOT` inside that folder)

#### Scenario: Copied or stale subfolder marker is not trusted

- **WHEN** the only marker found has this volume but a `clientPath` that is neither `/` nor the published folder
- **THEN** it is skipped; with no trusted marker, startup is refused and content endpoints answer `503` while running

#### Scenario: Release folder and navbar folders outside the position

- **WHEN** the release folder or a navbar folder is not strictly inside the position
- **THEN** it is ignored (logged once for the release folder) and never resolved outside `FILES_ROOT`

### Requirement: The Release Folder Comes From The Admin Database

In integration mode the portal SHALL take the release folder from
`integration_settings.release_client_path`, and SHALL ignore `RELEASE_PVM`.

#### Scenario: Release folder set

- **WHEN** `release_client_path` is `/release/pvm`
- **THEN** `/api/releases` and `/release{8,9}/latest` scan `FILES_ROOT/release/pvm` (and `/el8`, `/el9`)
- **AND** release protection is the admin lock on `/release/pvm`, exactly as before

#### Scenario: RELEASE_PVM still set

- **WHEN** `RELEASE_PVM` is set in integration mode
- **THEN** the portal logs at startup that it is ignored

#### Scenario: No release folder

- **WHEN** `release_client_path` is null
- **THEN** releases behave as with an unset `RELEASE_PVM` today

#### Scenario: Legacy mode

- **WHEN** integration mode is off
- **THEN** `RELEASE_PVM` behaves exactly as today

### Requirement: Auth Tunables Follow The Admin Database

In integration mode, session minutes, failed-attempt limit and lockout minutes SHALL be taken from
`integration_settings` when valid, else from env, else from the default. They SHALL be re-read on
each snapshot refresh.

#### Scenario: Admin changes session length

- **WHEN** the stored session length changes
- **THEN** sessions issued after the next refresh use it, without a restart

#### Scenario: Invalid stored value

- **WHEN** a stored value is outside its range
- **THEN** the env or default value is used and the problem is logged once

### Requirement: Production Paths Are Absolute

With `NODE_ENV=production`, the portal SHALL refuse startup when `PORTAL_DATA_DIR` is unset, or
when `PORTAL_DATA_DIR`, `FILES_ROOT`, `ADMIN_DB_PATH`, `LOG_FILE`, `AUTH_USERS_FILE` or
`RELEASE_PVM` is relative. Default data files SHALL live under `PORTAL_DATA_DIR`.

#### Scenario: Relative path in production

- **WHEN** `NODE_ENV=production` and `ADMIN_DB_PATH=./admin.sqlite`
- **THEN** startup is refused naming the variable

#### Scenario: Data directory required in production

- **WHEN** `NODE_ENV=production` and `PORTAL_DATA_DIR` is unset
- **THEN** startup is refused, so default data files never land in the code directory

#### Scenario: Development unchanged

- **WHEN** `NODE_ENV` is not `production`
- **THEN** relative values still resolve against the project root
