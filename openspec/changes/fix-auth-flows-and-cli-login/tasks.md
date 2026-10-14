# Tasks

## 1. Frontend bugs

- [x] 1.1 `home.js`: move `window.triggerAuthModal = showLoginModal` from inside `showLoginModal` to module scope, and focus the username field when the modal opens. Verified in the browser: open `/download/release` in a new tab with the release folder locked, click "Authenticate", and the modal opens with focus on the username field.
- [x] 1.2 `releases.js`: call `FileActions.signIn(load)`. `load()` already repaints the lead card. Verified in the browser: after logging in from the Release page, the table and lead card appear with no reload.
- [x] 1.3 `browse.js`: the locked-state button calls `FileActions.signIn()`, which re-renders the current route (`Router.refresh`) instead of calling `fetchList()` into the replaced DOM. The idle-logout path renders into a live DOM and was left unchanged. Verified in the browser: open `/browse/secret/`, log in, and the entries and toolbar show, with no `is-error` state and no reload.

## 2. Release access from the Admin UI

- [x] 2.1 `auth-service.pathRequiresAuth`: return `false` in integration mode. The release path is computed by the new `filesService.releaseRel()`. Verified in `test/release-access.test.js` ("without a lock, releases are public") and the updated `test/access-policy.test.js`. Legacy mode is covered by the new test in `test/legacy-auth.test.js`.
- [x] 2.2 `api-router`: `/api/releases` and `/release{8,9}/latest` decide the release root (or OS subfolder) first. `locked` returns `401`, `hidden` returns `200 {items: []}`. Verified in `test/release-access.test.js`: locked root, el8-only lock, hidden folder, and unlock after the TTL.
- [x] 2.3 `server.js`: in integration mode, log one warning when the release folder is open to anonymous callers. This is not unit-tested, because `server.js` is not loaded by the suite; the check itself is the one-line `decide()` call.
- [x] 2.4 Docs: `.env.example`, `docs/integration-admin-files-manager.md` (upgrade note), `docs/API.md`, `docs/SECURITY.md`.

## 3. CLI authentication

- [x] 3.1 `auth-service.parseBasic()`: checked for valid input, a missing colon, an empty username, a password containing a colon, an oversized value, a non-Basic scheme and UTF-8 names.
- [x] 3.2 `api-router` step 4b: on content routes only, with no valid cookie, Basic credentials go through the transport check and then `login()`. The result becomes the request's session for steps 5 and 5b, and is never renewed or turned into a cookie. Verified in `test/cli-auth.test.js`.
- [x] 3.3 Challenge plus `text/plain` errors for clients without `Sec-Fetch-Mode`. Verified in `test/cli-auth.test.js`, and manually with real `curl.exe` 8.17 and PowerShell 7 `Invoke-WebRequest -Credential` against a fixture server.
- [x] 3.4 Lockout (`429`) and no-logging. Verified in `test/cli-auth.test.js`.
- [x] 3.5 UI: `ResourceService.cliUserArg()` adds `-u <username>` to the Release page and inspector commands for signed-in visitors. No new UI strings were needed. Verified in the browser: after login the commands read `curl -fLOJ -u alice '…'`.
- [x] 3.6 Docs: `docs/API.md` and `docs/SECURITY.md`.

## 4. Close-out

- [x] 4.1 `npm test`: 161 pass, 0 fail. Also fixed the `users.json` cache key (mtime + size): two writes in one NTFS timestamp tick were treated as unchanged, which made the legacy revocation test flaky.
- [ ] 4.2 Run once by hand on a real HTTPS deployment: interactive `curl.exe -u <user>` password prompt in CMD and PowerShell, and Windows PowerShell 5.1 `Get-Credential`.
- [ ] 4.3 Before deploying: lock the `RELEASE_PVM` folder in the Admin Files Manager (BREAKING; see the proposal).
