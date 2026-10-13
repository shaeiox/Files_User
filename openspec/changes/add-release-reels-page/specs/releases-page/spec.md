# Spec Delta

## Purpose

Gives the portal a dedicated Releases (Reels) experience: an el8/el9-tabbed view of `RELEASE_PVM` artifacts, deterministic CLI download commands for any selected file, stable per-OS "latest release" download endpoints, and navbar-only discoverability of the page.

## ADDED Requirements

### Requirement: The Releases page renders as a clean root route reachable only through the navbar

The page SHALL render at the root route `/download/release` and SHALL be reachable from the UI solely through its navbar entry. A direct visit or refresh of `/download/release` SHALL serve the page itself rather than a 404 or the home route. No other navigation element SHALL link to the route.

#### Scenario: The user clicks the navbar entry

- **WHEN** the user clicks the Releases navbar tab
- **THEN** the client-side router navigates to `/download/release` without a full page reload
- **AND** the Releases page renders inside the app shell with the shared navbar, footer, and language switch functional

#### Scenario: The route is visited directly

- **WHEN** a browser loads `/download/release` as a first request or refresh
- **THEN** the server serves the SPA shell for that path and the Releases page renders
- **AND** no other UI surface links to the route

### Requirement: The package list offers el8 and el9 tabs that switch release folders

The page SHALL present a two-tab package list labelled `el8` and `el9`, defaulting to `el9`. Each tab SHALL list the artifacts stored in the matching `RELEASE_PVM` subfolder, and switching tabs SHALL re-fetch the list for the selected folder.

#### Scenario: The user switches tabs

- **WHEN** the user selects the `el8` tab
- **THEN** the table lists only artifacts from the `el8` subfolder of `RELEASE_PVM`
- **AND** selecting `el9` lists only artifacts from the `el9` subfolder

#### Scenario: A subfolder is missing or empty

- **WHEN** the selected subfolder contains no release artifacts
- **THEN** the table renders an empty state instead of rows
- **AND** no error is raised to the user

### Requirement: Selecting a release generates a deterministic CLI download command

For any file selected in the package list, the "Deterministic Automated Fetch" section SHALL generate a ready-to-copy CLI download command whose target is the file's download URL on this host. The same file SHALL always yield the same command.

#### Scenario: A release file is selected

- **WHEN** the user selects a package row such as `pvm-release-7.1.29-el9-20261003-084116.tgz`
- **THEN** the section displays a CLI command containing the absolute download URL for exactly that file
- **AND** re-selecting the same file reproduces the identical command

### Requirement: A selected release can be checksum-verified on demand

The page SHALL let the user request a SHA-256 checksum for the selected package. The digest SHALL be computed by the server over the file's bytes, only after the user asks for it, and SHALL be shown with a ready-to-copy `sha256sum` verification command for the downloaded file.

#### Scenario: The user verifies a selected release

- **WHEN** the user selects a package row and activates Verify SHA-256
- **THEN** the page requests the checksum for exactly that file and displays its 64-character SHA-256 digest
- **AND** the section displays a command that checks the file saved by the generated download command against that digest

#### Scenario: Checksums are never computed without a request

- **WHEN** the package list loads or the user changes the selected row
- **THEN** no checksum is requested
- **AND** any digest shown for a previously selected file is cleared

#### Scenario: The checksum cannot be computed

- **WHEN** the file is too large to hash, no longer exists, or the session lacks access
- **THEN** the page shows an error message instead of a digest
- **AND** no verification command is displayed

### Requirement: Per-OS latest-release endpoints stream the highest-version artifact

The server SHALL provide `GET /release9/latest` and `GET /release8/latest`. Each endpoint SHALL parse the version from the `pvm-release-<version>` filename prefix of files in the matching subfolder, select the numerically highest version, and stream it as a file download. Ties SHALL break toward the most recently modified file.

#### Scenario: A newer version is uploaded

- **WHEN** `pvm-release-7.1.29-el9-20261003-084116.tgz` coexists with `pvm-release-7.1.15-el9-20260817-163318.tgz` in the `el9` folder
- **THEN** `GET /release9/latest` streams `pvm-release-7.1.29-el9-20261003-084116.tgz`
- **AND** the response carries `Content-Disposition` naming that file

#### Scenario: The endpoint is called for a folder with no releases

- **WHEN** `GET /release8/latest` is requested and the `el8` folder holds no matching artifacts
- **THEN** the server responds with an error status and no file bytes

### Requirement: The latest-release endpoints honor the release auth gate

When authentication is enabled, requests to `/release9/latest` and `/release8/latest` SHALL require the same session as other `RELEASE_PVM`-protected routes, and unauthenticated requests SHALL be rejected without streaming file bytes.

#### Scenario: An unauthenticated client requests a latest endpoint

- **WHEN** `AUTH_ENABLED=true` and no valid session cookie accompanies the request
- **THEN** the server responds `401` and streams no file content

#### Scenario: An authenticated client requests a latest endpoint

- **WHEN** the request carries a valid session
- **THEN** the endpoint streams the selected artifact and renews the session cookie
