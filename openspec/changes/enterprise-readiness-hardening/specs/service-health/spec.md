# Spec Delta

## Purpose

Lets process supervisors and load balancers tell a running portal apart from one that can
actually serve content, without either probe exposing anything about the content itself.

## ADDED Requirements

### Requirement: Liveness probe
The portal SHALL answer `GET /livez` with `200` and `{"status":"ok"}` whenever the process is
accepting requests, without touching the filesystem or the admin database. `GET /api/health`
and `GET /__health` SHALL keep their current behaviour and body.

#### Scenario: Process up, content unavailable
- **WHEN** `FILES_ROOT` is unreadable and a client requests `GET /livez`
- **THEN** the portal answers `200` with `{"status":"ok"}`

#### Scenario: Legacy health URL kept
- **WHEN** a client requests `GET /api/health`
- **THEN** the portal answers `200` with a body that includes `"status":"ok"` and `uptime`, as today

### Requirement: Readiness probe
The portal SHALL answer `GET /readyz` with `200` only when `FILES_ROOT` is a readable directory
and, in integration mode, the admin snapshot can be read and validated. Otherwise it SHALL
answer `503`. Either body SHALL name each failed check by a fixed identifier only.

#### Scenario: Ready
- **WHEN** `FILES_ROOT` is readable and, in integration mode, the admin snapshot is valid
- **THEN** `GET /readyz` answers `200` with `{"status":"ready","checks":{"filesRoot":"ok","adminPolicy":"ok"}}` (`adminPolicy` is `"skipped"` in legacy mode)

#### Scenario: Admin database unreadable
- **WHEN** integration mode is on and the admin snapshot cannot be read or fails validation
- **THEN** `GET /readyz` answers `503` with `checks.adminPolicy` set to `"fail"`

#### Scenario: Content root missing
- **WHEN** `FILES_ROOT` no longer exists
- **THEN** `GET /readyz` answers `503` with `checks.filesRoot` set to `"fail"`

### Requirement: Probes disclose no internals
Probe responses SHALL NOT include filesystem paths, error messages, user data or version
strings, and SHALL NOT require authentication.

#### Scenario: Failure detail withheld
- **WHEN** `GET /readyz` fails because of a filesystem error
- **THEN** the body contains only the fixed check identifiers and states, never the path or the error text

#### Scenario: Unauthenticated probe
- **WHEN** auth is enabled and an anonymous client requests `GET /livez` or `GET /readyz`
- **THEN** the portal answers without asking for sign-in
