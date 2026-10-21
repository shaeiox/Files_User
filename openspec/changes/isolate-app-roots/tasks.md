# Tasks (§P — ships after the admin's contract endpoints, before the SQLite source is removed)

## 0. Hygiene

- [x] 0.1 `test/helpers/admin-fixture.js`: replace the `D:\Projects\Admin-Files-Manager-fixed @ 856a64c` reference with the admin repository name and commit only
- [ ] 0.2 Delete `graphify-out/.graphify_python` (Windows interpreter path) and rebuild the graph on a host with graphify; the current graph covers only `public/assets`
- [ ] 0.3 Local `.env`: move `PORTAL_DATA_DIR`/`LOG_FILE` to `/var/lib/files-portal` (operator step, documented in 5.2)

## 1. Root isolation (`app-root-isolation`)

- [x] 1.1 `lib/load-env.js`: `stateInsideCodeProblems()` (realpath of `PORTAL_DATA_DIR`, `dirname(LOG_FILE)`, `dirname(AUTH_USERS_FILE)` in legacy mode, compared against `PROJECT_ROOT`)
- [x] 1.2 `lib/load-env.js`: `filesRootOverlapProblems()` (`FILES_ROOT` vs `PROJECT_ROOT` and `PORTAL_DATA_DIR`, both directions; win32 case folding)
- [x] 1.3 Wire both into `settings.problems()` (refused in production, warned otherwise) and `node server.js --check-config`
- [x] 1.4 Tests in `test/settings.test.js`: every spec scenario, including symlinks and a path with spaces
- [x] 1.5 `Dockerfile`: already uses `/srv/files` and `/var/lib/files-portal`; add `USER node` and a read-only code layer check to the image smoke test (CI `container` job; Docker was not available on the dev host, so it first runs in CI)

## 2. Policy source (`admin-policy-source`)

- [x] 2.1 Split `lib/admin-db.js`: move the row reading of `readSnapshot` to `lib/admin/policy-source-sqlite.js` (`readRows`), unchanged; keep `buildSnapshot`, `locate`, the volume check (`snapshotFromRows`) and the public API in `admin-db.js`
- [x] 2.2 `lib/admin/policy-source-http.js`: GET with `If-None-Match`, timeout `< ADMIN_SYNC_TTL_MS`, one request in flight, no redirects, `https:` or loopback `http:` only; map contract v1 fields to the rows `buildSnapshot` takes
- [x] 2.3 `lib/settings.js`: `ADMIN_API_URL`, `ADMIN_SERVICE_TOKEN` (secret); the mode handshake table from `design.md` P2 in `resolveConfig`
- [x] 2.4 `validateStartup` in HTTP mode: one live snapshot fetch, contract version check, volume `locate()`
- [x] 2.5 `304` renews the age; every failure drops the snapshot (same path as a SQLite error)
- [x] 2.6 Parity test: run the admin-fixture suite through both sources; assert equal `buildSnapshot` output and equal `decide()` for each case in `test/contract/portal-v1/` (byte-identical copy of the admin's fixtures)
- [x] 2.7 `lib/auth/users-admin.js`: HTTP mode calls `credentials/verify` after the local lockout check; `pwf` = `credentialStamp`; never reads `password_hash`
- [x] 2.8 Tests: each spec scenario (unreachable at startup, `304`, admin down → `503`, newer contract, password change ends sessions, lockout short-circuits)

## 3. Ops endpoints

- [x] 3.1 `lib/routes/ops.js`: `gate: "service"` (constant-time Bearer check, own rate bucket, `404` when the token is unset)
- [x] 3.2 `GET /api/ops/log?limit=`: tail read of `LOG_FILE`, newest first, capped at 1000 entries
- [x] 3.3 `POST /api/ops/access-check`: `{path, userId|null}` → `{ outcome, policies[] }` via `decide()`
- [x] 3.4 Tests in `test/ops.test.js`

## 4. CI

- [x] 4.1 `.github/workflows/ci.yml`: relocation job (copy to `$(mktemp -d)/"relocated portal"`, `chmod -R a-w`, `npm test`, smoke `/livez` + `/readyz`)
- [x] 4.2 Relocation lint (sibling repo name, `/opt/devel`, `D:\`, `E:/`, `../` outside dependencies)
- [ ] 4.3 (deferred) Optional joint job: admin and portal from unrelated temp folders, URL and token only, one governed download allowed and one refused

## 4b. FILES_ROOT at any path (user request, 2026-10-21)

- [x] 4b.1 `locate()`: no trusted marker no longer refuses; position = `FILES_ROOT_ADMIN_PATH` → marker → published Portal folder → `/`, unverified positions logged once
- [x] 4b.2 `FILES_ROOT_ADMIN_PATH` setting (invalid value refuses startup); tests in `test/volume.test.js`
- [x] 4b.3 Docs: `.env.example`, `docs/DEPLOYMENT.md`, `docs/integration-admin-files-manager.md`

## 5. Docs

- [x] 5.1 `docs/integration-admin-files-manager.md`: HTTP contract, token, credential delegation, ops endpoints; the SQLite source is deprecated
- [x] 5.2 `docs/DEPLOYMENT.md` and `.env.example`: `ADMIN_API_URL`, `ADMIN_SERVICE_TOKEN`, dedicated `FILES_ROOT` tree, state outside the code folder, one-time session reset on switching source
- [ ] 5.3 `npm test`, `npm run lint`, `npm run typecheck` pass; `graphify update .`

## 6. Follow-up release

- [ ] 6.1 Remove `SqlitePolicySource`, `ADMIN_DB_PATH` and the schema-version gate; `node:sqlite` is then used only by `state-store.js`
