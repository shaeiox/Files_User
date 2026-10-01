# Spec Delta: file-actions

## Purpose

Defines requirements for Browse Files item targets and dedicated File Action controls: the primary Browse
navigation target (item name **and** the Browse icon resolving to the same destination), a dedicated File
Actions module that owns **all** File Action logic and supplies file-only Download controls, type-derived
applicability from existing item data, click isolation across all three targets, compatibility with the
existing SPA router and ResourceService primitives, preservation of all current Browse behavior and row
layout, accessibility (including the now-interactive icon), and localized extensibility for future actions.

The primary Browse icon/name target is navigation UI owned by the Browse Page and is explicitly **not** a
File Action, notwithstanding that it renders an action-shaped icon.

> **Delta structure note.** `openspec/specs/` contains no archived capabilities (`openspec list --specs`
> reports none), so `file-actions` is still a **new** capability and every requirement below lives under
> `## ADDED Requirements`. Requirements are stated in full — never as partial edits — so the delta is
> self-contained when it is archived. Requirements superseded by the confirmed product requirements
> (notably the former "Directory action rendering") have been **replaced in place** rather than moved to
> `## REMOVED Requirements`, because they never shipped into a main spec; the supersession is recorded
> explicitly in each replacement's text and in `design.md` §0.

## Confirmed product requirements governing this delta

1. The extra right-side File Action control is removed **only** for directories/folders. File-side action
   controls remain available for files.
2. The existing Browse icon displayed next to the item name becomes clickable and activates the **same
   target/action** as that item's existing name link. It is an actual interactive target, not decorative.
3. Existing name-link behavior is preserved: the name stays clickable, its target/navigation behavior is
   unchanged, and the icon is an *additional* target for the same destination — it does not replace the
   name link.

---

## ADDED Requirements

### Requirement: Primary Browse icon is an additional navigation target

Each Browse item SHALL expose its Browse icon (the per-type file/folder icon rendered next to the item
name) as an interactive target that resolves to the **same destination/action** as that item's existing
name link. The icon SHALL NOT be decorative-only, and SHALL NOT be implemented as an inert visual element
that merely resembles a control. The name link SHALL remain present and independently activatable; the
icon is an additional target, not a replacement for the name link.

#### Scenario: Icon resolves to the same target as the name link

- **WHEN** the Browse icon of an item is inspected or activated
- **THEN** its target is identical to the target of that item's name link (directory → the same browse
  target; file → the same download target, including the download marker attribute)

#### Scenario: Icon on a directory item navigates

- **WHEN** the user activates the Browse icon of a directory item
- **THEN** the user is taken into that directory, exactly as activating the directory's name link does

#### Scenario: Icon on a file item downloads

- **WHEN** the user activates the Browse icon of a file item
- **THEN** that file is downloaded, exactly as activating the file's name link does

#### Scenario: Icon is interactive, not decorative

- **WHEN** a row is rendered
- **THEN** the Browse icon is exposed as an interactive control (participating in the tab order and
  activatable by pointer and keyboard), and is not marked or authored as decorative-only

#### Scenario: Name link remains an independent target

- **WHEN** the user activates the item's name link
- **THEN** the name link performs its own behavior, whether or not the icon target exists

#### Scenario: No duplicate navigation from the two targets

- **WHEN** either the icon target or the name target is activated
- **THEN** the resulting navigation or download occurs exactly once — the other target of the same item
  is not additionally activated as a consequence

#### Scenario: Targets are not nested inside one another

- **WHEN** a row's interactive targets are inspected
- **THEN** no interactive target is nested inside another interactive target (no interactive element
  inside the name link, and none inside the icon target), so a single activation resolves to exactly one
  target

### Requirement: Directory items expose no dedicated File Action

Rows for directory items SHALL NOT render any control in the dedicated File Actions area. Directory
navigation SHALL remain fully available through the item's existing name link and through the primary
Browse icon, which resolve to the same target. Removing the directory File Action SHALL NOT remove,
disable, or alter directory navigation. File-side actions are unaffected by this requirement.

#### Scenario: Directory row has no File Action control

- **WHEN** a row for a directory item is rendered
- **THEN** no action control (no link, button, or other activatable element) is present in that row's
  File Actions area

#### Scenario: Directory name link still navigates

- **WHEN** the user activates a directory row's name link
- **THEN** the user is taken into that directory (unchanged from current behavior)

#### Scenario: Directory icon is the equivalent alternative

- **WHEN** the user activates a directory row's Browse icon instead
- **THEN** the same directory is opened, providing a second way to enter the directory now that the
  directory File Action no longer exists

#### Scenario: File rows are unaffected

- **WHEN** a row for a file item is rendered
- **THEN** its File Action is still present and unchanged

### Requirement: File action rendering

Rows for file items SHALL render a Download control whose target is produced by
`ResourceService.downloadHref(item.relPath)` and which carries the existing `data-file="true"` attribute
convention. This behavior is preserved unchanged by the removal of the directory File Action.

#### Scenario: Download control with correct target

- **WHEN** a file row is rendered
- **THEN** it contains a Download control whose `href` equals `ResourceService.downloadHref(item.relPath)`
  and which has the `data-file="true"` attribute

#### Scenario: Download control survives directory-action removal

- **WHEN** a file row is rendered after directories no longer receive a File Action
- **THEN** the Download control is still rendered for file items and its target, attributes, and
  behavior are identical to before

### Requirement: Dedicated File Actions module boundary

File Actions behavior (the definition of the dedicated per-item File Action controls, their applicability,
their rendering, and any action-specific event handling) SHALL be implemented in a dedicated frontend
module that is independent of `browse.js`. The Browse Page SHALL NOT contain the implementation details of
individual File Actions; it SHALL only place the module's output into each file row. The primary Browse
navigation target (name + icon) is BrowsePage-owned and SHALL NOT be moved into, or reimplemented by, the
File Actions module.

#### Scenario: Action logic lives outside browse.js

- **WHEN** reviewing where File Action definitions, applicability rules, action markup, and
  action-specific event handling are implemented
- **THEN** they are found in the dedicated File Actions module, not in `assets/js/browse.js`

#### Scenario: Module is loaded and available before rendering

- **WHEN** the application loads (`index.html` script tags)
- **THEN** the File Actions module script is loaded before `browse.js` and before `router.js`, exposing a
  single global module (project IIFE convention)

#### Scenario: BrowsePage integrates through a single call point

- **WHEN** `renderFilesList()` constructs a file row
- **THEN** it obtains the row's File Actions output from the File Actions module (one integration call)
  rather than constructing File Action markup itself

#### Scenario: Primary target stays BrowsePage-owned

- **WHEN** reviewing where the Browse icon target and the name link are produced
- **THEN** both are produced by the Browse Page, and the File Actions module neither renders nor defines
  them

### Requirement: Complete File Action ownership

Every concern that is specific to a dedicated File Action SHALL be implemented inside the File Actions
module. The complete set of module-owned concerns is: action definitions; action-specific helper
functions; action-specific label generation; action-specific target/URL creation (invoked through
`ResourceService`, never reimplemented); action-specific icon/SVG generation; action applicability;
action rendering; action-specific element attributes; and action-specific accessibility attributes.

Two categories are explicitly **excluded** from that ownership and SHALL NOT be moved into the module:

1. **The primary Browse navigation target** — the Browse icon target and the item name link — including the
   icon's accessible-name verb selection and its artwork. This is BrowsePage-owned navigation UI that may
   visually resemble an action icon.
2. **Shared, general-purpose helpers** that are not specific to any action. A helper shared with
   BrowsePage's own non-action markup SHALL remain where it is; the File Actions module keeping its own
   private copy of such a helper is acceptable and SHALL NOT be treated as a split-ownership defect.

The resulting invariant is verifiable by inspection: no File Action definition, action-specific label,
action-specific URL construction, action-specific SVG, action-specific attribute, or action-specific
event behavior SHALL exist outside the File Actions module.

#### Scenario: Action-specific labels are produced inside the module

- **WHEN** reviewing where a dedicated File Action's visible text and accessible name are composed
- **THEN** they are produced inside the File Actions module, using the dictionary passed into it, and no
  equivalent per-action label expression is duplicated in the Browse Page

#### Scenario: Action-specific URLs are produced inside the module

- **WHEN** reviewing where a dedicated File Action's `href` is created
- **THEN** it is created inside the File Actions module by calling `ResourceService`, and the same URL is not
  independently re-assembled by the Browse Page for that action

#### Scenario: Action-specific icons are produced inside the module

- **WHEN** reviewing where a dedicated File Action's inline SVG artwork is defined
- **THEN** it is defined inside the File Actions module, and no second copy of an action's SVG exists in the
  Browse Page

#### Scenario: Action applicability is not duplicated

- **WHEN** reviewing where per-item-type action applicability is decided
- **THEN** it is decided only inside the File Actions module, and the Browse Page does not re-test item type
  in order to choose which actions to request

#### Scenario: Primary icon label remains BrowsePage-owned

- **WHEN** reviewing where the Browse icon target's accessible name is composed
- **THEN** it is composed by the Browse Page from the existing `btnOpen` / `btnDownload` keys, and is not
  sourced from the File Actions module

#### Scenario: Shared general-purpose helpers are not relocated for ownership reasons

- **WHEN** a general-purpose helper (for example an HTML-escaping utility) is defined both in the Browse
  Page and privately inside the File Actions module
- **THEN** both definitions are acceptable and neither module is required to import the other's copy, and
  consolidating them into a new shared utility is out of scope

#### Scenario: No action markup originates outside the module

- **WHEN** searching the frontend source for action-control markup, attributes, or styles hooks
- **THEN** every dedicated File Action control is emitted solely by the File Actions module

### Requirement: Independent action definitions

Each dedicated File Action SHALL be independently defined and independently identifiable (a distinct
definition with its own target and rendered control). File Action controls SHALL NOT be coupled to the
item's name link, to the primary Browse icon target, or to row click behavior. The primary Browse icon
target SHALL NOT be modelled as a File Action definition.

#### Scenario: File actions are distinct definitions

- **WHEN** reviewing the File Action definitions in the File Actions module
- **THEN** each dedicated File Action exists as a separate, individually identifiable definition (not
  branches embedded in name-link or icon construction)

#### Scenario: Primary icon is not a File Action definition

- **WHEN** reviewing the File Actions module's definitions
- **THEN** no definition exists for the primary Browse icon target; directory navigation is not
  expressed as a File Action

#### Scenario: File Action controls are separate elements

- **WHEN** a file row is rendered
- **THEN** the File Action control is its own interactive element, not nested inside the name link, not
  nested inside the icon target, and not part of the row's clickable surface

### Requirement: Action applicability derived from item data

File Action applicability SHALL be derived from the existing file item data — specifically the existing
`type` field (`"directory"` | `"file"`). The primary icon target's URL SHALL be selected using the same
type-derived rule the name link already uses. This change SHALL NOT introduce a second file
capability/permission model.

#### Scenario: Directory items expose no File Action

- **WHEN** the item has `type: "directory"`
- **THEN** the rendered File Actions area contains no control, while the item's name link and Browse icon
  both remain available as navigation targets

#### Scenario: File items expose Download only

- **WHEN** the item has `type: "file"`
- **THEN** the rendered File Actions area includes the Download action and nothing else

#### Scenario: Icon target follows the same type-derived rule as the name link

- **WHEN** the target for the Browse icon of an item is resolved
- **THEN** the same type-derived choice the name link uses is applied (directory → browse target, file →
  download target), so the two targets can never diverge

#### Scenario: No parallel capability model

- **WHEN** reading the File Actions module and the Browse row construction
- **THEN** applicability checks read the item's existing `type` field; no separate
  capabilities/permissions/feature-flag structure exists for deciding available targets or actions

### Requirement: Hover and focus visibility of actions

Dedicated File Action controls SHALL be visible when the row is hovered or when focus is within the row,
and SHALL remain visible on devices without hover. Any visually hidden state SHALL NOT remove controls
from the keyboard tab order or the accessibility tree. The primary Browse icon target is part of the row's
always-visible identity and SHALL NOT be subject to hover- or focus-gated visibility.

#### Scenario: Reveal on row hover (pointer devices)

- **WHEN** the user hovers a file row on a device with a fine pointer
- **THEN** the row's File Action controls become visible

#### Scenario: Reveal on keyboard focus within the row

- **WHEN** keyboard focus enters a File Action control (or any element) inside a row that is not hovered
- **THEN** the File Action controls become visible

#### Scenario: Persistently visible without hover capability

- **WHEN** the page is displayed on a device without hover (e.g. touch)
- **THEN** File Action controls are visible without requiring a hover gesture

#### Scenario: Hidden state does not break keyboard access

- **WHEN** File Action controls are in their visually reduced state
- **THEN** they remain focusable by Tab and remain in the accessibility tree (no `display: none`,
  `visibility: hidden`, or `tabindex` removal)

#### Scenario: Browse icon is always visible

- **WHEN** a row is rendered and the pointer is not over it and nothing in the row is focused
- **THEN** the Browse icon and its target remain visible and not visually reduced

### Requirement: Targets available in both view modes

The primary Browse icon target and the dedicated File Action controls SHALL be available and operable in
both list view and grid view of the Browse page. Directory rows SHALL have no File Action in either view
mode, and their navigation SHALL remain available through the name link and the Browse icon in both
modes.

#### Scenario: List view placement

- **WHEN** the Browse page is in list view
- **THEN** each row shows the Browse icon in its existing position, the name, the existing type/modified/
  size columns, and — for file items only — the File Action in a dedicated rightmost column

#### Scenario: Grid view placement

- **WHEN** the Browse page is in grid (cards) view
- **THEN** each card shows the Browse icon, the name, and — for file items only — the File Action stacked
  with them, and switching view modes preserves correct targets for each item

#### Scenario: Directory rows navigate in both modes

- **WHEN** the user is in either view mode and activates a directory row's Browse icon or name
- **THEN** the directory is opened, and no File Action is expected or required in that row

#### Scenario: View mode toggle preserves targets

- **WHEN** the user toggles between list and grid view
- **THEN** the primary icon target and any File Action remain available and correct for every visible item

### Requirement: Row layout compatibility with the existing column structure

Making the Browse icon interactive and removing the directory File Action SHALL NOT disturb the existing
Browse row structure. Each row SHALL continue to present its existing cells in their existing order and
quantity semantics — icon, name, type, modified, size, and (for file items) File Actions — so that the
existing per-column behavior continues to apply to the correct columns. Neither change SHALL remove or hide
the icon cell or the name cell, SHALL NOT shift the type/modified/size columns out of their positions, and
SHALL NOT introduce wrapping, overflow, or horizontal misalignment in list view, grid view, or narrow
viewports.

#### Scenario: Icon cell survives becoming interactive

- **WHEN** the Browse icon is made interactive
- **THEN** the row still exposes exactly one icon cell in its original position, and the icon renders at
  the same size, alignment, and styling context as before

#### Scenario: Existing column rules still address the correct columns

- **WHEN** the row is rendered with the interactive icon and, for directories, without a File Action
- **THEN** the type, modified, and size columns retain their existing alignment, truncation, and
  visibility behavior in list view, grid view, and narrow viewports

#### Scenario: Header and rows stay aligned

- **WHEN** the table header row and a data row are compared
- **THEN** they continue to share the same number of column tracks so headers stay aligned over their
  columns, including when a directory row has no File Action

#### Scenario: No wrap or overflow in narrow viewports

- **WHEN** the viewport is narrow enough that the type/modified/size columns are hidden
- **THEN** the icon, the name, and any file File Action remain on the row without wrapping to a second
  implicit row and without horizontal overflow

#### Scenario: No layout shift from revealing the icon target

- **WHEN** the icon target is hovered or focused
- **THEN** revealing or emphasizing it does not move any other row content

### Requirement: Click isolation across icon, name, and File Action

Activating any one of a row's three targets — the Browse icon, the name link, or the File Action — SHALL
perform only that target's behavior. It SHALL NOT additionally activate either of the other targets,
SHALL NOT cause duplicate navigation or duplicate downloads, and SHALL NOT trigger row-level behavior.

#### Scenario: Activating the name navigates once

- **WHEN** the user activates an item's name link
- **THEN** the item's behavior occurs exactly once and the Browse icon target and File Action are not
  additionally activated

#### Scenario: Activating the icon navigates once

- **WHEN** the user activates an item's Browse icon
- **THEN** the item's behavior occurs exactly once and the name link and File Action are not additionally
  activated

#### Scenario: File Action performs only its own action

- **WHEN** the user activates a file row's File Action
- **THEN** exactly one download of that file is initiated and neither the name link nor the Browse icon
  target is additionally activated

#### Scenario: Rows remain non-clickable

- **WHEN** the user clicks anywhere on a row that is not one of its targets
- **THEN** no row-level click behavior occurs — rows themselves are not clickable targets (unchanged from
  current behavior)

#### Scenario: Background of a target does not trigger navigation

- **WHEN** the user activates a target
- **THEN** only the specific target that was activated performs its behavior

### Requirement: Event isolation is achieved structurally, not by speculative cancellation

Interaction isolation SHALL be achieved through element structure and the existing router contract.
Requirements in this capability are stated as observable outcomes; the implementation SHALL NOT be required
to call `stopPropagation()` or `preventDefault()` unless a concrete conflicting handler is demonstrated in
the Browse row. Where a click reaches a document-level listener, the only navigation or download that
results SHALL be the one belonging to the target that was activated.

#### Scenario: No unintended parent-handler navigation

- **WHEN** a row target is activated and the event bubbles to document-level listeners
- **THEN** the only navigation or download that results is the one belonging to the activated target

#### Scenario: No structural cause of double activation

- **WHEN** reviewing the row markup for the icon target, the name link, and the File Action
- **THEN** no target is nested inside another target and no element carries both an activation behavior of
  its own and a nested activatable target, so double activation is structurally impossible

#### Scenario: Cancellation is only added against demonstrated need

- **WHEN** reviewing the implementation for event-cancellation calls
- **THEN** any `preventDefault()`/`stopPropagation()` beyond the existing router's own handling is
  accompanied by a demonstrated conflicting handler, and is not present as defensive noise

### Requirement: Router interaction compatibility

All row targets SHALL work with the existing SPA router without modifying it. Directory targets
(icon and name) are intercepted by the router for SPA navigation. File targets (icon and name) SHALL
carry the existing `data-file="true"` convention so the router skips them and the browser performs the
download. The download marker SHALL NOT be omitted from any file target, including newly created ones.

#### Scenario: Directory targets perform SPA navigation

- **WHEN** the user activates a directory's icon target or name link
- **THEN** the router intercepts the click, updates the URL via `pushState`, and re-renders the Browse
  page for the new path without a full document reload

#### Scenario: File icon target bypasses SPA navigation

- **WHEN** the user activates a file row's Browse icon target
- **THEN** the router does not intercept it and the browser performs a normal download request to
  `/api/download/…`, exactly as for the file's name link

#### Scenario: Download marker is required on every file target

- **WHEN** a file target is created (name link or Browse icon)
- **THEN** it carries the `data-file="true"` attribute, so filenames whose extension is not covered by any
  recognition rule still download instead of being treated as an in-app route

#### Scenario: Router source is not modified

- **WHEN** reviewing the change's footprint
- **THEN** the SPA router is unmodified; compatibility is achieved through the target elements' own
  attributes

### Requirement: Existing file-name link behavior preserved

The existing file-name link SHALL behave exactly as it does today: directory names perform SPA navigation
into the directory; file names initiate a download. This change SHALL NOT remove, replace, re-target, or
alter the name link's behavior or its accessibility semantics. The Browse icon target SHALL resolve to the
same destination as the name link, either target SHALL be activatable on its own, and activating one SHALL
NOT cause the other to perform a second navigation.

#### Scenario: Directory name link unchanged

- **WHEN** the user activates a directory's name link
- **THEN** SPA navigation into that directory occurs (identical to current behavior)

#### Scenario: File name link unchanged

- **WHEN** the user activates a file's name link
- **THEN** the file downloads (the link retains its service-derived `href` and the `data-file="true"`
  attribute, identical to current behavior)

#### Scenario: Name link target and icon target agree

- **WHEN** the name link's target and the Browse icon's target for the same item are compared
- **THEN** they are identical, so either one reaches the same destination

#### Scenario: Each target activates independently

- **WHEN** the user activates the icon target and, separately, the name link
- **THEN** each activation produces the item's behavior once, and neither activation causes the other
  target to also fire

#### Scenario: Name link semantics preserved

- **WHEN** a screen reader or keyboard user encounters the name link
- **THEN** it exposes the same role, accessible name, and activation behavior as before this change

### Requirement: Existing Browse controls preserved

Local search, type filter, sorting, stats counts, and list/grid view toggles SHALL continue to function
unchanged, and each row's targets SHALL follow their row through filtering and sorting.

#### Scenario: Filtering and sorting operate on rows with targets

- **WHEN** the user searches, filters by type, or changes sort order
- **THEN** rows (including the icon target and any File Action) are filtered/sorted exactly as rows are
  today, and each visible item shows the targets applicable to its type

#### Scenario: Non-row Browse states unchanged

- **WHEN** the page shows loading, empty, unauthorized, or not-found states
- **THEN** those states render and behave exactly as before

### Requirement: Item target URLs built only via ResourceService primitives

Every target produced for a Browse item — the name link, the Browse icon, and any File Action — SHALL take
its URL exclusively from the existing `ResourceService.browseHref()` and `ResourceService.downloadHref()`
primitives. URL strings SHALL NOT be constructed by concatenation for these targets inside the File
Actions module, inside the Browse Page row construction, or anywhere else added by this change.

#### Scenario: Download href comes from the service

- **WHEN** any file target is produced (name link, Browse icon, or File Action)
- **THEN** its `href` is the exact return value of `ResourceService.downloadHref(item.relPath)`

#### Scenario: Browse href comes from the service

- **WHEN** any directory target is produced (name link or Browse icon)
- **THEN** its `href` is the exact return value of `ResourceService.browseHref(item.relPath)`

#### Scenario: No duplicated URL construction

- **WHEN** reading the File Actions module and the Browse row construction
- **THEN** no literal `"/api/download/"` or `"/browse/"` string assembly exists for item targets, and no
  new URL-building method is added to `ResourceService`

### Requirement: Accessible names for item targets

Every interactive target in a Browse row SHALL expose a human-readable accessible name. The Browse icon
target's accessible name SHALL be distinguishable from the item's name link (for example, by combining an
action verb with the item name) so that two links to the same destination are not announced identically.
The item name link SHALL retain its existing accessible name. Decorative SVG content inside any target
SHALL be hidden from assistive technology, and the now-interactive Browse icon SHALL NOT be left with
decorative-only semantics.

#### Scenario: Icon target has an accessible name

- **WHEN** a screen reader encounters the Browse icon target of an item named `el9`
- **THEN** the target has a non-empty accessible name that identifies the action and the item (localized),
  not an unlabeled icon

#### Scenario: Icon target is distinguishable from the name link

- **WHEN** a screen reader lists the links of a row
- **THEN** the icon target and the name link are announced differently, so the user can tell them apart
  even though they lead to the same destination

#### Scenario: File Action accessible name includes verb and item name

- **WHEN** a screen reader encounters the File Action control for an item named `file.iso`
- **THEN** the accessible name is of the form "Download file.iso" (localized), not an unlabeled icon

#### Scenario: Name link accessible name unchanged

- **WHEN** a screen reader encounters the item's name link
- **THEN** its accessible name is the same as before this change

#### Scenario: Decorative icons hidden from assistive technology

- **WHEN** a target renders an inline SVG icon
- **THEN** the SVG is hidden from assistive technology (e.g. `aria-hidden="true"`), so the target's
  accessible name comes from its own naming and the icon artwork is not announced

### Requirement: Keyboard operability with visible focus

Every interactive target in a Browse row SHALL be reachable via Tab, operable with the keyboard, and show a
visible focus indicator. Each target SHALL appear in the tab order exactly once, in an order consistent
with the row's visual order, and the structure SHALL NOT introduce a redundant extra stop (for example, a
wrapper that is itself activatable around an activatable target). Hover-oriented presentation SHALL NOT
make any target inaccessible to keyboard users.

#### Scenario: Tab reaches the icon target

- **WHEN** the user presses Tab into a row
- **THEN** focus reaches the Browse icon target and the name link (and, for file items, the File Action) in
  DOM order, matching the row's visual order

#### Scenario: Keyboard activation performs the target's behavior

- **WHEN** the Browse icon target has focus and the user presses the activation key
- **THEN** the item's behavior occurs (SPA navigation for directories, download for files)

#### Scenario: Visible focus indicator on every target

- **WHEN** any target — Browse icon, name link, or File Action — receives keyboard focus
- **THEN** a visible focus indicator is shown (via the existing global focus-visible styling or an
  equivalent), and it is not suppressed for the icon target

#### Scenario: No redundant tab stop

- **WHEN** counting the stops within a row
- **THEN** each target contributes exactly one stop; no additional activatable wrapper or duplicate
  control is added around an existing target

### Requirement: Localized extensibility for future actions

Adding a future dedicated File Action SHALL be a localized change, primarily inside the File Actions
module (adding an action definition with its applicability and rendering). It SHALL NOT require rewriting
BrowsePage, changing the router architecture, or duplicating resource URL logic. Reintroducing a
directory-scoped File Action later SHALL be possible through the same mechanism. The module SHALL remain
small and focused — no generic command/menu/action framework beyond a minimal per-action definition list,
and no new generic action abstraction SHALL be introduced to serve the primary Browse icon target, which
the Browse Page owns directly.

#### Scenario: Adding a declarative future action does not touch BrowsePage

- **WHEN** a new link-based File Action (applicable to an existing item type) is added to the module's
  action definitions
- **THEN** `browse.js` requires no changes: the row already renders whatever the module returns for the
  item, including for directories

#### Scenario: Directory-scoped actions remain re-addable

- **WHEN** a directory-scoped File Action is later desired again
- **THEN** it is reintroduced as a module definition with its own applicability rule, with no change to
  BrowsePage, the router, or the primary icon/name targets

#### Scenario: BrowsePage responsibilities remain unchanged

- **WHEN** future actions are added
- **THEN** BrowsePage continues to own only fetching, filtering, sorting, searching, view mode, and row
  construction (including the primary icon and name targets) — dedicated File Action knowledge stays in
  the module

#### Scenario: Minimal module surface

- **WHEN** reviewing the File Actions module's public API
- **THEN** it exposes a minimal rendering entry point consumed by BrowsePage — no generic toolbar, menu,
  or command-dispatch framework is introduced
