# Design

## Context

See proposal.md (Why). The current state that shapes the approach:

- `.page` (`public/assets/css/base.css:88-114`) wraps the navbar, `<main id="app">` and the footer
  (`public/index.html:119-258`). Its width is `calc(100% - 48px)` with `max-width: 1400px`, reduced to
  `calc(100% - 24px)` at ≤768px and `calc(100% - 16px)` at ≤480px.
- The router enables a route's stylesheet only while that route is shown and disables it otherwise
  (`public/assets/js/router.js:46-48`, `activateStylesheet()` in `commit()`). Browse uses
  `browse.css`, Releases uses `release.css`, and Home has no route stylesheet (`home.css` is global).
- The navbar is a sticky floating pill inside `.page`. Moving it out of `.page` was rejected in
  `enterprise-ui-redesign/design.md` §5.1 because it changes the sticky containing block.
- The in-flight `ui-craft-elevation` `home-page` spec forbids a wide empty band in the hero.
- Browse rows use fixed tracks `36px 40px minmax(0,1fr) 90px 160px 90px 26px`
  (`browse.css:710`), so every extra pixel goes to the name column.

## Goals / Non-Goals

**Goals:**
- Widen Browse and Releases with no JavaScript change.
- Keep the navbar, content and footer on one shared edge per route.
- Leave every layout at 1024px and below visually unchanged.

**Non-Goals:**
- Recomposing the home hero, or widening Home. This is a follow-up once `ui-craft-elevation` is archived.
- A full-bleed (edge-to-edge) navbar.
- Changes to the browse inspector width (340px) or its open/close animation.

## Decisions

### D1. The container width comes from two tokens; route stylesheets override them

Add `--page-max` (1400px) and `--page-gutter` to `tokens.css`. `.page` uses
`width: calc(100% - 2 * var(--page-gutter)); max-width: var(--page-max)`. `browse.css` and
`release.css` each set `--page-max: 2560px` on `.page`.

Because the router disables a route's stylesheet when the route is left, the override exists only while
that route is shown. The change needs no router code, `body` class or `data-route` attribute.

*Alternatives:* (a) the router writes a `data-route` attribute and `base.css` keys widths off it. That
works, but it adds JS state to the shell for something the stylesheet lifecycle already provides.
(b) A single global wider cap. Rejected, because it breaks the home hero requirement.

### D2. A clamped desktop gutter, existing mobile gutters kept

`--page-gutter: clamp(24px, 2.5vw, 48px)` above 768px. This gives 24px at ≤960px (today's value), 40px at
1600px and 48px from 1920px. The ≤768px (12px) and ≤480px (8px) values stay as they are today and
are expressed through the same token inside the existing media blocks.

*Alternative:* `vw`-only gutters. Rejected, because they become too thin on laptops and too wide on ultra-wide displays.

### D3. A 2560px ceiling, not `max-width: none`

On a 3440px or 5120px display, a 100%-wide table puts file names and their actions so far apart that
the eye loses the row. A 2560px ceiling only affects displays wider than about 2650px. Everything up to 2560px
gets the full-width layout that was asked for.

### D4. The Browse table's fixed columns grow from 1600px

Inside `browse.css`, at `min-width: 1600px`, the type/modified/size tracks become
`clamp(90px, 6vw, 140px) clamp(160px, 10vw, 220px) clamp(90px, 6vw, 140px)`. The tracks stay
identical on the header and every `.trow` because both share the one `.file-tbl .trow` rule. The
action track stays at 26px, as its comment requires. The ≤640px track list is untouched.

### D5. The shell follows automatically

The navbar and footer are children of `.page`, so D1 widens them with no extra rule. Route stylesheets
are switched inside `commit()`. When a View Transition runs, `commit()` runs inside
`startViewTransition`, so the old and new widths are captured as separate snapshots and there is no
mixed frame. This meets the "no frame where they disagree" scenario without extra work.

## Risks / Trade-offs

- [The navbar pill gets very long at 2560px, with a large gap between the logo and the actions] → Accepted
  for consistency of edges. If review finds it sparse, cap `.nav-bar` alone in a follow-up. The spec only
  requires the outer edges to align.
- [The pill's width animates or jumps when moving between Home and Browse] → The View Transition
  crossfades it. With reduced motion it switches instantly, which is acceptable.
- [The token contract test rejects new tokens] → Define both tokens in `tokens.css`, which
  `test/ui-contract.test.js` treats as the token source, and run `npm test`.
- [Home stays at 1400px, so the request is only partly met] → This is deliberate (see the proposal). The home
  hero has to be recomposed before Home can widen.
- [RTL] → `margin: 0 auto` and symmetric gutters mirror on their own. Browse column tracks are
  direction-agnostic.

## Migration Plan

This is CSS only. Deploy as usual. To roll back, revert the commit. The `?v=` cache-busting query on the
route stylesheets must be bumped so returning visitors get the new `browse.css`/`release.css`.
