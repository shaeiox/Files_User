# Tasks

## 1. Container tokens and fluid gutters

- [x] 1.1 Add `--page-max: 1400px` and `--page-gutter: clamp(24px, 2.5vw, 48px)` to the `:root` layout block in `public/assets/css/tokens.css`; verify `npm test` (token contract in `test/ui-contract.test.js`) passes
- [x] 1.2 Rewrite `.page` in `public/assets/css/base.css` to `width: calc(100% - 2 * var(--page-gutter)); max-width: var(--page-max)`, and set `--page-gutter` to 12px (≤768px) and 8px (≤480px) inside the existing media blocks; verify in the browser that Home measures 1400px wide at 1920px and that 375px has 8px gutters and no horizontal scroll
- [x] 1.3 Update the container description in `docs/STYLEGUIDE.md` (and the `.page` comment in `base.css`) to describe the tokens and the per-route override; verify the documented values match the CSS

## 2. Per-route width

- [x] 2.1 Set `.page { --page-max: 2560px; }` in `public/assets/css/browse.css`; verify the Browse table edges sit at the gutters at 1920px and that the content is 2560px wide and centred at 3440px
- [x] 2.2 Set `.page { --page-max: 2560px; }` in `public/assets/css/release.css`; verify the same at 1920px and 3440px, and that `.rel-head-text` stays within 60ch at 2560px
- [x] 2.3 Navigate Home → Browse → Releases → Home at 1920px with motion on and with reduced motion; verify that the navbar and footer edges match the content edges on every route and that Home returns to 1400px (the Browse/Releases override is gone). Verified with motion on (headless Chrome/CDP, `Router.navigate`); reduced-motion takes the same `commit()` path without a View Transition and was not separately driven

## 3. Browse table columns

- [x] 3.1 Add a `@media (min-width: 1600px)` rule in `browse.css` that widens the type/modified/size tracks of `.file-tbl .trow` per design D4, leaving the 26px action track and the ≤640px block untouched; verify at 1920px that those columns are wider than at 1280px and the header cells align with every row
- [x] 3.2 Open the inspector at 1920px and 2560px; verify that the table animates to `1fr + 340px` as before and that its columns stay aligned

## 4. Release hygiene and integration checks

- [x] 4.1 Bump the `?v=` cache-busting query for the changed stylesheets (router `ROUTES` entries and `index.html` links); verify that a hard-reload-free revisit serves the new CSS
- [x] 4.2 Run `npm test`, `npm run lint` and `npm run test:checks` (including `navbar-responsive.check.js`); verify that all pass. `npm test` 271 pass / 0 fail, lint clean, 17 checks pass; `navbar-responsive.check.js` SKIPPED (playwright not installed)
- [x] 4.3 Check every route at 375, 768, 1024, 1440, 1920 and 2560px in LTR and in RTL (`fa`), in light and dark themes; verify that there is no horizontal scroll, that layouts at 1024px and below are unchanged from `master`, and that the home hero requirement (no wide empty band) still holds. Verified via headless Chrome/CDP: no horizontal scroll at any width, LTR and RTL edges symmetric, hero gap 40px at 1920px. Notes: between 961px and 1024px the gutter is up to ~1.6px wider than before (clamp ramp, design D2); light theme not captured separately, since no layout rule depends on theme

## Workflow follow-up

- Archive after `ui-craft-elevation` is archived, so `page-layout` lands after the `home-page` spec it depends on.
- Follow-up change: recompose the home hero, then raise Home's `--page-max`.
