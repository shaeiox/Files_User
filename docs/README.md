# Project Brain Documentation

Structured reference documentation for the `files-server-web` repository. Designed for both
human developers and AI coding assistants.

## Intended Audience

- **Human developers** onboarding to the project or making changes
- **AI coding assistants** that need architectural context before modifying source code

## Reference Documents

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System overview, module relationships, environment variables |
| [API.md](API.md) | REST endpoint reference: methods, parameters, responses, auth |
| [DATAFLOWS.md](DATAFLOWS.md) | Request/response sequences, auth flow, boot sequence |
| [SECURITY.md](SECURITY.md) | Security model **and known security debt** — read before deploying |
| [DEPLOYMENT.md](DEPLOYMENT.md) | nginx topology, SSL, process configuration, pre-deploy checklist |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Setup, conventions, error patterns, verification |
| [EXTENDING.md](EXTENDING.md) | Patterns for adding endpoints, modules, components |
| [STYLEGUIDE.md](STYLEGUIDE.md) | Design tokens, CSS layers, theming, RTL, performance modes |

## Architecture Decision Records

[decisions/](decisions/README.md) records **why** architectural choices were made — the
constraints, the rejected alternatives, and the consequences accepted. Read the relevant ADR
before changing an architectural boundary.

| ADR | Title |
|-----|-------|
| [ADR-001](decisions/ADR-001-no-web-framework.md) | No web framework — plain `node:http` |
| [ADR-002](decisions/ADR-002-filesystem-as-datastore.md) | The filesystem is the datastore |
| [ADR-003](decisions/ADR-003-hand-rolled-jwt.md) | Hand-rolled HS256 JWT instead of a library |
| [ADR-004](decisions/ADR-004-path-scoped-auth.md) | Auth gates only `RELEASE_PVM`, not the whole portal |
| [ADR-005](decisions/ADR-005-defense-in-depth-path-containment.md) | Three-layer path containment |
| [ADR-006](decisions/ADR-006-vanilla-js-spa-no-build.md) | Vanilla JS SPA with no build step |
| [ADR-007](decisions/ADR-007-nginx-static-and-proxy.md) | nginx serves static assets and proxies `/api/` |
| [ADR-008](decisions/ADR-008-css-custom-property-tokens.md) | CSS custom properties as the design-token layer |
| [ADR-009](decisions/ADR-009-runtime-performance-tiers.md) | Runtime performance tiers gate visual effects |
| [ADR-010](decisions/ADR-010-vendored-lenis-smooth-scroll.md) | Vendored Lenis for smooth scrolling |
| [ADR-011](decisions/ADR-011-self-hosted-fonts.md) | Self-hosted WOFF2 fonts to satisfy CSP |
| [ADR-012](decisions/ADR-012-in-memory-rate-limiting.md) | In-memory rate limiting and brute-force lockout |

## Start Here

| If you are… | Read |
|-------------|------|
| New to the project | [readme.md](../readme.md) → [ARCHITECTURE.md](ARCHITECTURE.md) → [DEVELOPMENT.md](DEVELOPMENT.md) |
| Adding an endpoint | [API.md](API.md) → [EXTENDING.md](EXTENDING.md) → [ADR-004](decisions/ADR-004-path-scoped-auth.md) (auth classification) |
| Touching filesystem access | [ADR-005](decisions/ADR-005-defense-in-depth-path-containment.md) — non-negotiable |
| Changing the UI | [STYLEGUIDE.md](STYLEGUIDE.md) → [ADR-008](decisions/ADR-008-css-custom-property-tokens.md), [ADR-009](decisions/ADR-009-runtime-performance-tiers.md) |
| Deploying | [DEPLOYMENT.md](DEPLOYMENT.md) pre-deploy checklist → [SECURITY.md](SECURITY.md) |
| Reviewing for security | [SECURITY.md](SECURITY.md) → [ADR-003](decisions/ADR-003-hand-rolled-jwt.md), [ADR-005](decisions/ADR-005-defense-in-depth-path-containment.md) |

## Source of Truth

Each reference document owns its topic:

| Document | Owns |
|----------|------|
| `ARCHITECTURE.md` | Architecture overview and complete environment-variable inventory |
| `API.md` | API behavior: endpoints, parameters, responses, auth, errors |
| `DATAFLOWS.md` | Data-flow descriptions |
| `SECURITY.md` | Security model, known debt, accepted risks |
| `DEPLOYMENT.md` | Deployment guidance |
| `DEVELOPMENT.md` | Development workflow and conventions |
| `EXTENDING.md` | Extension guidance |
| `STYLEGUIDE.md` | Frontend visual conventions |
| `decisions/` | Architectural intent — the *why* behind the structure |

Precedence when two sources disagree:

- **JSDoc** in `lib/*.js` and `assets/js/*.js` is authoritative for module and function
  implementation details.
- The **`docs/` set** is authoritative for current architecture and behaviour.
- **ADRs** are authoritative for intent. Where an ADR and a reference document disagree, the
  ADR wins on intent and the reference document is out of date and should be corrected —
  unless the decision itself has changed, in which case write a **new** ADR superseding the
  old one. Never edit an accepted ADR in place, and never delete one.
- **Graphify** (`graphify-out/graph.json`) is a supporting analysis and navigation tool, not
  an architectural source of truth.

## Known Issues

Documented in full, tracked here so they are not lost:

| Issue | Reference |
|-------|-----------|
| `.env` tracked in git with a live `AUTH_JWT_SECRET`; `.gitignore` rule commented out | [SECURITY.md §1](SECURITY.md#1-env-is-tracked-in-git-with-a-live-signing-secret-high) |
| `PORT` default (`4000`) disagrees with `nginx.conf` `proxy_pass` (`3000`) → 502 in production | [DEPLOYMENT.md](DEPLOYMENT.md#port-mismatch-reconcile-before-deploying) |
| `browse.html` is not routed — `/browse/*` serves `index.html` | [ARCHITECTURE.md](ARCHITECTURE.md#standalone-html-pages) |
| `woff2`/`webp` missing from the nginx static-asset regex → no long-lived caching | [DEPLOYMENT.md](DEPLOYMENT.md#static-file-handling) |
| `RELEASE_PVM` unset silently disables release protection (no fail-closed behaviour) | [SECURITY.md §3](SECURITY.md#3-release_pvm-unset-silently-makes-releases-public-medium) |
| Rate limiter bypassable if the Node port is exposed directly | [SECURITY.md §2](SECURITY.md#2-rate-limiter-is-bypassable-if-the-port-is-exposed-directly-medium) |
| `lenis` declared in `package.json` but unused; the vendored copy is what ships | [ARCHITECTURE.md](ARCHITECTURE.md#unresolved) |
| No test suite, no CI, no process supervision definition | [DEVELOPMENT.md](DEVELOPMENT.md#tests-and-validation) |

## Maintenance

When source code changes, update the relevant reference document(s) according to the
maintenance mapping in [ARCHITECTURE.md → Maintenance Mapping](ARCHITECTURE.md#maintenance-mapping).

Non-trivial changes go through an [OpenSpec](https://github.com/Fission-AI/OpenSpec) proposal
under `openspec/changes/<name>/` — see
[DEVELOPMENT.md → Change Workflow](DEVELOPMENT.md#change-workflow-openspec). A proposal does
not replace the docs update; a change usually needs both.