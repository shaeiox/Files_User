# Spec Delta

## Purpose

Defines how portal users authenticate against the Admin Files Manager's `users` table when admin
integration is enabled, and how admin-side account changes end or refuse portal sessions within a
bounded synchronization interval, without the portal ever writing to the admin database.

## ADDED Requirements

### Requirement: Integration mode authenticates only against admin user records

When admin integration is enabled, the portal SHALL accept a login only for a row in the admin
`users` table. It SHALL NOT consult any portal-local user store, and it SHALL NOT create, update or
delete any row in the admin database.

#### Scenario: An admin-created user logs in to the portal

- **WHEN** an administrator has created user `erfan` in the admin app and `erfan` submits the
  correct password to the portal
- **THEN** the portal responds `200` and issues a session for that admin user id

#### Scenario: A portal-local user is not accepted

- **WHEN** a username exists only in the portal's legacy user file and not in the admin `users`
  table
- **THEN** the login is refused with the generic invalid-credentials response

#### Scenario: Login does not write to the admin database

- **WHEN** any login attempt succeeds or fails
- **THEN** no row in the admin database changes

### Requirement: Passwords are verified in the admin hash format

The portal SHALL verify a submitted password against `users.password_hash` using the admin
application's own scheme: scrypt with a 64-byte key over the stored `"<saltHex>:<hashHex>"`, where
the salt hex string is used as-is, with a timing-safe comparison.

#### Scenario: Correct password

- **WHEN** the password matches the admin-format hash
- **THEN** the login succeeds

#### Scenario: Wrong password and unknown user look identical

- **WHEN** one login uses a wrong password for an existing user and another uses a username that
  does not exist
- **THEN** both receive the same status code and the same response body

#### Scenario: Malformed stored hash

- **WHEN** the stored `password_hash` is not in the admin format
- **THEN** the login is refused and is never treated as a match

### Requirement: Usernames follow the admin's matching rules

The portal SHALL trim the submitted username and match it case-insensitively against
`users.username`, accepting any username the admin application can store. It SHALL NOT apply a
portal-specific character or length pattern in integration mode beyond a bounded maximum length.

#### Scenario: Username with a dot

- **WHEN** admin user `john.doe` submits correct credentials
- **THEN** the login succeeds

#### Scenario: Case and surrounding spaces

- **WHEN** admin user `Erfan` submits the username ` erfan ` with the correct password
- **THEN** the login succeeds

### Requirement: Disabled accounts cannot log in

A user whose `users.status` is not `active` SHALL be refused at login with the generic
invalid-credentials response, regardless of whether the password is correct.

#### Scenario: Disabled user with the correct password

- **WHEN** a user with `status = 'disabled'` submits the correct password
- **THEN** the login is refused with the same response as a wrong password

### Requirement: The admin login lock is honored

A user whose `users.locked_until` is later than the current time SHALL be refused at login, and the
response SHALL report a retry-after duration. This check SHALL apply only to login; an existing
session SHALL NOT be ended by `locked_until`, matching the admin application.

#### Scenario: Locked account

- **WHEN** `locked_until` is 10 minutes in the future and the correct password is submitted
- **THEN** the login is refused with `LOCKED_OUT` and a positive retry-after value

#### Scenario: Lock has expired

- **WHEN** `locked_until` is in the past and the correct password is submitted
- **THEN** the login succeeds

### Requirement: Portal login throttling is portal-local

Because the portal has read-only access, it SHALL NOT increment `users.failed_login_count` or set
`users.locked_until`. It SHALL apply its own per-username throttle, configured by
`AUTH_MAX_FAILED_ATTEMPTS` and `AUTH_LOCKOUT_MINUTES`, in addition to the admin lock.

#### Scenario: Repeated portal failures

- **WHEN** a username reaches the portal's failure threshold
- **THEN** further portal logins for that username are refused with `LOCKED_OUT` until the portal
  lockout expires
- **AND** the admin `users` row is unchanged

### Requirement: Sessions end when the account is disabled or deleted

On every request that depends on identity, the portal SHALL confirm that the session's user still
exists and is `active` in the admin data, using data no older than the synchronization interval.
A failed check SHALL make the request behave as anonymous.

#### Scenario: User disabled after login

- **GIVEN** a user with a valid portal session
- **WHEN** an administrator sets the user to `disabled` and the synchronization interval elapses
- **THEN** the next request that requires login is answered as unauthenticated

#### Scenario: User deleted after login

- **WHEN** an administrator deletes the user and the synchronization interval elapses
- **THEN** the session no longer authenticates

### Requirement: Sessions end when the password changes

A portal session SHALL be bound to the user's stored password hash at login. After an administrator
resets that user's password, the session SHALL stop authenticating within the synchronization
interval.

#### Scenario: Admin resets the password

- **GIVEN** a user with a valid portal session
- **WHEN** an administrator resets that user's password and the synchronization interval elapses
- **THEN** the old session no longer authenticates
- **AND** logging in with the new password succeeds

### Requirement: Role does not change file access

`users.role` SHALL NOT grant or remove access to any file in the portal. An `admin`-role user SHALL
be evaluated by the same file-access rules as a `user`-role user.

#### Scenario: Admin-role user and a restricted file

- **WHEN** an `admin`-role user without a grant requests a `restricted` file
- **THEN** the file is hidden from that user, exactly as for a `user`-role user

### Requirement: Admin data is synchronized within a bounded interval

The portal SHALL reflect changes to admin users, policies and permissions within a synchronization
interval set by `ADMIN_SYNC_TTL_MS`, defaulting to 5000 ms, without a restart.

#### Scenario: Default interval

- **WHEN** an administrator changes a user or policy and 5 seconds elapse
- **THEN** the portal's next decision uses the new data

### Requirement: Identity checks fail closed

When integration is enabled and the admin database cannot be read or its user data is invalid, the
portal SHALL refuse logins with a server-error code and SHALL treat existing sessions as
unauthenticated. It SHALL NOT fall back to the legacy user file or to anonymous-is-allowed behavior.

#### Scenario: Database unreadable at runtime

- **WHEN** the admin database becomes unreadable after startup
- **THEN** logins fail with `SERVER_ERROR`
- **AND** no governed file becomes accessible

### Requirement: Admin "Revoke sessions" ends portal sessions

When an administrator uses "Revoke sessions" on a user, every portal session for that user that
logged in at or before that moment SHALL stop authenticating within the synchronization interval.
The portal SHALL detect this from the admin's successful `user.revoke_sessions` audit record, SHALL
measure it against the session's original login time (not renewals), and SHALL accept new logins.

#### Scenario: Admin revokes a user's sessions

- **GIVEN** an active user with a valid portal session
- **WHEN** an administrator uses "Revoke sessions" on that user and the synchronization interval
  elapses
- **THEN** the next request with that session is unauthenticated with reason `SESSION_REVOKED`
- **AND** the user can log in again and the new session works

#### Scenario: Renewal does not escape a revocation

- **GIVEN** a session that was renewed after login
- **WHEN** the user's sessions are revoked
- **THEN** the renewed session is refused too

#### Scenario: Other users and failed revocations

- **WHEN** one user's sessions are revoked and a revocation attempt for another user failed
- **THEN** only the first user's sessions end

#### Scenario: Malformed revocation record

- **WHEN** the latest revocation time for a user is not an integer
- **THEN** that user cannot authenticate
