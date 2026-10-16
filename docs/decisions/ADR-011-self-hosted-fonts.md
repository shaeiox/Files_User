# ADR-011: Self-hosted WOFF2 fonts to satisfy CSP `font-src 'self'`

## Status
Accepted

## Date
2026-10-02 (Obsidian Kinetic enterprise UI redesign)

## Context

The redesign needed four type families:

| Family | Role | Weights |
|--------|------|---------|
| `Inter` | Body, display, headings | 400, 500, 600 |
| `Vazirmatn` | Persian (`fa`) script | 400, 500, 600 |
| `JetBrains Mono` | Code, versions, hashes | 400, 500, 600 |
| `Cinzel` | Hero headline only | 600 |

The application also supports RTL/Persian, so `Vazirmatn` is not optional — it is required
for correct Arabic-script rendering, and a Latin-only stack would fall back to a system
font mid-sentence for every Persian user.

Two constraints decided the approach:

1. **The CSP is `font-src 'self' data:`.** A font CDN on another origin is blocked. So
   every alternative that involves a remote font host is already foreclosed.
2. **There is no build step** (ADR-006), so fonts cannot be subsetted, preloaded
   programmatically, or converted as part of a pipeline. Whatever ships is what ships.

## Decision

Commit WOFF2 files to `public/assets/fonts/` and declare them with `@font-face` in
`public/assets/css/tokens.css`. Same-origin, no CDN, no build step.

Four properties applied throughout:

- **`font-display: swap` on every face.** Text paints immediately in the fallback and
  swaps when the webfont arrives. Without this, the CSS-referenced fonts would block text
  rendering on first load.
- **Weights are declared individually** (400 / 500 / 600) rather than as a variable font,
  so a browser downloads only the weights actually used.
- **No `unicode-range` on Vazirmatn** (removed 2026-10-13). The Arabic-only range forced
  digits, spaces, punctuation and ZWNJ inside Persian text onto Inter or a system font.
  Inter leads `--font`, so Latin-only text still never needs Vazirmatn.
- **Explicit fallback stacks per role**, ordered so the script-appropriate family wins:
  `--font: 'Inter', 'Vazirmatn', …`, `--font-fa: 'Vazirmatn', 'Inter', …`. Under
  `:root[lang="fa"]` the `--font*` tokens repoint to `--font-fa`; mono stacks carry
  Vazirmatn second so Persian inside mono elements never hits a system font.

## Alternatives Considered

### Google Fonts / Bunny Fonts / Fontsource CDN
- Pros: No repo weight; automatic subsetting and WOFF2 conversion; easy version bumps.
- Cons: **Blocked by CSP `font-src 'self'`.** Also adds a third-party origin and a privacy
  consideration (font requests leak page visits to that host).
- Rejected: Violates the CSP.

### Self-hosted via Fontsource npm packages + build step
- Pros: Version-locked in `node_modules`; upstream updates via `npm`; automated subsetting.
- Cons: Requires a build step to get the files into `public/assets/` (ADR-006). Fontsource does
  ship prebuilt CSS/woff2 that could be copied by hand — but then it is a vendored blob
  again, with an extra indirection.
- Rejected: Only worth revisiting if a build step is introduced; then prefer it over manual
  commits, and supersede this ADR.

### System font stack only (drop Inter/JetBrains Mono/Cinzel)
- Pros: Zero bytes, zero requests, instant text.
- Cons: Abandons the redesign's typographic identity — `JetBrains Mono` for versions and
  hashes and `Cinzel` for the hero are load-bearing design elements, not decoration. Also
  renders inconsistently across the team's machines.
- Rejected: Visual identity is the point of the redesign.

### SVG-in-CSS icons / logo as text
- Pros: No font.
- Cons: Not applicable — this is about typography, not iconography. Noted because it is the
  adjacent question (icons are already `.webp`/`.png` in `public/assets/icon/`).
- Rejected: Out of scope.

### Local fonts installed on the server, served via `font-src 'self'`
- Pros: Same-origin, satisfies CSP.
- Cons: Breaks for any developer whose machine lacks them; makes local development
  non-reproducible; adds system configuration to the setup steps.
- Rejected: Committed assets are reproducible.

## Consequences

- **Font binaries are in the repository.** Ten WOFF2 files add to clone size and are not
  minified or optimised by any pipeline. Check the total weight if clone time becomes
  painful.
- **No preload hints.** `<link rel="preload">` for the two most important faces
  (`Inter-Regular`, and `Vazirmatn-Regular` for Persian) would meaningfully improve
  first paint, and is the highest-value follow-up here. It requires editing the inline
  script/`public/index.html`, so it was out of scope for the redesign commit.
- **`.woff2` is missing from the nginx static-asset regex**
  (`~* \.(?:css|js|png|jpg|jpeg|svg|ico)$`). Fonts are still served correctly — they fall
  through to `location /` → `try_files $uri $uri/ @spa` and resolve on disk — but they miss
  the `expires 30d` + `Cache-Control: public, immutable` policy and `access_log off`, so
  every page load revalidates ten font files. See ADR-007 for the full consequence.
- **Licensing is a manual obligation.** Inter, Vazirmatn, and JetBrains Mono are all OFL;
  Cinzel is OFL. Committing them means the licence obligations ship with the repo. Keep the
  licence files alongside `public/assets/fonts/` if any of these are redistributed.
- **Only one weight of Cinzel** (600) is committed, and it is used by exactly one selector
  — the frozen `.hero-content h1` hero headline. `--font-hero` is intentionally *not*
  repointed at Inter (see the comment on that token in `tokens.css`, which references the
  frozen-hero constraint from the redesign design doc). Do not "clean up" `--font-hero`
  without reading that comment.
- **Font loading has no fallback if the files 404.** `font-display: swap` means text still
  renders in the fallback stack, so a broken font path degrades quietly. Verify fonts load
  in a production-like nginx setup rather than assuming.