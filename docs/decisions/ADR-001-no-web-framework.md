# ADR-001: No web framework — plain `node:http`

## Status
Accepted

## Date
Established at project inception (pre-2026-10-01; recorded 2026-10-03)

## Context

The portal exposes a small, fixed REST surface: health, auth status/login/logout,
categories, releases, search, file listing, and download. It also serves a single-page
frontend, a 404 page, and a handful of static asset classes.

A framework would bring routing, middleware composition, body parsing, and static-file
serving — but also a dependency tree, a build or transpilation story, and an upgrade
cadence that has to be maintained for a service whose entire backend is roughly 2,100
lines across ten files.

Constraints that shaped this:

- The whole application must be auditable end-to-end by a small team.
- There is no build step today, and adding one is a larger commitment than adding a
  framework would be.
- The request pipeline is not middleware-shaped: it is a rate-limit check, a handful of
  guards, an auth gate, then a flat `if (pathname === ...)` dispatch. A middleware stack
  would model a shape the code does not have.

## Decision

Use Node.js's built-in `http` module directly. `server.js` creates the server;
`lib/api-router.js` → `handleRequest()` owns the entire pipeline. Route dispatch is a
flat sequence of `if (pathname === "/api/...")` blocks, checked in a documented order.

Only three runtime dependencies are permitted: `bcrypt`, `dotenv`, and `lenis`.

## Alternatives Considered

### Express
- Pros: Mature, ubiquitous, tiny learning curve; middleware model is pleasant.
- Cons: Pulls in a transitive tree; its middleware model does not match the flat dispatch
  this service actually needs; introduces an upgrade cadence for ~2,100 lines of code.
- Rejected: The dependency cost exceeds the benefit at this size.

### Fastify
- Pros: Faster than Express; schema-first validation.
- Cons: Heavier and more opinionated than needed; still a full dependency tree.
- Rejected: Performance is not the bottleneck — filesystem I/O is.

### Koa
- Pros: Smallest of the three; good async middleware story.
- Cons: Still a framework with its own conventions; middleware model again mismatched.
- Rejected: Same reasoning as Express, with fewer ecosystem benefits.

### Build a mini-framework in-repo
- Pros: Total control, no dependency.
- Cons: A framework needs its own tests, security review, and maintenance — recreating
  the cost of a dependency while also writing it.
- Rejected: The flat dispatch in `api-router.js` is already "the framework", and it is
  small enough to read in one sitting.

## Consequences

- The request pipeline is readable in a single file with no indirection.
- Adding a route means adding an `if` block. This is genuinely simple, and genuinely easy
  to get subtly wrong — ordering, method guards, and auth gating are all manual. Treat
  `lib/api-router.js` as the place to look first when auditing request handling.
- Third-party middleware (body size limits, compression, cookie parsing, multipart) must
  be hand-written or explicitly declined. See ADR-012 for the rate limiter, which is
  exactly such a hand-rolled piece.
- We accept the risk of no framework-provided hardening. Mitigation: the security model
  in `docs/SECURITY.md` is the compensating control, and path containment (ADR-005) is
  the single highest-risk surface and is covered explicitly there.