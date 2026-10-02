# Design: Accessibility & UX Debt Clearance

## 1. Method

Every finding in this change was confirmed by reading the shipped files, not inferred from the spec. Claims
that depend on measured values (contrast, cascade resolution, DOM position) were verified with throwaway
scripts and the numbers are recorded here so a reviewer can reproduce them.

Two facts shaped the whole design and were not visible from the defect list alone:

- `#globalSearch` is a **Hero descendant** (`home.js:70`, inside `.input-wrap` at `:68` and `.hero-search` at
  `:67`, inside `.hero-max` at `:48`), so fixing search semantics breaches I21.
- `browse.css` consumes `--text-4` in six places (`.crumb-sep`, `.browse-stats`, `.thead`, `.f-sub`,
  `.f-action`, `.empty-circle`), so deleting or rewriting that token would break a frozen file.

## 2. Navbar: Keyboard Operability (J1)

### 2.1 Root cause

Three separate facts combine into a hard keyboard blocker:

| Fact | Location |
|---|---|
| Menu opens on `:hover` only | `components.css:351` `.lang-dropdown-wrap:hover .lang-dropdown-menu` |
| No `:focus-within` equivalent exists | absent from the whole stylesheet |
| No JS opens it | zero hits for `langBtn` / `lang-pill` / `lang-dropdown` across `assets/js/**` |

`#langBtn` is a real `<button>` with `aria-haspopup="true"` and `aria-expanded="false"` (`index.html:196`), so
it receives focus and draws a focus ring — it simply does nothing when activated. The failure is silent: a
sighted keyboard user sees focus land on a control that appears to be the only route to Persian and it is not.

`aria-expanded` is hardcoded `false` and never written to, so assistive technology reports "collapsed"
permanently even for a mouse user with the menu open.

### 2.2 Fix

Prefer `:focus-within` over adding a JS toggle, because it keeps the frozen "no script toggles this menu"
contract (I8) intact while closing the keyboard gap:

```css
.lang-dropdown-wrap:hover .lang-dropdown-menu,
.lang-dropdown-wrap:focus-within .lang-dropdown-menu {   /* added */
    opacity: 1;
    visibility: visible;
    transform: translateY(0) scale(1);
}
```

`:focus-within` is supported in every browser this project targets, so no `:hover-within` polyfill is needed.

`aria-expanded` is then driven from CSS state rather than JS, using a sibling attribute selector. Because the
menu is a descendant of the wrapper, the wrapper cannot read its own child's state — so the state lives on the
button and is mirrored by `:focus-within`:

```css
.lang-dropdown-wrap:focus-within .lang-pill { /* existing hover style, extended */ }
```

and, to keep `aria-expanded` truthful without a script, the button gets `aria-expanded="true"` reflected via
`:has()` where supported, with the hardcoded attribute retained as the no-JS fallback. If the implementer
prefers certainty over purity, a two-line JS listener in `i18n.js` is the honest alternative and is recorded as
an accepted deviation in the module spec.

### 2.3 Hover dead zone (defect 3)

The menu is offset `top: calc(100% + 8px)` from a 32px-tall wrapper. The 8px gap belongs to neither the pill
nor the menu, so the pointer crosses a region where `:hover` is false and the menu unmounts. `:hover-within` on
the wrapper makes the *whole subtree* a hover region, so the gap no longer breaks the chain as long as the
pointer remains within the wrapper's hit area — which the offset breaks. The offset is therefore reduced to
`4px` and the wrapper gains `padding-block-end` to cover the remainder, keeping a visual gap while closing the
interactive one.

### 2.4 `role="tablist"` (J3)

`index.html:121` declares `role="tablist"` on a `<div>` whose children are three `<a>` elements with no
`role="tab"`, no `aria-selected`, and no roving tabindex. A tablist without tabs is a pattern violation that
makes assistive technology worse than plain markup, because it announces a widget the user cannot operate.

The links are navigation links, not tabs — they open external sites and the app root. **The correct fix is to
remove the role, not to implement a tab widget.** `<nav aria-label="Primary">` with a plain `<ul>` gives the
same landmark and no false promise. This also removes the need for any arrow-key handler.

### 2.5 Stale `aria-current`

`index.html:142` hardcodes `class="nav-tab active" aria-current="page"` on the Downloads link. Nothing in
`router.js` or any other script updates it, so on `/browse` the navbar still asserts that Downloads is the
current page. `router.js` gains a post-render hook that clears `aria-current` and `.active` from all tabs and
re-applies them to the tab whose `href` matches the current route. No routes are added; only the highlight is
made truthful.

### 2.6 Touch targets

`.nav-tab` is 34px tall, `.lang-pill` / `.perf-pill` / `.theme-btn` are 32px. All clear the WCAG 2.2 24×24
floor, so none is a hard failure, but all sit under the 44×44 recommendation and the pills are the primary
mobile controls. They are raised to 44px min-height via `min-height` rather than by changing `height`, so the
`--nav-h` pill geometry (and therefore the frozen I1 sticky rule) is unaffected.

## 3. Contrast (J2)

### 3.1 Measured baseline

Against `--bg-card`, from `tokens.css`:

| Token | Dark | Light |
|---|---|---|
| `--text` | 13.32:1 | 16.43:1 |
| `--text-2` | 10.07:1 | 12.26:1 |
| `--text-3` | 5.44:1 | 9.35:1 |
| `--text-4` | **1.84:1 FAIL** | **3.16:1 FAIL** |

### 3.2 Why four steps are impossible

The raised surface `--n-4` (`#2b2d31` dark) is the highest-luminance background the app puts text on. Dark
`--text-3` measures **4.37:1** against it — already below 4.5. There is therefore no room for a fourth step
that is dimmer than `--text-3` *and* passes AA. Every AA-passing candidate for `--text-4` is lighter than
`--text-3`:

| Candidate | on `--bg-card` | on `--n-4` | vs `--text-3` |
|---|---|---|---|
| `#9b8a72` | 5.13:1 | 4.26 FAIL | dimmer, but fails |
| `#a3947c` | 5.79:1 | 4.65:1 | **lighter — inverts the scale** |
| `#b0a288` | 6.11:1 | 5.50:1 | clearly lighter |

Retuning `--text-4` to an independently chosen hex therefore buys AA compliance at the cost of an inverted
hierarchy, where the "quietest" token renders brighter than the one above it.

### 3.3 Chosen fix: alias, plus one nudge

- `--text-4` becomes `var(--text-3)` in both themes.
- Dark `--text-3` moves from `#9e8f78` to `#a3947c`.
- Light `--text-3` is unchanged at `#514532`.

Resulting measured state:

| Token | Dark on `--bg-card` | Dark on `--n-4` | Light on `--bg-card` | Light on `--n-4` |
|---|---|---|---|---|
| `--text-3` | 5.79:1 | 4.65:1 | 9.35:1 | 7.43:1 |
| `--text-4` (alias) | 5.79:1 | 4.65:1 | 9.35:1 | 7.43:1 |

Every surface clears 4.5:1. Aliasing cannot invert the hierarchy by construction, and it keeps all 15
`var(--text-4)` references valid — including the six inside the frozen `browse.css`, which are fixed through
token drift with no file edit (J5).

### 3.4 Cascade check

Four of the nine `components.css` sites are not the effective colour; a later Phase 4 rule in `home.css`
overrides `.section-sub`, `.mono`, and `.res-path` to `--text-3` already. Sites verified as genuinely effective
`--text-4` at 11px: `.copyright-text`, `.contact-label`, `.lang-option span`, `.ac-path`, `.ac-footer`,
`.ac-empty`. All are fixed by the alias.

### 3.5 Accepted side effect

The muted scale now has three usable steps instead of four. Hierarchy at the quiet end is carried by font size
and weight (`.copyright-text` is 11px mono; `.contact-label` is 11px) rather than by a dimmer colour. This is
recorded as Open Question 1. The alternative — deleting `--text-4` outright — is blocked by J5 because
`browse.css` references it six times.

## 4. Search Semantics (J3, D4)

### 4.1 Current state

`autocomplete.js` implements correct keyboard behaviour — `ArrowDown`/`ArrowUp` cycle `activeIndex` (`:167`,
`:171`), `Enter` navigates (`:175`), `Escape` closes (`:182`) — but exposes **none** of it to assistive
technology. There is no `role="combobox"`, no `aria-expanded`, no `aria-controls`, no `aria-activedescendant`,
no `role="listbox"`, and no `role="option"` or `aria-selected`. The highlighted row is signalled only by the
`.active` class.

A screen reader user tabs to the search field, types, and is given no indication that a result list exists, what
is in it, or which row is highlighted.

### 4.2 Fix

| Element | Attribute | Value |
|---|---|---|
| `#globalSearch` | `role` | `combobox` |
| `#globalSearch` | `aria-expanded` | `true`/`false`, toggled in `show()`/`hide()` |
| `#globalSearch` | `aria-controls` | id of the `.ac-dropdown` |
| `.ac-dropdown` | `role` | `listbox` |
| `.ac-item` | `role` | `option` |
| `.ac-item` | `aria-selected` | `true` on the active row |
| `#globalSearch` | `aria-activedescendant` | id of the active `.ac-item` |

`autocomplete.js` writes the ids it owns; no new element is introduced. `aria-activedescendant` is updated
wherever `activeIndex` changes, including the `mouseenter` handler at `:83`, so pointer and keyboard stay in
sync.

### 4.3 Why this needs an exception

`#globalSearch` is emitted by `renderHeroSection` at `home.js:70`, inside `.input-wrap` → `.hero-search` →
`.hero-max`. I21 freezes Hero markup. D4 grants a narrow exception covering only `role` and `aria-*`
attributes on `#globalSearch` and on the `.ac-dropdown`/`.ac-item` nodes that `autocomplete.js` builds. No
Hero CSS rule changes; `.ac-dropdown` styling in `components.css` is untouched even though the dropdown is
Hero-rendered.

## 5. Heading Outline (J4)

Current outline:

| Page | Sequence | Defect |
|---|---|---|
| Home | `h1` (hero, `home.js:61`) → `h3` (resource cards, `home.js:281`) | skips `h2` |
| Shell | `h1` (routed page) → `h4` (footer columns, `index.html:258/269/292`) | skips `h2` and `h3` |
| Browse | `h1#folderName` (`browse.js:81`) | correct |

Fix: resource card titles become `h2` wrapped by an `h2`-level section label for the resources block, and the
footer column titles become `h2`. The auth modal already uses `h2` correctly (`home.js:690`) and is left
alone. `browse.js` is frozen (J5), so its correct `h1` is untouched.

`.skeleton-line-title` is also an `h3` (`home.js:193`) inside the loading placeholder; it becomes `h2` to match
its loaded-state counterpart, keeping the outline stable across the loading transition.

## 6. Footer Localisation (J7)

`index.html:294,297,300` place `data-i18n-ph` on the three social `<a>` elements. `i18n.js:300` implements
`data-i18n-ph` as `el.placeholder = d[k]`. An anchor has no placeholder, so this writes a meaningless expando
and the `aria-label` stays English in both languages. The Persian strings added in Phase 8
(`footer.socialTelegramPh` / `LinkedInPh` / `GithubPh`) are dead.

Three attributes are removed and replaced with a new `data-i18n-aria` hook applied in `applyTranslations`:

```js
document.querySelectorAll("[data-i18n-aria]").forEach(el => {
    const k = el.getAttribute("data-i18n-aria");
    if (d[k] != null) el.setAttribute("aria-label", d[k]);
});
```

The dictionary keys are reused unchanged, so no new keys are added and I10 (no key deletion or rewording) is
upheld. `footer.about` and the other 14 keys are already correct and untouched.

## 7. Mobile Navigation (D3)

At `max-width: 900px`, `.nav-tabs { display: none }` and nothing replaces it. There is no hamburger, drawer,
or toggle anywhere in the codebase. On phones and tablets the primary navigation disappears; the footer links
partially compensate, which is why `content-strategy` depends on this module.

The disclosure control is a `<button class="nav-disclosure" aria-expanded="false" aria-controls="navTabs">`
placed in `.nav-actions`, visible only below 900px. Activating it toggles `.nav-tabs.is-open`, which flips the
tab group from `display: none` to a vertical stack. No new keyboard model is introduced: the button is a native
`<button>`, so Enter/Space work for free, and the revealed links are ordinary anchors in the tab order. This is
why a drawer was rejected (D3).

The disclosure button must satisfy J1, so it cannot be a `:hover` reveal — it is click/Enter activated, and its
state is reflected in `aria-expanded`.

## 8. Content Strategy

`footer.linkHome` ("Home") duplicates `.nav-logo`'s link to `/`, and `footer.linkDocs` ("Documentation")
duplicates the nav Docs tab. `footer.linkBrowse` is the only footer link with no navbar counterpart.

Given the footer is supplementary once `mobile-nav` ships, the duplicates are removed and the link set
becomes: Browse Portal, Rakaard, plus the Contact column. This is a copy decision and is recorded as Open Question 3.

**Implementation note (recorded deferral):** applying the no-duplicate-destination hard gate removed the Home
(`/`), Documentation, and CloudAvid Main Site links; `footer.linkHome`, `footer.linkDocs`, and
`footer.linkMainSite` now have no markup reference. Those dictionary entries are intentionally retained
unchanged (no deletion, rewording, or addition), so the keys can be restored deliberately later. The pre-existing
paragraph listing only Home and Documentation is superseded accordingly.

## 9. Rejected Alternatives

| Alternative | Why rejected |
|---|---|
| JS toggle for the language menu | Breaks the frozen I8 "no script toggles this menu" contract. `:focus-within` closes the keyboard gap without touching it. |
| Implement a real tab widget | The links are navigation, not tabs. Removing the role is correct; building a widget is scope the app does not need. |
| Delete `--text-4` | `browse.css` references it six times and is frozen; deletion breaks the Browse page. |
| Independently retune `--text-4` | Passes AA only by rendering brighter than `--text-3`, inverting the hierarchy. |
| Full mobile drawer with focus trap | No focus-trap primitive exists in this codebase; Phase 6 was skipped for that reason. Building one is a separate capability. |
| Fix contrast at the 15 call sites | Leaves the six frozen Browse selectors and `.ac-path` failing; the audit fails again next quarter. |
| Add axe-core CI now | Valuable but out of scope; raised as Open Question 4 rather than bundled into a defect-clearing change. |

## 10. Verification Approach

Each module ships with a verification step that is mechanical, not observational:

| Module | Verification |
|---|---|
| `navbar` | Tab to the language pill and assert the menu is visible; assert `role="tablist"` is gone from `index.html`; assert no JS references `langBtn`. |
| `contrast` | Script asserting every `--text-*` value clears 4.5:1 against all six real surfaces in both themes. |
| `search-a11y` | Assert the four attributes exist and that `aria-activedescendant` tracks `activeIndex` through arrow keys and mouse. |
| `doc-outline` | Script walking the rendered DOM asserting no skipped heading levels and exactly one `h1`. |
| `footer-i18n` | Switch to `fa` and assert the three `aria-label`s change. |
| `mobile-nav` | Assert `.nav-tabs` is reachable below 900px and that the disclosure reports its state. |
| `content-strategy` | Assert no footer `href` duplicates a navbar `href`. |

Plus the standing gates: `openspec validate a11y-ux-debt --strict`, `node --check` on every touched JS file,
and SHA-256 comparison of the three frozen files against their recorded baselines.