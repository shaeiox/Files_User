# Proposal

## Why

Every route sits inside one shared `.page` container capped at 1400px with a fixed 24px side gutter
(`public/assets/css/base.css:88-94`). On 1920px and wider displays the Browse table and the Releases
workspace — the two data-dense routes — leave wide empty margins while their columns stay cramped,
which reads as unfinished rather than professional. The cap was lowered from 1720px in
`ui-craft-elevation` to fix the home hero's empty band, so it was chosen for the home page and applied
to every route as a side effect.

## What Changes

- The shared page container becomes fluid: its side gutter scales with the viewport instead of
  staying at a fixed 24px, while the existing ≤768px and ≤480px gutters are kept.
- Width becomes a per-route decision instead of one global number:
  - **Browse** and **Releases** fill the viewport (minus gutters) up to an ultra-wide ceiling.
  - **Home** keeps its current 1400px cap, because the in-flight `ui-craft-elevation` hero requirement
    forbids a wide empty band between the hero's text and visual.
- The navbar pill and footer follow the active route's width, so the shell always aligns with the
  content beneath it.
- On wide viewports the Browse table's type, modified and size columns grow, instead of all extra
  width going to the file-name column.
- Running text (headings, descriptions, footer copy) keeps its existing character-based measure caps;
  only layout tracks widen.

No **BREAKING** changes: no URL, API, markup contract or narrow-viewport layout changes.

## Capabilities

### New Capabilities

- `page-layout`: the width contract of the application shell — the page container's fluid gutters,
  the per-route maximum width, shell/content alignment, and the readable-measure rule for text.

### Modified Capabilities

None. `browse-page`'s "file table is full width until an item is selected" requirement is about the
table inside the browse body and is unchanged; the column-growth behaviour is owned by `page-layout`.

## Impact

- **CSS:** `public/assets/css/base.css` (`.page`), `public/assets/css/tokens.css` (new layout width
  tokens), `public/assets/css/browse.css` (route width + table tracks),
  `public/assets/css/release.css` (route width). `home.css` and `components.css` are expected to need
  no change.
- **JS:** none. The router already enables a route's stylesheet only while that route is shown
  (`public/assets/js/router.js:46-48`, `commit()`), so per-route widths can live in route stylesheets.
- **Docs:** `docs/STYLEGUIDE.md` container description.
- **Tests:** `test/ui-contract.test.js` token contract must keep passing; browser checks at
  375 / 768 / 1440 / 1920 / 2560px.
- **Dependency:** `ui-craft-elevation` is not archived yet; its `home-page` hero requirement is a
  constraint this change preserves, not modifies.
