# Capability: Browse Page

## Purpose

`assets/js/browse.js` renders a directory listing into `#app` as a breadcrumb header, a control bar, and a
row container. Each row is a fixed six-child structure whose child order, child count, and grid track
definition are load-bearing: CSS addresses cells by ordinal, the header row shares the same tracks, and the
action area is emitted empty for directories precisely so that directory and file rows stay aligned. Three
independent activatable targets exist per row — an icon link, a name link, and a dedicated File Actions
control — whose hrefs and download markers are read by the SPA router. This capability restyles the row and
control chrome only, with the six-child contract treated as the hardest gate in the change.

## ADDED Requirements

### Requirement: Every file row has exactly six children in a fixed order

Every rendered row SHALL have exactly six element children in this exact order: the icon cell, the name
cell, the badge wrapper, the modified-date cell, the size cell, and the actions cell. No row may gain or lose
a child, and no child may change position. CSS addresses children three, four, and five by ordinal, and the
header row shares the same track definition as the data rows, so both the count and the order are frozen.

#### Scenario: **HARD GATE** — File row has exactly 6 children

- **GIVEN** a directory containing at least one file
- **WHEN** a row is rendered for that file and its element children are counted
- **THEN** the row has exactly six element children, with no conditional, additional, or missing child

#### Scenario: Child order is fixed

- **GIVEN** a rendered row
- **WHEN** its children are enumerated in document order
- **THEN** child one is the icon cell, child two the name cell, child three the badge wrapper, child four the
  modified-date cell, child five the size cell, and child six the actions cell

#### Scenario: The header row matches the data rows

- **GIVEN** the header row is rendered above the data rows
- **WHEN** both are compared
- **THEN** they share the same number of column tracks, so every header cell sits over its column, including
  the empty sixth header cell

#### Scenario: Ordinal selectors still address the intended cells

- **GIVEN** rules that hide or truncate children three, four, and five
- **WHEN** those rules are evaluated against a rendered row
- **THEN** the type badge, the modified date, and the size are the cells affected, and the icon, name, and
  actions cells are untouched

### Requirement: Directory rows also have six children, with an empty actions cell

A row for a directory SHALL have exactly six element children, with the sixth being an actions cell that
contains **no** activatable control. The empty actions cell is structural, not incidental: it exists so that
directory and file rows occupy the same number of grid tracks and the header stays aligned. It SHALL NOT be
removed, collapsed, or replaced.

#### Scenario: **HARD GATE** — Directory row has exactly 6 children including empty `.f-actions`

- **GIVEN** a directory containing at least one subdirectory
- **WHEN** a row is rendered for that directory and its element children are counted
- **THEN** the row has exactly six element children, and the sixth is an actions cell containing zero
  activatable controls

#### Scenario: Directory and file rows stay mutually aligned

- **GIVEN** a listing containing both a directory row and a file row
- **WHEN** the two rows are compared
- **THEN** they occupy the same column boundaries at every shared breakpoint, with no drift between them

#### Scenario: The empty actions cell is never dropped

- **GIVEN** the actions cell for a directory contributes no visible control
- **WHEN** the directory row is rendered
- **THEN** the cell is still present in the DOM, so the row's child count is invariant across item types

#### Scenario: Directory size shows a placeholder rather than a value

- **GIVEN** a directory has no meaningful byte size
- **WHEN** its size cell is rendered
- **THEN** it shows the placeholder dash rather than a formatted byte value, unchanged from the pre-change
  behaviour

#### Scenario: The badge reflects the item type

- **GIVEN** each row's third child carries a type badge
- **WHEN** a directory row and a file row are inspected
- **THEN** each carries its own type badge variant and label

### Requirement: The action track stays pinned at its declared width in both layouts

The action grid track SHALL remain a fixed width in both the desktop track definition and the narrow-viewport
collapsed track definition, and the action control itself SHALL remain that same width. These three
declarations are mutually coupled and SHALL change together or not at all. The icon cell SHALL keep its
existing size so hover and focus emphasis causes no layout shift.

#### Scenario: **HARD GATE** — Both track definitions end in the pinned action width

- **GIVEN** the desktop six-track definition and the narrow collapsed three-track definition
- **WHEN** each is inspected
- **THEN** both end in the same fixed action-track width, and that width equals the action control's declared
  width

#### Scenario: The header stays aligned when a directory row has no control

- **GIVEN** a directory row contributes no visible control to its action cell
- **WHEN** the header, the directory row, and a file row are compared
- **THEN** all three align on the same boundaries

#### Scenario: Icon emphasis causes no layout shift

- **GIVEN** hovering or focusing the icon target changes only its colour
- **WHEN** the row's geometry is measured before and after
- **THEN** no other cell moves and the row's height is unchanged

#### Scenario: The coupling is documented in place

- **GIVEN** an in-file comment records that changing the action size requires changing all three declarations
- **WHEN** the comment is inspected
- **THEN** it still describes the coupling accurately and no declaration has drifted from the others

### Requirement: Three row targets resolve independently

Each row SHALL expose three separate activatable targets: the icon target, the name target, and the dedicated
File Action. The icon and name targets SHALL resolve to the identical destination for the same item. No
target SHALL be nested inside another. Rows SHALL NOT be activatable. Activating one target SHALL NOT trigger
another, and SHALL NOT cause duplicate navigation or duplicate download.

#### Scenario: **HARD GATE** — Three row targets resolve independently

- **GIVEN** a rendered row
- **WHEN** each of the three targets is activated in turn, individually
- **THEN** each performs exactly its own behaviour once, no other target is additionally activated, and no
  row-level behaviour occurs

#### Scenario: Icon and name targets agree

- **GIVEN** a row for a single item
- **WHEN** the icon target's destination and the name target's destination are compared
- **THEN** they are identical, so either target reaches the same destination

#### Scenario: No target is nested inside another

- **GIVEN** a rendered row's markup
- **WHEN** it is inspected for activatable elements
- **THEN** no activatable element contains another activatable element, so a single activation resolves to
  exactly one target

#### Scenario: The row itself is not activatable

- **GIVEN** a click anywhere on a row that is not one of its targets
- **WHEN** the click occurs
- **THEN** no navigation or download is triggered, unchanged from the pre-change behaviour

#### Scenario: Directory navigation survives the removal of a directory action

- **GIVEN** a directory row has no dedicated action control
- **WHEN** either the name target or the icon target is activated
- **THEN** the directory is opened, so directory navigation is available through both remaining targets

### Requirement: Every file target carries the download marker

Every activatable target that leads to a file SHALL carry the download marker attribute, and no directory
target SHALL carry it. The router reads this attribute to decide whether to intercept a click, so its absence
would turn a download into a client-side route navigation. The marker SHALL NOT be replaced by an extension
allow-list.

#### Scenario: **HARD GATE** — File target carries `data-file="true"`

- **GIVEN** a rendered file row
- **WHEN** the icon target, the name target, and the action target are inspected
- **THEN** all three carry the download marker with the value `true`, and each one's destination matches what
  the data layer's download primitive returns

#### Scenario: Directory targets omit the marker

- **GIVEN** a rendered directory row
- **WHEN** its icon target and name target are inspected
- **THEN** neither carries the download marker, so the router intercepts them for client-side navigation

#### Scenario: The extension allow-list is unchanged

- **GIVEN** the router recognises a fixed set of file extensions
- **WHEN** the router source is inspected
- **THEN** that set is byte-identical to its pre-change state, and no extension was added or removed

#### Scenario: Files with unrecognised extensions still download

- **GIVEN** a file whose extension is absent from the router's allow-list
- **WHEN** its name target is activated
- **THEN** the download still occurs, because the marker bypasses the router regardless of extension

#### Scenario: The data layer remains the only URL source

- **GIVEN** every target's destination is produced by the data layer's browse and download primitives
- **WHEN** the Browse source is searched for literal download or browse path assembly
- **THEN** none is present

### Requirement: The action area's hidden state preserves keyboard access

The actions cell SHALL reveal its controls when the row is hovered or when focus is within the row, and
SHALL be permanently visible on devices without hover. Its visually reduced state SHALL be achieved with
opacity and pointer-events only. It SHALL NOT be hidden with `display: none` or `visibility: hidden`, and no
control SHALL be removed from the tab order or the accessibility tree.

#### Scenario: **HARD GATE** — The reduced state preserves tab order

- **GIVEN** a row that is neither hovered nor focused
- **WHEN** the keyboard is used to tab into the row's action control
- **THEN** the control is reachable and activatable, and its reduced visual state has not removed it from the
  accessibility tree

#### Scenario: No layout-level hiding is used

- **GIVEN** the action area's reduced state
- **WHEN** its rules are inspected
- **THEN** they set opacity and pointer-events, and set neither `display` nor `visibility`

#### Scenario: Hover reveals the controls

- **GIVEN** a pointer device
- **WHEN** the pointer enters a row
- **THEN** the row's action controls become visible and interactive

#### Scenario: Focus reveals the controls

- **GIVEN** the pointer is elsewhere
- **WHEN** focus enters any element inside a row
- **THEN** the row's action controls become visible

#### Scenario: Touch devices see the controls without hovering

- **GIVEN** a device with no hover capability
- **WHEN** the listing is displayed
- **THEN** the action controls are visible without any hover gesture and are operable by touch

### Requirement: The narrow-viewport collapse survives the restyle

At the narrow breakpoint the row SHALL still collapse from six tracks to three, children three, four, and
five SHALL still be hidden, and the header row SHALL still be hidden. The restyle SHALL change only the
surviving tracks' sizing, padding, and radius. No breakpoint value may change, and no new breakpoint may be
added.

#### Scenario: The collapse still produces three tracks

- **GIVEN** a viewport at or below the narrow breakpoint
- **WHEN** a row is inspected
- **THEN** its track definition contains three tracks, ending in the pinned action width

#### Scenario: The hidden columns stay hidden

- **GIVEN** a viewport at or below the narrow breakpoint
- **WHEN** the row's children are inspected
- **THEN** the badge, modified-date, and size cells are not rendered visibly, while the icon, name, and
  action targets remain

#### Scenario: The header is hidden at narrow widths

- **GIVEN** a viewport at or below the narrow breakpoint
- **WHEN** the header row is inspected
- **THEN** it is not displayed, so no orphaned header column appears above collapsed rows

#### Scenario: No wrap or overflow is introduced

- **GIVEN** a narrow viewport with a long file name
- **WHEN** the row renders
- **THEN** the name truncates within its track, the row does not wrap to a second implicit row, and no
  horizontal overflow appears

#### Scenario: The grid-mode variant keeps its hidden ordinals

- **GIVEN** the alternate card-style view mode is active
- **WHEN** a row is inspected
- **THEN** children three, four, and five remain hidden and the icon, name, and action targets remain present
  and correctly targeted

### Requirement: Folders continue to sort above files for every sort option

Regardless of the selected sort strategy, directories SHALL continue to be ordered above files. This is
existing verified behaviour and SHALL NOT be altered by the redesign, including in the presentation of the
sort control.

#### Scenario: Folders bubble to the top in every sort

- **GIVEN** a listing containing both types, and each available sort option
- **WHEN** each option is selected in turn
- **THEN** every directory precedes every file, for name ascending, name descending, newest, oldest, and
  largest

#### Scenario: The sort option vocabulary is unchanged

- **GIVEN** five sort strategies are offered
- **WHEN** the option value attributes are collected
- **THEN** the same five values are present, with none added or removed

#### Scenario: The type filter still narrows the listing

- **GIVEN** a type filter of all, directories only, or files only
- **WHEN** each is selected
- **THEN** the listing narrows accordingly and the displayed counts remain correct

### Requirement: Breadcrumbs keep their structure and RTL mirroring

The breadcrumb container SHALL keep its id, its home crumb, its per-segment separator, its ancestor links,
and its active leaf. The separator chevron SHALL continue to mirror its direction under a right-to-left text
direction, whether that mirroring is achieved by the existing CSS rule or by an equivalent new one.

#### Scenario: The breadcrumb reflects the current path

- **GIVEN** a nested browse path
- **WHEN** the page renders
- **THEN** a home crumb, a separator and link for each ancestor segment, and a non-link active leaf for the
  final segment are all present, in order

#### Scenario: Ancestor links navigate

- **GIVEN** a breadcrumb with ancestor segments
- **WHEN** an ancestor crumb is activated
- **THEN** the corresponding directory is opened through the data layer's browse primitive

#### Scenario: The leaf reflects the decoded segment name

- **GIVEN** a path segment containing encoded characters
- **WHEN** the breadcrumb renders
- **THEN** the leaf displays the decoded segment name, matching the pre-change behaviour

#### Scenario: **HARD GATE** — RTL mirrors breadcrumb chevron

- **GIVEN** a right-to-left text direction on the root element
- **WHEN** the breadcrumb separator is rendered
- **THEN** its chevron points in the mirrored direction rather than the left-to-right direction

### Requirement: Loading, empty, error, and locked states keep their behaviour

The Browse page SHALL continue to render skeleton rows while loading, an empty state for an empty folder and
for a search with no matches, an authentication-required state when the API reports it, an **in-page** not-found
state with no navigation, and a generic error state for other failures. In every failure case the control bar
SHALL continue to be hidden, and the state SHALL remain on the page.

#### Scenario: Skeletons render then clear

- **GIVEN** a page load in progress
- **WHEN** the listing first renders
- **THEN** skeleton rows and skeleton count placeholders are shown, and both are replaced by real content once
  the fetch settles

#### Scenario: The two empty states are distinguished

- **GIVEN** a folder with no entries, and separately a folder with entries but no search matches
- **WHEN** each is rendered
- **THEN** each shows its own message, and searching clears the row container before the empty state appears

#### Scenario: The authentication state offers a way in

- **GIVEN** the API reports that authentication is required
- **WHEN** the listing renders
- **THEN** an authentication-required state appears with an activate control, and the control's handler chain
  is unchanged from the pre-change behaviour

#### Scenario: Not found stays on the page

- **GIVEN** the API reports that the directory does not exist
- **WHEN** the listing renders
- **THEN** an in-page not-found state is shown with the requested path displayed, and no navigation or page
  load occurs

#### Scenario: The control bar is hidden on failure

- **GIVEN** any of the failure states
- **WHEN** the state renders
- **THEN** the control bar is not displayed, so filters cannot be operated against a listing that failed to load

#### Scenario: A generic failure shows the server message

- **GIVEN** an unexpected failure
- **WHEN** the listing renders
- **THEN** a generic error state appears showing the server's message, escaped for display

### Requirement: View-mode persistence is preserved

The view-mode toggle SHALL continue to switch between the row layout and the grid layout, SHALL persist the
choice, and SHALL restore it on the next render.

#### Scenario: Toggling switches the layout

- **GIVEN** the listing is rendered in one view mode
- **WHEN** the other mode's button is activated
- **THEN** the container receives or loses the grid-mode state and the active state moves to the activated
  button

#### Scenario: The choice persists and is restored

- **GIVEN** a view mode is selected
- **WHEN** the page is left and the listing is rendered again
- **THEN** the previously selected mode is restored automatically

#### Scenario: Targets remain correct in both modes

- **GIVEN** a listing rendered in either view mode
- **WHEN** a row's targets are inspected
- **THEN** the icon target, name target, and any action control remain present and correctly targeted in both
  modes

### Requirement: Browse markup edits stay within the whitelist

Any markup change in `browse.js` SHALL be limited to class names, wrapper elements, inline decorative styles,
and inline SVG artwork. The child count, the child order, the shared target-attribute computation, every id,
and every `data-*` attribute SHALL be unchanged. Each edit SHALL be documented individually.

#### Scenario: Each edit falls inside the whitelist

- **GIVEN** a documented markup edit
- **WHEN** it is classified
- **THEN** it is a class name, a wrapper element, an inline decorative style, or inline SVG artwork

#### Scenario: The shared target computation is untouched

- **GIVEN** one expression produces the destination and marker attributes shared by the icon and name targets
- **WHEN** the redesigned source is inspected
- **THEN** that single shared computation is still present and still used by both targets, so they cannot
  diverge

#### Scenario: No id or data attribute changes

- **GIVEN** the whitelist excludes ids and data attributes
- **WHEN** the diff of `browse.js` is inspected
- **THEN** no id and no `data-*` attribute was added, removed, or renamed

#### Scenario: No new capability is introduced

- **GIVEN** D2 and the out-of-scope list forbid new interaction models
- **WHEN** the redesigned Browse page is exercised
- **THEN** no pagination, no row selection, no multi-select, no lazy loading, and no infinite scroll is present

### Requirement: Browse styling gains no layout-level overflow

The listing container SHALL keep its horizontal-overflow behaviour, because it is one of only three nested
scroll containers and provides the narrow-viewport overflow protection for long file names. Neither the page
container nor the application mount SHALL gain any overflow value, because that would break the sticky
navbar.

#### Scenario: The listing container still scrolls horizontally

- **GIVEN** a listing whose content is wider than its container
- **WHEN** the container is inspected
- **THEN** it provides horizontal scrolling and clips vertically as before

#### Scenario: The page container and mount stay unclipped

- **GIVEN** the sticky navbar depends on there being no intermediate scroll container
- **WHEN** the page container and the application mount are inspected
- **THEN** neither declares any overflow value

#### Scenario: The sticky navbar still works on a Browse page

- **GIVEN** a long directory listing
- **WHEN** the page is scrolled
- **THEN** the navbar remains visible and stuck, confirming no new scroll container was introduced