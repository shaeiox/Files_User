# Tasks (§P — ships before the admin change)

## 1. Volume check

- [x] 1.1 `lib/admin-db.js`: schema gate `≤ 5`; read `integration_settings` in the existing snapshot transaction (absent on v4)
- [x] 1.2 Read and validate `FILES_ROOT/.dimension-volume` at startup (refuse) and per refresh (snapshot unavailable → `503`)
- [ ] 1.3 v4 compatibility: no check, warning logged; add a follow-up issue to remove it one release after rollout (code done and marked `ponytail:` in `warnUnverifiedVolume`; the issue is not filed yet)
- [x] 1.4 Verify dot-entries are skipped by listing/search/categories/releases and refused by download/hash/ZIP; add a test for `.dimension-volume` (download and hash served dotfiles by name: fixed once in `resolveInsideRoot`)
- [x] 1.5 Extend `test/helpers/admin-fixture.js` to schema v5 + marker; tests for each scenario in the spec (`test/volume.test.js`)

## 2. Release folder

- [x] 2.1 Integration mode: `filesService.releaseRel` / `resolveReleaseRoot` take `release_client_path` from the snapshot; `RELEASE_PVM` ignored with a startup warning (v5 only; a v4 admin keeps `RELEASE_PVM` so the rollout loses no release folder)
- [x] 2.2 Tests: set / null / `RELEASE_PVM` ignored / legacy unchanged / lock still gates `/api/releases` and `/release{8,9}/latest`

## 3. Tunables

- [x] 3.1 `lib/auth-service.js`: DB → env → default for the three tunables, re-read per snapshot, out-of-range logged once
- [x] 3.2 Tests (`test/volume.test.js`, "auth tunables")

## 4. Production paths

- [x] 4.1 `PORTAL_DATA_DIR` default base for `users.json` and `portal.log`; relative path variables refused when `NODE_ENV=production` (`PORTAL_DATA_DIR` itself required there)
- [x] 4.2 Startup tests for the matrix

## 5. Docs

- [x] 5.1 `docs/integration-admin-files-manager.md`: replace "FILES_ROOT must be the same directory" with the marker contract; release folder; tunables; v5
- [x] 5.2 `.env.example`, `docs/DEPLOYMENT.md`: `PORTAL_DATA_DIR`, `RELEASE_PVM` legacy-only, upgrade order
- [x] 5.3 `npm test` passes; `graphify update .`

## 6. FILES_ROOT as a subfolder of the admin storage

- [x] 6.1 (superseded by §7: no equality with `portal_root_client_path`) marker `clientPath` read; absent = `/`
- [x] 6.2 `clientPathOf(rel)` / `governingPaths` map through the portal root
- [x] 6.3 Release folder and navbar folders are stripped of the portal root; outside ones ignored
- [x] 6.4 Fixture `useVolume({ portalRoot })`; tests: subfolder mapping, ancestor policy, stale marker, release/nav outside
- [x] 6.5 Integration doc §1.1/§1.2 updated

## 7. Self-located FILES_ROOT (design D2, second revision)

- [x] 7.1 Canonicalise FILES_ROOT and climb to the first trusted marker of this volume; position = marker clientPath + folders climbed
- [x] 7.2 No equality with portal_root_client_path; a published folder marker is trusted, other subfolder markers are skipped
- [x] 7.3 Startup log names the position; refusal message says how to fix
- [x] 7.4 Tests: no admin setting, deeper folder, isolated host, stale copy skipped, policies on ancestors

## 8. Releases behind a lock when the whole root is scanned

- [x] 8.1 The release walk reports a skipped locked folder; `/api/releases` with nothing visible and `/release{8,9}/latest` with no build answer `401` instead of "no releases"/404
- [x] 8.2 Tests: locked folder holding the only releases -> 401 for the OS tabs and latest; other visible releases still listed; the flag never leaves the server
