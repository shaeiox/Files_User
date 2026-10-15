# Tasks (§P — ships before the admin change)

## 1. Volume check

- [ ] 1.1 `lib/admin-db.js`: schema gate `≤ 5`; read `integration_settings` in the existing snapshot transaction (absent on v4)
- [ ] 1.2 Read and validate `FILES_ROOT/.dimension-volume` at startup (refuse) and per refresh (snapshot unavailable → `503`)
- [ ] 1.3 v4 compatibility: no check, warning logged; add a follow-up issue to remove it one release after rollout
- [ ] 1.4 Verify dot-entries are skipped by listing/search/categories/releases and refused by download/hash/ZIP; add a test for `.dimension-volume`
- [ ] 1.5 Extend `test/helpers/admin-fixture.js` to schema v5 + marker; tests for each scenario in the spec

## 2. Release folder

- [ ] 2.1 Integration mode: `filesService.releaseRel` / `resolveReleaseRoot` take `release_client_path` from the snapshot; `RELEASE_PVM` ignored with a startup warning
- [ ] 2.2 Tests: set / null / `RELEASE_PVM` ignored / legacy unchanged / lock still gates `/api/releases` and `/release{8,9}/latest`

## 3. Tunables

- [ ] 3.1 `lib/auth-service.js`: DB → env → default for the three tunables, re-read per snapshot, out-of-range logged once
- [ ] 3.2 Tests in `test/auth.test.js`

## 4. Production paths

- [ ] 4.1 `PORTAL_DATA_DIR` default base for `users.json` and `portal.log`; relative path variables refused when `NODE_ENV=production`
- [ ] 4.2 Startup tests for the matrix

## 5. Docs

- [ ] 5.1 `docs/integration-admin-files-manager.md`: replace "FILES_ROOT must be the same directory" with the marker contract; release folder; tunables; v5
- [ ] 5.2 `.env.example`, `docs/DEPLOYMENT.md`: `PORTAL_DATA_DIR`, `RELEASE_PVM` legacy-only, upgrade order
- [ ] 5.3 `npm test` passes; `graphify update .`
