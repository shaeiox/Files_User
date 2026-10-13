# Spec Delta: browse-page

## Purpose

Defines requirements for the Browse page's presentation layer and its interactive controls: the
redesigned layout, the search/filter/sort/view toolbar, bidirectional parity, motion-tier compliance,
and the browser-side error states. Behavior that already shipped — local search, folders-first sorting,
list/grid view persistence, skeleton and empty states — is restated here as a preservation contract
rather than a new behavior.

> **Delta structure note.** `openspec/specs/` contains no archived capabilities, so this capability is
> declared but not yet in a main spec. This delta retires the freeze that
> `enterprise-ui-redesign` placed on the page and states the requirements that replace it. The freeze
> is removed rather than modified because it is an obligation that no longer holds.

## REMOVED Requirements

### Requirement: The Browse page is frozen against all changes

**Reason**: The freeze was a deliberate trade-off made by `enterprise-ui-redesign` to keep its
redesign's blast radius small; its proposal cancelled that change's Phase 5 and assumed
`browse.css`, `browse.js`, and `file-actions.js` would stay byte-identical. A replacement design now
exists at `template/browse/code.html`, and the accepted token drift it produced has become the
norm rather than the exception. Leaving the page frozen is no longer the lower-risk option, so this
change explicitly lifts the freeze and takes on the redesign.

**Migration**: `assets/css/browse.css` and `assets/js/browse.js` are editable by this change. The
per-row File Action contract in `file-actions.js` is **not** affected by this removal and continues to
be governed solely by the `file-actions` capability — this delta removes the freeze, it does not
grant permission to alter that module's ownership boundary. Inspector and bulk-download concerns move
into new dedicated modules rather than being added to `browse.js`.

## ADDED Requirements

### Requirement: The Browse page renders the redesigned layout inside the app shell

The Browse page SHALL render into the application shell's `#app` element using the structure defined by
`template/browse/code.html`: a context header carrying breadcrumb, item counts and primary actions; a
toolbar carrying search, filters, sort and view controls; a file table with a leading selection column;
and an inspector column. The shared navbar, footer, and SPA router SHALL behave exactly as they do on
the home route.

#### Scenario: A user navigates to a browse path

- **GIVEN** a user navigates to a `/browse/<path>` URL
- **WHEN** the route resolves
- **THEN** the page renders the redesigned layout into `#app`
- **AND** the navbar, footer, and language switch remain present and functional

#### Scenario: A design-only asset would be rejected

- **GIVEN** the redesigned layout is implemented
- **WHEN** the Browse page loads
- **THEN** it references no remote origin for scripts, styles, fonts, or images
- **AND** it renders without depending on any content-delivery network

### Requirement: The file table is full width until an item is selected

At a wide viewport the file table SHALL occupy the full width of the browse body until exactly one
item is selected, and no space SHALL be reserved for the closed inspector. Selecting one item SHALL
collapse the table and reveal the inspector beside it in one animated transition; clearing the
selection SHALL restore full width the same way. Below that breakpoint the inspector SHALL stack
beneath the table and the table SHALL keep full width.

#### Scenario: No item is selected

- **GIVEN** a browse page loaded at a wide viewport
- **WHEN** no item is selected
- **THEN** the file table fills the browse body's width exactly
- **AND** no empty column is reserved beside it

#### Scenario: One item is selected

- **GIVEN** a browse page whose table is full width
- **WHEN** the user selects exactly one item
- **THEN** the table narrows and the inspector becomes visible beside it
- **AND** both changes animate together rather than the table snapping

#### Scenario: The selection is cleared

- **GIVEN** the table is collapsed and the inspector is visible
- **WHEN** the user clears the selection
- **THEN** the table animates back to full width
- **AND** the inspector fades out and is removed from the layout

#### Scenario: A narrow viewport is used

- **GIVEN** a viewport too narrow for the side-by-side layout
- **WHEN** an item is selected
- **THEN** the inspector appears beneath the table
- **AND** the table keeps the full width and is not squeezed

### Requirement: Browse styling uses only the project's own design tokens

The Browse page SHALL be styled using the CSS custom properties defined in `assets/css/tokens.css` and
the existing six-stylesheet system. Material-3 style token names, Tailwind utility classes, and
CDN-hosted icon or font resources SHALL NOT appear in the shipped implementation.

#### Scenario: A Material token name reaches the stylesheet

- **GIVEN** the redesign is ported into the project stylesheet
- **WHEN** a Material-3 token name such as `surface-container-low` appears in `browse.css`
- **THEN** it is rejected, because the project has no such token
- **AND** the equivalent project token is used instead

### Requirement: Existing search behavior is preserved

The Browse page SHALL filter the current directory listing client-side using a case-insensitive
substring match against item names, re-rendering the visible rows on each input event without a
network request. This SHALL remain distinct from the recursive server-side search endpoint, which
searches below the current directory.

#### Scenario: A user types into the search field

- **GIVEN** a directory listing is displayed
- **WHEN** the user types a query
- **THEN** the visible rows are filtered to names containing that query, case-insensitively
- **AND** no network request is issued
- **AND** the folder and file totals in the header still report the unfiltered directory contents

#### Scenario: A search matches nothing

- **GIVEN** a query matching no item
- **WHEN** the filter is applied
- **THEN** the existing "no files matched" empty state is shown

### Requirement: Type filter and sort modes are preserved

The Browse page SHALL retain the all/directories/files type filter and the five existing sort modes,
and SHALL continue to sort folders ahead of files under every mode. Each sort mode SHALL be
selectable and SHALL leave the page in a consistent state.

#### Scenario: Any sort mode is chosen while files and folders are present

- **GIVEN** a directory containing both folders and files
- **WHEN** any sort mode is applied
- **THEN** folders are listed before files
- **AND** the remaining items are ordered by the chosen mode

### Requirement: View modes are limited to list and grid

The Browse page SHALL offer exactly two view modes, detailed list and compact grid, and SHALL persist
the user's choice across page loads. A third tree view mode SHALL NOT be offered until it has a defined
lazy-loading data contract.

#### Scenario: A previously stored view preference exists

- **GIVEN** the user previously selected grid view
- **WHEN** the Browse page loads
- **THEN** the grid view is restored without a second interaction

#### Scenario: The tree view affordance is evaluated

- **GIVEN** the redesigned toolbar renders
- **WHEN** the view switcher is inspected
- **THEN** it exposes list and grid only

### Requirement: Extension filter chips narrow the visible rows

The Browse page SHALL offer filter chips scoped to the extensions present in the current directory,
each labelled with its extension and the real number of matching items. Selecting a chip SHALL narrow
the visible rows to that extension and SHALL compose with the existing type filter and search.

#### Scenario: A chip is selected

- **GIVEN** a directory containing files of several extensions
- **WHEN** the user selects the chip for one extension
- **THEN** only rows with that extension remain visible
- **AND** the count on each other chip still reports the directory's real totals

#### Scenario: A directory contains no files

- **GIVEN** a directory with folders but no files
- **WHEN** the toolbar renders
- **THEN** no extension chip is shown, because no extension exists to filter

### Requirement: Browser-side states are preserved

The Browse page SHALL preserve its skeleton loading state, its empty state, and its in-page
authentication-required, not-found, and server-error states. Errors SHALL be rendered in place; the
page SHALL NOT perform a full navigation to a hard error page for a directory-listing failure.

#### Scenario: The requested directory does not exist

- **GIVEN** a browse path that does not resolve to a directory
- **WHEN** the listing is requested
- **THEN** the in-page not-found state is shown with the requested path
- **AND** no navigation to the standalone error page occurs

#### Scenario: Authentication is required for the path

- **GIVEN** the requested path requires authentication and the session is absent
- **WHEN** the listing is requested
- **THEN** the locked state is shown with a control that opens the existing sign-in flow
- **AND** re-authentication re-runs the listing without a full page load

### Requirement: Browse supports keyboard operation

The Browse page SHALL focus the search field when `/` is pressed outside an editable element, SHALL
move row focus with the arrow keys, SHALL activate the focused row's primary action with `Enter`, and
SHALL copy the focused item's computed checksum with a modifier-key chord. The checksum copy chord
SHALL work on both Windows and macOS rather than binding a single vendor's key.

#### Scenario: The slash key is pressed outside a field

- **GIVEN** focus is on the document body
- **WHEN** the user presses `/`
- **THEN** the search field receives focus
- **AND** the keypress does not insert a character into the page

#### Scenario: A user copies the focused item's checksum

- **GIVEN** a file row holds focus and a checksum has been computed for it
- **WHEN** the user presses the copy chord
- **THEN** the checksum is placed on the clipboard

### Requirement: Browse layout is bidirectional and mirrors under RTL

The Browse page SHALL render correctly in both left-to-right and right-to-left directions. Every
direction-sensitive rule — inspector column placement, breadcrumb separator direction, table column
order, toolbar flow, and selection affordances — SHALL have an explicit `[dir="rtl"]` counterpart,
following the mirroring approach already used by the home page.

#### Scenario: The page is rendered in Persian

- **GIVEN** the active language is Persian
- **WHEN** the Browse page renders
- **THEN** direction is right-to-left and the inspector column moves to the mirrored side
- **AND** the breadcrumb separators point in the reading direction
- **AND** no element overflows its container

### Requirement: Browse motion respects reduced-motion and performance tiers

The Browse page SHALL animate its inspector and card transitions, and SHALL suppress or shorten those
animations when the user prefers reduced motion or when the active performance tier disables them. No
animation SHALL block interaction.

#### Scenario: The user prefers reduced motion

- **GIVEN** the operating system reports a reduced-motion preference
- **WHEN** the metadata card opens
- **THEN** it appears without the entrance animation
- **AND** its content and controls are fully available

#### Scenario: A lower performance tier is active

- **GIVEN** the page is running under a performance tier that disables animation
- **WHEN** the metadata card opens
- **THEN** the content becomes available without a long transition

### Requirement: The signature badge is presentation-only static text

The Browse page MAY display a "Signed by CloudAvid Core" label as static product chrome. The label
SHALL be static text only. It SHALL NOT be presented as, derived from, or accompanied by any
cryptographic verification result, and no code path may compute or imply a signature check.

#### Scenario: The label is rendered

- **GIVEN** a file is listed
- **WHEN** the context header renders
- **THEN** the label appears as static text
- **AND** no verification is performed or reported to produce it