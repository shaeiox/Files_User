# ADR-014: Hero "Noir Prism" palette exception

## Status
Accepted (hero redesign request, 2026-10-18).

## Root cause
The hero read as a flat gold box: tokens.css D2 allowed exactly two hue
roles product-wide, and home.css painted every hero layer (beam, sunburst,
pill, shader, hover) from the single amber `rgba(255,184,0,…)` family at
8px radius (`--radius-panels`), with the logo as a 0.48-opacity watermark.
No second hue, no depth cue other than blur, no proof content. Repetition
of one hue at one strength is what made it forgettable — not the gold itself.

## Decision
- Gold stays as heritage **champagne** (`--color-champagne`, desaturated),
  joined by decorative-only **iris** and **glacier** (plus a rose veil in
  gradients) as *light fields* inside the hero only.
- The hero ground becomes a token pair: noir prism (dark theme) /
  porcelain prism (light theme) via `--hero-ground`, `--hero-text`,
  `--hero-text-2`, `--hero-glass`, `--hero-input-*` in tokens.css.
  No token is redeclared inside a component scope (ui-contract test).
- Decorative hues never carry text, state or control fills. The primary
  CTA stays `--action`; accent *text* outside gradients stays
  `--text-accent`; focus stays `--border-focus`. D2 therefore still
  governs every informational surface; ADR-014 scopes colour-as-light
  to `.hero-max` only.
- Substance over ornament (taste-skill): a proof meta strip
  (SHA-256 / formats / signed delivery, i18n `heroMeta*`), a live status
  dot, concentric emblem rings, a pointer-tracked sheen (no scroll
  listener, transform/opacity-only keyframes) complete the redesign.
- ECC discipline applied: research-first (skill sources read before
  code), token contract preserved, perf tiers + `prefers-reduced-motion`
  shed every new layer (performance-modes.css), RTL uses logical
  properties (`inset-inline-*`).

## Consequences
- `test/ui-contract.test.js` still passes unmodified: no banned iris/coral
  literals return, no `--primary`/`--accent` tokens, `.btn-primary`
  remains `--action`.
- Reverting is deleting the appended "NOIR PRISM HERO" block in
  home.css, the hero tokens, and the `hero-aurora` markup.

## Amendment (2026-10-18, owner feedback)
- The pointer-tracked sheen (mouse-hover effect) is removed entirely —
  no `pointermove` handler remains in the hero.
- The circular glow/disc behind the central logo is removed; only the
  single prism hairline ring remains.
- Seven product logos (`public/assets/icon/orbit/*.webp`, 256px) ride
  that ring as satellites: a 64s linear orbit with counter-rotation so
  marks stay upright. Hover/focus on a satellite pauses the orbit and
  scales the chip ×1.32 with a soft overshoot ease; its name appears in
  a glass label. Reduced-motion and low/potato tiers stop the orbit.

## Amendment 2 (taste-skill pass, 2026-10-18)
Satellite chips removed: the seven marks are transparent, so the chip
disc was an invented container (taste-skill "no ornaments"). Assets were
rebuilt optically normalised (trim + uniform re-pad; glyphs had ranged
162–256px of frame), enlarged to `clamp(52px, 16cqw, 88px)`, and hover
now uses an alpha-shaped drop-shadow instead of a box shadow. The
central logo grows 52% → 66% of the emblem.

## Amendment 3 (RTL bug fix, 2026-10-18)
Two legacy-RTL defects on the FA switch: (1) the pre-redesign RTL rule
parking `.hero-max::before` at `right:6%` collapsed the new full-frame
prism border into a vertical line beside the FA hero text — now reset
to `left/right:0` in the Noir Prism block; (2) satellite radius used
`44cqw` against a container whose inline size resolves under the
page direction, so logos bunched and breathed independently of the
ring in FA. The orbit is rebuilt direction-proof: ring and orbit share
one stage box, satellites are placed by rotating a full-stage layer
(`.orbit-anchor` on the stage's top edge), and `.hero-emblem` is pinned
`direction: ltr`. EN and FA now compute identical geometry.

## Amendment 4 (2026-10-18)
Orbit motion removed entirely: satellites are static on the ring.
Straightening fix — the old counter-rotation cancelled only the
orbit's spin, never each satellite's placement angle, so marks sat
tilted by `--a`. `.orbit-logo` now applies `rotate(calc(-1 * var(--a)))`,
so every logo is perfectly upright around the centre. Hover zoom
(×1.35, counter-rotation preserved) remains.

## Amendment 5 (2026-10-18)
Smooth orbit restored by owner request, with the Amendment-4
straightening kept: `.hero-orbit` spins 64s linear, `.orbit-spin`
counter-spins the same duration (cancelling the orbit), and
`.orbit-logo` statically counter-rotates `--a` (cancelling placement).
Net logo orientation is 0deg at every frame — logos travel around the
ring perfectly upright, never tilting. Both animations restart and
pause together (hover/focus `:has` pause), so they cannot desync.

## Amendment 6 (2026-10-19, owner bug report: orbit moves in jumps)
Root cause: the orbit's angle is `elapsed / animation-duration`, and the
performance monitor switches `data-perf` at runtime from live FPS (down
after 3 s below 50 fps, up after 5 s of recovery). `medium` changed the
duration from 64s to 110s, which rescaled the elapsed time and made every
logo jump along the ring. `low`/`potato` set `animation: none`, which
snapped the orbit to 0deg and restarted it from 0deg on recovery. On a
hero with a live WebGL field, FPS sits near the threshold, so the tier
flipped repeatedly and the motion read as stepped. A hero re-render
(language switch, returning to Home) also restarted the orbit at 0deg.

Fix (sync rule of Amendment 5 kept: one clock for stage and counter-spin):
- Tier rules only pause the orbit (`animation-play-state: paused`). It
  freezes where it is and resumes from the same angle. `medium` keeps
  the normal speed, because a compositor-driven rotation costs the same
  at any speed.
- A negative `animation-delay` from the page clock
  (`performance.now() % 64000`), so a re-rendered orbit continues at the
  angle it had reached (now per satellite, see Amendment 7).
- `will-change: transform` on the animated layers keeps them promoted, so
  pausing (hover or tier) never re-rasters them.
- Reduced motion still stops the orbit (`animation: none`), by user
  preference.
- Contract pinned by `test/hero-orbit.test.js`.

## Amendment 7 (2026-10-19, owner report repeated: logos' angle still steps)
Supersedes Amendment 5's mechanism; its outcome (upright logos) is kept.
A logo's orientation was the difference of two separate animations: the
stage turned +θ and each logo's `.orbit-spin` turned −θ. The browser
restarts them separately (after a pause, a tier change or a re-render)
and may tick them on different paths, so any skew between the two clocks
showed up directly as the logo's angle wobbling or stepping.

New structure: the stage `.hero-orbit` is static, the same box as the
ring. Each `.orbit-anchor` is a 19% square centred in it (`inset: 40.5%`)
and runs ONE animation, `orbit-path`:
`rotate(θ) translateY(-263.1579%) rotate(-θ)`, with θ from 0 to 360deg.
The two lists have the same shape, so the browser interpolates per
function, and both angles come from one progress value in the same frame:
the logo is exactly upright and exactly on the ring line (50/19 of its own
height) at every frame. The placement angle and the shared clock are a
per-logo negative `animation-delay` (`--orbit-delay`), computed by
home.js from ONE `performance.now()` reading. The base `transform` is the
same list at `--a`, so with reduced motion the logos sit still where they
would have been. `.orbit-item` and `.orbit-spin` are removed, and so is
`.orbit-logo`'s static counter-rotation: it only scales on hover now.
Animated layers drop from 8 to 7. `test/hero-orbit.test.js` proves the
geometry numerically (radius and tilt at 721 progress values) and pins
the tier, hover and clock rules.

Delivery: production serves CSS/JS `immutable` for 30 days (ADR-007), so
the asset stamp was bumped (package.json 4.6.5 → 4.6.6,
`node scripts/stamp-assets.js`). Without it, returning visitors keep the
old stylesheet.

