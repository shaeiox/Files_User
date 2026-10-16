# ADR-007: nginx serves static assets and proxies `/api/`

## Status
Accepted

## Date
Established at project inception (pre-2026-10-01; recorded 2026-10-03)

## Context

The application can technically serve everything itself — `lib/static-handler.js` does
SPA shells, static files, and streamed downloads. In production it does not: nginx
terminates TLS and fronts the whole thing.

This duplication is deliberate and needs explaining, because "why does nginx reimplement
static file serving?" is a reasonable question and it has a real operational cost: static
asset behaviour is defined in two places.

Why front it at all:

- **TLS termination.** HTTPS at nginx, plain HTTP on loopback. Keeps certificate handling
  and cipher policy out of Node entirely.
- **Cheap, cacheable static serving.** nginx serves CSS/JS/images directly with
  `expires 30d` and `immutable`, never touching the Node process. The Node process does
  nothing but API work and downloads.
- **Security headers, including HSTS**, set once at the edge and applied uniformly.
- **Path deny rules as a third containment layer**, independent of application code
  (ADR-005): `location ~ /\.` blocks hidden files, `~ \.(php|pl|py|cgi)$` blocks script
  execution, and `~* \.(backup|bak|sql|env|log)$` blocks sensitive extensions.
- **Download proxying with `proxy_buffering off` and a 3600s read timeout**, tuned for
  large artifact streaming that would otherwise buffer in the proxy.

The split is: `location /api/` → Node; everything else → nginx, with `try_files` falling
back to `@spa` → `public/index.html`.

## Alternatives Considered

### Node serves everything (no nginx)
- Pros: Single component; one place to configure; no proxy hop; static behaviour defined
  once.
- Cons: Node handles TLS and every static request. Hand-rolled TLS config is a downgrade
  from nginx's; no edge caching; application bugs are directly internet-facing.
- Rejected: nginx is a better TLS terminator and a better static server.

### nginx for TLS only, proxy everything to Node
- Pros: Static behaviour defined in exactly one place; no duplicated routing rules.
- Cons: Every CSS/JS/image request consumes a Node request slot against the in-memory rate
  limiter (ADR-012) — an asset-heavy page load can exhaust an IP's budget. Loses edge
  caching entirely.
- Rejected: Pushes static load onto the process that has the least spare capacity.

### CDN in front of nginx
- Pros: Offloads assets globally; cheaper bandwidth.
- Cons: Requires public asset hosting, cache invalidation discipline, and a second thing
  to keep in sync with the same-origin CSP and `font-src 'self'` constraint (ADR-011).
- Rejected: Not warranted at this scale.

### Dev server (Vite) with HMR
- Pros: Fast inner loop; module resolution; would let ADR-006 be revisited cheaply.
- Cons: Introduces a build/dev server into a no-build project, and a second way for
  assets to be served that differs from production (ADR-006's core appeal).
- Rejected: Would erode the "what you serve is what you wrote" property.

## Consequences

- **Static asset configuration is duplicated between `nginx.conf` and
  `lib/static-handler.js`.** A new asset class — a font, a WebP variant — must be added to
  the nginx extension regex (`~* \.(?:css|js|png|jpg|jpeg|svg|ico)$`) to receive the
  intended caching policy.
- **`public/assets/fonts/*.woff2` is a live example.** `.woff2` is not in that regex, so font
  requests fall through to `location /` → `try_files $uri $uri/ @spa`, which does serve
  them correctly from disk. The gap is caching, not availability: fonts miss the
  `expires 30d` + `Cache-Control: public, immutable` treatment and `access_log off`, so
  every page load revalidates ten font files against nginx's default `ETag`/`Last-Modified`
  handling. Adding `woff2` (and `webp`, also absent) to that regex is a one-line fix that
  matches the intent already expressed for every other static asset.
- **Local development does not exercise nginx.** `npm start` alone proves nothing about
  proxying, caching, TLS, or deny rules. Any change touching `nginx.conf` must be verified
  against a real nginx.
- `nginx.conf` ships with production-specific values: `server_name files.cloudavid.com` and
  concrete SSL certificate paths. It is a template, not a portable config.
- **The Node SPA/static handlers are effectively a development affordance.** They are
  correct and used, but production never reaches them for assets. Do not treat them as
  dead code, and do not assume changes there affect production behaviour without checking
  `nginx.conf`.
- Rate limiting applies only to `/api/*` in production, since static requests never reach
  Node — a useful side effect of this topology.
- No process supervision is defined anywhere in the repo (no systemd unit, PM2 config, or
  Dockerfile). Deployment must supply it. This is recorded as unresolved in
  `docs/DEPLOYMENT.md`.