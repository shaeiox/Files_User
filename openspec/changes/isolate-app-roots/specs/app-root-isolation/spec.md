# Spec Delta

## Purpose

The portal's code folder can sit at any path, under any name, read-only, with no knowledge of
where the Admin Files Manager lives, and it still works.

## ADDED Requirements

### Requirement: The Code Folder Holds No State In Production

With `NODE_ENV=production`, the portal SHALL refuse to start when `PORTAL_DATA_DIR`, the directory of
`LOG_FILE`, or (in legacy mode) the directory of `AUTH_USERS_FILE` resolves after symlinks to the
code folder or any folder inside it.

#### Scenario: State outside the code folder

- **WHEN** `PORTAL_DATA_DIR=/var/lib/files-portal` and the code folder is anywhere else
- **THEN** `portal-state.sqlite`, `portal.log` and `users.json` are written only under `/var/lib/files-portal`

#### Scenario: State inside the code folder

- **WHEN** `PORTAL_DATA_DIR` resolves to `<code folder>/data`
- **THEN** startup is refused with a message naming the variable and the code folder

#### Scenario: Development

- **WHEN** `NODE_ENV` is not `production` and `PORTAL_DATA_DIR` is unset
- **THEN** `<code folder>/data` is used, unchanged

### Requirement: FILES_ROOT Never Overlaps The Portal

The portal SHALL refuse to start in production, and warn otherwise, when `FILES_ROOT` after symlinks
equals, contains, or is contained by the code folder or `PORTAL_DATA_DIR`.

#### Scenario: FILES_ROOT contains the portal

- **WHEN** `FILES_ROOT=/opt/` and the code folder is `/opt/devel/PRO/<any name>`
- **THEN** production startup is refused, and no endpoint can serve the portal's state database or source code

### Requirement: No Reference To The Admin's Folders

The portal SHALL NOT need any path inside the admin's code or data folder when it integrates over
HTTP. The only admin-specific configuration SHALL be `ADMIN_API_URL` and `ADMIN_SERVICE_TOKEN`.

#### Scenario: Admin folder moved

- **WHEN** the admin's code and data folders are moved or renamed and its URL is unchanged
- **THEN** the portal keeps working with no configuration change

### Requirement: Relocation Is Verified In CI

CI SHALL copy the repository to a fresh temporary path with spaces in its name, make it read-only,
and run `npm test` and a smoke start (`/livez`, `/readyz`). A lint step SHALL fail on references to
the sibling repository or to machine-specific absolute paths in `lib`, `test`, `scripts` and `docs`.

#### Scenario: Both apps in unrelated folders

- **WHEN** the optional joint job starts the admin and the portal from two unrelated temporary folders, linked only by URL and token
- **THEN** a governed download is allowed for a granted user and refused for a visitor

### Requirement: FILES_ROOT May Be Any Folder

In integration mode the portal SHALL start with `FILES_ROOT` at any existing folder, inside the
admin storage or not. It SHALL NOT refuse because no storage marker is found. Its admin folder
(position) SHALL be, in order:
1. `FILES_ROOT_ADMIN_PATH` when set;
2. a trusted storage marker at or above `FILES_ROOT` (verified);
3. the Portal folder published in the admin;
4. `/`.

A position that is not verified by a marker SHALL be logged once at startup.

#### Scenario: Unrelated folder

- **WHEN** `FILES_ROOT=/tmp/share` holds no marker and the admin publishes no Portal folder
- **THEN** the portal starts with position `/`, and an admin policy on `/a` governs `FILES_ROOT/a`

#### Scenario: Explicit mapping

- **WHEN** `FILES_ROOT_ADMIN_PATH=/Downloads`
- **THEN** the position is `/Downloads` even if a marker says otherwise

#### Scenario: Invalid mapping

- **WHEN** `FILES_ROOT_ADMIN_PATH` is relative or contains `..`
- **THEN** startup is refused naming the variable

