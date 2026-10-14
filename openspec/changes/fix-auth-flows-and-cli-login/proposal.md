# Proposal

## Why

Four authentication problems remain after `enforce-admin-file-policies`:

1. **A locked folder stays blank after login.** When `/api/files/<rel>` returns 401,
   `assets/js/browse.js` `fetchList()` replaces `#tableContainer`'s contents with the locked
   state, hides `#browseControls` and adds `is-error` to `#browseBody`. After a successful login it
   calls `fetchList()` again. That call fetches the data, but `applyFiltersAndRender()` returns
   early because `#rows` no longer exists (`browse.js:453`). The user has to reload the page.
2. **Release authentication is configured only through `.env`.** The Release page requires login
   only through `authService.pathRequiresAuth()`. That function gates `/api/releases`,
   `/release{8,9}/latest` and the `RELEASE_PVM` subtree whenever `AUTH_ENABLED=true` and
   `RELEASE_PVM` is set. Integration mode requires `AUTH_ENABLED=true`, so the Release page is
   always protected and an administrator cannot change that without editing `.env` and
   restarting the server.
3. **The login modal does not open on the Release page.** `assets/js/releases.js` opens the modal
   only through `window.triggerAuthModal`. That global is assigned *inside* `showLoginModal()`
   (`home.js:755`), so it is `undefined` until the modal has been opened once from somewhere
   else. A visitor who goes straight to `/download/release` clicks "Authenticate" and nothing
   happens.
4. **CLI downloads of locked files cannot authenticate.** The Release page tells users to run
   `curl.exe -fLOJ …`. For locked content the only credential the server accepts is the
   `avid_session` HttpOnly cookie (`extractToken`). A terminal user would have to sign in in a
   browser, copy the cookie and add a header by hand.

## What Changes

- **Browse (bug 1):** after a successful login from the locked-folder state, re-render the Browse
  page for the current path (`render(container, currentPath)`). Do not call `fetchList()` against
  the replaced DOM; the existing `FileActions.signIn()` re-renders the current route instead.
  (The idle-logout path already renders into a live DOM and needed no change.)
- **Login modal (bug 3):** assign `window.triggerAuthModal` once when `home.js` loads, not inside
  `showLoginModal`. `releases.js` calls `FileActions.signIn(load)`, the shared sign-in helper, as `browse.js`
  already does. After login, the Release page reloads its list and the lead card.
- **Release auth in the Admin UI (item 2):** in integration mode, Release page authentication is
  controlled by the admin lock on the `RELEASE_PVM` folder in the Admin Files Manager. The
  hard-coded `.env` gate is turned off in this mode. When the folder is locked, every release
  endpoint returns `401 AUTH_REQUIRED` to anonymous callers, and the page shows the sign-in state.
  When it is unlocked, the page is public. Changes take effect within `ADMIN_SYNC_TTL_MS`, with no
  restart. See `design.md` D2 for why this reuses the existing lock instead of adding a new
  setting.
- **CLI authentication (item 4):** download endpoints accept HTTP Basic credentials in addition to
  the session cookie, and non-browser clients get a standard `WWW-Authenticate: Basic` challenge.
  `curl.exe -u <username> …` then prompts for the password in the same terminal. On PowerShell,
  `-Credential (Get-Credential)` prompts for both username and password. The password never
  appears in the command line or in shell history. The Release page and the file inspector show
  these commands (with `-u <username>`) to signed-in visitors.
- **BREAKING** (integration mode only): `RELEASE_PVM` no longer implies authentication. A
  deployment that relied on that implicit gate has to lock the release folder in the Admin Files
  Manager once before upgrading. Otherwise releases become public. Legacy mode (no admin
  integration) is unchanged.

## Non-goals

- A portal-side admin UI. The portal has none, and the Admin Files Manager remains the only UI.
- Bearer/API tokens, `.netrc` support or stored CLI credentials.
- Prompting for the *username* from plain `curl`. curl cannot do this; see `design.md` D4
  §Limitations.

## Capabilities

### New Capabilities
- `release-access`: how the Release page and its endpoints decide whether login is required, and
  how the page asks for it.
- `cli-download-auth`: HTTP Basic authentication and challenge behavior for command-line
  downloads.

### Modified Capabilities
- `browse-page`: a successful login from the locked-folder state shows the folder without a page
  reload.

## Impact

- **Code:** `assets/js/browse.js`, `assets/js/home.js`, `assets/js/releases.js`,
  `assets/js/file-inspector.js` (CLI snippet), `lib/auth-service.js` (`verifySession` accepts
  Basic, `pathRequiresAuth` is skipped in integration mode), `lib/api-router.js` (release root gate
  and challenge header), `assets/js/services/resource-service.js` (`cliUserArg`). No new UI strings.
- **APIs:** `Authorization: Basic` is accepted on `GET`/`HEAD` for `/api/download/*`,
  `/api/hash/*`, `/api/download-zip` and `/release{8,9}/latest`. A 401 on those routes carries
  `WWW-Authenticate` when the request is not from a browser. In integration mode,
  `/api/releases` returns 401 when the release root is locked for the caller.
- **Config:** no new variables. In integration mode, `.env.example` documents that release
  protection is set in the Admin Files Manager.
- **Admin project:** no changes.
- **Docs:** `docs/integration-admin-files-manager.md`, `docs/API.md`, `docs/SECURITY.md`.
- **Tests:** HTTP tests for the release gate and Basic authentication; a DOM-free check is not
  practical for the two frontend bugs, so they are verified manually in the browser (tasks list the
  steps).
