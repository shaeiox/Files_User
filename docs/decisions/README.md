# Architecture Decision Records

Decision records for `files-server-web`. Each ADR captures the *reasoning* behind an
architectural choice — the constraints that produced it and the alternatives that were
rejected — so a future maintainer (or agent) does not re-litigate a settled decision
without first learning why it was made.

## Format

Numbered sequentially as `ADR-NNN-kebab-case-title.md`, in the order decisions were made
(not the order they were written down). Never renumber, never delete, never rewrite an
accepted ADR in place.

## Lifecycle

```
PROPOSED → ACCEPTED → (SUPERSEDED by ADR-NNN | DEPRECATED)
```

When a decision changes, write a **new** ADR that references and supersedes the old one,
and mark the old one `Superseded by ADR-NNN`. The old record stays in the repository —
it is the reason the superseded approach looked reasonable at the time.

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [ADR-001](ADR-001-no-web-framework.md) | No web framework — plain `node:http` | Accepted |
| [ADR-002](ADR-002-filesystem-as-datastore.md) | The filesystem is the datastore | Accepted |
| [ADR-003](ADR-003-hand-rolled-jwt.md) | Hand-rolled HS256 JWT instead of a library | Accepted |
| [ADR-004](ADR-004-path-scoped-auth.md) | Auth gates only `RELEASE_PVM`, not the whole portal | Accepted |
| [ADR-005](ADR-005-defense-in-depth-path-containment.md) | Three-layer path containment for the filesystem boundary | Accepted |
| [ADR-006](ADR-006-vanilla-js-spa-no-build.md) | Vanilla JS SPA with no build step | Accepted |
| [ADR-007](ADR-007-nginx-static-and-proxy.md) | nginx serves static assets and proxies `/api/` | Accepted |
| [ADR-008](ADR-008-css-custom-property-tokens.md) | CSS custom properties as the design-token layer, no preprocessor | Accepted |
| [ADR-009](ADR-009-runtime-performance-tiers.md) | Runtime performance tiers gate visual effects | Accepted |
| [ADR-010](ADR-010-vendored-lenis-smooth-scroll.md) | Vendored Lenis for smooth scrolling, gated by perf and reduced-motion | Accepted |
| [ADR-011](ADR-011-self-hosted-fonts.md) | Self-hosted WOFF2 fonts to satisfy CSP `font-src 'self'` | Accepted |
| [ADR-012](ADR-012-in-memory-rate-limiting.md) | In-memory rate limiting and brute-force lockout | Accepted |

## Relationship to `docs/`

These ADRs record **why**. The reference documents one directory up record **what**:

- `docs/ARCHITECTURE.md` — the module and dependency structure these decisions produced
- `docs/STYLEGUIDE.md` — the design-token and CSS conventions behind ADR-008/009/010/011
- `docs/SECURITY.md` — the implemented security model, including accepted risk

When an ADR and a reference document disagree, the ADR wins on intent and the reference
document wins on current behaviour. Fix the reference document; supersede the ADR only
when the decision itself changes.