## ADDED Requirements

### Requirement: The Browse page shows a persistent folder tree of the portal root

The Browse page SHALL render a tree pane listing the portal root's folders and files, folders first,
each sorted by name. The tree SHALL be the navigation surface for the page: activating a folder node
SHALL navigate the centre pane to that folder's `/browse/<path>` URL, and activating a file node SHALL
navigate to its parent folder and select that file so the inspector opens on it. Hidden entries SHALL
be excluded by the same rule the file table uses.

#### Scenario: The page opens at the root

- **GIVEN** a user opens `/browse/`
- **WHEN** the page renders
- **THEN** the tree pane lists every visible root entry, folders before files
- **AND** no folder is expanded

#### Scenario: A folder node is activated

- **GIVEN** the tree shows a collapsed folder `release`
- **WHEN** the user clicks its label
- **THEN** the URL becomes `/browse/release/` through the SPA router
- **AND** the centre pane lists the contents of `release`
- **AND** the `release` node expands and is marked as the current folder

#### Scenario: A file node is activated

- **GIVEN** the tree shows a file `release/v4.4/setup.iso`
- **WHEN** the user activates it
- **THEN** the centre pane shows `release/v4.4/`
- **AND** `setup.iso` is selected and the inspector opens on it

### Requirement: Tree children load lazily, once, through the existing listing endpoint

The tree SHALL fetch a folder's children only when it is first expanded or becomes current, via
`ResourceService.listFiles(<relPath>)`, and SHALL cache them for the life of the page. It SHALL show
inline loading and retry rows, SHALL never scan recursively, and the page's refresh action SHALL
invalidate the current folder and its ancestors.

#### Scenario: A folder is expanded for the first time

- **GIVEN** the folder `tmp` has never been expanded
- **WHEN** the user expands it
- **THEN** exactly one request is made for `tmp`
- **AND** a loading row is shown until it resolves
- **AND** the children appear in place of the loading row

#### Scenario: A folder is collapsed and expanded again

- **GIVEN** `tmp` has been expanded once
- **WHEN** the user collapses and re-expands it
- **THEN** no new request is made
- **AND** the cached children are shown

#### Scenario: Loading a folder fails

- **GIVEN** the server returns an error for `AutoLogger`
- **WHEN** the user expands it
- **THEN** an inline "Couldn't load — retry" row appears under it
- **AND** every other node stays usable
- **AND** activating retry repeats the single request

#### Scenario: The user deep-links into a nested folder

- **GIVEN** a user opens `/browse/release/v4.4/` directly
- **WHEN** the page renders
- **THEN** the tree loads only the root, `release`, and `release/v4.4`
- **AND** those ancestors are expanded and `v4.4` is marked current and scrolled into view

### Requirement: Tree nodes honour admin file policies

The tree SHALL display locked and view-only entries exactly as the file table does: a locked folder
SHALL be shown with its lock badge, SHALL NOT be expandable while the visitor is signed out, and
activating it SHALL open the existing sign-in modal; after a successful sign-in the tree SHALL reload
the affected folder. Entries filtered out by the server SHALL NOT appear.

#### Scenario: A signed-out visitor activates a locked folder

- **GIVEN** a signed-out visitor and a locked root folder `release`
- **WHEN** they activate its tree node
- **THEN** the sign-in modal opens
- **AND** no listing request is made for `release`

#### Scenario: The visitor signs in from the tree

- **GIVEN** the sign-in modal was opened from a locked tree node
- **WHEN** sign-in succeeds
- **THEN** the node's lock badge is removed and it expands with its children loaded

### Requirement: The tree stays mounted across folder navigation

Navigating between two `/browse` URLs, by the tree, the table, the breadcrumb, or browser back and
forward, SHALL keep the tree pane mounted. Its expanded nodes, cached children, scroll offset and
keyboard focus SHALL be preserved, and only the centre pane and inspector SHALL re-render. The
current-folder marker SHALL move to the new folder, expanding its ancestors if needed. Leaving the
`/browse` route and returning MAY rebuild the tree but SHALL restore the expanded set from memory.

#### Scenario: The user opens a sub-folder from the table

- **GIVEN** the tree has `release` and `tmp` expanded and is scrolled down
- **WHEN** the user double-clicks the sub-folder `tmp/logs` in the centre table
- **THEN** the tree keeps both folders expanded and its scroll offset unchanged
- **AND** `tmp/logs` becomes the current node

#### Scenario: The user presses browser Back

- **GIVEN** the user navigated from `/browse/release/` to `/browse/tmp/`
- **WHEN** they press Back
- **THEN** the centre pane shows `release`
- **AND** the tree is not rebuilt and the current marker returns to `release`

### Requirement: The tree implements the WAI-ARIA tree keyboard model

The tree SHALL be exposed as `role="tree"` with `treeitem` nodes carrying `aria-expanded`,
`aria-level`, `aria-setsize`, `aria-posinset`, and `aria-current="page"` on the current folder, with one
roving tab stop. It SHALL support the WAI-ARIA tree keys (arrows, `Home`/`End`, `Enter`, type-ahead),
with `ArrowRight`/`ArrowLeft` swapped in right-to-left layout.

#### Scenario: Keyboard expansion

- **GIVEN** focus is on a collapsed folder node in a left-to-right layout
- **WHEN** the user presses `ArrowRight`
- **THEN** the folder expands and focus stays on it
- **AND** a second `ArrowRight` moves focus to its first child

#### Scenario: Type-ahead

- **GIVEN** the tree has focus and visible nodes `AutoLogger`, `AV_block_remover`, `release`
- **WHEN** the user types `r`
- **THEN** focus moves to `release`

### Requirement: Panes are resizable by pointer, touch and keyboard

On wide viewports a focusable `role="separator"` handle SHALL resize the tree pane live by pointer or
touch drag, by arrow keys (16px, 64px with `Shift`), and reset on double-click or `Enter`. The tree SHALL
be clamped to 200px–40% of the browse body and the centre pane SHALL stay at least 480px wide; an open
inspector SHALL get a second handle clamped to 300–520px. Dragging SHALL NOT select text or click rows.

#### Scenario: The pointer leaves the handle mid-drag

- **GIVEN** the user is dragging the tree handle
- **WHEN** the pointer moves over the table and is released there
- **THEN** the resize continues to follow the pointer until release
- **AND** no row is clicked and no text is selected

#### Scenario: The user drags the tree boundary

- **GIVEN** a wide viewport with the tree at its default width
- **WHEN** the user drags the handle 120px toward the centre
- **THEN** the tree widens by 120px as the pointer moves
- **AND** the centre table reflows to the remaining width without horizontal scroll

#### Scenario: The drag exceeds a limit

- **GIVEN** the tree is near its maximum width
- **WHEN** the user keeps dragging toward the centre
- **THEN** the tree stops at the maximum
- **AND** the centre pane is never narrower than 480px

#### Scenario: Keyboard resize

- **GIVEN** the resize handle has focus
- **WHEN** the user presses `Shift`+`ArrowRight` in a left-to-right layout
- **THEN** the tree widens by 64px and `aria-valuenow` reports the new width

#### Scenario: Reset

- **GIVEN** the tree has been resized
- **WHEN** the user double-clicks the handle
- **THEN** the tree animates back to its default width

### Requirement: Pane sizes and collapsed state persist per browser

The tree width, inspector width and tree collapsed state SHALL be saved to browser storage when a
resize or toggle ends and SHALL be restored on the next visit. A stored value outside the current
clamps SHALL be clamped on restore. If storage is unavailable or throws, the page SHALL use defaults
and SHALL NOT error.

#### Scenario: Widths survive a reload

- **GIVEN** the user widened the tree to 360px
- **WHEN** they reload `/browse/`
- **THEN** the tree renders at 360px with no visible jump from the default

#### Scenario: Storage is blocked

- **GIVEN** a private window where storage access throws
- **WHEN** the Browse page loads and the user resizes the tree
- **THEN** the page renders with default widths and resizing still works for the session

### Requirement: Home embeds the explorer in place of resource cards

The home page SHALL render the explorer (tree and centre panes) below its hero instead of resource
cards. Folder navigation inside it SHALL stay on `/`. A Full screen control SHALL open the current
folder's `/browse` URL with a shared-element transition that moves the explorer up into place, and the
Browse page SHALL offer Exit full screen back to `/`, which reopens the embed at the same folder.

#### Scenario: Browsing on the home page

- **GIVEN** a visitor on `/`
- **WHEN** they open a folder from the embedded tree or table
- **THEN** the URL stays `/`, the hero stays, and the centre pane lists that folder

#### Scenario: Going full screen and back

- **GIVEN** the embed shows `tmp`
- **WHEN** the visitor activates Full screen
- **THEN** the explorer animates up into `/browse/tmp/`
- **AND** Exit full screen returns to `/` with the embed still on `tmp`

### Requirement: The tree pane collapses to a rail and becomes a drawer on narrow viewports

On wide viewports a collapse control SHALL shrink the tree pane to a slim rail that keeps an expand
control and the current folder's icon; the centre pane SHALL take the freed width. Below the tablet
breakpoint the tree SHALL NOT occupy layout width: it SHALL open as an off-canvas drawer from a
"Folders" button in the context header, SHALL trap focus while open, SHALL close on `Escape`, on
scrim tap, and after a folder is activated, and SHALL return focus to the button that opened it.

#### Scenario: Collapsing on desktop

- **GIVEN** a wide viewport with the tree visible
- **WHEN** the user activates the collapse control
- **THEN** the tree animates to a rail and the centre pane widens in the same transition
- **AND** the collapsed state is remembered on reload

#### Scenario: Navigating on a phone

- **GIVEN** a 390px-wide viewport
- **WHEN** the user opens the Folders drawer and taps a folder
- **THEN** the drawer closes, the centre pane shows that folder
- **AND** focus returns to the Folders button
