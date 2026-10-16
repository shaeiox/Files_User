# Implementation Report: UI Craft Elevation

**Date:** 2026-10-16
**Implemented by:** Claude Code

## Summary
This implements `openspec/changes/ui-craft-elevation` across its six phases. The hero's token pins are retired, so each theme resolves one accent (amber) and one primary-action fill (iris blue). There is one focus-ring colour per theme, Cinzel gets proper tracking and leading, and the Vazirmatn fonts load only for Arabic script. The other work is the nine correctness fixes, a native motion layer (IntersectionObserver reveal, FLIP, cross-fade, View Transitions, capped stagger, Lenis-driven nav condense), a 1400px container with a data-driven featured card, per-route loading through native `import()`, and the shell accessibility fixes (one dropdown mechanism, a sign-in dialog with real dialog semantics, and in-place download feedback). The goal is to close the coherence and motion gaps the review found while keeping the zero-build architecture (ADR-006) and adding no dependency.

## Files Changed
| File | Status | Lines | Description |
|------|--------|-------|-------------|
| `public/assets/css/tokens.css` | Modified | +65 / −73 | Vazirmatn `unicode-range`; colour-role contract; `--action*` added; `--a-*` ramp, `--color-electric-iris` and shadcn `--primary`/`--accent` removed; `--ring` and `--info` now aliases; light `--border-focus` changed; contrast comments re-measured |
| `public/assets/css/base.css` | Modified | +107 / −27 | 1400px container; selection colour and aura glow moved off the retired hue; dead `shimmer` keyframe and `.aura-vignette` removed; motion primitives (route fallback, view-transition timing, reveal, hero cascade) with reduced-motion branches |
| `public/assets/css/home.css` | Modified | +227 / −201 | Insulation block deleted; hero recoloured to accent roles; Cinzel set at `0.02em` / `1.12`; status dot removed; hero visual moved into the flex row; `.wiping` hook removed; error border uses `--e-border`; 11 `transition: all` replaced; featured/tiered grid, list mode, trust band, empty search state |
| `public/assets/css/components.css` | Modified | +137 / −80 ¹ | `.btn-primary` uses `--action`; badges, autocomplete and language option moved to accent roles; language menu switched to the `.show` mechanism (`display:none` when closed, `menuIn` entrance); single owner for control heights; nav-condense transform; footer bottom bar layout; download busy and error styles; 8 `transition: all` replaced |
| `public/assets/css/performance-modes.css` | Modified | +104 / −39 ¹ | Dead `.hero-cloud-wrap` and `.wiping` rules removed; duplicate height removed; performance menu switched to `.show` + `display`; 4 `transition: all` replaced; undefined `--radius-full` → `--r-full`; §10 potato overrides for new effects; §11 footer placement; unclosed potato-tier comment closed (deploy pass) |
| `public/assets/js/motion.js` | Added | +200 | Shared motion gates and primitives: `reveal`, `teardown`, `flip`, `crossfade`, `enter`, `pop`, `allowsMotion`, `reduced` |
| `public/assets/js/router.js` | Modified | +106 / −92 | One `navigate()`; explicit `ROUTES` table with `import()` handles; route stylesheet loader; View Transitions with fallback; no `setTimeout`, no inline transition; unknown route uses `location.replace`; route URLs version-stamped and `tel:` links no longer intercepted (deploy pass) |
| `public/assets/js/home.js` | Modified | +206 / −106 | Per-card descriptions; data-driven featured card; keyed FLIP renderer; dead `[data-url]` interceptor with Persian `alert()` removed; cross-fade view toggle; progressive search with capped stagger, panel replay and composed empty state; sign-in dialog semantics, focus trap, Escape and focus restore; trust band; localised labels |
| `public/assets/js/theme.js` | Modified | +23 / −26 | Phantom "wipe" machinery replaced by a View Transitions cross-fade; race fix for rapid toggling |
| `public/assets/js/i18n.js` | Modified | +97 / −44 | `{year}` substitution; titles follow `data-i18n-aria`; language menu on the `.show` mechanism with real `aria-expanded`, Escape and outside-click; new and changed keys (identical key sets in en/fa) |
| `public/assets/js/services/performance-monitor.js` | Modified | +18 / −6 | Performance menu writes `aria-expanded` from its real state; Escape closes it |
| `public/assets/js/file-actions.js` | Modified | +26 / −4 | Blocking `alert()` replaced by an in-place localised `role="alert"` note; `unreachable` outcome; busy state on the initiating control |
| `public/assets/js/smooth-scroll.js` | Modified | +11 / −0 | Nav condense on Lenis's own `scroll` event |
| `public/assets/js/browse.js` | Modified | +8 / −1 | Converted to an ES module: imports its three helpers (version-stamped URLs), exports `BrowsePage` |
| `public/assets/js/file-inspector.js` | Modified | +14 / −2 | Converted to an ES module (version-stamped imports); `aria-busy` while the ZIP indicator loops |
| `public/assets/js/bulk-download.js` | Modified | +2 / −1 | Converted to an ES module (`export { BulkDownload }`) |
| `public/assets/js/browse-icons.js` | Modified | +2 / −1 | Converted to an ES module (`export { BrowseIcons }`) |
| `public/assets/js/releases.js` | Modified | +3 / −0 | Converted to an ES module (`export { ReleasePage }`) |
| `public/index.html` | Modified | +92 / −75 | Every JS/CSS URL stamped `?v=4.3.6` (deploy pass); pre-paint tier `high`; route scripts and stylesheets removed; hero font preloads; `motion.js` added; `idle-timer.js` deferred; performance control moved to the footer with production labels; localisable control names; new footer copy and legal line |
| `public/404.html` | Modified | +7 / −3 | 2 `transition: all` replaced; reduced-motion branch |
| `public/browse.html` | Deleted | −65 | Unrouted, broken standalone page (design D13) |
| `test/ui-contract.test.js` | Added | +262 | 15 static checks: the spec's source-decidable criteria plus the cache-busting stamp |
| `scripts/stamp-assets.js` | Added | +54 | Idempotent: writes `?v=<package.json version>` into every first-party JS/CSS URL (`index.html`, `router.js`, module imports) (deploy pass) |
| `lib/static-handler.js` | Modified | +3 / −1 | The SPA shell is served with `Cache-Control: no-cache`; it previously sent no caching header at all (deploy pass) |
| `docs/STYLEGUIDE.md` | Modified | +95 / −41 | Layer model and line counts; colour-role table; font-scoping claim now true; frozen regions lifted; §10 motion contract and checklist |
| `docs/ARCHITECTURE.md` | Modified | +17 / −25 | Module-loading model, load order, `browse.html` removal |
| `docs/API.md` | Modified | +3 / −4 | `browse.html` note updated |
| `docs/DEPLOYMENT.md` | Modified | +1 / −1 | `browse.html` removed from the nginx diagram |
| `docs/DEVELOPMENT.md` | Modified | +3 / −4 | Tree and loading note updated |
| `docs/EXTENDING.md` | Modified | +3 / −3 | How to add a route-only module |
| `docs/README.md` | Modified | +0 / −1 | Stale `browse.html` known-issue row removed |
| `openspec/changes/a11y-ux-debt/tasks.md` | Modified | +14 / −1 ² | Amendment lifting gates J5/J6 (task 0.1) |
| `openspec/changes/enterprise-ui-redesign/tasks.md` | Modified | +8 / −0 | Amendment lifting D8/I21 (task 0.1) |

¹ These two files already had uncommitted changes of yours (navbar responsive ladder) before this work, so `git diff` against `HEAD` includes those lines too. I built on them and did not revert them.
² The −1 is a line-ending normalisation of the existing last line. I appended lines with LF to CRLF files and then normalised every touched file to CRLF.

`package.json` and `test/checks/navbar-responsive.check.js` show in `git status` but are your pre-existing changes; I did not modify them.

## Change Details

### Added
- **`public/assets/js/motion.js`** — a new shell global, `Motion`. Each effect reads `prefers-reduced-motion` and `data-perf` live and animates only `transform`/`opacity` through the Web Animations API, so nothing stays behind in inline styles:

  | Effect | Reduced motion | `potato` | `low` |
  |--------|----------------|----------|-------|
  | `reveal` | not registered | not registered | full |
  | `flip` | instant | instant | instant |
  | `crossfade` | opacity only | 60 ms | full |
  | `enter` | opacity only | 60 ms | full |

  A preference or tier change mid-session releases pending reveals and finishes running script animations. `crossfade` and the FLIP exit have timer fallbacks so a frozen animation timeline cannot block the state change. The public API is `reveal(scope)`, `teardown()`, `flip(container, mutate)`, `crossfade(els, swap)`, `enter(el, index)`, `pop(el)`, `allowsMotion()` and `reduced()`.
- **`test/ui-contract.test.js`** — runs under `npm test`. It checks:
  - every `var(--x)` resolves to a declared property;
  - no token is redeclared in a component scope;
  - `--ring` aliases `--border-focus` and every outline uses one of them;
  - the iris/coral literals are gone and the three CTAs use `--action`;
  - 16 quoted contrast ratios are recomputed from the token values;
  - Vazirmatn `unicode-range`, and Cinzel tracking ≥ 0 and leading ≥ 1 in every rule;
  - no `transition: all` and no raw `scroll` listener;
  - all keyframes are transform/opacity only (the skeleton shimmer is the one justified loop);
  - potato overrides exist, and the wipe is gone;
  - both dropdowns use the `.show` mechanism and write real `aria-expanded`, and the performance control is not in the navbar;
  - no `alert(` call and no Persian literals in home behaviour code;
  - en/fa key parity, `{year}` in the legal line, and dialog semantics;
  - no route-only script or stylesheet in `index.html`, exactly one `navigate()`, and `browse.html` is gone;
  - the removed identifiers stay removed;
  - the `STYLEGUIDE.md` line counts match `wc -l`.

  While being written, the test found a real pre-existing defect: `--radius-full` was used twice but never defined.

### Modified — interface changes (before → after)
- **`FileActions.download`:** `download(href, fileName)` → `download(href, fileName, control)`. The optional `control` gets the busy state and the error note.
- **`FileActions.preflight`:** resolves `"ok"|"locked"|"missing"|"error"` → adds `"unreachable"` when the network request throws.
- **`Router.navigate`:** `navigate(path, pushState = true): void` → `async navigate(path, pushState = true): Promise<void>`. Existing callers ignore the return value.
- **Route modules:** global `const BrowsePage`, `ReleasePage`, `FileInspector`, `BulkDownload`, `BrowseIcons` (three of them also set `window.X`) → ES-module named exports. `browse.js` and `file-inspector.js` import their helpers. Only `router.js` consumes them, and nothing else referenced them.
- **`Theme`:** the public API is unchanged. The internal `triggerLogoWipe()` and `WIPE_MS` were removed.
- **`HomePage`:** the public API is unchanged (`render`, `refreshResources`, `showLoginModal`). The internal `bindDownloadInterception()` was removed: it matched `[data-url]`, which no markup emits.
- **i18n dictionary:**
  - `categoryDesc` (one shared string) → `categoryDescs: {}`, a map keyed by category id. It is empty, so cards omit the description rather than repeat filler.
  - Added: `sortByName`, `sortByCount`, `refreshResources`, `searchAria`, `trustTitle`, `trustDesc`, `trustLink`, `featuredTag`, `emptySearchFor`, `emptySearchHint`, `clearSearch`, `downloadChecking`, `downloadUnreachable`, `aria.*`.
  - Changed: `perf*` labels, `footer.about` and `footer.copyright`.
- **CSS tokens:**
  - Removed: `--a-1…--a-8` (both copies), `--color-electric-iris`, `--primary`, `--primary-foreground`, `--accent`, `--accent-foreground`.
  - Added: `--action: #3d6bc7`, `--action-hover: #2f5cb2`, `--text-on-action`.
  - Now aliases: `--ring: var(--border-focus)` (dark was an invalid HSL triplet) and `--info: var(--text-accent)` (was cyan).
  - Light `--border-focus`: `#ffb800` → `#8a5a00`.

### Modified — by phase
- **Phase 0 (correctness):**
  - Per-card descriptions are resolved inside the render callback.
  - Download failures are localised and shown in place, with no `alert()`.
  - Footer: "© {year} CloudAvid. All rights reserved." in both languages, with the year computed at render time.
  - The error state uses the defined `--e-border`.
  - Vazirmatn `unicode-range` added, and `idle-timer.js` deferred.
  - `router.js` has one `navigate()`; `browse.html` is deleted (`ARCHITECTURE.md` confirmed no route serves it); the status dot is removed.
  - Docs corrected.
- **Phase 1 (identity):**
  - Insulation block deleted, and hero literals moved to amber roles.
  - The headline gradient became solid `--text-accent`, and the primary-action fill became `--action`.
  - Focus colours collapsed; `--info` re-scoped; duplicate ramp removed; redundant heights removed.
  - Dead keyframe, selectors and overrides removed.
  - Contrast comments updated. Two quoted figures were wrong: light `--text-3` claimed 4.37:1 on `--n-4` (actual 7.16:1), and light `--e-text` claimed 4.8:1 (actual 6.79:1).
- **Phase 2 (motion):**
  - 25 `transition: all` replaced (23 in CSS, 2 in `404.html`).
  - Reveal, FLIP, cross-fade, View Transitions with an animationend-cleaned fallback, the hero cascade (the headline itself is not animated), search stagger capped at 10 steps and replayed every run, nav condense, and the theme cross-fade.
  - The ZIP loop gets `aria-busy` and a potato override.
- **Phase 3 (composition):** 1400px container; hero visual in the flex row above 1024px and in normal flow below it; data-driven featured card spanning two columns (reset at ≤640px and in list view); trust band.
- **Phase 4 (payload):** explicit route handles; `import()` loading; route stylesheets inserted before `performance-modes.css` and disabled off-route; preloads; `high` pre-paint tier.
- **Phase 5 (shell):** performance control in the footer with production labels; one dropdown mechanism with real `aria-expanded`; dialog semantics; prose footer with no unverified "15 years" claim; localised control names.

### Deleted
- **`public/browse.html`** — unrouted, it loaded a reduced stylesheet set without `performance-modes.css` and referenced a non-existent `logo.png` (design D13). Current-state docs were updated. ADR-010 still mentions it as historical context; I left the ADR alone.

## Verification

**Baseline before any change:** `npm test` gave 257 tests: 256 pass, 0 fail, 1 skipped. Lint and typecheck were clean.

**First-pass run** (before the deploy-readiness pass; superseded by the run in that section below):
```
$ npm test
ℹ tests 271
ℹ suites 40
ℹ pass 270
ℹ fail 0
ℹ cancelled 0
ℹ skipped 1
ℹ todo 0

$ node --test test/ui-contract.test.js
ℹ tests 14
ℹ pass 14
ℹ fail 0

$ npm run lint
> eslint server.js lib test scripts eslint.config.js
exit=0

$ npm run typecheck
> tsc -p jsconfig.json
exit=0

$ npm run test:checks
...
17 passed, 0 failed
SKIP navbar-responsive: playwright is not installed.
exit=0

$ npm run test:coverage
ℹ tests 271
ℹ pass 270
ℹ fail 0
ℹ all files            |  92.25 |    83.54 |   93.11 |
exit=0   (threshold --test-coverage-lines=89)
```
The `[ERROR] [admin-integration] …` lines in the coverage log come from existing tests that exercise failure paths. They appear in the baseline too.

**Syntax:** `node --check` on every edited classic script, and on `.mjs` copies of the five ES modules, gave no output (pass).

**Contrast preflight** (`node contrast.js` in my scratchpad, WCAG 2.x):
```
  1.59:1  LIGHT focus #ffb800 on --bg #f5f5f0          ← failed 3:1, replaced
  5.42:1  LIGHT focus --text-accent #8a5a00 on --bg #f5f5f0
  3.71:1  CTA white on #5683da (current hero/btn blue)  ← failed 4.5:1, replaced
  5.09:1  CTA white on #3d6bc7 (new --action)
  6.37:1  CTA white on #2f5cb2 (new --action-hover)
  1.71:1  CTA white on #c3c0ff (old global .btn-primary fill outside the hero)
 10.71:1  DARK focus #ffb800 on --bg      9.90:1 on --bg-card
 15.09:1  DARK hero accent #ffdca1 on void   5.39:1 LIGHT #8a5a00 on hero wash
 14.71:1  DARK --info(→--text-accent) on --bg-sunken   5.28:1 LIGHT on --bg-sunken
```
`test/ui-contract.test.js` recomputes the figures quoted in `tokens.css` from the token values, so they can be reproduced.

**Per-route first-render bytes** (HTML + CSS + JS, fonts excluded; `wc -c` on the working tree):
```
before (HEAD, every route): 17673 html + 198830 css + 302824 js = 519,327
now  /                  396,159   (−24%; no browse/release/inspector/bulk code or CSS)
now  /browse            531,589
now  /download/release  431,518
now  full app           566,948   (each first render is a strict subset)
```

**Browser checks** were run in the built-in browser against `node server.js` on port 43918. `FILES_ROOT` pointed at a throwaway fixture tree, not your real one. The pane was hidden, so the page ran as a background tab and `requestAnimationFrame` was throttled or paused. For the dialog test only, I shimmed rAF with a 16 ms timer.

| Check | Result |
|-------|--------|
| Cold `/`: requests | No `browse.js`, `releases.js`, `file-inspector.js`, `bulk-download.js`, `browse-icons.js`, `browse.css`, `release.css`, or any Vazirmatn face |
| Persian | Switching to fa fetched exactly the three Vazirmatn faces |
| Cards | Featured = `Packages` (most recently modified), 970 px wide vs 479 px; 0 description elements (no dictionary entries yet) |
| Sort to Name | Same element set (`sameNodesAfterSort: true`), 14 FLIP animations |
| Filter to one category | 6 cards taken out of flow and animated out; 1 card remained |
| `/browse`, then `/download/release` | Modules and stylesheets loaded on navigation; route sheets inserted before `performance-modes.css`; `browse.css` disabled on Releases; `#app` has no inline `style` or class afterwards |
| Language menu | `aria-expanded` false→true→false matching `display` none/flex; stays open on `pointerleave`; Escape closes it and focus returns to the trigger; bridge `::after` 8 px |
| Performance menu | In the footer, labelled "Performance setting", `aria-expanded` truthful |
| Focus ring (dark) | `rgb(255, 184, 0)` on button, nav link and navbar control |
| Footer | "© 2026 CloudAvid. All rights reserved." / fa "© 2026 کلودآوید. تمامی حقوق محفوظ است." |
| Sign-in dialog | `role=dialog`, `aria-modal=true`, named "Clearance Required"; focus goes to `authUsername`; Tab from the last control wraps to the first (prevented); Escape and the close button both return focus to `authBtn` |
| Theme toggle | Uses `startViewTransition`; rapid double toggle and single toggle end consistent (attribute = stored); no unhandled rejections after the fixes below |
| fa accessible names | `انتخاب زبان`, `تغییر پوسته`, `منو`, `تنظیم عملکرد`, `ناوبری اصلی`, and titles follow |
| Download failure (HEAD rejected) | No `alert`; `span.dl-error[role=alert]` "The server could not be reached…"; `aria-busy` cleared |
| Search | 28 rows, "Done · 28 found"; panel entrance replayed on all 3 searches; empty state names the query and offers "Clear search", which hides the panel and refocuses the input |
| Grid/list | `is-list` gives 1 track; featured span reset to `auto`; rapid toggles settle on the last choice; no inline style |
| Nav condense | `is-condensed` at y=500, removed at y=0, with Lenis running |
| Layout | At 360, 480, 768, 900, 1024, 1440 and 1920 px × dark/light × ltr/rtl: `scrollWidth − innerWidth ≤ 0` and no element past either edge. At ≥1440 the text-to-visual gap is 40 px (0.03 of the hero, under ⅓). At ≤1024 the visual is stacked, `position: relative`, and inside the hero |

The browser checks found and fixed three defects in my own code:
1. An unhandled `InvalidStateError` from a View Transition on the first render. The first render now skips the transition, and the promises are caught.
2. The theme toggle lost a rapid second click: `set()` compared against the DOM attribute, which a pending transition had not yet updated, and a skipped transition's callback could run last. It now compares against `resolve()` and applies `resolve()` inside the callback.
3. The cross-fade never swapped when the animation timeline was frozen. It now has a timer fallback.

The browser also cached the old scripts (`Cache-Control: public, max-age=3600`); I refreshed them with `fetch(url, {cache: 'reload'})` before re-testing.

### Deploy-readiness pass (after the first report)
This pass changed three things:
- **Cache busting.** Production nginx serves CSS/JS with `expires 30d` + `immutable` (ADR-007), so unchanged URLs would have kept the old `router.js` and friends for up to a month next to the new `index.html`, which breaks the Browse route. Every first-party JS/CSS URL, including the ES-module imports, now carries `?v=4.3.6` from `package.json`, written by `scripts/stamp-assets.js`. The SPA shell is served `no-cache` by Node.
- **Potato-tier comment.** The unclosed comment that disabled the potato "hide backdrop" rule is now closed.
- **`tel:` links.** The router no longer intercepts them, so they dial instead of opening the 404 page.

These are the same two one-line fixes the side session made. Its worktree (`refs/heads/claude/mystifying-spence-ce9ad4`) was cut from `9fd475d`, before the `public/` move, and its edits were uncommitted, so I applied them here instead of merging.

```
$ npm test
ℹ tests 272
ℹ suites 40
ℹ pass 271
ℹ fail 0
ℹ cancelled 0
ℹ skipped 1
ℹ todo 0

$ npm run lint
exit=0

$ npm run typecheck
exit=0

$ npm run test:coverage
ℹ tests 272
ℹ pass 271
ℹ fail 0
ℹ all files            |  92.27 |    83.68 |   93.11 |
exit=0

$ node scripts/stamp-assets.js        # second run: idempotent
All asset URLs already carry ?v=4.3.6.
```

**Browser smoke test** (fresh server, fixture tree):
- A cold load of `/browse/Packages/` rendered 5 rows. `browse.js`, `browse.css`, `browse-icons.js`, `bulk-download.js` and `file-inspector.js` were each fetched once with `?v=4.3.6`, so there is one module instance each.
- No JS/CSS request was unstamped.
- `GET /` returned `Cache-Control: no-cache`.
- `/`, `/download/release` and back rendered; there were no errors.
- A click on a `tel:` link was not default-prevented.
- With `data-perf="potato"`, `.aura-glow-1` and `.aura-backdrop` computed to `display: none`.

**Deploy steps that follow from this:**
1. For every future release, bump `package.json` `version` and run `node scripts/stamp-assets.js`. `test/ui-contract.test.js` fails if any URL is out of date.
2. The nginx config is in the Admin Files Manager repo (`scripts/nginx/cloudavid.conf`). It should send `Cache-Control: no-cache` for `index.html` (the `@spa` fallback), so browsers always pick up the newest stamped URLs. That repo is outside this one, so I have not edited it.

## Open Questions / Risks
- **Gate amendments to other changes (task 0.1).** I amended `a11y-ux-debt` (J5/J6) and `enterprise-ui-redesign` (D8/I21) instead of archiving them. The spec says both need explicit sign-off; please confirm or adjust the amendment text.
- **Light-theme focus ring changed to `#8a5a00`.** It is the light accent text colour. `#ffb800` measured 1.59:1, under the 3:1 minimum for a focus indicator. This goes slightly beyond "collapse the two tokens"; it is justified by the measurement requirement, but it is a visible change.
- **The CTA blue was deepened from `#5683da` to `#3d6bc7`** (same hue) because white text measured 3.71:1. D2 says to "keep the iris blue"; I kept the hue, not the exact value.
- **Legal entity name.** The two old footers used "CloudAvid Technology Co." and "شرکت رایانش ابری کلودآوید" (different entities). I used the brand "CloudAvid" in both. Please confirm the registered name.
- **Category descriptions.** `categoryDescs` is empty because the real category ids are deployment folder names I don't know. Cards correctly omit the line until entries are added (design open question).
- **Motion contract for existing hover transitions.** The requirement says only `transform`/`opacity` animate. Task 3.1 asks for "the properties that rule actually changes", so existing hover transitions now list colour/border/shadow properties explicitly. None animate layout. New keyframes are transform/opacity only.
- **Performance pill radius.** It was square because `--radius-full` was undefined. It now renders fully rounded via `--r-full`.
- **Fallback route fade.** Where View Transitions are missing, the new view renders first and then plays a 220 ms entrance (task 3.6, "fall back to the current fade"). The routing spec also allows a plain immediate change, which is what reduced motion and the potato tier get.
- **Not fully covered:**
  - The navbar responsive check SKIPs because Playwright isn't installed.
  - The browser checks ran in a hidden pane, so animation smoothness and the 230 ms rAF timing were not judged visually. FLIP frame timing on a very large category (design risk) was not profiled.
  - There is no project accessibility-audit script to run (task 6.9); accessibility was checked by the scripted checks above.
  - Task 0.3 accent sampling was done through tokens plus the literal grep in the test, not pixel sampling.
- **Preloads.** Cinzel and Inter are preloaded even for Persian visitors, where Cinzel is unused (about 15 KB).
- **Fixed in the deploy pass** (outside the spec, but they blocked a safe deploy): the potato-tier unclosed comment, `tel:` link interception, and stale-asset caching (see "Deploy-readiness pass").
- **Out-of-scope issues noticed, still not fixed:**
  1. `performance-monitor.js` FPS recovery can raise the tier mid-session. That is separate from the pre-paint fix (D8, now `high`), and redesigning the tier system is a non-goal.
  2. `idle-timer.js` listens to `scroll` for activity tracking (it does not drive rendering, so it is allowed by the contract).
  3. `.env` is tracked in git with a live `AUTH_JWT_SECRET` (already documented in `SECURITY.md`). Rotate the secret and untrack the file before or alongside this deploy.
  4. The reduced-motion global `0.01ms !important` rule is a known ceiling (design, workflow follow-up).
  5. `base.css`'s `scroll-behavior: smooth` coexists with Lenis.
- **Nothing is committed.** `components.css` and `performance-modes.css` contain your pre-existing uncommitted navbar work along with mine.

## Related Spec
`openspec/changes/ui-craft-elevation/`
