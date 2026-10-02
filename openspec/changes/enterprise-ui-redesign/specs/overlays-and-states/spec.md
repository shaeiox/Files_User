# Capability: Overlays and States

## Purpose

Overlays and non-content states are the parts of the interface a user meets only under pressure: the login
modal, the three navbar filter menus, the autocomplete dropdown, the performance toast and debug panel, the
skeleton loaders, the empty states, the error states, and the authentication-required lock. Their behaviour is
carried by mechanisms that are invisible in the visual design — a 250 ms close delay matched to a CSS
transition, a single-instance guard, a `show` class on a wrapper rather than on the menu, a hover-only open
state, an internal scroll container — and several of those mechanisms differ from one another on purpose. This
capability restyles all of them in place, in the stylesheet that already owns each, while preserving every
mechanism exactly.

## ADDED Requirements

### Requirement: The login modal's 250 ms contract is preserved

The modal's backdrop transition and the modal panel's transform transition SHALL both remain exactly 250 ms,
because JavaScript removes the node from the DOM after a 250 ms timeout once the open state is cleared. If
either duration changes, the modal visibly pops on close.

#### Scenario: **HARD GATE** — The close delay matches the transition duration

- **GIVEN** the modal is open and the close action is taken
- **WHEN** the modal is observed
- **THEN** it fades and scales out over exactly 250 ms and is removed immediately afterwards, with no visible
  jump, no premature disappearance, and no lingering backdrop

#### Scenario: **HARD GATE** — Both transitions are 250 ms

- **GIVEN** the backdrop fades via an opacity transition and the panel moves via a transform transition
- **WHEN** each rule's duration is inspected
- **THEN** each is exactly 250 ms, and the pair matches the removal timeout

#### Scenario: The open sequence is unchanged

- **GIVEN** a request to open the modal
- **WHEN** it is processed
- **THEN** the overlay is appended, and on the next animation frame the open state is applied so the fade-in
  runs

#### Scenario: The closed state is inert but still present

- **GIVEN** a closing overlay before removal
- **WHEN** its computed pointer-events are inspected
- **THEN** it does not intercept pointer input, and it is not removed from layout until its timeout elapses

### Requirement: The modal attaches to the document body

The modal overlay SHALL be appended to the document body and SHALL NOT be appended to, or nested inside, the
application mount. Because the router replaces the mount's contents on every route change, a modal nested
inside it would be destroyed mid-interaction.

#### Scenario: **HARD GATE** — The overlay is a child of the document body

- **GIVEN** an open modal
- **WHEN** its parent element is inspected
- **THEN** it is the document body, not the application mount

#### Scenario: The modal survives a route change

- **GIVEN** a modal is open
- **WHEN** a navigation is performed
- **THEN** the modal remains open and usable, unchanged from the pre-change behaviour

#### Scenario: The mount's contents are replaced normally

- **GIVEN** a modal is open
- **WHEN** a navigation is performed
- **THEN** the application mount's contents still swap as before, confirming the router's behaviour is
  unchanged

### Requirement: The single-instance guard is preserved

Opening the modal while one is already open SHALL be a no-op. The guard SHALL run before any DOM work so that
no partial overlay is created.

#### Scenario: **HARD GATE** — Repeated opens produce one overlay

- **GIVEN** a modal is already open
- **WHEN** the open routine is invoked again
- **THEN** exactly one overlay exists in the document and no second dialog, backdrop, or form is created

#### Scenario: The guard runs before any DOM work

- **GIVEN** a modal is already open
- **WHEN** the open routine is invoked again
- **THEN** the routine returns without touching the DOM

#### Scenario: All three open sites reach the same modal

- **GIVEN** the releases locked state, the download-interception path, and the Browse locked state
- **WHEN** each opens the modal
- **THEN** each reaches the same single-instance modal

### Requirement: Modal controls keep their ids and semantics

The modal's overlay, close control, form, username input, password input, error region, and submit control
SHALL keep their ids, because they are created at runtime and referenced by the open routine and the submit
handler. The close control SHALL remain positioned on the side determined by the text direction, SHALL remain
clipped to the panel radius, and SHALL retain its accessible name. The inputs SHALL keep their autocomplete
hints so password managers continue to work.

#### Scenario: All modal ids resolve

- **GIVEN** an open modal
- **WHEN** each of its control ids is looked up
- **THEN** every one resolves to exactly one element

#### Scenario: The close control mirrors for direction

- **GIVEN** a right-to-left text direction
- **WHEN** the close control's position is inspected
- **THEN** it is positioned on the mirrored side, matching the pre-change behaviour

#### Scenario: The panel clips its decorative layer

- **GIVEN** the panel has a decorative gradient layer behind its contents
- **WHEN** the panel's overflow is inspected
- **THEN** it clips, so the decorative layer follows the panel's rounded corners

#### Scenario: Input autocomplete hints are preserved

- **GIVEN** the username and password inputs
- **WHEN** their autocomplete attributes are inspected
- **THEN** they carry the same hints as before, so credential managers still recognise them

### Requirement: No accessibility improvement is introduced into the modal

The modal SHALL gain no focus trap, no escape-key close handler, and no focus restoration. Its labels SHALL
NOT gain `for` attributes. These are recorded pre-existing gaps and are out of scope for a visual change.

#### Scenario: No focus trap is added

- **GIVEN** the modal is open
- **WHEN** the keyboard is used to tab repeatedly
- **THEN** focus is not confined to the dialog, matching the pre-change behaviour

#### Scenario: No escape-key handler is added

- **GIVEN** the modal is open
- **WHEN** the escape key is pressed
- **THEN** the modal does not close as a result of any handler introduced by this change

#### Scenario: Focus is not restored on close

- **GIVEN** the modal closes
- **WHEN** focus location is inspected
- **THEN** it is not restored to a previously focused element by new code

### Requirement: Filter and performance menus open via a class on their wrapper

The category filter menu and the performance menu SHALL continue to open and close by toggling a `show` class
on their **wrapper** element, not on the menu itself. Their closed states SHALL continue to be produced by
their existing visibility and interactivity properties rather than by removal from layout.

#### Scenario: **HARD GATE** — The open class is applied to the wrapper

- **GIVEN** a filter or performance menu wrapper
- **WHEN** it is opened
- **THEN** the open class is present on the wrapper and absent from the menu

#### Scenario: Closed menus are never removed from layout

- **GIVEN** a closed menu
- **WHEN** its rules are inspected
- **THEN** they use opacity and visibility, and set neither `display` to `none` nor `visibility` to `hidden`

#### Scenario: Selecting an option closes the menu

- **GIVEN** a filter menu is open
- **WHEN** an option is activated
- **THEN** the wrapper's open state is cleared

#### Scenario: An outside click closes open filter menus

- **GIVEN** one or more filter menus are open
- **WHEN** a click occurs outside every filter wrapper
- **THEN** all open filter menus close

#### Scenario: The performance menu closes on outside click

- **GIVEN** the performance menu is open
- **WHEN** a click occurs outside its wrapper
- **THEN** it closes, and the selected tier's indicator is retained

### Requirement: The language menu remains hover-only

The language menu SHALL continue to open by hover and SHALL gain no class-driven or attribute-driven open
state. Its trigger's expanded-state attribute SHALL continue to be unmaintained. This is a recorded
pre-existing accessibility gap; correcting it would be accessibility work beyond preservation and is out of
scope.

#### Scenario: **HARD GATE** — The hover-only mechanism is unchanged

- **GIVEN** the language menu's open state is produced by a hover rule
- **WHEN** the rule set is inspected
- **THEN** there is still no open class, open attribute, or scripted open path for this menu

#### Scenario: The expanded-state attribute is still unmaintained

- **GIVEN** the language trigger ships with an expanded-state attribute
- **WHEN** the menu opens by hover
- **THEN** the attribute's value is unchanged by script, matching the pre-change behaviour

#### Scenario: Hovering still opens the menu

- **GIVEN** a pointer device
- **WHEN** the pointer enters the language trigger
- **THEN** the menu becomes visible

### Requirement: The autocomplete dropdown keeps its mechanism and internal scroll

The autocomplete dropdown SHALL continue to open via its own open class and close by removing it, SHALL
continue to be inert to pointer input when closed, and its item list SHALL keep its fixed maximum height and
internal vertical scrolling. It SHALL continue to escape the hero panel and SHALL continue to layer above
page content.

#### Scenario: The dropdown opens and closes by its own class

- **GIVEN** the search input has been bound
- **WHEN** a query is typed and the request settles
- **THEN** the dropdown gains its open class and becomes interactive, and removing that class makes it inert
  again

#### Scenario: A closed dropdown does not intercept pointer input

- **GIVEN** a closed dropdown
- **WHEN** a pointer is pressed over where it would sit
- **THEN** the press passes through, because its closed state sets interactivity to none

#### Scenario: The item list scrolls internally

- **GIVEN** more suggestions than fit in the list
- **WHEN** the list is scrolled
- **THEN** it scrolls internally while the page does not move, and its maximum height is unchanged

#### Scenario: Keyboard navigation tracks the active suggestion

- **GIVEN** the dropdown is open
- **WHEN** the up or down keys are pressed
- **THEN** the active suggestion moves, wraps at both ends, and is scrolled into view within the list

#### Scenario: An outside click closes the dropdown

- **GIVEN** the dropdown is open
- **WHEN** a click occurs outside the input's wrapper
- **THEN** the dropdown closes

#### Scenario: A file suggestion downloads and a directory suggestion navigates

- **GIVEN** the active suggestion is chosen with the activation key
- **WHEN** the choice is applied
- **THEN** a file suggestion initiates a download and a directory suggestion performs client-side navigation,
  both unchanged from the pre-change behaviour

### Requirement: The three overlay hidden-state mechanisms are not unified

The application deliberately uses three different combinations of properties to hide its overlays: one moves
four properties including interactivity, one omits interactivity, and one omits visibility. The restyle SHALL
preserve each combination rather than consolidating them, because consolidating changes pointer hit-testing and
focus behaviour.

#### Scenario: Each overlay keeps its own hidden-state combination

- **GIVEN** three overlays with three distinct hidden-state property combinations
- **WHEN** their rules are inspected
- **THEN** each still sets its original combination, with no property added or removed

#### Scenario: No overlay's hidden state is changed to layout removal

- **GIVEN** a hidden overlay
- **WHEN** its rules are inspected
- **THEN** it is not hidden by removal from layout

### Requirement: Loading, empty, and error states keep their shape and behaviour

Skeleton loaders, empty states, and error states SHALL keep their existing class hooks and their existing
toggle behaviour. The skeleton element count SHALL be unchanged. The two empty messages — a folder with no
entries and a search with no matches — SHALL remain distinguishable. The error variant of the empty indicator
SHALL remain available.

#### Scenario: Skeleton rows keep their count and hooks

- **GIVEN** a listing loading
- **WHEN** skeletons render
- **THEN** the same number of skeleton rows is produced as before, each carrying the skeleton box and skeleton
  line hooks

#### Scenario: Skeletons are replaced, not appended

- **GIVEN** skeletons are showing
- **WHEN** the fetch settles
- **THEN** the skeleton markup is replaced by real content, leaving no skeleton behind

#### Scenario: Empty states clear the row container

- **GIVEN** an empty result
- **WHEN** the empty state renders
- **THEN** the row container is emptied and the empty state becomes visible

#### Scenario: The empty state can be dismissed

- **GIVEN** an empty state is visible and then content is available
- **WHEN** content renders
- **THEN** the empty state is hidden, matching the pre-change behaviour

#### Scenario: The error variant remains reachable

- **GIVEN** the empty indicator supports an error appearance
- **WHEN** it is rendered in that state
- **THEN** the error styling hook is applied to the indicator

#### Scenario: The busy attribute is preserved on skeletons

- **GIVEN** resource skeletons are rendered for an assistive-technology-friendly loading state
- **WHEN** the skeleton is inspected
- **THEN** it still carries the busy attribute

### Requirement: The authentication-required lock keeps its control chain

The lock state SHALL keep its icon, title, description, and activate control. The activate control's handler
chain SHALL remain unchanged: it tries the Home-owned opener first, then the cross-module global alias, and
falls back to client-side navigation. Both the Home and Browse lock states SHALL keep their respective
responsive size collapses.

#### Scenario: The activate control's fallback chain is intact

- **GIVEN** the lock state's activate control is activated
- **WHEN** its handler runs
- **THEN** it attempts the Home-owned opener, then the global alias, then falls back to client-side navigation,
  in that order

#### Scenario: The lock state keeps its semantic hooks

- **GIVEN** the lock state renders
- **WHEN** it is inspected
- **THEN** the icon, title, description, and control classes are all present

#### Scenario: Responsive size collapses are preserved

- **GIVEN** the lock state shrinks at three successive narrow breakpoints
- **WHEN** the page is rendered at each
- **THEN** the corresponding size overrides still apply

### Requirement: The performance toast and debug panel keep their behaviour and layering

The toast SHALL continue to be positioned relative to the bottom centre of the viewport, SHALL continue to
show and dismiss by its open class, and SHALL continue to mirror its centring transform under a right-to-left
direction. The debug panel SHALL continue to be positioned clear of the navbar, SHALL continue to toggle by
its open class, and SHALL continue to mirror to the opposite side under right-to-left. Both SHALL keep their
relative stacking order.

#### Scenario: The toast shows and dismisses

- **GIVEN** a performance notification is raised
- **WHEN** it is raised and then expires
- **THEN** the toast becomes visible on display and is hidden on expiry, matching the pre-change timing

#### Scenario: The toast mirrors for direction

- **GIVEN** a right-to-left text direction
- **WHEN** the toast's transform is inspected in both its hidden and shown states
- **THEN** both transforms are mirrored, keeping it centred

#### Scenario: The debug panel clears the navbar

- **GIVEN** the debug panel is offset below the navbar so it does not overlap
- **WHEN** the panel is shown
- **THEN** it is positioned clear of the navbar and does not cover it

#### Scenario: The debug panel mirrors for direction

- **GIVEN** a right-to-left text direction
- **WHEN** the panel's position is inspected
- **THEN** it is anchored to the opposite side, matching the pre-change behaviour

#### Scenario: Stacking order is unchanged

- **GIVEN** the navbar, a dropdown, the banner host, the toast, the debug panel, and the modal overlay
- **WHEN** they are layered
- **THEN** their relative order is identical to the pre-change baseline, with the modal on top

### Requirement: Overlay effects are tier-gated

Every overlay rule that uses `backdrop-filter`, `blur`, `animation`, `transition`, or `box-shadow` SHALL have
a matching override in `performance-modes.css` under both the `low` and `potato` tiers. The modal backdrop's
blur is currently ungated and SHALL be gated as part of this change.

#### Scenario: The modal backdrop blur is gated

- **GIVEN** the modal backdrop uses a blur that was previously ungated
- **WHEN** the tier overrides are inspected
- **THEN** both the low and potato tiers remove it

#### Scenario: Every overlay effect has both tier overrides

- **GIVEN** the enumeration of overlay rules using blur, animation, transition, or shadow
- **WHEN** `performance-modes.css` is searched under both tier blocks
- **THEN** every enumerated selector appears in each

#### Scenario: Low tier disables the overlay blur

- **GIVEN** `data-perf="low"` is set
- **WHEN** the modal is opened
- **THEN** its backdrop renders without a blur

### Requirement: Overlays render correctly across breakpoints, themes, and directions

Every overlay and state SHALL render correctly at all six existing breakpoints, in both themes, and in both
text directions. Dropdowns SHALL remain anchored to their triggers and SHALL not be clipped by the viewport
at narrow widths.

#### Scenario: All six breakpoints render every overlay

- **GIVEN** the six existing breakpoints
- **WHEN** the modal, the menus, and the toast are opened at each width
- **THEN** each renders fully within the viewport with no clipping and no overflow

#### Scenario: Dropdowns stay anchored to their triggers

- **GIVEN** a menu opened from a trigger near the viewport edge
- **WHEN** it renders at a narrow width
- **THEN** it stays aligned to its trigger and remains fully visible

#### Scenario: Both themes render every overlay

- **GIVEN** `data-theme="dark"` and `data-theme="light"`
- **WHEN** each overlay is opened in each theme
- **THEN** every overlay is legible, with adequate contrast against its backdrop in both themes

#### Scenario: Both directions render every overlay

- **GIVEN** left-to-right and right-to-left text directions
- **WHEN** each overlay is opened in each direction
- **THEN** text alignment, control placement, and transforms are correct in both

### Requirement: No banned content appears in overlays or states

No overlay, state, or generated content SHALL display any banned trust, compliance, or infrastructure claim,
and no fabricated data SHALL appear.

#### Scenario: No banned claim is present

- **GIVEN** the banned set of trust, compliance, and infrastructure claims
- **WHEN** the shipped files and every rendered state are searched
- **THEN** none of the banned strings appears

#### Scenario: No fabricated content appears in states

- **GIVEN** loading, empty, error, lock, and toast states
- **WHEN** each renders
- **THEN** its content comes from the dictionaries or from live data, with no invented counts, dates, or claims