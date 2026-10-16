# Spec Delta

## Purpose

Makes the portal refuse to start on any configuration it cannot use as written, so a typo
never quietly turns off a protection or changes a limit, and the operator sees every problem
at once.

## ADDED Requirements

### Requirement: All problems reported together
At startup the portal SHALL check every configuration variable before it listens. If any check
fails, it SHALL print every problem, each naming the variable, and exit with a non-zero status
without opening the port. This covers the existing path and admin-integration checks.

#### Scenario: Two bad values
- **WHEN** `PORT=abc` and `RATE_LIMIT_MAX_REQUESTS=-5` are set
- **THEN** the portal prints one problem for `PORT` and one for `RATE_LIMIT_MAX_REQUESTS`, does not listen, and exits non-zero

#### Scenario: Valid configuration
- **WHEN** every variable is unset or valid
- **THEN** the portal starts as today, with defaults for unset values

### Requirement: Numeric values validated
Every numeric variable (`PORT`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`,
`RATE_LIMIT_MAX_IPS`, `AUTH_SESSION_MINUTES`, `AUTH_MAX_FAILED_ATTEMPTS`,
`AUTH_LOCKOUT_MINUTES`, `AUTH_MAX_FAILED_ENTRIES`, `AUTH_FAILED_IDLE_MS`, `ADMIN_SYNC_TTL_MS`,
`CONTENT_INDEX_TTL_MS`, `CONTENT_INDEX_MAX_DIRS`)
SHALL be a whole number within its documented range when set. Anything else SHALL refuse
startup.

#### Scenario: Non-numeric limit
- **WHEN** `RATE_LIMIT_MAX_REQUESTS=lots` is set
- **THEN** startup is refused with a problem naming `RATE_LIMIT_MAX_REQUESTS` and its accepted range

#### Scenario: Out-of-range sync interval
- **WHEN** `ADMIN_SYNC_TTL_MS=500` is set (range 1000–60000)
- **THEN** startup is refused rather than the value being silently clamped

### Requirement: Boolean values validated
Every boolean variable (`AUTH_ENABLED`, `ADMIN_INTEGRATION_ENABLED`, `AUTH_BASIC_ALLOW_HTTP`)
SHALL accept only `true/1/yes/on` or `false/0/no/off`, in any case, or be unset. Unset keeps
today's default. Any other value SHALL refuse startup.

#### Scenario: Typo in AUTH_ENABLED
- **WHEN** `AUTH_ENABLED=ture` is set
- **THEN** startup is refused with a problem naming `AUTH_ENABLED`; the portal never starts with auth silently off

### Requirement: Signing secret checked at startup
When auth is enabled, an `AUTH_JWT_SECRET` shorter than 32 characters SHALL refuse startup.
Today it is only rejected at the first sign-in.

#### Scenario: Short secret
- **WHEN** `AUTH_ENABLED=true` and `AUTH_JWT_SECRET` has 10 characters
- **THEN** startup is refused with a problem naming `AUTH_JWT_SECRET`, and the secret's value is not printed

### Requirement: Values never echoed for secrets
Problem messages SHALL quote the offending value for ordinary variables, but SHALL NEVER print
the value of `AUTH_JWT_SECRET` or any variable whose name ends in `_SECRET`, `_PASSWORD` or
`_TOKEN`.

#### Scenario: Secret problem message
- **WHEN** startup is refused because of `AUTH_JWT_SECRET`
- **THEN** the message states the rule and the variable name only

### Requirement: Configuration dry run
`node server.js --check-config` SHALL run every startup check against the current environment
and `.env`, print the same problems startup would, and exit `0` when there are none or
non-zero otherwise. It SHALL NOT listen, write files or open the admin database for writing.

#### Scenario: Validate before deploy
- **WHEN** an operator runs `node server.js --check-config` with `AUTH_ENABLED=ture` in the env file
- **THEN** it prints the `AUTH_ENABLED` problem, exits non-zero, and no port is opened

#### Scenario: Clean configuration
- **WHEN** every variable is valid
- **THEN** it prints that the configuration is usable and exits `0`
