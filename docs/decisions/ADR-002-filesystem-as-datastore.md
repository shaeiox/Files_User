# ADR-002: The filesystem is the datastore

## Status
Accepted

## Date
Established at project inception (pre-2026-10-01; recorded 2026-10-03)

## Context

The product is a **download portal for an existing artifact repository**. The files are
already on disk, produced by some other system (release packaging, for example). This
service's entire job is to present that tree over HTTP: list it, search it, search within
it, and stream it.

The question is whether to index it. A directory tree of any real size is expensive to
walk per request: `listCategories()` recursively summarises every subdirectory, and
`searchEntries()` scans the whole tree. Both are O(tree).

Constraints:

- The files are **not owned** by this service. They are written and rotated by other
  systems. Anything we cache is a cache, and caches go stale.
- There is no schema to maintain. A directory is the schema.
- The deployment target is a single Node.js process behind nginx (see ADR-007). There is
  no second service to host a database.

## Decision

**No database. No index. No cache layer.** Every request reads the live filesystem.

- `FILES_ROOT` is the root of truth. `lib/files-service.js` resolves, validates, and walks
  it on each request.
- Category counts and modification times are computed per request by `summarizeTree()`,
  capped at `MAX_WALK_DEPTH = 12`.
- Search is a live walk (`searchEntries()`), stack-based rather than recursive to avoid
  blowing the call stack on deep trees.

## Alternatives Considered

### SQLite index
- Pros: Fast queries; no full-tree walk per request; standard library only in Node 22+.
- Cons: Introduces a real consistency problem. The filesystem is written by other systems
  on an unknown schedule, so the index needs invalidation logic — and a stale index
  serving *download links to files that no longer exist* is worse than a slow directory
  listing.
- Rejected: Optimises the read path at the cost of the correctness that matters most.

### Elasticsearch / Meilisearch
- Pros: Excellent search; typo tolerance; ranking.
- Cons: A whole additional service to operate, index lifecycle to maintain, and a
  deployment topology (ADR-007) that has no place for it.
- Rejected: Disproportionate. Search is a substring match over names, not a relevance
  problem.

### In-memory cache with mtime invalidation
- Pros: Removes the O(tree) cost without a new service.
- Cons: Two invalidation bugs and the portal shows the wrong file list — which is the
  one thing a file portal must never do. Also breaks under multi-process (there is only
  one today, but a cache is a standing invitation to scale horizontally).
- Rejected: The failure mode is worse than the performance problem.

## Consequences

- **Zero schema migration, zero sync job, zero staleness class of bug.** A file that
  appears on disk is immediately visible; a file that disappears immediately 404s.
- Listing and search cost scale with tree size on every request. This is a real ceiling:
  a very large tree makes `/api/categories` and `/api/search` slow.
- Mitigations already in place: walk depth is capped, search has a result cap, and the
  rate limiter (ADR-012) bounds request volume per IP. None of these fix the asymptotics —
  they only bound the blast radius.
- The practical limit to watch: `summarizeTree()` runs per category per request. If this
  portal ever needs to serve a tree large enough for that to matter, the correct fix is a
  **narrower** answer than a full index — a precomputed summary refreshed on demand, or
  simply caching one category's count and invalidating on that category's `mtime`. Revisit
  this ADR before reaching for Elasticsearch.
- Anything that must be stored *about* users (not files) does use a file — see ADR-003
  and `data/users.json`.