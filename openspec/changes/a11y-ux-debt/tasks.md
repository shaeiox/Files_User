# Tasks: Accessibility & UX Debt Clearance

**Change:** `a11y-ux-debt`
**Modules:** `navbar`, `contrast`, `search-a11y`, `doc-outline`, `footer-i18n`, `mobile-nav`, `content-strategy`, `mobile-responsive`, `unified-font`, `local-assets`

## Build Order (D1, locked)

```
navbar ──→ mobile-nav ──→ content-strategy
   │
   └──→ (contrast ∥ search-a11y ∥ doc-outline ∥ footer-i18n ∥ mobile-responsive ∥ unified-font ∥ local-assets)   [independent, may run in parallel]
```

Phases 2 through 5, 8, 9, and 10 have no dependency on each other or on `navbar`, and may be executed in any
order or in parallel. `mobile-nav` requires Phase 1. `content-strategy` requires Phase 6.

---

## Phase 1 — Navbar Keyboard, Semantics & Targets

**Objective:** Close the keyboard blocker on the language menu, remove the unbacked tablist role, make the
current-page indicator truthful, close the hover dead zone, fix the misleading cursor, and raise touch targets.

**Prerequisites:** Human approval of this change.

**In-scope files:**

- `assets/css/components.css` — language menu focus/hover state, hover gap, cursor, control hit areas, tab group
  semantics
- `index.html` — tab group markup (`role` removal, landmark wrapper)
- `assets/js/router.js` — current-page indicator, on route change only
- `assets/js/i18n.js` — **added during implementation.** Task 1.2 requires `aria-expanded` to track the menu,
  and CSS cannot write an attribute. Task 1.2 named a listener in the language module as the accepted
  alternative; the original in-scope list omitted the file. Visibility stays pure CSS, so I8 is preserved.
- `assets/css/performance-modes.css` — **added during implementation.** `.perf-pill`'s base rule lives here and
  this file loads after `components.css`, so an override authored in `components.css` would lose the cascade.
  Task 1.7 explicitly names the performance pill, so the file list was incomplete.

**Out-of-scope files:** `assets/css/tokens.css`, `assets/css/home.css`, `assets/css/browse.css`,
`assets/js/home.js`, `assets/js/browse.js`, `assets/js/file-actions.js`, `lib/**`.

**Forbidden:** the `.nav` sticky geometry (`position: sticky`, `top: 12px`, `z-index: var(--z-sticky)`) — frozen
by I1. Any script that toggles the language menu — frozen by I8.

**Recorded deviation (D-I18-I1):** task 1.2 was implemented with the task's documented alternative rather than
the design note's preferred CSS-only option. CSS cannot set an `aria-*` attribute, so a `focusin`/`focusout`
plus `pointerenter`/`pointerleave` reporter in `i18n.js` writes `aria-expanded`. It only *reports* the state
that CSS already controls; it does not open, close, or otherwise toggle the menu.

**Tasks:**

- [x] 1.1 Open the language menu on keyboard focus. Extend the existing reveal selector so
      `.lang-dropdown-wrap:focus-within` opens `.lang-dropdown-menu` alongside the current `:hover` rule, and
      extend the matching focus style for the pill.
      - **HARD GATE (J1):** a keyboard user who Tabs to the language pill can see and enter the menu.
      - Confirm no `:focus-within` selector already exists for this wrapper; add rather than replace the hover
        rule.
      - Verify no `:hover-within` polyfill is needed — `:focus-within` is sufficient and universally supported.
- [x] 1.2 Make `aria-expanded` truthful. The button's expanded state SHALL reflect the real menu state in both
      directions, for pointer and keyboard alike.
      - Preferred: drive the reflected state from CSS so no script is required, preserving the I8 no-script
        contract.
      - Accepted alternative: a two-line listener in the language module that writes the attribute on
        `focusin`/`focusout` of the wrapper. If chosen, record it as a deviation from I8 in this change's
        design notes.
      - **HARD GATE (J3):** no role is declared without its pattern.
- [x] 1.3 Close the hover dead zone. The gap between pill and menu currently belongs to neither element, so the
      menu closes mid-traversal.
      - Reduce the menu offset and cover the remainder with the wrapper's own hit area, preserving a visible
        gap while making the interactive area continuous.
      - Verify by pointer traversal: pill → far edge of menu, menu never closes mid-path.
- [x] 1.4 Stop advertising the language pill as inert. Remove the default cursor from the control so its cursor
      matches its hover behaviour.
- [x] 1.5 Remove the unbacked tablist role. `role="tablist"` currently wraps plain anchors with no tab children
      and no roving tabindex.
      - Replace the container's role with a labelled navigation landmark containing a plain link list.
      - Remove the `tablist` role and its label from the markup; do NOT add `role="tab"` children.
      - **HARD GATE (J3):** the group is a landmark, not a fake widget.
- [x] 1.6 Make the current-page indicator truthful. Clear the current-page mark from every tab, then apply it to
      the tab matching the active route.
      - The hardcoded mark in the static markup SHALL be removed.
      - On a route with no matching tab, no tab SHALL be marked.
      - Adding no routes; the route table is unchanged.
      - **HARD GATE:** at most one tab is marked at any time.
- [x] 1.7 Raise touch targets. Bring the language pill, performance pill, theme button, and navigation tabs to at
      least 44×44 CSS pixels.
      - Use `min-height` so the navbar's height token and the frozen sticky geometry are untouched.
      - **HARD GATE (I1):** the sticky offset, stacking value, and bar height are unchanged.

**Validation:**

- **HARD GATE (J1):** keyboard-only traversal reaches and opens the language menu.
- **HARD GATE (J3):** no `tablist`, `tab`, `menu`, or `menuitem` role remains without its required pattern.
- **HARD GATE (I1):** sticky geometry byte-identical — `position: sticky`, `top: 12px`,
  `z-index: var(--z-sticky)`.
- Grep assertion: `role="tablist"` returns 0 hits in `index.html`.
- Grep assertion: no JS reference to `langBtn`, `lang-pill`, or `lang-dropdown` opens the menu (unless 1.2 takes
  the JS alternative, in which case record it).
- Measured: every primary control ≥44×44.
- Measured: current-page indicator correct on `/` and on `/browse`.
- `node --check assets/js/router.js`.
- Pointer traversal: menu stays open from pill to menu edge.

**Completion condition:** a keyboard-only user can open the language menu and reach every navbar control; the
navbar exposes only semantics it implements; the current-page indicator is truthful; the frozen sticky geometry
is untouched.

---

## Phase 2 — Contrast Floor

**Objective:** Bring every muted text value to or above 4.5:1 on every real surface in both themes, reaching the
frozen Browse stylesheet through the token alone.

**Prerequisites:** none. Independent of Phase 1.

**In-scope files:**

- `assets/css/tokens.css` — the muted scale, both theme blocks

**Out-of-scope files:** every stylesheet and script, including `assets/css/browse.css` (frozen by J5).

**Tasks:**

- [x] 2.1 Record the baseline. Capture the current resolved value and contrast ratio of every muted scale token
      against `--bg`, `--bg-card`, `--bg-input`, `--bg-hover`, `--n-4`, and `--bg-elevated`, in both themes.
      - The known failing values are dark 1.84:1 and light 3.16:1 against `--bg-card`.
- [x] 2.2 Re-point the quietest muted token at its sibling. It currently fails AA and cannot be removed, because
      the frozen Browse stylesheet references it six times.
      - Re-point it at the sibling muted token so the quietest step resolves to the sibling's passing value.
      - **HARD GATE (J5):** the token remains declared in both themes and no reference to it becomes invalid.
      - **HARD GATE (J2):** no step renders brighter than the step above it — an alias cannot invert by
        construction, so verify the resolved order is monotonic.
- [x] 2.3 Nudge the dark sibling muted token so it clears AA on the raised surface. Measured, the dark sibling
      misses the floor on the raised surface; nudge its value until it clears on every surface.
      - This single nudge is also what fixes the six Browse selectors, via drift rather than by editing them.
- [x] 2.4 Confirm the previously failing call sites are fixed. The footer copyright, footer contact labels,
      language menu sub-labels, autocomplete path and footer text, and the six Browse selectors SHALL all
      resolve to or above the floor.
      - Note: a later stylesheet block already overrides three of the muted-text sites to the sibling token, so
        those were never effectively failing. Verify rather than assume.

**Validation:**

- **HARD GATE (J2):** a script measures every muted scale value against all six surfaces in both themes; every
  ratio is ≥4.5:1.
- **HARD GATE (J5):** `assets/css/browse.css`, `assets/js/browse.js`, `assets/js/file-actions.js` are
  byte-identical — SHA-256 against the recorded baselines.
- **HARD GATE (J5):** the Browse stylesheet's six muted-text selectors render at or above the floor purely from
  the token change.
- **HARD GATE (J2):** the resolved scale is monotonic — no step brighter than the one above it.
- Cascade check: the four sites a later block already overrides are confirmed, not assumed, to be non-failing.
- Visual: both themes inspected for over-brightened muted text.

**Completion condition:** no user-visible text renders below 4.5:1 anywhere in the application, including the
frozen Browse page, and the frozen files are byte-identical.

---

## Phase 3 — Search Combobox Semantics

**Objective:** Expose the global search field's already-working keyboard behaviour to assistive technology.

**Prerequisites:** none for the code. D4's Hero-freeze exception SHALL be approved before starting.

**D4 exception approval:** granted by the maintainer on 2026-10-02, immediately before Phase 3 implementation.
The implementation added only `role` and `aria-*` attributes inside the Hero subtree (`#globalSearch`); the
dropdown id (`acDropdown`) and `listbox`/`option` roles live on nodes generated by `autocomplete.js`.

**In-scope files:**

- `assets/js/home.js` — `aria-*` / `role` attributes on the search field only
- `assets/js/autocomplete.js` — state writing and ARIA on the generated dropdown and rows

**Out-of-scope files:** every stylesheet. `assets/js/browse.js`, `assets/js/file-actions.js`, `assets/js/router.js`,
`assets/js/i18n.js`, `lib/**`.

**Forbidden under D4:** any Hero CSS rule, token, colour, typography value, or layout declaration. The exception
covers only `role` and `aria-*` attributes.

**Tasks:**

- [x] 3.1 Add combobox semantics to the search field: role, expanded state, and a control reference to the
      result panel.
      - Give the panel a stable id to reference.
      - **HARD GATE (J3):** the role is backed by the keyboard pattern that already exists.
- [x] 3.2 Expose the result panel as a listbox with option rows.
      - Set the selected state on the highlighted row; never on more than one.
- [x] 3.3 Reference the highlighted row from the field.
      - Update the reference wherever the highlight moves: both arrow-key branches, the pointer-hover handler,
        and explicit selection.
      - Clear the reference when nothing is highlighted.
      - **HARD GATE (J3):** the announced state never disagrees with the visible highlight.
- [x] 3.4 Prove the behaviour is unchanged.
      - Arrow-key cycling, Enter navigation, and Escape dismissal SHALL behave exactly as before.
      - No new event listener SHALL be added for functionality that already worked.

**Validation:**

- **HARD GATE (J3):** all four attribute classes are present and correct.
- **HARD GATE (J6):** the only diff inside the Hero subtree is `role` and `aria-*` attributes.
- **HARD GATE (I21):** no Hero stylesheet rule changed; the Hero renders identically.
- Manual: arrow keys cycle and announce; pointer hover and keyboard selection stay in sync.
- `node --check` on both touched scripts.

**Completion condition:** a screen reader announces the presence of the result list, its contents, and the
highlighted entry, with no change to visual appearance or existing keyboard behaviour.

---

## Phase 4 — Document Outline

**Objective:** Remove skipped heading levels from the Home page and the shell footer.

**Prerequisites:** none.

**In-scope files:**

- `assets/js/home.js` — heading levels for resource cards and skeleton placeholders only
- `index.html` — footer column heading levels only

**Out-of-scope files:** every stylesheet. `assets/js/browse.js` (frozen — its heading is already correct).

**Tasks:**

- [x] 4.1 Add the missing level 2 heading for the resources region on the Home page, and align the resource card
      and skeleton headings beneath it.
      - The loading placeholder and the loaded state SHALL use the same level, so the outline does not shift when
        data arrives.
      - Existing visual styling is authored against class selectors and SHALL remain valid.
- [x] 4.2 Re-level the three footer column headings from the deepest level to a level directly beneath the
      routed page's top-level heading, adding no competing top-level heading to the shell.
- [x] 4.3 Confirm appearance is unchanged.
      - Re-levelled headings SHALL render identically — same size, weight, colour, spacing.

**Validation:**

- **HARD GATE (J4):** a script walks the rendered Home page and shell headings; no level is skipped and exactly
  one level 1 exists.
- **HARD GATE (J4):** no new stylesheet rule was needed to preserve appearance.
- **HARD GATE (J5):** `assets/js/browse.js` byte-identical.
- Visual: Home page and footer render pixel-identically apart from semantics.
- `node --check assets/js/home.js`.

**Completion condition:** the outline descends without skips on every page, with no visual change.

---

## Phase 5 — Footer Link Localisation

**Objective:** Make the three footer social links announce a localised accessible name instead of writing a
meaningless placeholder property.

**Prerequisites:** none.

**In-scope files:**

- `index.html` — the three social anchors' hooks and accessible names
- `assets/js/i18n.js` — a new accessible-name hook in the language applicator

**Out-of-scope files:** both dictionaries' existing entries, every stylesheet, all other scripts.

**Tasks:**

- [x] 5.1 Replace the placeholder hook on the three social anchors with the new accessible-name hook, and point
      the existing dictionary keys at it.
      - No new dictionary keys SHALL be added; the existing footer keys are reused.
- [x] 5.2 Add the accessible-name hook to the language applicator so it writes the `aria-label` attribute.
      - Follow the existing pattern: read the attribute, look up the key, apply only when the key resolves.
- [x] 5.3 Report placeholder hooks applied to non-input elements as an authoring error, so this class of mistake
      cannot recur silently.
      - Confirm the legitimate placeholder use on the search field still works.

**Validation:**

- **HARD GATE (J7):** in Persian, all three social links announce localised names.
- **HARD GATE:** no dictionary entry added, removed, renamed, or reworded; both dictionaries remain identical.
- **HARD GATE (J7):** switching language updates the footer accessible names with no reload.
- Grep assertion: no placeholder hook remains on a non-input element.
- Grep assertion: no footer key is defined in both dictionaries but referenced by nothing.
- `node --check assets/js/i18n.js`.

**Completion condition:** every footer link has a localised accessible name, the Persian social names render, and
the dictionaries are untouched.

---

## Phase 6 — Mobile Navigation

**Objective:** Give users below 900px a route to the primary navigation.

**Prerequisites:** **Phase 1 complete.** This control is added to the same subtree as the language menu and the
tab group, and SHALL NOT inherit their defects.

**In-scope files:**

- `index.html` — the disclosure control
- `assets/css/components.css` — the control and the revealed group layout
- `assets/js/router.js` — toggle state only, if a script is required

**Out-of-scope files:** `assets/css/tokens.css`, `assets/css/home.css`, `assets/css/browse.css`,
`assets/js/home.js`, `assets/js/browse.js`, `assets/js/file-actions.js`, `lib/**`.

**Forbidden:** the frozen sticky geometry (I1). A drawer, focus trap, roving tabindex, or dialog-dismissal
primitive — none exist in this codebase and D3 rejects building one here.

**Implementation notes:** the control (`#navDisclosure`) sits last in `.nav-actions`, in-flow, so it neither
detaches nor overlays routed content. The revealed group is `.nav-tabs.is-open`: an absolutely positioned
stack anchored to `.nav` (the sticky positioned ancestor), spanning exactly the bar's width with its own
`--surface-glass` background, so it fits any viewport the bar fits and no content shows through. The
control's accessible name is a hardcoded English `aria-label="Menu"`, matching the existing shell controls
(theme/lang pills); the localising `data-i18n-aria` hook is Phase 5's mechanism and was not applied here to
avoid shipping a dead hook. No new dictionary keys were added.

**Tasks:**

- [x] 6.1 Add the disclosure control to the navbar actions as a native button, visible only below 900px, with an
      expanded state and a control reference to the navigation group.
- [x] 6.2 Give the navigation group a stable id to be referenced by.
- [x] 6.3 Style the revealed group as a vertical stack that fits within the viewport at 360px without clipping or
      overlap.
- [x] 6.4 Hide the control at 900px and above, where the group is always visible.
- [x] 6.5 Prove the control is keyboard operable, reports its state truthfully in both directions, and keeps
      focus on itself when toggled.

**Validation:**

- **HARD GATE:** at 360px, 480px, 768px, and 900px, a visible operable control reveals the group.
- **HARD GATE (J1):** the control is never a hover-only reveal.
- **HARD GATE (J3):** its role, if any, is one whose pattern is implemented.
- **HARD GATE (I1):** sticky geometry byte-identical; the control does not detach or overlay routed content.
- Manual: revealed links are reachable in document order and route correctly.
- Manual: no destination becomes unreachable at any width.

**Completion condition:** no viewport width leaves the shell without a route to Website, Docs, or Downloads.

---

## Phase 7 — Footer Content Strategy

**Objective:** Remove footer links that merely duplicate navbar destinations, now that mobile navigation exists.

**Prerequisites:** **Phase 6 complete.** Until then, the footer is the only route to some destinations on a
phone, and removing a "duplicate" would remove the user's only path.

**In-scope files:**

- `index.html` — the duplicated footer links

**Out-of-scope files:** both dictionaries, every stylesheet, all scripts.

**Tasks:**

- [x] 7.1 Compare footer link destinations against navbar link destinations and remove the overlaps.
      - Confirm first that the navbar exposes each removed destination at every width, including below 900px.
      - Keep destinations with no navbar equivalent, plus the contact column and the copyright line.
- [x] 7.2 Confirm no remaining link is a placeholder pointing at the current page, and that contact details stay
      reachable.
- [x] 7.3 Leave dictionary entries intact. Removing a link SHALL NOT delete its key.
      - If a key becomes referenced by nothing, resolve it by keeping the fallback source text or by recording the
        deferral — never by silently deleting an entry.

**Validation:**

- **HARD GATE:** no footer destination duplicates a navbar destination.
- **HARD GATE:** no dictionary entry added, removed, renamed, or reworded; both dictionaries identical.
- **HARD GATE:** no destination becomes unreachable at any width.
- Grep assertion: every remaining footer link resolves to a real destination.
- Manual at 360px: all destinations remain reachable.

**Completion condition:** the navbar and footer no longer overlap, nothing is orphaned, and the dictionaries are
untouched.

---

## Phase 8 — Cross-Browser Mobile Responsiveness

**Objective:** Audit and fix layout breakage, clipping, overflow, and inconsistent rendering on small viewports
across Firefox, Chrome, and other browsers.

**Prerequisites:** none. Independent; may run in parallel with Phases 2–5.

**In-scope files:**

- `assets/css/base.css`, `assets/css/home.css`, `assets/css/components.css`, `assets/css/performance-modes.css`
- `index.html` — viewport meta and markup hooks only, if needed

**Out-of-scope files:** `assets/css/tokens.css` (owned by `contrast`), `assets/css/browse.css`, `assets/js/browse.js`,
`assets/js/file-actions.js` (frozen by J5), all other scripts, `lib/**`.

**Forbidden:** any edit to the three frozen files (J5). If the audit finds a defect in `browse.css`, record it as
a deferral; do not edit the file.

**J6 exception (F8):** granted by the maintainer on 2026-10-02, scoped to `.hero-max::after` geometry only.
The glow's fixed `480px` width at `left: -60px` extended past the right viewport edge below ~420px and
inflated `scrollWidth` through `.hero-max { overflow: visible }`. Fix: `width: min(480px, 100%)` — one
declaration, no visual change at any width (the paint was already clip-path'd to the hero bounds). No
other Hero rule, token, or markup was touched.

**Audit findings (recorded 2026-10-02, live CDP audit — Chrome 154, Edge 154, Firefox 157):**

- **F1 — Navbar controls off-viewport at 360px (FIXED).** `.nav-logo` (134px) + `.nav-actions` (251px)
  exceeded the 344px page box, pushing the theme button and the Phase 6 disclosure control off the right
  edge — the disclosure was unreachable, failing Phase 6's own gate. Fix: `.nav-logo-text { display: none }`
  at ≤480px, `.nav-actions { gap: 4px }` at ≤640px (components.css).
- **F2 — Resource cards 393px wide inside a 344px grid track at 360px (FIXED).** The card is a grid item
  with default `min-width: auto`, so its min-content forced it past the track. Fix: `min-width: 0` on
  `.resource-card`, `overflow-wrap: anywhere` on `.resource-meta h3/p` (home.css).
- **F3 — Horizontal scrollbar at every width on `/` (FIXED).** `.resource-card::after`'s corner bleed sat
  40px outside the card; as a laid-out pseudo-element it inflated `scrollWidth` at 360–900px. Fix: bleed
  repositioned inside the card (`top: 0; inset-inline-end: 0`).
- **F4 — Hidden language menu jutting past the right edge at 360px (FIXED).** The menu was pinned to both
  inline edges of its wrap, anchoring its 148px min-width at the start edge. Fix: `inset-inline-start: auto`
  inside the ≤900px block, so it grows inward.
- **F5 — Hidden performance menu jutting past the left edge at 360px (FIXED, exposed by F1's fix).** Once
  the navbar compacted, the `right: 0`-anchored, 170px-min-width menu crossed the left edge. Fix:
  `inset-inline-start: 0; inset-inline-end: auto` at ≤640px (performance-modes.css, logical properties so
  RTL mirrors correctly).
- **F6 — Known finding "navbar too tall" (REFUTED).** Measured bar height is 52px at ≤640px and 56px above,
  exactly the `--nav-h-mobile`/`--nav-h` values. The perceived problem was horizontal crowding (F1).
- **F7 — Known finding "card grid too long" (MITIGATED).** Single-column at ≤640px kept; a 2-column track
  was evaluated and rejected (~166px tracks at 360px force heavy wrapping and new clipping). Padding
  tightened to 14px and gap to 10px at ≤640px (appended Phase 8 block at the end of home.css).
- **F8 — `scrollWidth` 429px at 360px (FIXED via J6 exception above).** Root cause was `.hero-max::after`.
  Pre-fix it was also verified as invisible and unreachable: `body { overflow-x: hidden }` keeps
  `pageXOffset` at 0 under a forced `scrollTo`, and the glow's paint is clip-path'd to the hero bounds.

**Re-verification (2026-10-02, post-fix):** `document.scrollingElement.scrollWidth === innerWidth` at
360/480/768/900px on `/`, `/browse`, and `/404.html` in both Chrome 154 and Edge 154 (full matrix,
rate-limit-paced); zero interactive controls off-viewport at any width; Firefox 157 screenshots at
360px (`/`, `/browse`) and 768px (`/`) show the navbar (with disclosure), cards, hero, and footer fully
inside the viewport with no horizontal scrollbar. J5: frozen-file diff empty. I1: `.nav` rule absent
from the components.css diff.

**Tasks:**

- [x] 8.1 Audit every routed page at 360px, 480px, 768px, and 900px in both Firefox and Chrome (plus one other
      engine, e.g. Safari/Edge). Record: horizontal scrollbar presence, clipped or overlapping text, controls
      that render off-viewport, stacking/overflow breaks, and any browser-specific divergence (e.g. `100vh`
      behaviour on mobile, safe-area insets, differing default styles).
      - **Known findings (reported 2026-10-02, pending live audit):**
        - **Navbar too tall on small screens.** Likely causes to verify: 44px touch-target pills (Phase 1)
          inside the bar, `.nav-actions` crowding/wrapping at ≤640px, and `--nav-h-mobile`. Verify actual
          rendered height at 360/480/768px before fixing.
        - **Card grid too long on mobile.** `.resources-grid` collapses to a single column below 640px
          (`home.css:1663`) with 20px-padded `.resource-card`s (`home.css:769`), producing a very long
          vertical scroll. Evaluate a compact 2-column or tighter single-column layout at ≤640px.
      - Output: a written findings list appended to this file or the change's design notes.
- [x] 8.2 Fix each confirmed finding using standards-based, cross-browser CSS (no vendor-prefixed hacks, no
      browser-sniffing JS). Prefer shared fixes (constraints, min/max bounds, `overflow-wrap`, modern viewport
      units with fallbacks) over per-browser overrides.
- [x] 8.3 Re-verify after fixing: no horizontal overflow and no clipped interactive control at any audited
      width in any audited browser; both themes pass visual inspection.
      - **HARD GATE (J5):** the three frozen files remain byte-identical — SHA-256 against recorded baselines.
      - **HARD GATE (I1):** navbar sticky geometry unchanged.

**Validation:**

- Documented before/after per finding.
- Manual pass at 360/480/768/900px in Firefox and Chrome shows no overflow, clipping, or overlap.
- Frozen-file SHA-256 unchanged.

**Completion condition:** every page renders without horizontal scroll, clipped text, or unreachable controls on
a 360px viewport in Firefox, Chrome, and at least one other browser, with no edit to any frozen file.

---

## Phase 9 — Unified Font Style

**Objective:** Every rendered surface uses the project's font tokens; no element falls back to a browser default
or an undeclared font.

**Prerequisites:** none. Independent; may run in parallel with Phases 2–5, 8. Any edit to `tokens.css` must be
serialized with Phase 2 (both touch the file).

**In-scope files:**

- `assets/css/base.css`, `assets/css/home.css`, `assets/css/components.css`, `assets/css/performance-modes.css`
- `index.html` — inline `style` attributes or font declarations only
- `assets/css/tokens.css` — only to consolidate font-token definitions, never to retune colour tokens
- `assets/js/**` — only inline font styles in generated markup, if found

**Out-of-scope files:** `assets/css/browse.css`, `assets/js/browse.js`, `assets/js/file-actions.js` (frozen by J5).
Browse's single `var(--font-display)` reference inherits the fix via token drift.

**Forbidden:** introducing a new brand font family without approval; browser-sniffing; per-browser font hacks.

**Tasks:**

- [x] 9.1 Audit every selector that sets or omits `font-family`. Check form controls (`input`, `button`,
      `textarea`, `select`), table elements, code/pre blocks, and JS-generated markup — the usual places the
      browser default leaks through. Record every spot that does not resolve to `var(--font)`,
      `var(--font-mono)`/`var(--mono)`, `var(--font-display)`, `var(--font-hero)`, or `var(--font-fa)`.
- [x] 9.2 Fix each finding by pointing it at the appropriate existing token (prose → `--font`, code/paths →
      `--font-mono`, hero brand → `--font-hero`, Persian body → `--font-fa`). Consolidate the duplicated
      mono aliases (`--mono` vs `--font-mono`) onto one token only if done repo-wide; otherwise leave aliases.
      Replace all fallbacks like `var(--font, system-ui)` with the plain token so failures are visible rather
      than silent.
- [x] 9.3 Verify: in DevTools, every sampled element's computed `font-family` starts with Inter/Vazirmatn/
      JetBrains Mono/Cinzel — never a bare browser default (Arial/Times/serif, system font on form controls).
      - **HARD GATE (J5):** frozen files byte-identical.
      - **HARD GATE:** Persian text still renders in Vazirmatn, hero still in Cinzel.

**Validation:**

- Grep assertion: no bare `font-family` value in any stylesheet/script other than the token definitions in
  `tokens.css`.
- Computed-style spot check in both themes, Home and Browse, covers body, nav, buttons, inputs, footer, and
  hero.

**Completion condition:** no element on any page resolves to a browser-default font, in either theme, in any
supported language.

---

## Phase 10 — Self-Host Third-Party Assets

**Objective:** Every asset the app downloads at runtime (fonts, icon CSS, JS libraries) is served from this
repository, so the site works offline, behind a strict CSP, and with no third-party CDN in the critical path.

**Prerequisites:** none. Independent.

**Audit findings (2026-10-02):**

- `browse.html:8-10` — Google Fonts (`Manrope`, `Cinzel`, `Vazirmatn`, `Sora`) via `fonts.googleapis.com`.
- `404.html:9` — Font Awesome 6.4.0 CSS via `cdnjs.cloudflare.com`.
- `index.html` — already self-hosted (fonts under `/assets/fonts/`, no CDN links). Untouched.
- `template/new-home.html` and `graphify-out/graph.html` also reference CDNs, but both are build/artifact
  directories, not shipped pages. Confirm with the human before touching them.

**In-scope files:** `browse.html`, `404.html`, `assets/fonts/**` (new files), `assets/css/**` (only to add
`@font-face` / local icon CSS imports), `assets/vendor/**` (new, for any JS).

**Out-of-scope files:** `assets/css/browse.css`, `assets/js/browse.js`, `assets/js/file-actions.js` (frozen by
J5), `lib/**`.

**Forbidden:** adding a runtime dependency on any external CDN; fetching third-party code at request time;
silently dropping the Font Awesome icons on `404.html` (replace with local files or inline SVG).

**Tasks:**

- [x] 10.1 Vendor the fonts used by `browse.html` (and any weights actually needed) into `assets/fonts/`,
      add `@font-face` rules, and replace the Google Fonts `<link>`/`preconnect` tags with the local
      stylesheet. Note: `Cinzel` is already the `--font-hero` face — de-duplicate by reusing the existing
      `/assets/fonts/` files where the family and weight match.
- [x] 10.2 Replace the `cdnjs` Font Awesome `<link>` in `404.html` with a local copy (`assets/vendor/` or
      `assets/css/`) including its webfont files, or swap the icons for inline SVG. Remove the CDN reference
      either way.
- [x] 10.3 Grep-assert zero runtime CDN references remain in shipped pages and stylesheets (allow only
      documented outbound hyperlinks like `cloudavid.com`, `t.me`, etc.).
      - **HARD GATE (J5):** frozen files byte-identical.
      - **HARD GATE:** Home, Browse, and 404 render identically (same fonts, same icons) in Persian and English.

**Validation:**

- Grep assertion: `https://(fonts|cdnjs|unpkg|jsdelivr|cdn\.)` returns 0 hits outside `template/` and
  `graphify-out/`.
- DevTools Network: zero requests to external origins on page load for `/`, `/browse`, and the 404 page.
- Visual diff of 404 and Browse before/after: unchanged.

**Completion condition:** no shipped page requests a static asset from a CDN; the site renders fully with
network access to third-party origins blocked.

---

## Final Verification (all phases)

- [ ] `openspec validate a11y-ux-debt --strict` passes.
- [ ] `node --check` passes on every touched script.
- [ ] **HARD GATE (J5):** the three frozen files are byte-identical to their recorded SHA-256 baselines.
- [ ] **HARD GATE (J6):** the Hero stylesheet is byte-identical; the only Hero changes are `role` and `aria-*`.
- [ ] **HARD GATE (I1):** navbar sticky geometry unchanged.
- [ ] **HARD GATE (J2):** every muted text value ≥4.5:1 on every surface, both themes.
- [ ] **HARD GATE (J1):** every interactive element operable by keyboard alone.
- [ ] **HARD GATE (J3):** no ARIA role without its required pattern.
- [ ] **HARD GATE (J4):** no skipped heading level; exactly one level 1 per page.
- [ ] **HARD GATE (J7):** every shell control has an accessible name that localises.
- [ ] Dictionary key sets remain identical across both languages.
- [ ] Nothing staged or committed; unrelated working-tree changes remain untouched.
- [ ] **HARD GATE (Phase 8):** no horizontal overflow, clipping, or overlap at 360/480/768/900px in Firefox, Chrome, and one other browser.
- [ ] **HARD GATE (Phase 9):** no computed `font-family` anywhere resolves to a browser default.
- [ ] **HARD GATE (Phase 10):** zero CDN asset requests at runtime on `/`, `/browse`, and 404.
## Amendment (2026-10-16) — superseded by `ui-craft-elevation`

The following gates are **amended** so this change no longer conflicts with
`openspec/changes/ui-craft-elevation/` (design D1, D13; tasks 0.1, 2.1):

- **J5** (byte-identical `browse.css`, `browse.js`, `file-actions.js`) — lifted. `ui-craft-elevation`
  edits all three: `browse.js` and its helpers become route-loaded ES modules (task 5.2), `browse.css`
  re-scopes `--info` (task 2.5), and `file-actions.js` replaces its blocking `alert()` (task 6.7).
- **J6** (Hero stylesheet byte-identical) — lifted. The `HERO DRIFT INSULATION` block is deleted and the
  Hero resolves the live tokens (task 2.1).

Every other gate in this file is unchanged. Verification for the lifted gates moves to
`ui-craft-elevation` §7.
