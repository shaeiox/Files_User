# Design

## Current architecture (what was investigated)

| Piece | Where | Behaviour today |
|---|---|---|
| Session | `auth-service.js` `extractToken` / `verifySession` | HMAC JWT in HttpOnly `avid_session` cookie only. No header-based credential. |
| Login | `POST /api/auth/login` → `login()` | Per-username lockout (`checkLockout`), legacy `users.json` or admin `users` (scrypt). |
| Release gate | `pathRequiresAuth()` (router step 5) | `AUTH_ENABLED && RELEASE_PVM` ⇒ `/api/releases`, `/release{8,9}/latest`, release subtree need a session. Pure `.env`. |
| Admin policy gate | `access-policy.decide()` (router step 5b) | `allow / locked / hidden`, re-read every `ADMIN_SYNC_TTL_MS`. Locked ⇒ `401 AUTH_REQUIRED`. |
| Release list walk | `listLatestReleases(…, decideFor)` | Drops files that are hidden or locked through an ancestor. A locked release root therefore yields `200 {items: []}`, not 401. |
| Login modal | `home.js` `showLoginModal(cb)` | Sets `window.triggerAuthModal` inside itself (bug 3). |
| Browse 401 state | `browse.js` `fetchList` catch | Overwrites `#tableContainer` (removes `#rows`) and then retries into the missing DOM (bug 1). |
| TLS | `nginx.conf` | Terminates TLS on 443 and forwards `X-Forwarded-Proto`; `isSecureRequest()` reads it. |
| Client | Windows 10 `curl.exe` | 8.x (Schannel). It supports `-u user` with a hidden password prompt. |

## Decisions

### D1 — Bugs 1 and 3 are fixed where they originate

- Bug 1: the locked state replaces part of the page shell, so after login the shell is rebuilt by
  calling `BrowsePage.render(container, currentPath)`, the same call the router makes. This
  avoids a second "restore the DOM" path that could drift from `render()`.
- Bug 3: `window.triggerAuthModal = showLoginModal` moves to module scope in `home.js`, so every
  caller works no matter which page loaded first. `releases.js` uses
  `FileActions.signIn(load)` (the shared helper `browse.js` also uses), so the post-login reload
  callback is passed explicitly.

### D2 — Release protection uses the existing admin folder lock, not a new setting

The request asks for an on/off switch in the Admin UI. Two options were considered:

| | A. Lock the `RELEASE_PVM` folder (chosen) | B. New `portal.releaseAuthRequired` in admin `settings.json` |
|---|---|---|
| Admin changes | None. The Files Manager already has the lock toggle. | New field, validator and Settings UI control in the admin project. |
| Portal reads | `admin.sqlite` (already read, TTL-cached, fail-closed) | Also `settings.json`, which needs a second path variable, a second cache and a second fail-closed rule. |
| Semantics | The same lock that protects every other folder | A special case that applies only to releases |
| Per-OS control | Possible: lock `el8` but not `el9` | All or nothing |

A wins on every row. It needs one portal change. Today a locked release root is invisible on the
Release page because the walk silently drops its files. Instead, the release endpoints decide the
**release root** first:

- `/api/releases?os=X` decides `rel(RELEASE_PVM)/X`, falling back to `rel(RELEASE_PVM)`. A
  `locked` result returns `401 AUTH_REQUIRED`, which the page already renders as the sign-in
  state. A `hidden` result returns `200 {items: []}`, the same response as having no releases.
- `/release{8,9}/latest` already gates the chosen file, and an inherited lock makes that file
  `locked`. The response gets the `401` and `WWW-Authenticate` from D4.

In integration mode, `pathRequiresAuth()` returns `false`. The admin lock is the single source of
truth, so the `.env` gate and the admin lock cannot disagree. Legacy mode has no Admin UI and
keeps the `.env` gate unchanged.

Migration: the integration doc and the startup log state that release protection now comes from
the admin lock. At startup in integration mode, if `RELEASE_PVM` is set and its folder has no
`is_locked` policy, the portal logs one warning: `release folder is public — lock it in the Admin
Files Manager to require sign-in`.

### D3 — "Logged in" for a CLI means valid Basic credentials on the request

A terminal has no cookie jar, so it cannot reuse a browser session. `verifySession` is
synchronous and `login()` is async (scrypt), so the router resolves Basic once per request, before
the gates in steps 5 and 5b. If there is no valid cookie session and the route is a D3 route, it
awaits `login()` and stores the result as that request's `policySession`. Basic credentials go
through the **same**
`login()` path as the modal: the same lockout counter, the same admin `status` and `locked_until`
checks, and the same fail-closed `SERVER_ERROR`. The result is a request-scoped session with the
same `user` shape. Basic authentication:

- never sets a cookie and never renews a session;
- is accepted only on `GET`/`HEAD` content routes: `/api/download/*`, `/api/hash/*`,
  `/api/download-zip` and `/release{8,9}/latest`. It is not accepted on `/api/auth/*`,
  listings or search;
- is refused on a non-secure request (`!isSecureRequest(req)`) unless the client is loopback. The
  refusal is `400 INSECURE_TRANSPORT` with a plain message, so a password is never accepted over
  cleartext HTTP;
- is limited by the existing `rateLimiter` plus the per-username lockout. Each successful request
  costs one scrypt verification, which is acceptable for a download (one request per file).

### D4 — Challenge only non-browser clients

curl and PowerShell send credentials only after they see `401` with `WWW-Authenticate: Basic`.
A browser that sees that header shows its own native dialog, which would replace the portal's
modal. Browsers send `Sec-Fetch-Mode` on every request, and curl and PowerShell send none. So:

- On a `401 AUTH_REQUIRED` from a D3 route, add
  `WWW-Authenticate: Basic realm="CloudAvid Downloads", charset="UTF-8"` **only when the request
  has no `Sec-Fetch-Mode` header**.
- When there is no `Sec-Fetch-Mode` and the request does not accept `application/json`, the 401
  body is a one-line `text/plain` message instead of JSON. For example:
  `Authentication required. Re-run with: curl.exe -u <username> …` and
  `Invalid username or password.` PowerShell, and curl without `-o`/`-O`, print this message.

If a browser is misdetected, the worst case is the browser's native login dialog. Access control
is unchanged. The header only decides how the client is asked for credentials.

### D5 — Commands shown to users

The Release page and the file inspector keep their existing commands (`curl` for POSIX,
`curl.exe` for PowerShell) and add `-u <username>` **when the visitor is signed in**: the
terminal has no browser session, so curl prompts for the password itself
(`Enter host password for user 'alice':`, hidden). Anonymous visitors see the plain commands;
locked items cannot be selected anonymously. A username that is not shell-safe in both shells
(`[A-Za-z0-9._@-]+`) becomes the literal placeholder `<username>`.

`Invoke-WebRequest -Credential (Get-Credential) -Authentication Basic` (prompts for username
and password) works against the same endpoints and is documented in `docs/API.md`, but is not
shown on the page: one command form per shell keeps the page simple.

`--fail-with-body` was dropped: combined with `-O` it writes the error text *into the output
file*. With `-f`, curl reports `The requested URL returned error: 401` and writes nothing;
PowerShell and curl without `-o`/`-O` print the plain-text message (`Invalid username or password.`).

### Limitations (to accept before implementation)

1. **Plain curl cannot prompt for a username.** curl prompts for the password only when `-u
   <user>` is given. A command that prompts for both requires PowerShell `Get-Credential` or a
   wrapper script. A downloadable `get.ps1` / `get.sh` wrapper was rejected because piping a
   script from the server into a shell trains users in an unsafe pattern.
2. **Basic auth requires HTTPS.** The production nginx already terminates TLS. A plain-HTTP
   deployment cannot use CLI login except from loopback, by design.
3. **The user detection relies on a heuristic.** A very old browser that does not send
   `Sec-Fetch-Mode` would show its native dialog. Chromium ≥76, Firefox ≥90 and Safari ≥16.4 all
   send it.
4. **There is no session reuse across CLI commands.** Each command asks again. Scripting can use
   `curl -K`/`.netrc`, but that is out of scope and undocumented on purpose.
5. **Windows PowerShell 5.1 `Get-Credential` opens a GUI dialog** unless console prompting is
   enabled. This is OS behavior, not something the server controls.

## Risks

- **Implicit release protection is removed (BREAKING).** This is mitigated by the startup warning
  and the migration note. Tasks require the operator to lock the folder before upgrading.
- **A new credential surface.** Basic authentication goes through the existing `login()`, so
  lockout and admin status apply. Credentials are never logged: `logAccess` logs only the
  pathname and the username on failure, as it does for the modal today.
