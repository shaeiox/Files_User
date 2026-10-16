# Spec Delta

## Purpose

Keeps logout revocations, login lockouts and rate limits in force across restarts and across
every portal process that shares one data directory, so scaling out or restarting never
reopens a closed session or resets an attacker's counters.

## ADDED Requirements

### Requirement: Logout revocation survives restart
A session ended by `POST /api/auth/logout` SHALL stay revoked until its tokens would have
expired anyway, including after the portal restarts.

#### Scenario: Old cookie after restart
- **WHEN** a user signs out, the portal restarts, and the old session cookie is sent to `GET /api/auth/status`
- **THEN** the response has `authenticated:false` and `reason:"SESSION_REVOKED"`

### Requirement: Revocation shared across processes
A logout handled by one portal process SHALL be honoured by every other process using the
same `PORTAL_DATA_DIR`, within one second.

#### Scenario: Logout on one instance, reuse on another
- **WHEN** two portal processes share a data directory, a user signs out through process A, and one second later the old cookie is sent to process B
- **THEN** process B answers with `authenticated:false` and `reason:"SESSION_REVOKED"`

### Requirement: Lockout survives restart and is shared
Failed sign-in counts and lockouts SHALL persist across restarts and be shared by every process
using the same `PORTAL_DATA_DIR`. Thresholds and durations are unchanged (admin tunables, then
env, then defaults).

#### Scenario: Restart does not unlock
- **WHEN** an account is locked out and the portal restarts before the lockout ends
- **THEN** the next sign-in for that account answers `429` with `code:"LOCKED_OUT"` and `retryAfterMs` of the remaining time

#### Scenario: Attempts counted across processes
- **WHEN** the failure limit is 5 and a client fails 3 times against process A and 2 times against process B
- **THEN** the account is locked out on both processes

### Requirement: Rate limit shared across processes
The per-client request limit (`RATE_LIMIT_MAX_REQUESTS` per `RATE_LIMIT_WINDOW_MS`) SHALL count
requests from every process using the same `PORTAL_DATA_DIR` together, overshooting by at most
20 requests per process per window. Exceeding it SHALL answer `429` with `code:"RATE_LIMITED"`.

#### Scenario: Requests spread over two processes
- **WHEN** the limit is 120 per minute and one client sends 100 requests to process A and 100 to process B within a minute
- **THEN** at most 160 of the 200 requests succeed and the rest are answered `429` with `code:"RATE_LIMITED"`

### Requirement: Fail closed for sessions and sign-in
If the security state cannot be read or written, the portal SHALL NOT accept a session it
cannot confirm is unrevoked, and SHALL NOT accept a sign-in it cannot count. Rate limiting
alone SHALL fall back to per-process counting and log a warning.

#### Scenario: Store unavailable during status check
- **WHEN** the security-state store cannot be read and a client sends a valid-looking session cookie
- **THEN** the response has `authenticated:false` and protected content is refused; the portal never treats the session as valid

#### Scenario: Store unavailable during sign-in
- **WHEN** the security-state store cannot be written and a client signs in
- **THEN** the portal answers `503` with `code:"SERVER_ERROR"` and issues no session cookie

#### Scenario: Store unavailable during sign-out
- **WHEN** the security-state store cannot be written and a signed-in client calls `POST /api/auth/logout`
- **THEN** the portal answers `503` with `code:"SERVER_ERROR"` and still clears the session cookie

#### Scenario: Store unavailable for rate limiting
- **WHEN** the store cannot be written and requests arrive
- **THEN** requests are still limited per process and a warning is written to the trace

### Requirement: State store holds no secrets
The security-state store SHALL NOT hold passwords, password hashes, session tokens or the JWT
secret. It holds only session IDs, usernames as keys, client addresses, counters and expiry
times, and it purges expired rows.

#### Scenario: Inspect the store
- **WHEN** an operator opens the security-state file after users have signed in and out
- **THEN** it contains no token, hash or password, and no row that expired more than 10 minutes earlier
