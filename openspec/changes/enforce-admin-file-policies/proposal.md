# Proposal

## Why

The Admin Files Manager (`D:\Projects\Admin-Files-Manager-fixed`) lets administrators lock, publish,
restrict and time-box files and grant or deny individual users. It stores those decisions in
`admin.sqlite` but enforces none of them itself (its ADR-009 §4). The portal is the only consumer.
Today the portal's integration is connected but not effective:

- Its path mapping looks up `/Downloads/<rel>` while the admin stores `/<rel>`, so no policy ever
  matches and every governed file is served publicly.
- It checks only the exact requested path, so a policy on a folder can be bypassed through direct
  download, hash, ZIP, search and release URLs.
- It interprets `is_locked`, folder policies and `deny` rows in ways the owner has not agreed to.
- Its login regex rejects valid admin usernames, and an admin password reset does not end portal
  sessions.

Without this change, administrators would have to manage the same users and restrictions twice, and
restrictions they set would not actually take effect in the portal.

## What Changes

- Make `admin.sqlite` the only source of truth for portal identity and file access whenever
  integration is enabled. The portal opens it read-only and never writes to it.
- Enforce every field that affects access: `users.status`, `users.locked_until`,
  `users.password_hash`, `files.client_path`, `file_access_policies.access_mode`, `is_published`,
  `is_locked`, `available_from`, `available_until`, and `user_file_permissions` grant/deny rows.
- Apply the rules agreed on 2026-10-14 (see `design.md` §Decisions):
  - Unpublished items, items outside their availability window, and denied items are hidden from
    everyone.
  - Locked items are shown to anonymous visitors by name with a lock icon, and require login to
    open.
  - Folder policies apply to everything inside the folder.
  - An explicit `deny` row always blocks that user.
  - `role` has no effect on file access.
- Use one authorization decision (`allow` / `locked` / `hidden`) for every endpoint that exposes
  file contents or metadata: listings, direct downloads, search, categories and their counts,
  releases, `/release{8,9}/latest`, hashes, and ZIP archives, checked per file.
- Hidden items return 404, exactly like a missing path. Locked items return 401 with
  `AUTH_REQUIRED`.
- Re-read policies, grants and users at most every 5 seconds (configurable), so admin changes take
  effect without a restart.
- Authenticate against admin users with the admin scrypt format. Drop the portal-only username
  regex in integration mode. Bind sessions to the stored password hash, and end them when an
  administrator uses "Revoke sessions" (read from the admin's audit log).
- Fail closed when the database is missing, unreadable, newer than schema v2, or contains invalid
  values.
- **BREAKING** (integration mode only): `ADMIN_STORAGE_ROOT` is no longer used. Portal path `a/b`
  maps to admin `client_path` `/a/b`, because both projects serve the same storage root.
- **BREAKING** (integration mode only): listing entries that require authentication are no longer
  returned to anonymous callers, and locked entries are returned without `size` or `mtime`.
- Frontend: locked rows show a lock icon, and activating one opens the existing login modal instead
  of following the download link.
- Remove the dead duplicate `listPath` / `getDownloadTarget` definitions in `lib/files-service.js`.

## Capabilities

### New Capabilities
- `admin-authentication`: portal login and session validity driven by the admin `users` table
  (password format, account status, login lock, session invalidation, sync interval, fail-closed
  behavior).
- `file-access-policy`: the portal's authorization rule over admin `files`,
  `file_access_policies` and `user_file_permissions`, and its uniform enforcement across every
  endpoint that exposes file contents or metadata.

### Modified Capabilities
- `browse-page`: locked rows render with a lock indicator, and activating one opens the login modal
  instead of downloading.
- `file-inspector`: a locked item shows no size, date or checksum before login.
- `bulk-download`: a ZIP selection is refused when any selected file is not allowed for the caller.

## Impact

- **Code:** `lib/admin-db.js`, `lib/access-policy.js`, `lib/auth-service.js`, `lib/api-router.js`,
  `lib/files-service.js` (and indirectly `lib/archive-service.js` and `lib/hash-service.js`),
  `server.js` startup validation, `assets/js/browse.js`, `assets/js/file-inspector.js`, and
  `assets/js/home.js` (search results).
- **APIs:** in integration mode, response shapes gain `locked: true` on entries, `size` and `mtime`
  are omitted for locked entries, and hidden paths return 404. Legacy mode (integration not
  configured) is unchanged.
- **Config:** `ADMIN_STORAGE_ROOT` is removed from `.env.example`. A new optional
  `ADMIN_SYNC_TTL_MS` (default 5000) is added. `ADMIN_INTEGRATION_ENABLED` and `ADMIN_DB_PATH` keep
  their current meaning and their fail-closed startup checks.
- **Dependencies:** none added. The portal uses Node 24's built-in `node:sqlite`.
- **Admin project:** no source, schema, database or `.env` changes.
- **Docs:** `docs/integration-admin-files-manager.md` is rewritten to match.
- **Tests:** `test/access-policy.test.js` is rewritten, and a new HTTP-level suite runs against a
  temporary SQLite database with the admin schema.
