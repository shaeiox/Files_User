# Tasks: Project Brain Documentation

## Phase 1: Core Architecture (no dependencies)

- [ ] 1.1 Create `docs/README.md` index linking to all 7 reference documents
- [ ] 1.2 Create `docs/ARCHITECTURE.md` — module dependency graph, request routing, frontend structure, complete env var inventory
- [ ] 1.3 Create `docs/API.md` — all endpoints from `api-router.js` with methods, params, responses, auth requirements

## Phase 2: Data Flows & Security (depends on Phase 1)

- [ ] 2.1 Create `docs/DATAFLOWS.md` — request→response, auth, download, search, boot sequence flows
- [ ] 2.2 Create `docs/SECURITY.md` — auth flow, brute-force, path traversal, rate limiting, security headers

## Phase 3: Operations & Development (depends on Phase 1)

- [ ] 3.1 Create `docs/DEPLOYMENT.md` — nginx config, SSL, file permissions, production-relevant env vars (link to ARCHITECTURE.md for full inventory)
- [ ] 3.2 Create `docs/DEVELOPMENT.md` — setup, conventions, error patterns, testing, maintenance checklist

## Phase 4: Extension Guidance & Final Review (depends on Phase 1; final review depends on Phases 1, 2, and 3)

- [ ] 4.1 Create `docs/EXTENDING.md` — patterns for adding endpoints, modules, auth methods, frontend components
- [ ] 4.2 Verify all architectural claims against source code
- [ ] 4.3 Verify all security claims against implementation (cookies, JWT, rate limiting, path traversal, headers, AUTH_ENABLED, API responses, RELEASE_PVM, SPA fallback)
- [ ] 4.4 Check navigation links between all documents
- [ ] 4.5 Confirm no duplication with JSDoc
- [ ] 4.6 Confirm DEPLOYMENT.md does not duplicate the full env var inventory
