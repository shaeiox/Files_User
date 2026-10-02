# Capability: Performance, RTL, and Responsive Parity

## Purpose

The application expresses three orthogonal runtime conditions as attributes on the root element —
`data-theme` for the colour scheme, `data-perf` for a performance tier that doubles as the reduced-motion
path, and `dir` for text direction — and layers them onto six fixed responsive breakpoints. Every one of those
behaviours is existing, load-bearing behaviour rather than decoration: the performance tiers decide which
expensive effects are affordable on a low-power device, the direction attribute drives roughly forty mirrored
rules, and the breakpoints include two behaviours that remove functionality rather than restyle it. This
capability guarantees that every effect introduced by the redesign is tier-gated, every new direction-sensitive
rule is mirrored, and every breakpoint and directionality behaviour survives intact.

## ADDED Requirements

### Requirement: Every new effect has a low-tier and a potato-tier override

Every CSS rule introduced or modified by this change that uses `backdrop-filter`, `blur`, `animation`,
`transition`, `filter`, or `box-shadow` SHALL have a matching override in `performance-modes.css` under
**both** the `low` and `potato` tiers. A rule that has only one of the two is incomplete.

#### Scenario: **HARD GATE** — Every effect-bearing selector has a low-tier override

- **GIVEN** the complete enumeration of selectors introduced or modified by this change that use any of the
  effect-bearing properties
- **WHEN** `performance-modes.css` is searched under the low tier
- **THEN** every enumerated selector appears with an override

#### Scenario: **HARD GATE** — Every effect-bearing selector has a potato-tier override

- **GIVEN** the same enumeration
- **WHEN** `performance-modes.css` is searched under the potato tier
- **THEN** every enumerated selector appears with an override

#### Scenario: The enumeration is complete

- **GIVEN** the change touches six stylesheets
- **WHEN** every added or modified declaration using an effect-bearing property is extracted from the diff
- **THEN** each is present in the enumeration, with no selector omitted

#### Scenario: Existing overrides still win over restyled rules

- **GIVEN** `performance-modes.css` overrides some of the same selectors this change restyles, using elevated
  specificity
- **WHEN** a restyled rule and its tier override are both applied
- **THEN** the tier override takes effect at both the low and potato tiers

### Requirement: Low and potato tiers actually remove the effects

At the `low` and `potato` tiers, backdrop blurs SHALL be removed, heavy shadows SHALL be reduced or removed,
and animations and transitions SHALL be suppressed. The enumeration is not satisfied by an override that only
reduces an effect partially; the expensive property must be neutralised.

#### Scenario: Perf tier `low` disables backdrop blur

- **GIVEN** `data-perf="low"` is set on the root element
- **WHEN** the navbar pill, the page shell backdrop, the autocomplete dropdown, the modals, and the dropdown
  menus are inspected
- **THEN** none of them computes a `backdrop-filter` or `filter` blur, and every blur value resolves to `none`

#### Scenario: Perf tier `potato` disables backdrop blur

- **GIVEN** `data-perf="potato"` is set
- **WHEN** the same elements are inspected
- **THEN** none computes a blur, and the animated background layers are suppressed in favour of a single static
  treatment

#### Scenario: Low tier suppresses animation

- **GIVEN** `data-perf="low"` is set
- **WHEN** the page is observed over time
- **THEN** no animation or transition that was introduced by this change runs

#### Scenario: Potato tier suppresses animation

- **GIVEN** `data-perf="potato"` is set
- **WHEN** the page is observed over time
- **THEN** no animation or transition that was introduced by this change runs

#### Scenario: High and medium tiers keep the full treatment

- **GIVEN** `data-perf="high"` or `data-perf="medium"` is set
- **WHEN** the page renders
- **THEN** the full Obsidian Kinetic treatment, including blurs and glows, is present

### Requirement: The tier is selected before paint and honours reduced motion

The performance tier SHALL continue to be resolved by the existing inline pre-paint script, SHALL continue to
force the low tier when the operating system requests reduced motion, and SHALL continue to read and write its
cached tier with its existing validity window. No new tier-selection mechanism SHALL be introduced.

#### Scenario: The tier is applied before first paint

- **GIVEN** a returning visitor with a cached tier
- **WHEN** the first paint occurs
- **THEN** the tier attribute is already present on the root element, with no flash of the wrong tier

#### Scenario: Reduced motion forces the low tier

- **GIVEN** the operating system requests reduced motion
- **WHEN** the inline pre-paint script runs
- **THEN** the low tier is applied regardless of any cached higher tier, and the cached value is not consulted

#### Scenario: The cached tier's validity window is unchanged

- **GIVEN** a cached tier value carries a timestamp
- **WHEN** the timestamp is outside the existing validity window
- **THEN** the cache entry is discarded and the system-detected tier is used, exactly as before

#### Scenario: Invalid cached values are discarded

- **GIVEN** a cached tier value that is not one of the recognised tiers, or whose timestamp is not a finite
  number or is in the future
- **WHEN** the pre-paint script runs
- **THEN** the entry is discarded rather than applied

#### Scenario: Smooth scrolling is disabled at the low tiers

- **GIVEN** the low and potato tiers force instant document scrolling
- **WHEN** a scroll position is set programmatically or via a hash
- **THEN** it jumps rather than animating, unchanged from the pre-change behaviour

### Requirement: Every new animation has a motion guard

Any animation or transition introduced by this change SHALL be neutralised by a reduced-motion media query
in addition to its tier overrides, so a user who requests reduced motion never sees it regardless of which
tier is active.

#### Scenario: Every new animation is guarded

- **GIVEN** the enumeration of animations and transitions introduced by this change
- **WHEN** each is located in the stylesheets
- **THEN** a reduced-motion block neutralises it

#### Scenario: Reduced motion suppresses the entrance animation

- **GIVEN** rows and cards animate in on render
- **WHEN** reduced motion is requested
- **THEN** the animation does not run and the content is simply present

### Requirement: Every new direction-sensitive rule is mirrored or authored logically

Every new layout rule that depends on writing direction SHALL either have a `[dir="rtl"]` counter-rule or be
authored with logical properties so that no counter-rule is needed. Direction-sensitive means any use of a row
flex direction, a physical side property, a horizontal transform, or a float.

#### Scenario: **HARD GATE** — Every direction-sensitive rule has a mirror

- **GIVEN** the enumeration of new rules using a row direction, a physical side property, a horizontal
  transform, or a float
- **WHEN** each is checked for a `[dir="rtl"]` counter-rule or for logical-property authoring
- **THEN** each satisfies one of those two conditions

#### Scenario: **HARD GATE** — RTL mirrors breadcrumb chevron

- **GIVEN** a right-to-left text direction on the root element
- **WHEN** the breadcrumb separator chevron is rendered on a directory listing
- **THEN** the chevron points in the mirrored direction, achieved by an explicit mirror rule or by an
  equivalent logical or direction-aware declaration

#### Scenario: Physical side properties are inventoried

- **GIVEN** the change touches six stylesheets
- **WHEN** every added declaration of a left, right, margin-left, margin-right, border-left, border-right,
  padding-left, padding-right, or text-align to left or right is extracted
- **THEN** each appears in the enumeration with a mirror or a logical-property rewrite recorded against it

#### Scenario: Logical properties are preferred for new rules

- **GIVEN** a new rule that needs side-aware spacing
- **WHEN** it is authored
- **THEN** an inline-start or inline-end logical property is used rather than a physical side property, so the
  rule works in both directions without a counter-rule

#### Scenario: Existing mirrored rules still apply

- **GIVEN** roughly forty direction-mirror rules exist today across the stylesheets
- **WHEN** the restyled selectors are inspected
- **THEN** their existing mirror rules still apply, with no mirror lost or made unreachable

### Requirement: Both directions render correctly

The entire interface SHALL render correctly under a right-to-left direction, with no overlap, no clipping, no
reversed control placement, and no left-to-right artefact.

#### Scenario: The layout mirrors without overlap

- **GIVEN** a right-to-left direction
- **WHEN** every page renders
- **THEN** no element overlaps another, nothing is clipped, and no content overflows horizontally

#### Scenario: Icon-only direction is correct

- **GIVEN** elements whose position must flip, including the modal close control, the toast centring, the debug
  panel anchor, the dropdown menu anchors, and the breadcrumb separator
- **WHEN** the direction flips
- **THEN** each flips to the correct side

#### Scenario: Bidirectional text renders correctly

- **GIVEN** a file or folder name containing mixed-direction text
- **WHEN** it renders in a right-to-left page
- **THEN** it is displayed in a readable, correctly ordered form, matching the pre-change behaviour

#### Scenario: Direction switches cleanly at runtime

- **GIVEN** an active session in one direction
- **WHEN** the language is switched so the direction flips
- **THEN** the page re-renders in the new direction with no stale mirrored state and no duplication

### Requirement: All six breakpoints are preserved exactly

The existing breakpoints — a minimum-width rule at the widest value and maximum-width rules at four
successive values plus one narrow value — SHALL remain in force with unchanged values. No breakpoint value may
change, no breakpoint may be added, and no breakpoint may be removed.

#### Scenario: The breakpoint set is unchanged

- **GIVEN** the pre-change set of width conditions across the stylesheets
- **WHEN** the post-change set is extracted
- **THEN** the same conditions are present with identical values, and no additional width condition is added

#### Scenario: Every breakpoint renders

- **GIVEN** each of the six breakpoints
- **WHEN** the page is rendered at that width in both themes and both directions
- **THEN** it renders correctly with no horizontal overflow and no clipped content

#### Scenario: The content-width scaling is preserved

- **GIVEN** the page container narrows its side margins at a mid breakpoint
- **WHEN** the rule is compared before and after the change
- **THEN** it is unchanged, so the content width still scales as before

### Requirement: Breakpoint behaviours that remove functionality are preserved

Two existing breakpoint behaviours remove functionality rather than restyle it: the primary navigation tabs
are hidden below the first narrow breakpoint with **no** replacement navigation, and the Browse listing
collapses its columns and header below the second narrow breakpoint. Both SHALL be preserved, and no
replacement affordance SHALL be introduced.

#### Scenario: **HARD GATE** — Mobile navigation removal is preserved

- **GIVEN** the primary navigation tabs are hidden below the first narrow breakpoint
- **WHEN** the page is rendered at that width
- **THEN** the tabs are not displayed, and no hamburger, drawer, off-canvas, disclosure, or condensed icon
  navigation is offered in their place

#### Scenario: No alternative mobile navigation exists

- **GIVEN** D2 forbids adding a sidebar, drawer, or off-canvas
- **WHEN** the shipped files are searched for a mobile navigation toggle, its state attribute, and the related
  class names
- **THEN** no match is found

#### Scenario: The listing column collapse is preserved

- **GIVEN** the Browse listing collapses to three tracks below the second narrow breakpoint
- **WHEN** a row is rendered at that width
- **THEN** three tracks are used, the type, modified, and size cells are hidden, and the header row is hidden

#### Scenario: The mobile view toggle suppression is preserved

- **GIVEN** the view-mode toggle is suppressed at the second narrow breakpoint because a single column makes
  it meaningless
- **WHEN** the page is rendered at that width
- **THEN** the toggle is not displayed, unchanged from the pre-change behaviour

#### Scenario: The grid reflow is preserved

- **GIVEN** the resources grid, the bottom grid, and the status bar each reflow at specific breakpoints
- **WHEN** the page is rendered across the breakpoints
- **THEN** each reflows exactly as before, with its column counts and border rules intact

#### Scenario: The navbar height reduction is preserved

- **GIVEN** the navbar is shorter at the second narrow breakpoint
- **WHEN** the page is rendered at that width
- **THEN** the reduced height applies

#### Scenario: The search field's narrow behaviour is preserved

- **GIVEN** the Browse search field becomes full width and moves to its own row below the first narrow
  breakpoint
- **WHEN** the page is rendered at that width
- **THEN** it is full width and occupies its own row, and its focus-grow behaviour is suppressed

#### Scenario: Hero responsive breakpoints are preserved [HARD GATE]

- **GIVEN** the redesigned application
- **WHEN** the viewport is ≤1024px
- **THEN** the Hero stacks and centers exactly as before the redesign
- **AND** at ≤640px `.search-keys` is hidden exactly as before

#### Scenario: Hero positioning declarations are byte-identical

- **GIVEN** the Hero emblem is absolutely positioned with an offset, a vertical centring transform, and a
  fluid width, plus mid- and narrow-breakpoint overrides
- **WHEN** the diff is inspected across all phases
- **THEN** each of those declarations is byte-identical to its pre-change value, and no new Hero breakpoint is
  introduced

### Requirement: Hover-capability fallback is preserved

Controls that reveal on hover SHALL remain visible and operable on devices without hover capability, and their
visually reduced state SHALL NOT remove them from the tab order or the accessibility tree.

#### Scenario: The hoverless media query is preserved

- **GIVEN** a control whose visibility is gated on hover
- **WHEN** a device with no hover capability is emulated
- **THEN** the hoverless media query applies and the control is visible without any hover gesture

#### Scenario: **HARD GATE** — Controls stay keyboard reachable on hoverless devices

- **GIVEN** a device with no hover capability
- **WHEN** the keyboard is used to tab through a listing row
- **THEN** the row's action control is reachable and operable, and its reduced state has not removed it from the
  tab order

#### Scenario: The row hover reveal is unchanged

- **GIVEN** a pointer device
- **WHEN** the pointer enters and leaves a row
- **THEN** the row's controls reveal and conceal exactly as before

### Requirement: No new global or per-render listener is introduced

The redesign SHALL NOT add a global binding, and SHALL NOT add a document-level or window-level event listener
that is registered during rendering. Any new global listener, should one be unavoidable, SHALL be registered
once at module initialisation and SHALL NOT be re-registered per render.

#### Scenario: **HARD GATE** — No new global is added

- **GIVEN** I14 forbids new global bindings
- **WHEN** the diff over the JavaScript sources is inspected for added global assignments
- **THEN** none is found, and the pre-existing global bindings are unchanged

#### Scenario: **HARD GATE** — No new per-render global listener is added

- **GIVEN** I15 forbids per-render global listener registration
- **WHEN** the diff is inspected for added document-level or window-level listener registrations inside a
  rendering path
- **THEN** none is found

#### Scenario: Reference design shortcut handlers are not adopted

- **GIVEN** the reference design adds a document-level keyboard handler for a slash shortcut, a
  command-or-control shortcut, and an escape-to-blur behaviour
- **WHEN** the shipped JavaScript is inspected
- **THEN** none of those handlers was added, so no existing shortcut or escape behaviour is shadowed

### Requirement: No banned content ships

The banned set of trust, compliance, tier, and version claims, and any fabricated card data, SHALL NOT appear
anywhere in the shipped application.

#### Scenario: **HARD GATE** — No banned string appears in shipped files

- **GIVEN** the banned set
- **WHEN** every shipped stylesheet, script, and markup file is searched
- **THEN** no member of the banned set appears in any of them

#### Scenario: No fabricated card data appears in the rendered output

- **GIVEN** the reference design's hard-coded resource cards with fixed names, counts, and dates
- **WHEN** the rendered pages are inspected
- **THEN** none of those names, counts, or dates appears; all such content comes from the data layer

### Requirement: The protected files are untouched

No file under the server-side library directory SHALL change. The client router, the resource service, the
file-actions module, the theme module's persistence, and the autocomplete module's semantics SHALL NOT change.
The dead second page and the reference file SHALL NOT change.

#### Scenario: **HARD GATE** — The server library is byte-identical

- **GIVEN** I9 forbids any change under the server library directory
- **WHEN** the change set is scoped to that directory
- **THEN** it is empty

#### Scenario: **HARD GATE** — The protected client modules are unchanged

- **GIVEN** I10 names the router, the resource service, the file-actions action list, the theme module's
  persistence, and the autocomplete module's semantics
- **WHEN** the diff is scoped to those files
- **THEN** the router, the resource service, and the file-actions module are byte-identical, and the theme and
  autocomplete modules contain no logic change

#### Scenario: The dead page is byte-identical

- **GIVEN** the second HTML page is unreachable and out of scope
- **WHEN** the diff is scoped to it
- **THEN** it is byte-identical, including its font links, which are deliberately left untouched despite
  being blocked

#### Scenario: The reference file is byte-identical

- **GIVEN** the reference design file is read-only
- **WHEN** the diff is scoped to it
- **THEN** it is byte-identical

#### Scenario: The server contract and security headers are unchanged

- **GIVEN** the security headers, the content-security policy, and the response helpers are server concerns
- **WHEN** the diff is scoped to the server library
- **THEN** no security header, policy, or helper changed

### Requirement: The performance tier cache still round-trips

The cached performance tier SHALL continue to be written when the user selects a tier, SHALL continue to be
read on the next load, and SHALL continue to be reflected in the tier attribute and in the performance
monitor's own state.

#### Scenario: Selecting a tier persists

- **GIVEN** the user selects a tier from the performance menu
- **WHEN** the selection is made
- **THEN** the tier is cached, the attribute is updated, and the menu's indicator moves to the selected option

#### Scenario: The persisted tier is restored on the next load

- **GIVEN** a cached tier
- **WHEN** the page is loaded again
- **THEN** the same tier is applied before paint

#### Scenario: Automatic detection remains available

- **GIVEN** the automatic option is selected
- **WHEN** the selection is made
- **THEN** the tier is re-derived from the system rather than pinned to a fixed value

### Requirement: The performance monitor's surfaces survive

The performance menu, toast, and debug panel SHALL keep their open class, their positioning anchors, and their
existing tier awareness. The debug panel's shortcut SHALL keep working and SHALL keep toggling only the panel.

#### Scenario: The debug panel shortcut still toggles the panel

- **GIVEN** the panel's toggle shortcut
- **WHEN** it is pressed
- **THEN** the panel toggles and nothing else changes

#### Scenario: The monitor still observes page performance

- **GIVEN** the monitor is initialised on load
- **WHEN** page performance is observed
- **THEN** the monitor's tier assessment and reporting behave as before, with no change to its logic

### Requirement: Focus visibility survives the restyle

Every interactive element SHALL keep a visible focus indicator, and focus-driven reveals SHALL continue to
work. Suppressing focus styling is forbidden.

#### Scenario: Every interactive element shows a focus indicator

- **GIVEN** any focusable element
- **WHEN** it receives keyboard focus
- **THEN** a visible indicator is rendered, and it is not suppressed by the restyle

#### Scenario: Focus-driven reveals still work

- **GIVEN** a row whose controls reveal when focus is within it
- **WHEN** focus enters that row by keyboard
- **THEN** the controls reveal, matching the pre-change behaviour

#### Scenario: Hover styling does not remove keyboard access

- **GIVEN** a hover-oriented presentation
- **WHEN** the page is used without a pointer
- **THEN** every target remains reachable and operable by keyboard