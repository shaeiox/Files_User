# Spec Delta

## Purpose

Defines how the portal turns the Admin Files Manager's `files`, `file_access_policies` and
`user_file_permissions` rows into one access decision per path and caller, and how that decision is
enforced the same way on every endpoint that exposes file contents or metadata.

## ADDED Requirements

### Requirement: Portal paths map directly to admin client paths

With integration enabled, the portal SHALL match the relative path `a/b` against admin
`files.client_path` `/a/b`, because both applications serve the same storage root. Repeated and
trailing slashes SHALL be ignored, and matching SHALL be case-insensitive on Windows and exact
elsewhere. Every matching row SHALL apply.

#### Scenario: Root-level file

- **WHEN** the admin governs `/AmazTool.exe` and a caller requests portal path `AmazTool.exe`
- **THEN** that policy is applied

#### Scenario: Nested file

- **WHEN** the admin governs `/stitch_modern_file_portal_redesign/screen.png`
- **THEN** a request for `stitch_modern_file_portal_redesign/screen.png` is evaluated against it

### Requirement: A path with no applicable policy keeps existing portal behavior

When neither the path nor any of its parent folders has a `file_access_policies` row, the portal
SHALL treat the path as ungoverned and apply only its pre-existing rules. A `files` row whose policy
was deleted, and any permission rows left on it, SHALL be ignored.

#### Scenario: Ungoverned file

- **WHEN** no policy exists on `docs/readme.pdf`, `docs` or the root
- **THEN** the file is served exactly as before this change

#### Scenario: Policy deleted but permission rows remain

- **WHEN** the admin deletes a file's policy and a `deny` row for user 2 remains on that `files` row
- **THEN** the file is ungoverned for every user, including user 2

### Requirement: Folder policies apply to everything inside the folder

A policy on a path SHALL apply to that path and every descendant path. The decision for a path SHALL
combine its own policy with the policy of every parent folder that has one, and the strictest result
SHALL win. This SHALL be decided by path, regardless of `files.is_directory`.

#### Scenario: File inside an unpublished folder

- **WHEN** folder `/private` is unpublished and `/private/a.iso` has no policy of its own
- **THEN** `private/a.iso` is hidden from every caller on every endpoint

#### Scenario: Folder row recorded as a file

- **WHEN** the policy row for `/CodeGeeXProjects` has `is_directory = 0` but the path is a folder
  on disk
- **THEN** the policy still applies to everything under `CodeGeeXProjects`

#### Scenario: Stricter child policy

- **WHEN** folder `/tools` is `public` and published, and `/tools/x.exe` is `authenticated`
- **THEN** `tools/x.exe` is hidden from anonymous callers and allowed for logged-in users

### Requirement: Each policy yields allow, locked or hidden for a caller

For one policy and one caller, the portal SHALL decide `hidden` for unpublished, out-of-window or
caller-denied items. Otherwise an anonymous caller SHALL get `locked` if `is_locked = 1`, `allow` if
the mode is `public`, and `hidden` otherwise. A logged-in caller SHALL get `allow` for `public` and
`authenticated`, and for `restricted` only with a `grant` row on that policy's file.

#### Scenario: Decision table

- **WHEN** each combination below is evaluated for a published, in-window file
- **THEN** the results are:

  | access_mode | is_locked | anonymous | logged in, no row | logged in, `grant` |
  |---|---|---|---|---|
  | public | 0 | allow | allow | allow |
  | public | 1 | locked | allow | allow |
  | authenticated | 0 | hidden | allow | allow |
  | authenticated | 1 | locked | allow | allow |
  | restricted | 0 | hidden | hidden | allow |
  | restricted | 1 | locked | hidden | allow |

### Requirement: Unpublished items are hidden from everyone

An item governed by a policy with `is_published = 0` SHALL be hidden from every caller, including
logged-in, granted and `admin`-role users. This SHALL take precedence over `is_locked`.

#### Scenario: Locked and unpublished

- **WHEN** a file is `authenticated`, `is_locked = 1` and `is_published = 0`
- **THEN** it is hidden from anonymous and logged-in callers alike

#### Scenario: Granted user and an unpublished file

- **WHEN** a user holds a `grant` on an unpublished `restricted` file
- **THEN** the file is hidden from that user

### Requirement: Availability windows are enforced for everyone

An item SHALL be hidden from every caller before `available_from` and after `available_until`
(epoch milliseconds, both bounds inclusive). A null bound SHALL mean no limit on that side.

#### Scenario: Not yet available

- **WHEN** `available_from` is one hour in the future
- **THEN** the file is hidden, including from granted users

#### Scenario: Expired

- **WHEN** `available_until` is in the past
- **THEN** the file is hidden

#### Scenario: Open-ended window

- **WHEN** `available_from` is in the past and `available_until` is null
- **THEN** the window does not hide the file

### Requirement: An explicit deny always blocks that user

A `deny` row in `user_file_permissions` SHALL hide the item and its descendants from that user,
whatever the policy's `access_mode`. A `grant` row SHALL only satisfy a `restricted` mode; it SHALL
NOT override unpublished, out-of-window or deny results.

#### Scenario: Deny on a public file

- **WHEN** a `public`, published file has a `deny` row for user 2
- **THEN** the file is hidden from user 2 and allowed for everyone else

#### Scenario: Deny on a folder

- **WHEN** folder `/team` has a `deny` row for user 2
- **THEN** every path under `team` is hidden from user 2

### Requirement: Each policy is checked against its own grants

A `grant` SHALL satisfy only the policy whose `files` row it belongs to. A grant on a folder SHALL
satisfy that folder's `restricted` mode for everything inside it. A descendant with its own
`restricted` policy SHALL still require a grant on its own row.

#### Scenario: Grant on a restricted folder

- **WHEN** `/team` is `restricted` with a `grant` for user 2, and `/team/a.pdf` has no policy
- **THEN** user 2 is allowed `team/a.pdf`

#### Scenario: Restricted file inside a granted folder

- **WHEN** user 2 holds a grant on `/team`, but `/team/secret.pdf` is `restricted` with no grant
  for user 2
- **THEN** `team/secret.pdf` is hidden from user 2

### Requirement: The combined decision is hidden, then locked, then allow

Across the path and its governed parents, the portal SHALL decide `hidden` if any policy yields
`hidden`, otherwise `locked` if any yields `locked`, otherwise `allow`. The portal's existing
`RELEASE_PVM` login rule SHALL remain an additional requirement and SHALL only ever restrict.

#### Scenario: Locked folder over a public file

- **WHEN** folder `/beta` is locked and `/beta/b.iso` is `public`
- **THEN** an anonymous caller gets `locked` for `beta/b.iso` and a logged-in caller gets `allow`

#### Scenario: Locked folder over a restricted, ungranted file

- **WHEN** folder `/beta` is locked and `/beta/c.iso` is `restricted` with no grant
- **THEN** an anonymous caller gets `hidden` for `beta/c.iso`

### Requirement: Invalid or unreadable policy data fails closed

If a governing row has a value outside its documented domain, or the policy data cannot be read,
the affected path SHALL be `hidden` for every caller. The server SHALL refuse to start when the
database is missing, unreadable, lacks the admin tables, or has a schema version above 2.

#### Scenario: Unknown access mode

- **WHEN** a policy's `access_mode` is a value other than `public`, `authenticated` or
  `restricted`
- **THEN** the path and its descendants are hidden from everyone

#### Scenario: Database lost at runtime

- **WHEN** the admin database cannot be read during a request
- **THEN** every file endpoint responds `503` with code `POLICY_UNAVAILABLE` and returns no file
  content or metadata
- **AND** no path is treated as ungoverned by default

#### Scenario: Newer schema at startup

- **WHEN** `schema_migrations` reports version 3
- **THEN** the portal refuses to start

### Requirement: Access is decided before the filesystem is consulted

For every direct request, the portal SHALL decide access from the path alone before checking whether
the path exists. A `hidden` decision SHALL return `404`, identical to a missing path. A `locked`
decision SHALL return `401` with code `AUTH_REQUIRED`.

#### Scenario: Missing and hidden look the same

- **WHEN** an anonymous caller requests a hidden file and a nonexistent file
- **THEN** both responses have status `404` and the same body

#### Scenario: Nonexistent path under a locked folder

- **WHEN** an anonymous caller requests `beta/does-not-exist.iso` under locked folder `beta`
- **THEN** the response is `401`, the same as for an existing file there

### Requirement: Another name for a governed file is governed too

A content request SHALL be decided on the requested path and on the path it resolves to on disk,
and the most severe result SHALL apply. An in-root symlink or junction, or a Windows alias such as a
trailing dot or space, a `::$DATA` suffix, a case change or an 8.3 short name, SHALL NOT reach a
governed file.

#### Scenario: Link into an unpublished folder

- **WHEN** `docs/shortcut` is a link to unpublished folder `private`
- **THEN** downloading, hashing, listing or zipping through `docs/shortcut` answers `404`

#### Scenario: Windows trailing dot

- **WHEN** an anonymous caller requests `docs/hidden.txt.` and `docs/hidden.txt` is unpublished
- **THEN** the request is refused and no file bytes are sent

### Requirement: Listings show only allowed entries and the entries that carry a lock

A directory listing SHALL include `allow` entries in full. An entry whose own policy yields
`locked`, under parents that all yield `allow`, SHALL appear with `locked: true` and without size
or modification time. All other entries SHALL be omitted. Listing a `locked` folder SHALL return
`401`, and listing a `hidden` folder SHALL return `404`.

#### Scenario: Anonymous listing

- **WHEN** a folder holds `a.txt` (ungoverned), `b.iso` (locked, public) and `c.iso` (unpublished)
- **THEN** an anonymous listing returns `a.txt` in full and `b.iso` with `locked: true` and no
  `size` or `mtime`
- **AND** it does not return `c.iso`

#### Scenario: Logged-in listing

- **WHEN** the same folder is listed by a logged-in user
- **THEN** `a.txt` and `b.iso` are returned in full and `c.iso` is not returned

### Requirement: Direct downloads are enforced

Every direct file URL SHALL be served only for `allow`. This SHALL hold for URLs that the UI never
links to and for files inside governed folders.

#### Scenario: Direct URL to a file in a locked folder

- **WHEN** an anonymous caller requests `/api/download/beta/b.iso` and `beta` is locked
- **THEN** the response is `401` and no file bytes are sent

#### Scenario: Direct URL to a denied file

- **WHEN** user 2 requests a file with a `deny` row for user 2
- **THEN** the response is `404`

### Requirement: Search applies the listing rules before limits

Search results SHALL follow the listing rules. Hidden entries and everything inside `hidden` or
`locked` folders SHALL be skipped while searching, so `results`, `scanned` and `truncated` describe
only what the caller may see.

#### Scenario: Hidden match

- **WHEN** an anonymous caller searches for a name that only matches an unpublished file
- **THEN** the results are empty and `truncated` is `false`

#### Scenario: Match inside a locked folder

- **WHEN** an anonymous caller searches for a name that only matches a file inside locked folder
  `beta`
- **THEN** the file does not appear in the results

### Requirement: Categories and counts reflect only allowed content

The categories endpoint SHALL omit hidden categories, show a locked category with `locked: true`
and without counts or dates, and compute `fileCount`, `folderCount` and dates only from `allow`
entries.

#### Scenario: Counts exclude governed files

- **WHEN** a category holds 3 ungoverned files and 1 unpublished file
- **THEN** its `fileCount` is 3 for every caller

#### Scenario: Locked file is not counted for anonymous

- **WHEN** a category holds 2 ungoverned files and 1 locked file
- **THEN** its `fileCount` is 2 for an anonymous caller and 3 for a logged-in caller

### Requirement: Release listings and latest-release URLs are enforced

Release listings SHALL follow the listing rules, applied before the result limit. A
`/releaseN/latest` request SHALL serve the newest `allow` release for the caller. If none is
allowed but a newer one is `locked`, it SHALL return `401`; otherwise `404`.

#### Scenario: Newest release is unpublished

- **WHEN** the newest `el9` release is unpublished and an older one is ungoverned
- **THEN** `/release9/latest` streams the older release

#### Scenario: Only locked releases

- **WHEN** every `el9` release is locked and the caller is anonymous
- **THEN** `/release9/latest` returns `401`

### Requirement: Hashes are computed only for allowed files

The hash endpoint SHALL compute and return a checksum only for `allow`. It SHALL return `401` for
`locked` and `404` for `hidden`, without reading the file.

#### Scenario: Hash of a hidden file

- **WHEN** a caller requests the hash of an unpublished file
- **THEN** the response is `404` and no digest is computed

### Requirement: ZIP archives contain only allowed files

A ZIP request SHALL be refused entirely unless the browsed directory and every selected file are
`allow`. It SHALL return `401` if every refusal is `locked`, otherwise `404`.

#### Scenario: One hidden file in the selection

- **WHEN** a selection holds two allowed files and one unpublished file
- **THEN** the response is `404` and no archive bytes are sent

#### Scenario: Locked file in the selection

- **WHEN** an anonymous selection holds an allowed file and a locked file
- **THEN** the response is `401`

### Requirement: Admin policy changes take effect within the synchronization interval

Changes to `files`, `file_access_policies` and `user_file_permissions` SHALL affect every endpoint
within `ADMIN_SYNC_TTL_MS` (default 5000 ms), without a restart.

#### Scenario: File unpublished while being served

- **WHEN** an administrator unpublishes a file and 5 seconds elapse
- **THEN** listings omit it, and its download, hash and ZIP inclusion are refused

#### Scenario: Grant added

- **WHEN** an administrator grants user 2 a `restricted` file and 5 seconds elapse
- **THEN** user 2 can list and download it

### Requirement: Legacy mode is unchanged

When integration is not configured, every endpoint SHALL behave exactly as before this change, and
no response SHALL carry a `locked` field.

#### Scenario: Integration not configured

- **WHEN** neither `ADMIN_INTEGRATION_ENABLED` nor `ADMIN_DB_PATH` is set
- **THEN** listings, search, categories, releases, hashes, downloads and ZIPs behave as before
