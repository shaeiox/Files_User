# Spec Delta

## Purpose

Lets command-line tools (curl, PowerShell) download locked content by asking for credentials in
the same terminal, without a browser, a copied token or a hand-built header, and without weakening
access control.

## ADDED Requirements

### Requirement: Content routes accept HTTP Basic credentials

The portal SHALL accept `Authorization: Basic` on `GET` and `HEAD` requests to `/api/download/*`,
`/api/hash/*`, `/api/download-zip` and `/release{8,9}/latest`, but only when the request has no
valid session cookie. It SHALL verify the credentials through the same login path as the web
modal, including per-username lockout, admin account status, admin `locked_until`, and the
fail-closed behavior when the admin data is unavailable. A Basic-authenticated request SHALL be
authorized under exactly the same access-policy rules as a cookie session for that user.

#### Scenario: Correct credentials download a locked file

- **WHEN** a client sends `GET /api/download/release/el9/pvm-release-9.2.rpm` with valid Basic
  credentials for a user allowed to read it
- **THEN** the response is `200` with the file bytes

#### Scenario: Correct credentials do not bypass policy

- **WHEN** the user is valid but a `deny` row applies to the file
- **THEN** the response is `404`, identical to an anonymous request for a missing file

#### Scenario: Basic auth does not create a session

- **WHEN** any Basic-authenticated request succeeds
- **THEN** the response has no `Set-Cookie` header

#### Scenario: Basic auth is not accepted elsewhere

- **WHEN** Basic credentials are sent to `/api/files/*`, `/api/search` or `/api/auth/status`
- **THEN** they are ignored and the request is treated as anonymous

#### Scenario: Lockout applies

- **WHEN** a client sends wrong Basic passwords for one username more than
  `AUTH_MAX_FAILED_ATTEMPTS` times
- **THEN** further attempts for that username return `429` with code `LOCKED_OUT` until the
  lockout expires, even if a later password is correct

### Requirement: Credentials are accepted only over a secure transport

The portal SHALL refuse Basic credentials on a request that is neither TLS (`socket.encrypted` or
`X-Forwarded-Proto: https`) nor from a loopback address. It SHALL respond `400` with code
`INSECURE_TRANSPORT` and SHALL NOT verify the password.

#### Scenario: Plain HTTP from a remote host

- **WHEN** a remote client sends Basic credentials over plain HTTP
- **THEN** the response is `400 INSECURE_TRANSPORT` and no login attempt is recorded

### Requirement: Non-browser clients are challenged; browsers are not

On a `401 AUTH_REQUIRED` from a route listed above, the portal SHALL include
`WWW-Authenticate: Basic realm="CloudAvid Downloads", charset="UTF-8"` if, and only if, the request
has no `Sec-Fetch-Mode` header. For such requests that do not accept `application/json`, the body
SHALL be a single line of `text/plain` that states the problem and how to retry.

#### Scenario: curl is challenged and prompts in the terminal

- **WHEN** a user runs `curl.exe -fLOJ -u alice "https://host/release9/latest"` in
  Command Prompt or PowerShell
- **THEN** curl prompts `Enter host password for user 'alice':` in the same terminal, with the
  input hidden, and after the correct password the file is saved

#### Scenario: PowerShell prompts for username and password

- **WHEN** a user runs `Invoke-WebRequest "<url>" -Credential (Get-Credential) -Authentication Basic
  -OutFile pkg.rpm` in PowerShell 7
- **THEN** PowerShell prompts for the username and password and the download completes after a
  correct entry

#### Scenario: Browsers keep the portal modal

- **WHEN** a browser (sending `Sec-Fetch-Mode`) receives the same `401`
- **THEN** the response has no `WWW-Authenticate` header and is JSON, so no native browser dialog
  appears

#### Scenario: Clear failure message

- **WHEN** a user enters a wrong password
- **THEN** the response is `401` with the body `Invalid username or password.` (printed by
  PowerShell and by curl without `-o`/`-O`; curl with `-f` reports `returned error: 401`), the
  command exits non-zero, and no file is written

### Requirement: Passwords never appear in commands, history or logs

The commands the portal shows SHALL NOT contain a password or a placeholder for
one, and SHALL rely on the tool's own hidden prompt. The server SHALL NOT log the `Authorization`
header or any part of the password.

#### Scenario: Shown command

- **WHEN** a signed-in user views a CLI command on the Release page or in the file inspector
- **THEN** the command includes `-u <their username>` and no password or `user:password` form

#### Scenario: Anonymous visitors keep the plain command

- **WHEN** the visitor is not signed in
- **THEN** the shown command has no `-u` option, as today
