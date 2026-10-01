# Spec Delta: file-actions

## Purpose

Defines requirements for independent per-item action controls (Open, Download, and future actions) on Browse Files rows: a dedicated File Actions module separate from the Browse Page, action applicability derived from existing item data, isolated click behavior compatible with the existing SPA router, reuse of existing ResourceService primitives, preservation of current Browse behavior, accessibility, and localized extensibility.

## ADDED Requirements

### Requirement: Dedicated File Actions module boundary

File Actions behavior (action definitions, applicability, rendering of action controls, and action-specific event handling) SHALL be implemented in a dedicated frontend module that is independent of `browse.js`. The Browse Page SHALL NOT contain the implementation details of individual actions; it SHALL only place the module's output into each file row.

#### Scenario: Action logic lives outside browse.js

- **WHEN** reviewing where action definitions, applicability rules, action markup, and action-specific event handling are implemented
- **THEN** they are found in the dedicated File Actions module, not in `assets/js/browse.js`

#### Scenario: Module is loaded and available before rendering

- **WHEN** the application loads (`index.html` script tags)
- **THEN** the File Actions module script is loaded before `browse.js` and before `router.js`, exposing a single global module (project IIFE convention)

#### Scenario: BrowsePage integrates through a single call point

- **WHEN** `renderFilesList()` constructs a file row
- **THEN** it obtains the row's actions markup from the File Actions module (one integration call) rather than constructing action markup itself

### Requirement: Independent action definitions

Each action SHALL be independently defined and independently identifiable (distinct definition with its own target and rendered control). Action controls SHALL NOT be coupled to the file-name link or to row click behavior.

#### Scenario: Open and Download are distinct definitions

- **WHEN** reviewing the action definitions in the File Actions module
- **THEN** Open and Download exist as separate, individually identifiable definitions (not branches embedded in name-link construction)

#### Scenario: Action controls are separate elements from the name link

- **WHEN** a file row is rendered
- **THEN** each action control is its own interactive element, not nested inside the file-name link and not part of the row's clickable surface

### Requirement: Action applicability derived from item data

Action applicability SHALL be derived from the existing file item data — specifically the existing `type` field (`"directory"` | `"file"`). This change SHALL NOT introduce a second file capability/permission model.

#### Scenario: Directory items expose Open only

- **WHEN** the item has `type: "directory"`
- **THEN** the rendered actions include the Open action and do not include Download

#### Scenario: File items expose Download only

- **WHEN** the item has `type: "file"`
- **THEN** the rendered actions include the Download action and do not include Open

#### Scenario: No parallel capability model

- **WHEN** reading the File Actions module
- **THEN** applicability checks read the item's existing `type` field; no separate capabilities/permissions/feature-flag structure exists for deciding available actions

### Requirement: Directory action rendering

Rows for directory items SHALL render an Open control whose target is produced by `ResourceService.browseHref(item.relPath)`.

#### Scenario: Open control with correct target

- **WHEN** a directory row is rendered
- **THEN** it contains an Open control whose `href` equals `ResourceService.browseHref(item.relPath)` for that directory

### Requirement: File action rendering

Rows for file items SHALL render a Download control whose target is produced by `ResourceService.downloadHref(item.relPath)` and which carries the existing `data-file="true"` attribute convention.

#### Scenario: Download control with correct target

- **WHEN** a file row is rendered
- **THEN** it contains a Download control whose `href` equals `ResourceService.downloadHref(item.relPath)` and which has the `data-file="true"` attribute

### Requirement: Hover and focus visibility of actions

Action controls SHALL be visible when the row is hovered or when focus is within the row, and SHALL remain visible on devices without hover. Any visually hidden state SHALL NOT remove controls from the keyboard tab order or the accessibility tree.

#### Scenario: Reveal on row hover (pointer devices)

- **WHEN** the user hovers a file row on a device with a fine pointer
- **THEN** the row's action controls become visible

#### Scenario: Reveal on keyboard focus within the row

- **WHEN** keyboard focus enters an action control (or any element) inside a row that is not hovered
- **THEN** the action controls become visible

#### Scenario: Persistently visible without hover capability

- **WHEN** the page is displayed on a device without hover (e.g. touch)
- **THEN** action controls are visible without requiring a hover gesture

#### Scenario: Hidden state does not break keyboard access

- **WHEN** action controls are in their visually reduced state
- **THEN** they remain focusable by Tab and remain in the accessibility tree (no `display: none`, `visibility: hidden`, or `tabindex` removal)

### Requirement: Actions available in both view modes

Action controls SHALL be available in both list view and grid view of the Browse page.

#### Scenario: List view placement

- **WHEN** the Browse page is in list view
- **THEN** each row shows its actions in a dedicated rightmost column without shifting the existing icon, name, type, modified, and size columns

#### Scenario: Grid view placement

- **WHEN** the Browse page is in grid (cards) view
- **THEN** each card shows its actions (stacked with the icon and name), and switching view modes preserves correct actions for each item

### Requirement: Action click isolation from name link and row

Activating an action control SHALL perform only that action's behavior. It SHALL NOT activate the file-name link, trigger unrelated row behavior, or cause additional navigation/download beyond the action's own target.

#### Scenario: Download activates exactly one download

- **WHEN** the user activates the Download control on a file row
- **THEN** one download of that file is initiated and the file-name anchor of the row is not additionally activated

#### Scenario: Open navigates exactly once

- **WHEN** the user activates the Open control on a directory row
- **THEN** navigation into that directory occurs exactly once (no duplicate navigation from the name link)

#### Scenario: Rows remain non-clickable

- **WHEN** the user clicks an action control
- **THEN** no row-level click behavior occurs — rows themselves are not clickable targets (unchanged from current behavior)

### Requirement: Event propagation is controlled

Action activation SHALL NOT propagate in a way that triggers unintended handlers (particularly the file-name link's navigation). Propagation control SHALL be explicit in design: sibling placement of actions relative to the name link, and `preventDefault`/`stopPropagation` where a handler requires it.

#### Scenario: No unintended parent-handler navigation

- **WHEN** an action control is activated and the event bubbles to document-level listeners
- **THEN** the only navigation or download that results is the one belonging to the activated action

### Requirement: Router interaction compatibility

Action controls SHALL work with the existing SPA router without modifying it: Open actions are intercepted by the router for SPA navigation; Download actions bypass router interception using the existing `data-file="true"` convention.

#### Scenario: Open performs SPA navigation

- **WHEN** the user activates an Open control
- **THEN** the router intercepts the click, updates the URL via `pushState`, and re-renders the Browse page for the new path without a full document reload

#### Scenario: Download bypasses SPA navigation

- **WHEN** the user activates a Download control
- **THEN** the router does not intercept it (due to `data-file="true"`), and the browser performs a normal download request to `/api/download/…`

### Requirement: Existing file-name link behavior preserved

The existing file-name link SHALL behave exactly as it does today: directory names perform SPA navigation into the directory; file names initiate a download. This change SHALL NOT remove, replace, or alter the name link's behavior.

#### Scenario: Directory name link unchanged

- **WHEN** the user clicks a directory's name link
- **THEN** SPA navigation into that directory occurs (identical to current behavior)

#### Scenario: File name link unchanged

- **WHEN** the user clicks a file's name link
- **THEN** the file downloads (the link retains `href` from `downloadHref()` and `data-file="true"`, identical to current behavior)

### Requirement: Existing Browse controls preserved

Local search, type filter, sorting, stats counts, and list/grid view toggles SHALL continue to function unchanged, and action controls SHALL follow their row through filtering and sorting.

#### Scenario: Filtering and sorting operate on rows with actions

- **WHEN** the user searches, filters by type, or changes sort order
- **THEN** rows (including their action controls) are filtered/sorted exactly as rows are today, and each visible item shows the actions applicable to its type

#### Scenario: View mode toggle preserves actions

- **WHEN** the user toggles between list and grid view
- **THEN** actions remain available and correct for every visible item

### Requirement: Action URLs built only via ResourceService primitives

Action targets SHALL be produced exclusively by the existing `ResourceService.browseHref()` and `ResourceService.downloadHref()`. URL strings SHALL NOT be constructed by concatenation inside the File Actions module or newly inside `browse.js`.

#### Scenario: Download href comes from the service

- **WHEN** the File Actions module renders a Download control
- **THEN** its `href` is the exact return value of `ResourceService.downloadHref(item.relPath)`

#### Scenario: Browse href comes from the service

- **WHEN** the File Actions module renders an Open control
- **THEN** its `href` is the exact return value of `ResourceService.browseHref(item.relPath)`

#### Scenario: No duplicated URL construction

- **WHEN** reading the File Actions module and the Browse row integration
- **THEN** no literal `"/api/download/"` or `"/browse/"` string assembly exists for action targets

### Requirement: Accessible names for action controls

Every action control SHALL expose a human-readable accessible name that combines the action verb with the item name, and SHALL mark decorative SVG content as hidden from assistive technology.

#### Scenario: Accessible name includes verb and item name

- **WHEN** a screen reader encounters an action control for an item named `file.iso` with the Download action
- **THEN** the accessible name is of the form "Download file.iso" (localized), not an unlabeled icon

#### Scenario: Decorative icons hidden from assistive technology

- **WHEN** an action control renders an inline SVG icon
- **THEN** the SVG is hidden from assistive technology (e.g. `aria-hidden="true"`)

### Requirement: Keyboard operability with visible focus

Action controls SHALL be reachable via Tab, operable with the keyboard (native anchor activation), and show a visible focus indicator. Hover-oriented presentation SHALL NOT make actions inaccessible to keyboard users.

#### Scenario: Tab reaches action controls

- **WHEN** the user presses Tab through a file row
- **THEN** focus reaches the row's action controls in DOM order (after the name link), and they become visible when focused

#### Scenario: Keyboard activation performs the action

- **WHEN** an action control has focus and the user presses Enter
- **THEN** the action performs its behavior (SPA navigation for Open, download for Download)

#### Scenario: Visible focus indicator

- **WHEN** an action control receives keyboard focus
- **THEN** a visible focus indicator is shown (via the existing global `:focus-visible` styling or an equivalent)

### Requirement: Localized extensibility for future actions

Adding a future action SHALL be a localized change, primarily inside the File Actions module (e.g. adding an action definition with its applicability and rendering). It SHALL NOT require rewriting BrowsePage, changing the router architecture, or duplicating resource URL logic. The module SHALL remain small and focused — no generic command/menu/action framework beyond a minimal per-action definition list.

#### Scenario: Adding a declarative future action does not touch BrowsePage

- **WHEN** a new link-based action (applicable to an existing item type) is added to the module's action definitions
- **THEN** `browse.js` requires no changes: the row already renders whatever the module returns for the item

#### Scenario: BrowsePage responsibilities remain unchanged

- **WHEN** future actions are added
- **THEN** BrowsePage continues to own only fetching, filtering, sorting, searching, view mode, and row construction — action knowledge stays in the module

#### Scenario: Minimal module surface

- **WHEN** reviewing the File Actions module's public API
- **THEN** it exposes a minimal rendering entry point consumed by BrowsePage — no generic toolbar, menu, or command-dispatch framework is introduced
