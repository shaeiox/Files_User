# ADR-005: Three-layer path containment for the filesystem boundary

## Status
Accepted

## Date
Established at project inception (pre-2026-10-01; recorded 2026-10-03)

## Context

This service takes a user-supplied relative path and reads or streams the file it names.
That is the highest-risk code in the repository: a containment bug is arbitrary file read
over HTTP, and possibly arbitrary file *disclosure* — the artifact tree is what this
service exists to protect.

There are also files outside `FILES_ROOT` that matter: `.env` (which holds the JWT signing
secret, per ADR-003), `data/users.json` (password hashes), and `nginx.conf`. A traversal
that reaches any of them is a full compromise.

Threats to defend against:

1. Encoded traversal — `../../etc/passwd`, `%2e%2e%2f`
2. Null-byte truncation — `file.txt\0.jpg`
3. Absolute path injection — `/etc/passwd` passed as the relative path
4. **Symlink escape** — a symlink *inside* `FILES_ROOT` pointing outside it. This is the
   one that defeats naive `path.resolve()`-based containment, because `path.resolve()`
   never touches the filesystem and so cannot see link targets.

## Decision

Containment is enforced in `lib/files-service.js` → `resolveInsideRoot()` as three
independent layers. Each layer must pass.

**Layer 1 — reject traversal segments before touching the filesystem.**
`splitRel()` normalizes the path and rejects any segment that is `.` or `..`, and any
segment containing a null byte → `400 INVALID_PATH`.

**Layer 2 — verify the resolved path is inside the root, after resolution.**
`path.resolve(root, ...parts)`, then `path.relative(root, target)` must not begin with
`..` → `403 PATH_TRAVERSAL`. This catches absolute-path injection and any segment
surviving layer 1.

**Layer 3 — resolve symlinks and re-verify containment against the real path.**
`fs.realpathSync()` on the resolved target, then the same `path.relative()` containment
check against the real root → `403 SYMLINK_TRAVERSAL`.

Two additional independent controls:

- **Hidden-file filter.** `isHidden()` excludes dotfiles and `index.html` / `index.php`
  from all listings, so a web index dropped into a shared tree is never exposed.
- **Sensitive-path deny at the router.** `lib/api-router.js` rejects `/.env` and any
  `/lib/`, `/data/`, `/node_modules/` prefix with `403` before routing — a second, coarser
  net that does not depend on `resolveInsideRoot()` being correct. nginx adds a third
  (`location ~ /\.` and `~* \.(backup|bak|sql|env|log)$`, see ADR-007).

## Alternatives Considered

### Single `path.resolve()` + `startsWith(root)` check
- Pros: One line, easy to read.
- Cons: Does not see symlinks at all, and `startsWith` on string prefixes is itself
  error-prone (`/srv/files-evil` passes a `/srv/files` prefix check).
- Rejected: Insufficient — it misses the symlink case entirely.

### Canonicalize then check (resolve + realpath, one layer)
- Pros: Fewer steps; realpath does subsume `..` handling for existing paths.
- Cons: Fails *closed-ish* in the wrong direction: a non-existent path cannot be
  realpath'd, so the error surfaced is a confusing `ENOENT` rather than a clean rejection.
  Also means the traversal segments survive into the filesystem call, which is harder to
  audit than rejecting them up front.
- Rejected: Layer 1's early rejection gives better errors and a cleaner audit story.

### chroot / container / mount namespace isolation
- Pros: Kernel-enforced boundary; containment becomes structural rather than code-based.
- Cons: Requires root or container privileges and complicates the nginx + Node topology
  (ADR-007). A significant infrastructure commitment for a single-process portal.
- Rejected: Containment in code is appropriate here; revisit if the deployment ever runs
  multiple mutually-distrusting services on one host.

### `sendfile`/stream without full resolution
- Pros: Faster.
- Cons: Skips layers 2 and 3.
- Rejected: Speed is not the goal; correctness is.

## Consequences

- **Three `realpathSync()` / `statSync()` calls per request.** Layer 3 and the
  existence check both hit the filesystem. This is a deliberate latency cost: containment
  is not on a fast path.
- **`resolveInsideRoot()` is the single most security-critical function in the
  repository.** Any new filesystem operation must route through it. A direct
  `fs.readFile`/`createReadStream` on a request-derived path is a containment bypass even
  if it "looks safe" — do not add one. `docs/EXTENDING.md` restates this rule for
  contributors.
- A symlink *inside* `FILES_ROOT` pointing to another location inside `FILES_ROOT` is
  allowed. That is intentional — containment is about the boundary, not about link
  prohibition.
- Layer 1 rejects `.` segments, so `a/./b` is an error rather than being normalized. Slightly
  stricter than necessary; preferred over being lenient, since a path that "needs"
  normalizing is usually a client bug worth surfacing.
- Because resolution is per-request and the root is validated on each call
  (`getRoot()` → `fs.stat`), a `FILES_ROOT` change takes effect immediately with no cache
  to invalidate. Consistent with ADR-002.
- There is a known accepted risk recorded in `docs/SECURITY.md`: the deny-list in
  `api-router.js` and nginx is prefix-based and coarse. Layer 3 is the real control; the
  others are defence in depth.