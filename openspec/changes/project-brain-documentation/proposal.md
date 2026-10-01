# Proposal: Project Brain Documentation

## Problem & Motivation

The `files-server-web` repository has **zero standalone architecture documentation**. The `readme.md` contains only 5 setup commands. While `lib/` modules have excellent inline JSDoc comments, there is no document explaining:

- How modules connect and depend on each other
- How a request flows through the system
- What the API endpoints are and their auth requirements
- How authentication, brute-force protection, and path traversal prevention work
- How the frontend SPA is structured
- How to deploy, extend, or contribute to the project

This forces new developers and AI coding assistants to read source code directly to understand the architecture, increasing onboarding time and the risk of incorrect modifications.

## Goals

1. Create a structured `docs/` directory at the repository root with hand-written Markdown documentation
2. Cover confirmed architecture, API behavior, data flows, security, deployment, development workflow, error-handling conventions, and extension points
3. Serve both human developers and AI coding assistants equally
4. Maintain a single source of truth per topic, avoiding duplication with JSDoc
5. Clearly distinguish confirmed facts from assumptions and tool-generated inferences
6. Include a lightweight documentation maintenance and review checklist

## Non-Goals

- Do not modify application source code, dependencies, or configuration
- Do not add pre-commit hooks, automated documentation tests, or runtime tests
- Do not make `graph.json` a required runtime or documentation dependency
- Do not generate API docs from JSDoc (keep JSDoc as implementation detail source)
- Do not document behavior not confirmed in the repository
- Do not treat automatic Graphify regeneration or automated doc validation as part of this proposal

## Proposed Documentation Files

**7 reference documents + 1 index (`docs/README.md`):**

```
docs/
├── README.md           (index — excluded from primary document count)
├── ARCHITECTURE.md
├── API.md
├── DATAFLOWS.md
├── SECURITY.md
├── DEPLOYMENT.md
├── DEVELOPMENT.md
└── EXTENDING.md
```

### ARCHITECTURE.md

**Responsibility:** System overview, module dependency graph, request routing, frontend component structure, and the complete environment-variable inventory.

**Scope:**
- Confirmed module dependency graph (from `require()` calls and `<script>` tags)
- Request routing: `server.js` → `api-router.js` → service modules
- Frontend SPA structure: `router.js` → `home.js`/`browse.js` → `resource-service.js`
- Complete environment-variable inventory (centralized reference — single source of truth)
- Technology stack: Node.js (no framework), vanilla JS SPA, nginx reverse proxy

**Source of truth:** This file is the authoritative source for architectural overview and the complete environment-variable inventory. JSDoc headers in individual files remain the source for module-level implementation details.

### API.md

**Responsibility:** REST endpoint reference with methods, paths, parameters, responses, and auth requirements.

**Scope:**
- All endpoints confirmed in `lib/api-router.js`
- Request/response shapes verified against handler code
- Auth requirements per endpoint
- Error response format (`serviceError` pattern)

**Source of truth:** This file is the authoritative source for API behavior. Cross-references JSDoc in `api-router.js` for implementation details.

### DATAFLOWS.md

**Responsibility:** Sequence and flow diagrams for key system operations.

**Scope:**
- Request → response flow for file listing, download, search
- Authentication flow: login → JWT → cookie → session verification
- Auth gate flow for protected release/download paths
- Frontend data flow: Router → HomePage/BrowsePage → ResourceService → API
- Boot sequence: server.js → load-env → logger → api-router → health check

**Source of truth:** This file is the authoritative source for data flow descriptions. All flows verified against source code.

### SECURITY.md

**Responsibility:** Security model, auth mechanisms, and threat mitigations.

**Scope:**
- Authentication: bcrypt password hashing, JWT (HMAC-SHA256), HttpOnly/Secure/SameSite cookies
- Brute-force protection: in-memory lockout, `AUTH_MAX_FAILED_ATTEMPTS`, `AUTH_LOCKOUT_MINUTES`
- Path traversal prevention: `resolveInsideRoot()`, symlink checks, `path.relative()` validation
- Rate limiting: in-memory IP-based limiter (`lib/rate-limiter.js`)
- Security headers: CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- Feature flag: `AUTH_ENABLED` toggle behavior

**Source of truth:** This file is the authoritative source for security model documentation. Cross-references `auth-service.js` JSDoc for implementation details.

### DEPLOYMENT.md

**Responsibility:** Deployment architecture and configuration confirmed in the repository.

**Scope:**
- nginx reverse proxy configuration (from `nginx.conf`)
- SSL/TLS termination at nginx
- Node.js process on port 3000
- File permissions and `FILES_ROOT` requirements
- Production-relevant environment variables (links back to `ARCHITECTURE.md` for the complete inventory — does NOT duplicate the full list)
- SPA fallback routing (`@spa` location)

**Source of truth:** This file is the authoritative source for deployment documentation. Only documents behavior confirmed in `nginx.conf` and source code.

### DEVELOPMENT.md

**Responsibility:** Development setup, coding conventions, error-handling patterns, and testing approach.

**Scope:**
- Setup: `npm install`, `.env` configuration, `node server.js`
- Coding conventions: `'use strict'`, JSDoc headers, module pattern (IIFE), `serviceError()` pattern
- Error handling: `serviceError(httpStatus, code, message)` convention, HTTP status codes
- Frontend conventions: IIFE modules, `data-i18n` attributes, `data-file` attribute for downloads
- Testing: current state (no tests), manual testing approach
- Documentation maintenance checklist

**Source of truth:** This file is the authoritative source for development workflow. Cross-references JSDoc for module-level details.

### EXTENDING.md

**Responsibility:** How to add new features, endpoints, and modules.

**Scope:**
- Adding new API endpoints (pattern in `api-router.js`)
- Adding new file operations (pattern in `files-service.js`)
- Adding new auth methods (pattern in `auth-service.js`)
- Adding new frontend components (pattern in `home.js`/`browse.js`)
- Adding new environment variables (pattern in `load-env.js` + JSDoc `@env` tags)

**Source of truth:** This file is the authoritative source for extension guidance. All patterns verified against existing code.

## Single Source of Truth Strategy

| Topic | Authoritative Source | Secondary Reference |
|-------|---------------------|---------------------|
| Architecture overview | `docs/ARCHITECTURE.md` | JSDoc headers in `lib/*.js` |
| Complete environment-variable inventory | `docs/ARCHITECTURE.md` | JSDoc `@env` tags in `lib/*.js` |
| API behavior | `docs/API.md` | `lib/api-router.js` code |
| Data flows | `docs/DATAFLOWS.md` | Source code |
| Security model | `docs/SECURITY.md` | `lib/auth-service.js` JSDoc |
| Deployment | `docs/DEPLOYMENT.md` | `nginx.conf` |
| Development workflow | `docs/DEVELOPMENT.md` | Source code conventions |
| Extension guidance | `docs/EXTENDING.md` | Source code patterns |
| Module implementation details | JSDoc in `lib/*.js` | N/A (JSDoc is source of truth here) |

**Environment-variable rule:** `docs/ARCHITECTURE.md` holds the complete inventory. `DEPLOYMENT.md` describes only production-relevant variables and MUST link back to `ARCHITECTURE.md` instead of duplicating the full list.

## Confirmed Facts vs. Assumptions

### Confirmed Facts (verified against source)

- Module dependency graph from `require()` calls
- API endpoints from `api-router.js` route handlers
- Auth flow from `auth-service.js` implementation
- Environment variables from JSDoc `@env` tags and `process.env` reads
- Frontend component structure from `<script>` tags and IIFE exports
- nginx configuration from `nginx.conf`
- Error handling pattern from `serviceError()` usage

### Assumptions (not fully verified)

- Production deployment uses the exact `nginx.conf` in the repo (may be customized per environment)
- No database or external service dependencies beyond filesystem

### Unresolved Implementation Details

- `data/users.json` exact schema — not directly verified from source; treat as an unresolved implementation detail until confirmed against the actual data file or generation logic

### Tool-Generated Inferences (NOT to be presented as facts)

- Graphify `indirect_call` edges between modules and functions (mislabeled `contains` relationships)
- Graphify `semantically_similar_to` edges between HTML pages (plausible but not architecturally significant)
- Graphify community detection groupings (useful for navigation, not authoritative)

## Documentation Maintenance

### When to Update

| Change Type | Documents to Update |
|-------------|-------------------|
| New API endpoint | `API.md`, `ARCHITECTURE.md` |
| New module or dependency | `ARCHITECTURE.md` |
| Auth/Security change | `SECURITY.md`, `DATAFLOWS.md` |
| New env var | `ARCHITECTURE.md` (complete inventory), `DEPLOYMENT.md` (if production-relevant) |
| Deployment change | `DEPLOYMENT.md` |
| New frontend component | `ARCHITECTURE.md`, `DATAFLOWS.md` |
| Error handling change | `DEVELOPMENT.md` |
| New extension pattern | `EXTENDING.md` |

### Review Checklist

- [ ] All architectural claims verified against source code
- [ ] All API endpoints match `api-router.js` handlers
- [ ] All environment variables documented with correct defaults in `ARCHITECTURE.md`
- [ ] `DEPLOYMENT.md` links back to `ARCHITECTURE.md` instead of duplicating the full env var inventory
- [ ] No duplication with JSDoc (cross-reference instead)
- [ ] No Graphify INFERRED edges presented as facts
- [ ] All confirmed facts marked as confirmed; assumptions marked as assumptions
- [ ] Navigation links between related documents work
- [ ] No broken references to source files
- [ ] All source references include file paths plus stable symbols, function names, route registrations, config sections, or headings (line numbers optional, never the only reference)

## Acceptance Criteria

### Completeness
- All 7 reference documents created under `docs/` plus 1 index (`docs/README.md`)
- All API endpoints from `api-router.js` documented
- All environment variables documented in `ARCHITECTURE.md`
- All modules in `lib/` and `assets/js/` covered in architecture

### Source Verification
- Every architectural claim traceable to a specific file and stable symbol/function/route/config section
- Security claims (cookie attributes, JWT algorithm, rate limiting, path traversal, security headers, `AUTH_ENABLED` behavior, API response shapes, `RELEASE_PVM` behavior, SPA fallback) verified directly against implementation before being documented as confirmed facts
- No Graphify INFERRED edges presented as confirmed facts
- All assumptions explicitly labeled
- `data/users.json` schema not documented unless directly verified from source

### Consistency
- Single source of truth per topic maintained
- `ARCHITECTURE.md` is the single source of truth for the complete environment-variable inventory
- `DEPLOYMENT.md` does not duplicate the full env var inventory; it links back to `ARCHITECTURE.md`
- No contradictory statements between documents
- Cross-references use consistent format

### Navigation
- `docs/README.md` index links to all 7 reference documents
- Each document links to related documents
- Clear hierarchy: ARCHITECTURE → API/DATAFLOWS/SECURITY → DEPLOYMENT/DEVELOPMENT/EXTENDING

### Readability
- Documents are skimmable with clear headings
- Code references use file paths plus stable symbols (line numbers optional)
- Diagrams use ASCII art or Mermaid (GitHub-compatible)
- No jargon without explanation

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Documentation becomes stale as code evolves | High | Medium | Maintenance checklist, review in PRs |
| Architectural assumptions incorrect | Medium | High | Verify all claims against source; label assumptions |
| Duplication with JSDoc causes confusion | Medium | Medium | Single source of truth strategy; cross-reference |
| Graphify inferences mislead readers | Low | Medium | Do not reference Graphify as source; label tool-generated content |
| Missing files in Graphify (7/15 chunks lost) | Low | Low | Graphify is not a dependency; manual verification is source of truth |

## Implementation Phases

### Phase 1: Core Architecture (no dependencies)
- Create `docs/README.md` (index)
- Create `docs/ARCHITECTURE.md` (includes complete env var inventory)
- Create `docs/API.md`

### Phase 2: Data Flows & Security (depends on Phase 1)
- Create `docs/DATAFLOWS.md`
- Create `docs/SECURITY.md`

### Phase 3: Operations & Development (depends on Phase 1)
- Create `docs/DEPLOYMENT.md` (production-relevant env vars only; links to `ARCHITECTURE.md`)
- Create `docs/DEVELOPMENT.md`

### Phase 4: Extension Guidance & Final Review (depends on Phase 1; final review depends on Phases 1, 2, and 3)
- Create `docs/EXTENDING.md`
- Final review of all documents against acceptance criteria
- Verify all claims against source code
- Check navigation links between documents
- Confirm no duplication with JSDoc
