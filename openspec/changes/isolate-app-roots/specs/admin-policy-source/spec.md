# Spec Delta

## Purpose

In integration mode, the portal gets the admin's users, policies, grants and settings through
the admin's versioned HTTP contract, not by reading the admin database.

## ADDED Requirements

### Requirement: Integration Source Is Chosen By Explicit Configuration

With `ADMIN_INTEGRATION_ENABLED=true`, exactly one of `ADMIN_API_URL` or `ADMIN_DB_PATH` SHALL be set.
`ADMIN_API_URL` SHALL require `ADMIN_SERVICE_TOKEN` of at least 32 characters.

#### Scenario: HTTP source

- **WHEN** `ADMIN_API_URL` and a valid token are set and the admin answers
- **THEN** integration mode starts, and the startup log names the URL but never the token

#### Scenario: Both set

- **WHEN** `ADMIN_API_URL` and `ADMIN_DB_PATH` are both set
- **THEN** startup is refused as ambiguous

#### Scenario: Deprecated SQLite source

- **WHEN** only `ADMIN_DB_PATH` is set
- **THEN** integration runs as today and logs that the SQLite source is removed in the next release

#### Scenario: Admin unreachable at startup

- **WHEN** the first snapshot request fails
- **THEN** startup is refused; the portal never falls back to legacy mode

### Requirement: Snapshot Polling Fails Closed

The portal SHALL poll the snapshot with `If-None-Match` every `0.8 × ADMIN_SYNC_TTL_MS`. It SHALL
treat a network error, a timeout, `401`, a `5xx`, an unknown newer `contract`, or a storage volume
mismatch as "no snapshot", answering governed requests with `503 POLICY_UNAVAILABLE` until a refresh
succeeds.

#### Scenario: Unchanged

- **WHEN** the admin answers `304`
- **THEN** the current snapshot stays and its age resets

#### Scenario: Admin goes down

- **WHEN** refreshes fail for longer than `ADMIN_SYNC_TTL_MS`
- **THEN** governed endpoints answer `503 POLICY_UNAVAILABLE`, and ungoverned static assets still load

#### Scenario: Newer contract

- **WHEN** the snapshot's `contract` is greater than the newest this portal knows
- **THEN** the snapshot is refused and the log names both numbers

#### Scenario: Same decisions as SQLite

- **WHEN** the same admin data is read through either source
- **THEN** `buildSnapshot` produces equal results and `decide()` gives the same outcome for every fixture case

### Requirement: Sign-In Is Verified By The Admin

In HTTP mode, the portal SHALL verify credentials with
`POST /api/v1/integration/portal/credentials/verify` and SHALL NOT receive or store password hashes.
The session's password claim SHALL be the admin's `credentialStamp`.

#### Scenario: Password changed in the admin

- **WHEN** a user's password changes in the admin
- **THEN** that user's existing portal sessions end at the next snapshot

#### Scenario: Portal lockout first

- **WHEN** a username is locked out by the portal's own failed-attempt limit
- **THEN** the portal answers without calling the admin

### Requirement: Ops Endpoints For The Admin

With `ADMIN_SERVICE_TOKEN` set, the portal SHALL serve `GET /api/ops/log?limit=` (newest-first trace
entries) and `POST /api/ops/access-check` (`{ outcome, policies[] }` from `decide()`), each requiring
the token as `Authorization: Bearer`. Without the token they SHALL answer `404`.

#### Scenario: Wrong token

- **WHEN** a request carries a wrong or missing token
- **THEN** it answers `401` and is rate-limited per IP

#### Scenario: Logging disabled

- **WHEN** `LOG_FILE=off`
- **THEN** `/api/ops/log` answers `{ available: false, entries: [] }`
