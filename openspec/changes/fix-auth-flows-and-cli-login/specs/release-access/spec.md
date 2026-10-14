# Spec Delta

## Purpose

Defines when the Release page and its endpoints require login, where that decision is configured,
and how the page asks the visitor to sign in.

## ADDED Requirements

### Requirement: In integration mode, release protection comes from the admin folder lock

When admin integration is enabled, the portal SHALL decide whether release content requires login
only from the Admin Files Manager's policy on the `RELEASE_PVM` folder (or its OS subfolder). It
SHALL NOT apply the `.env`-derived release gate (`pathRequiresAuth`) in that mode. A change in the
Admin UI SHALL take effect within `ADMIN_SYNC_TTL_MS` without a restart.

#### Scenario: Administrator locks the release folder

- **WHEN** the release folder is locked in the Admin Files Manager and an anonymous visitor
  requests `/api/releases?os=el9`
- **THEN** the response is `401` with code `AUTH_REQUIRED`

#### Scenario: Administrator unlocks the release folder

- **WHEN** the lock is removed and the sync interval has passed
- **THEN** an anonymous `/api/releases?os=el9` returns `200` with the release items, and no
  server restart or `.env` edit was needed

#### Scenario: Per-OS lock

- **WHEN** only `<release>/el8` is locked
- **THEN** anonymous `/api/releases?os=el8` is `401` and `/api/releases?os=el9` is `200`

#### Scenario: Hidden release folder looks empty

- **WHEN** the release OS folder is hidden for the caller (unpublished, outside its window, or
  denied)
- **THEN** `/api/releases` for that OS returns `200` with no items, the same response as having no
  releases

#### Scenario: Startup warning for an unprotected release folder

- **WHEN** the server starts in integration mode with `RELEASE_PVM` set and no lock policy on that
  folder
- **THEN** it logs exactly one warning that release content is public and how to lock it

### Requirement: Legacy mode keeps the `.env` release gate

When admin integration is not enabled, the existing rule SHALL apply unchanged: with
`AUTH_ENABLED=true` and `RELEASE_PVM` set, release endpoints and the release subtree require a
session.

#### Scenario: Legacy deployment

- **WHEN** integration is disabled, `AUTH_ENABLED=true`, `RELEASE_PVM=release`, and an anonymous
  visitor requests `/api/releases`
- **THEN** the response is `401 AUTH_REQUIRED`, as before this change

### Requirement: The Release page opens the login modal whenever login is required

When the Release page receives `401 AUTH_REQUIRED`, its "Authenticate" control SHALL open the login
modal on the first activation, whether or not any other page has been visited or the modal has
been opened before. After a successful login, the page SHALL reload the release list and the lead
card for the active OS tab without a full page reload.

#### Scenario: Direct visit to the Release page

- **WHEN** a visitor opens `/download/release` directly in a new tab, the release folder is
  locked, and they activate "Authenticate"
- **THEN** the login modal opens

#### Scenario: Release list appears after login

- **WHEN** the visitor logs in successfully from that modal
- **THEN** the modal closes and the release table for the active OS tab is shown

#### Scenario: Keyboard activation

- **WHEN** the "Authenticate" control is focused and activated with Enter or Space
- **THEN** the login modal opens and focus moves to the username field
