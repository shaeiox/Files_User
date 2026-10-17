## MODIFIED Requirements

### Requirement: The Browse page renders the redesigned layout inside the app shell

The Browse page SHALL render into the application shell's `#app` element as three panes: a tree pane
(defined by the `browse-explorer` capability); a centre pane carrying the context header with
breadcrumb, item counts and primary actions, the toolbar with search, filters, sort and view controls,
and the file table with a leading selection column; and an inspector column. The shared navbar, footer,
and SPA router SHALL behave exactly as they do on the home route. `template/browse/code.html` SHALL be
updated to show the three-pane structure and remains the visual reference.

#### Scenario: A user navigates to a browse path

- **GIVEN** a user navigates to a `/browse/<path>` URL
- **WHEN** the route resolves
- **THEN** the page renders the tree pane and the centre pane into `#app`
- **AND** the centre pane lists the contents of `<path>`
- **AND** the navbar, footer, and language switch remain present and functional

#### Scenario: A design-only asset would be rejected

- **GIVEN** the redesigned layout is implemented
- **WHEN** the Browse page loads
- **THEN** it references no remote origin for scripts, styles, fonts, or images
- **AND** it renders without depending on any content-delivery network

### Requirement: The file table is full width until an item is selected

At a wide viewport the centre pane SHALL occupy all of the browse body's width not taken by the tree
pane (or its collapsed rail) until exactly one item is selected, and no space SHALL be reserved for the
closed inspector. Selecting one item SHALL narrow the centre pane and reveal the inspector beside it in
one animated transition; clearing the selection SHALL restore the centre pane's width the same way. The
tree pane's width SHALL NOT change when the inspector opens or closes. Below that breakpoint the
inspector SHALL stack beneath the table and the table SHALL keep the centre pane's full width.

#### Scenario: No item is selected

- **GIVEN** a browse page loaded at a wide viewport
- **WHEN** no item is selected
- **THEN** the centre pane fills the browse body's width minus the tree pane exactly
- **AND** no empty column is reserved beside it

#### Scenario: One item is selected

- **GIVEN** a browse page whose centre pane has no inspector beside it
- **WHEN** the user selects exactly one item
- **THEN** the centre pane narrows and the inspector becomes visible beside it
- **AND** both changes animate together rather than the table snapping
- **AND** the tree pane keeps its width

#### Scenario: The selection is cleared

- **GIVEN** the centre pane is narrowed and the inspector is visible
- **WHEN** the user clears the selection
- **THEN** the centre pane animates back to its full width
- **AND** the inspector fades out and is removed from the layout

#### Scenario: A narrow viewport is used

- **GIVEN** a viewport too narrow for the side-by-side layout
- **WHEN** an item is selected
- **THEN** the inspector appears beneath the table
- **AND** the table keeps the full width and is not squeezed

### Requirement: Browse layout is bidirectional and mirrors under RTL

The Browse page SHALL render correctly in both left-to-right and right-to-left directions. Every
direction-sensitive rule — tree pane placement, tree indentation and disclosure-chevron direction,
resize-handle drag and arrow-key direction, drawer slide side, inspector column placement, breadcrumb
separator direction, table column order, toolbar flow, and selection affordances — SHALL have an
explicit `[dir="rtl"]` counterpart or use logical properties, following the mirroring approach already
used by the home page.

#### Scenario: The page is rendered in Persian

- **GIVEN** the active language is Persian
- **WHEN** the Browse page renders
- **THEN** direction is right-to-left, the tree pane is on the right and the inspector on the left
- **AND** tree children indent from the right and collapsed chevrons point left
- **AND** the breadcrumb separators point in the reading direction
- **AND** no element overflows its container

#### Scenario: Resizing in Persian

- **GIVEN** the active language is Persian
- **WHEN** the user drags the tree handle toward the centre of the page
- **THEN** the tree widens, exactly as dragging toward the centre does in English

### Requirement: Browse motion respects reduced-motion and performance tiers

The Browse page SHALL animate its inspector, card, tree expand/collapse, current-folder marker,
centre-pane folder change, pane collapse and pane reset transitions, and SHALL suppress or shorten those
animations when the user prefers reduced motion or when the active performance tier disables them.
Live drag-resizing SHALL follow the pointer directly with no easing at any tier. Animations SHALL use
only `transform` and `opacity`, except pane width changes, which SHALL animate the grid track once per
discrete change and never per pointer move. No animation SHALL block interaction.

#### Scenario: The user prefers reduced motion

- **GIVEN** the operating system reports a reduced-motion preference
- **WHEN** the metadata card opens or a tree folder expands
- **THEN** it appears without the entrance animation
- **AND** its content and controls are fully available

#### Scenario: A lower performance tier is active

- **GIVEN** the page is running under a performance tier that disables animation
- **WHEN** the metadata card opens or the centre pane changes folder
- **THEN** the content becomes available without a long transition

#### Scenario: Navigating deeper

- **GIVEN** full motion is allowed
- **WHEN** the user opens a sub-folder
- **THEN** the centre pane's rows enter from the reading-end side with a short stagger
- **AND** navigating to a parent enters them from the reading-start side
