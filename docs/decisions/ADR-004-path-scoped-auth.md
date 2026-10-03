# ADR-004: Auth gates only `RELEASE_PVM`, not the whole portal

## Status
Accepted

## Date
Established at project inception (pre-2026-10-01; recorded 2026-10-03)

## Context

The portal has two kinds of content sharing one filesystem and one URL space:

1. **Public artifact categories** — reference material and downloads that the
   organisation publishes for anyone with the link.
2. **Release packages** — pre-release builds under `RELEASE_PVM`, which are confidential
   until the embargo lifts.

The obvious design is a global auth gate: if `AUTH_ENABLED=true`, require a session for
everything. That is simpler to reason about and harder to get wrong.

It is also wrong for this product. The portal's reason to exist as a public link is
convenience — an engineer on a laptop without VPN should be able to grab a public package.
Gating the whole portal forces a login wall onto content that is meant to be public, and
users route around it, which means the release protection is bypassed by a user who simply
does not log in and guesses a URL.

## Decision

Auth is **path-scoped, not global**. `lib/auth-service.js` → `pathRequiresAuth()` decides
per request:

```
auth required  ⟺  AUTH_ENABLED
              ∧  RELEASE_PVM is configured
              ∧  FILES_ROOT is configured
              ∧  requested path resolves inside the RELEASE_PVM subtree
```

Protected prefixes, computed dynamically from `FILES_ROOT` and `RELEASE_PVM`:

- `/api/releases`
- `/api/files/{rel}` and `/api/files/{rel}/`
- `/api/download/{rel}` and `/api/download/{rel}/`

Everything else — `/api/categories`, `/api/search`, `/api/files/*` outside the release
subtree, and the SPA itself — is reachable without a session.

`/api/auth/status`, `/api/auth/login`, and `/api/auth/logout` are always reachable, or
login could not happen.

## Alternatives Considered

### Global auth gate when `AUTH_ENABLED=true`
- Pros: Simplest possible rule; one code path; no "did I cover this route" audit.
- Cons: Breaks the product's public-link purpose, and creates a pressure to disable auth
  entirely — which would remove release protection along with the login wall.
- Rejected: Wrong security model for two-tier content.

### Separate deployments / two portals
- Pros: Cleanest possible separation; public and confidential content share nothing.
- Cons: Two processes, two `FILES_ROOT` configurations, two nginx servers, two deployment
  pipelines — for one service whose public and private content live in the same tree.
- Rejected: Operational cost far exceeds the isolation benefit at this scale.

### Static signed URLs for releases
- Pros: No session at all; URLs can be time-boxed and revocable by expiry.
- Cons: Requires per-request signing infrastructure and a second key management story
  alongside `AUTH_JWT_SECRET`. Overkill when the audience already has accounts.
- Rejected: Reconsider if release access needs to extend to people without logins.

## Consequences

- **Every new route must be consciously classified.** This is the real cost, and it is a
  security cost, not a convenience one. A new endpoint is public by default; protection is
  opt-in via `pathRequiresAuth()`. When adding a route, decide explicitly which side it
  falls on, and if it touches release content, verify the prefix matching covers it.
- Prefix matching is **string-based against a computed relative path**, so a routing bug
  could expose the subtree. `pathRequiresAuth()` computes the relative path from
  `FILES_ROOT` to `RELEASE_PVM` and matches request prefixes against it — the containment
  logic in ADR-005 does **not** apply here, because this check happens before any file
  resolution. Treat this function as security-critical and re-verify it during review.
- If `RELEASE_PVM` is unset, the whole scheme is inert — `pathRequiresAuth()` returns
  `false` unconditionally. There is **no fail-closed behaviour**: forgetting to set
  `RELEASE_PVM` silently makes releases public. This is a genuine operational hazard; the
  startup banner is the only signal, so verify it on every deploy (ADR-007).
- There is no role model. `users.json` carries a `role` field, but nothing enforces it.
  Do not build on the assumption that roles are meaningful.