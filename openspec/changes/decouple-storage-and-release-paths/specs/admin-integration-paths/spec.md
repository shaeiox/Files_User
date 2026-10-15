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

With `NODE_ENV=production`, the portal SHALL refuse startup when `FILES_ROOT`, `ADMIN_DB_PATH`,
`LOG_FILE`, `AUTH_USERS_FILE` or `RELEASE_PVM` is relative. Default data files SHALL live under
`PORTAL_DATA_DIR`.

#### Scenario: Relative path in production

- **WHEN** `NODE_ENV=production` and `ADMIN_DB_PATH=./admin.sqlite`
- **THEN** startup is refused naming the variable

#### Scenario: Development unchanged

- **WHEN** `NODE_ENV` is not `production`
- **THEN** relative values still resolve against the project root
