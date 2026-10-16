# CloudAvid File Portal (`files-server-web`)

A filesystem-driven download portal. Serves an existing artifact tree over a small REST
API and a vanilla-JS single-page frontend — browse categories, search file names, and
stream downloads.

No database. No web framework. No build step. Three runtime dependencies
(`bcrypt`, `dotenv`, `lenis`).

---

## Quick Start

```bash
npm install

# Create .env in the project root (see Configuration below)
# Generate the JWT signing secret — 32 chars minimum:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# Create the users database directory (only needed when AUTH_ENABLED=true)
mkdir data

# Generate an admin password hash and paste it into data/users.json
node lib/hash-password.js admin123

npm start
```

Then open <http://localhost:4000>.

The startup banner reports `FILES_ROOT` status. If it says anything other than
`FILES_ROOT is configured`, the portal cannot serve files — see
[DEVELOPMENT.md → Startup Failures](docs/DEVELOPMENT.md#startup-failures).

---

## Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start the server (`node server.js`) |
| `node lib/hash-password.js <password>` | Generate a bcrypt hash for `data/users.json` |

There is **no test suite and no build step.** Verification is manual — see
[DEVELOPMENT.md → Tests and Validation](docs/DEVELOPMENT.md#tests-and-validation).

Quick smoke check once running:

```bash
curl http://localhost:4000/api/health
curl http://localhost:4000/api/categories
curl http://localhost:4000/api/files/
curl http://localhost:4000/api/auth/status
```

---

## Configuration

All configuration is environment variables, loaded by `lib/load-env.js` from `.env`.
`dotenv` is used when available, with a built-in parser as fallback. **Existing
`process.env` values are never overwritten** — real environment variables win.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FILES_ROOT` | **Yes** | — | Absolute path to the artifact tree. Nothing works without it. |
| `PORT` | No | `4000` | HTTP port |
| `RELEASE_PVM` | No | — | Path (under `FILES_ROOT`) holding confidential releases. Auth-protected when set. |
| `AUTH_ENABLED` | No | `false` | Enables the auth gate |
| `AUTH_JWT_SECRET` | If auth on | — | HMAC signing secret, **32 characters minimum** |
| `AUTH_SESSION_MINUTES` | No | `30` | Session idle timeout |
| `AUTH_USERS_FILE` | No | `./data/users.json` | User database path |
| `AUTH_MAX_FAILED_ATTEMPTS` | No | `5` | Brute-force lockout threshold |
| `AUTH_LOCKOUT_MINUTES` | No | `15` | Lockout duration |

> **Port:** the portal listens on `PORT` (default **4000**), which is what the nginx config
> (`scripts/nginx/cloudavid.conf` in the Admin Files Manager repository) proxies to. Set
> `PORT=4000` explicitly in production — see [DEPLOYMENT.md](docs/DEPLOYMENT.md#7-nginx).

### Security note

`.env` **must not be committed.** It holds `AUTH_JWT_SECRET`, which is the entire trust
anchor for sessions (see [ADR-003](docs/decisions/ADR-003-hand-rolled-jwt.md)).

The repository's `.gitignore` currently has this entry **commented out** (`#.env`), and
`.env` is tracked. This is recorded as known security debt in
[SECURITY.md → Known Security Debt](docs/SECURITY.md#known-security-debt) along with
remediation steps. Read it before deploying anywhere new.

---

## Architecture

```
Browser
  └─ nginx (:443, TLS)                         [ADR-007]
       ├── /api/*        → proxy_pass → Node.js :PORT
       ├── static assets → served from disk, 30d immutable cache
       └── everything else → try_files → @spa → index.html
              │
Node.js process (plain node:http, no framework)  [ADR-001]
  └── server.js → lib/api-router.js → handleRequest()
        ├── lib/rate-limiter.js    per-IP request cap
        ├── lib/auth-service.js    JWT sessions, bcrypt, lockout  [ADR-003][ADR-004]
        ├── lib/files-service.js   filesystem access + containment [ADR-002][ADR-005]
        └── lib/static-handler.js  SPA shell, 404, static, downloads
              │
            filesystem (FILES_ROOT)
```

Frontend is a no-build vanilla-JS SPA ([ADR-006](docs/decisions/ADR-006-vanilla-js-spa-no-build.md))
with a CSS custom-property design system ([ADR-008](docs/decisions/ADR-008-css-custom-property-tokens.md)),
runtime performance tiers ([ADR-009](docs/decisions/ADR-009-runtime-performance-tiers.md)),
and vendored Lenis smooth scrolling ([ADR-010](docs/decisions/ADR-010-vendored-lenis-smooth-scroll.md)).

### Key design decisions

The filesystem **is** the datastore — no index, no cache, no staleness bugs. Auth gates
only `RELEASE_PVM`, not the whole portal, so public downloads stay link-shareable while
releases stay confidential.

### Repository layout

```
├── server.js              entry point, HTTP server, boot sequence
├── lib/                   backend modules (10 files)
│   ├── api-router.js      request pipeline + route dispatch
│   ├── files-service.js   filesystem abstraction, path containment
│   ├── auth-service.js    JWT, bcrypt, brute-force lockout
│   ├── rate-limiter.js    in-memory per-IP rate limiting
│   ├── http-utils.js      responses, JSON body parsing, security headers
│   ├── static-handler.js  SPA, 404, static files, download streaming
│   ├── load-env.js        .env loading
│   ├── logger.js          ANSI terminal logging
│   ├── idle-timer.js      client-side session auto-lock
│   └── hash-password.js   CLI password hashing
├── public/assets/
│   ├── js/                frontend modules (IIFE, no build)
│   │   ├── router.js      SPA routing — must load last
│   │   ├── home.js        HomePage
│   │   ├── browse.js      BrowsePage
│   │   ├── file-actions.js  per-item File Actions module
│   │   ├── i18n.js        en / fa
│   │   ├── theme.js       light/dark toggle
│   │   ├── autocomplete.js
│   │   ├── banner.js
│   │   ├── smooth-scroll.js  Lenis wrapper, gated by perf + motion prefs
│   │   ├── services/      resource-service.js, performance-monitor.js
│   │   └── vendor/        lenis.min.js
│   ├── css/               7 stylesheets, tokens.css first
│   ├── fonts/             self-hosted WOFF2
│   └── icon/              image assets
├── data/users.json        user database (bcrypt hashes)
├── docs/                  Project Brain documentation
│   └── decisions/         ADRs
├── openspec/              OpenSpec change proposals
├── nginx.conf             production nginx config (template)
└── .env                   environment variables — DO NOT COMMIT
```

---

## Documentation

Start at **[docs/README.md](docs/README.md)** for the full index.

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Modules, dependencies, env inventory, frontend structure |
| [API.md](docs/API.md) | Endpoint reference: methods, params, responses, auth, errors |
| [DATAFLOWS.md](docs/DATAFLOWS.md) | Request sequences, auth flow, boot sequence |
| [SECURITY.md](docs/SECURITY.md) | Security model **and known security debt** |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | nginx topology, TLS, process configuration |
| [DEVELOPMENT.md](docs/DEVELOPMENT.md) | Setup, conventions, error patterns, verification |
| [EXTENDING.md](docs/EXTENDING.md) | How to add endpoints, modules, components |
| [STYLEGUIDE.md](docs/STYLEGUIDE.md) | Design tokens, CSS layers, theming, RTL, perf modes |
| [decisions/](docs/decisions/) | Architecture Decision Records — why things are the way they are |

**JSDoc in source is authoritative for implementation details.** The `docs/` set is
authoritative for architecture and behaviour; ADRs are authoritative for *intent*.

---

## Contributing

1. **Read the relevant ADR first.** If your change touches an architectural boundary, the
   ADR explains the constraint you are working within — and whether the decision still
   holds.
2. **Follow existing patterns.** Backend: `'use strict'`, JSDoc headers, `module.exports`,
   `serviceError()` for typed errors, `sendJSON()` for responses. Frontend: IIFE modules
   exposing one global.
3. **Register new frontend modules** in `public/index.html` — script order is load-bearing, and
   `router.js` must stay last.
4. **Classify the auth requirement of every new endpoint** explicitly. Routes are public
   by default; see [ADR-004](docs/decisions/ADR-004-path-scoped-auth.md).
5. **Route all filesystem access through `resolveInsideRoot()`.** It is the single most
   security-critical function in the repo — see
   [ADR-005](docs/decisions/ADR-005-defense-in-depth-path-containment.md).
6. **Verify manually** — there is no test suite. The checklist is in
   [EXTENDING.md → Verification After an Extension](docs/EXTENDING.md#verification-after-an-extension).
7. **Update the docs** using the maintenance mapping in
   [ARCHITECTURE.md → Maintenance Mapping](docs/ARCHITECTURE.md#maintenance-mapping).

### Change proposals

This project uses [OpenSpec](https://github.com/Fission-AI/OpenSpec) for non-trivial
changes: create a proposal under `openspec/changes/<name>/` with `proposal.md`,
`design.md`, `tasks.md`, and capability `specs/`. See `openspec/config.yaml`. Four
proposals are currently in flight — `enterprise-ui-redesign`, `a11y-ux-debt`,
`browse-file-actions`, `project-brain-documentation`.

---

## Known Issues

- `.env` is no longer tracked, but an old `AUTH_JWT_SECRET` remains in git history:
  generate a fresh one for every deployment. See
  [SECURITY.md → Known Security Debt](docs/SECURITY.md#known-security-debt).
- `public/browse.html` is not routed — `/browse/*` serves `public/index.html`. See
  [ARCHITECTURE.md](docs/ARCHITECTURE.md#standalone-html-pages).
- No test suite and no process supervision definition.