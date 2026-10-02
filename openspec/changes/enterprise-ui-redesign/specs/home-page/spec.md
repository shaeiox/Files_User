# Capability: Home Page

## Purpose

`assets/js/home.js` renders the landing page into `#app`. It once rendered five sections — a hero with search,
a resources grid of category cards, a bottom grid holding the releases table and a quick-access list, a
collapsible search-results panel, and a status bar. Per **D10**, the bottom grid, the releases auth UI, and
the status bar are **deleted**, leaving three: the hero, the resources grid, and the collapsible
search-results panel.

The module still owns the login modal, the category filter menu, the global search that drives the
autocomplete, and the `showLoginModal` function that the frozen Browse page calls through a global alias. This
capability restyles the surviving presentation and permits a tightly whitelisted set of markup edits, while
preserving every id, `data-*` attribute, `data-i18n` attribute, element count, and text contract that
JavaScript depends on — with the explicit deletions in D10 carved out of that guarantee.

This capability also owns the **Enterprise Footer**, which is shell content in `index.html` rather than Home
route content.

## ADDED Requirements

### Requirement: Hero Section Freeze

The system MUST preserve the Home page Hero section (`.hero-max` and all descendants) without any visual,
structural, or behavioral change throughout the entire redesign.

#### Scenario: Hero DOM is byte-identical after redesign [HARD GATE]

- **GIVEN** the application before the redesign
- **WHEN** all 8 phases of the redesign are complete
- **THEN** the `innerHTML` of `.hero-max` is byte-identical to the pre-redesign state
- **AND** the computed styles of `#globalSearch`, `#logoSwap`, `.hero-visual`, `.hero-title`, and
  `.hero-pill` are identical

#### Scenario: Hero token drift is compensated

- **GIVEN** Phase 1 has changed token values in `tokens.css`
- **WHEN** the Hero's CSS rules reference a changed token
- **THEN** the Hero's CSS rules have been pinned to explicit values matching the pre-redesign computed output
- **AND** the Hero's visual appearance is unchanged

#### Scenario: Hero autocomplete still binds

- **GIVEN** the redesigned application
- **WHEN** `Autocomplete.bind()` is called on `#globalSearch`
- **THEN** the `.input-wrap` ancestor exists and the `.ac-dropdown` renders correctly inside `.hero-max`

#### Scenario: No CSS rule targets a frozen selector

- **GIVEN** the exhaustive frozen-element list in D8
- **WHEN** the diff of `home.css` and `components.css` across all phases is inspected
- **THEN** no rule targeting `.hero-max`, `.hero-content`, `.hero-pill`, `.hero-pill-dot`, `.hero-bg`,
  `.hero-desc`, `.hero-search`, `.search-keys`, `.logo-shader`, `.logo-swap`, `.logo-layer`, or
  `.hero-visual` was added, removed, or modified — except the token-pinning overrides authorised by D8
  clause 3

#### Scenario: The Hero-emitting code path is untouched

- **GIVEN** the Home renderer builds the Hero section as its first section
- **WHEN** the diff of `home.js` is inspected
- **THEN** the Hero-emitting code path shows no change to DOM structure, class names, ids, `data-*`
  attributes, or text content

#### Scenario: The `--hero-grad` token is not repointed

- **GIVEN** `--hero-grad` is consumed only by the frozen Hero panel
- **WHEN** `tokens.css` is inspected after Phase 1
- **THEN** the token keeps its pre-change value in both theme blocks

#### Scenario: The logo wipe animation still plays

- **GIVEN** the theme module reads the logo swap container by id and toggles its wiping class
- **WHEN** the theme is toggled
- **THEN** the wiping class is added and removed on the same interval as before, with no visual change to the
  emblem

#### Scenario: The Hero's keyboard shortcut is unchanged

- **GIVEN** a keyboard shortcut bound to the Hero's search field
- **WHEN** the shortcut is pressed
- **THEN** the same field receives focus and its content is selected, and no new shortcut handler was added

#### Scenario: The Hero's responsive rules are byte-identical

- **GIVEN** the Hero stacks and centres at a mid breakpoint and hides its key hint at a narrow breakpoint
- **WHEN** the diff is inspected
- **THEN** both media-query blocks are byte-identical to their pre-change state

#### Scenario: The Hero's overflow escape hatch is preserved

- **GIVEN** the autocomplete dropdown must escape the Hero panel to be visible
- **WHEN** the Hero panel's overflow rule is inspected
- **THEN** it still permits visible overflow, and the dropdown is not clipped

### Requirement: Every surviving Home id survives unchanged

Every id consumed by JavaScript or written by JavaScript SHALL survive: `#globalSearch`, `#searchBtn`,
`#stopBtn`, `#logoSwap`, `#resourcesGrid`, `#catFilterWrap`, `#sortFilterWrap`, `#refreshResourcesBtn`,
`#viewGridBtn`, `#viewListBtn`, `#resultsBox`, `#resultsTitle`, `#progress`, `#resultsList`. No id SHALL be
added, removed, or renamed.

**Deleted by D10 and therefore no longer guaranteed:** `#releasesContainer`, `#releasesBody`,
`#releaseAuthAction`, `#viewAllReleases`, `#releaseLogoutBtn`, `#quickAccessList`, `#lastSyncTime`,
`#osTabs`. These are removed on purpose; see the Home Page Pruning requirement.

#### Scenario: All surviving Home ids are still present

- **GIVEN** the Home ids listed above
- **WHEN** each is searched for in the post-change source
- **THEN** every one is found on the same element that carries it today

#### Scenario: The diff introduces no unexpected id change

- **GIVEN** the markup whitelist for this capability
- **WHEN** the diff of `assets/js/home.js` is inspected for id attributes
- **THEN** the only ids removed are the D10 deletion list, and no id outside it is added, removed, or renamed

#### Scenario: The deleted ids are genuinely gone

- **GIVEN** D10 removes the releases panel, the quick access list, the OS tabs, and the status bar
- **WHEN** the post-change source is searched for `#releasesContainer`, `#releasesBody`, `#releaseAuthAction`,
  `#viewAllReleases`, `#releaseLogoutBtn`, `#quickAccessList`, `#lastSyncTime`, and `#osTabs`
- **THEN** none of them is found in the markup or in any surviving script

### Requirement: The search field keeps its autocomplete host

`#globalSearch` SHALL remain inside a `.input-wrap` ancestor, and the autocomplete dropdown SHALL continue to
be found inside or created within that same wrapper. Any markup restructuring SHALL preserve this, because
the autocomplete module returns early when it cannot find the wrapper and would otherwise disable silently.

#### Scenario: **HARD GATE** — The autocomplete host is intact

- **GIVEN** the autocomplete module resolves its dropdown by finding the input's wrapper and then locating
  the dropdown within it
- **WHEN** `#globalSearch` is inspected in the DOM
- **THEN** an ancestor with the `input-wrap` class exists, and the dropdown is inside that same wrapper

#### Scenario: The dropdown is created when absent

- **GIVEN** no dropdown element pre-exists inside the wrapper
- **WHEN** the autocomplete is bound to the input
- **THEN** it creates the dropdown inside that wrapper, and it is styled and positioned correctly

#### Scenario: The hero's overflow escape hatch survives

- **GIVEN** the dropdown must escape the hero panel to be visible outside the input's bounds
- **WHEN** the hero panel's overflow rule is inspected
- **THEN** it still permits visible overflow, so the dropdown is not clipped

#### Scenario: The dropdown's stacking ceiling is preserved

- **GIVEN** the dropdown's effective stacking ceiling is established by ancestor stacking contexts rather
  than by its own declared value
- **WHEN** the search wrapper's stacking declarations are inspected
- **THEN** they are unchanged, so the dropdown continues to layer correctly against the navbar and overlays

### Requirement: The search field identity is unchanged

`#globalSearch` SHALL keep its id. The existing keyboard shortcut that focuses it SHALL continue to be the
only such shortcut, and its handler SHALL remain the single existing global keyboard listener. The redesign
SHALL NOT introduce a second field, a second shortcut handler, or a document-level shortcut handler.

#### Scenario: The shortcut focuses the existing field

- **GIVEN** a global keyboard shortcut bound to the search input
- **WHEN** the shortcut is pressed
- **THEN** `#globalSearch` receives focus and its content is selected
- **AND** because `#globalSearch` sits inside the Hero section, which is FROZEN per D8/I21, the shortcut's
  target, its handler, and the input itself are all unchanged — the redesign neither moves the field nor
  retargets the shortcut

#### Scenario: No second shortcut handler is added

- **GIVEN** I14 and I15 forbid new globals and new global listeners
- **WHEN** the diff over `assets/js/**` is inspected for added global keyboard registrations
- **THEN** none is found

#### Scenario: The reference design's shortcut field is not adopted

- **GIVEN** the reference design focuses a differently-named field that does not exist in this application
- **WHEN** the shipped markup is searched for that field name
- **THEN** no match is found

### Requirement: The full search flow is preserved end to end

Submitting the search SHALL continue to run the scan, the stop control SHALL continue to cancel it, the
results panel SHALL continue to appear, its progress text SHALL continue to update, results SHALL continue to
be appended, and the panel SHALL continue to scroll into view. The result cap and the result row shape SHALL
be unchanged.

#### Scenario: Submitting runs the search and reveals the panel

- **GIVEN** the search field contains a query
- **WHEN** the submit control is activated or Enter is pressed
- **THEN** the results panel becomes visible, its progress indicator begins updating, and results accumulate

#### Scenario: The stop control cancels

- **GIVEN** a search is in progress
- **WHEN** the stop control is activated
- **THEN** accumulation halts, consistent with the pre-change cancellation behavior

#### Scenario: The panel scrolls into view

- **GIVEN** results have been appended
- **WHEN** the panel is shown
- **THEN** it is scrolled into view with the same smooth, nearest-block behavior as before

#### Scenario: Result rows keep their shape

- **GIVEN** each result is appended as a row containing an anchor, a path, and a type badge
- **WHEN** a row is inspected
- **THEN** the anchor, the path text, and the badge are all present, and file results still carry the
  download marker while directory results do not

#### Scenario: Escape clears the results

- **GIVEN** results are visible
- **WHEN** Escape is pressed in the search field
- **THEN** the results panel is cleared, unchanged from the pre-change behavior

### Requirement: The login modal stays callable after the pruning

The `showLoginModal` function SHALL survive D10 in full. It SHALL remain reachable from the
download-interception path and from the Browse locked state. The cross-module alias that lets Browse reach it
SHALL survive unchanged, and `window.triggerAuthModal` SHALL still be bound to it. No new global SHALL be
introduced.

Only the **trigger** is removed by D10: the releases locked state's authenticate control disappears with the
releases panel. The function it called is not touched.

#### Scenario: The releases locked state no longer exists as a trigger

- **GIVEN** D10 deletes the releases panel
- **WHEN** the Home page is searched for the inline `onclick` that opened the modal from that panel
- **THEN** it is not found, because the markup that contained it was removed
- **AND** the `showLoginModal` definition is still present

#### Scenario: `showLoginModal` is still defined and exported

- **GIVEN** D10 removes the releases trigger
- **WHEN** `HomePage.showLoginModal` is inspected in `assets/js/home.js`
- **THEN** the function is still defined and still exposed on the `HomePage` export, unchanged in behaviour

#### Scenario: The Browse locked state opens the modal

- **GIVEN** Browse receives an authentication-required response and renders its locked state
- **WHEN** the authenticate control is activated
- **THEN** the modal opens, and the fallback chain still ends in client-side navigation if neither entry point
  is available

#### Scenario: The cross-module alias resolves

- **GIVEN** Browse looks up the modal through a global alias
- **WHEN** that lookup is performed
- **THEN** it resolves to the Home-owned modal opener, unchanged from today

#### Scenario: No new global is introduced

- **GIVEN** I14 forbids new global bindings
- **WHEN** the diff over `assets/js/**` is inspected for added global assignments
- **THEN** none is found, and the pre-existing alias remains the only one of its kind

### Requirement: Resource cards are driven exclusively by the data layer

Every card SHALL be rendered from the categories the data layer returns. Counts, folder totals, dates,
status, and icons SHALL all derive from that response. The reference design's hard-coded card names, counts,
dates, and chips SHALL NOT ship, and no string SHALL appear that is not either already present in the
dictionaries or newly added to both dictionaries.

#### Scenario: Card content matches the API response

- **GIVEN** the data layer returns a set of categories with names, file counts, folder counts, and
  timestamps
- **WHEN** the cards are rendered
- **THEN** each card's name, counts, and timestamp correspond to one returned category, with no invented
  values

#### Scenario: Reference card data is absent

- **GIVEN** the reference design contains eight fabricated cards with fixed names, counts, and dates
- **WHEN** the shipped source and rendered output are searched for those names
- **THEN** none appears

#### Scenario: No banned claim appears

- **GIVEN** D3 bans a specific set of trust, compliance, and infrastructure claims
- **WHEN** the shipped files and the rendered page are searched for each banned string
- **THEN** none is found

#### Scenario: Icons come from the existing icon resolver

- **GIVEN** the data layer classifies each category into an icon type
- **WHEN** a card renders
- **THEN** its icon is resolved from that classification through the existing resolver, not from a literal
  list written into the markup

### Requirement: The category filter and sort controls keep their contract

The category filter menu SHALL continue to be cleared and rebuilt at runtime inside the category filter
wrapper, and every generated option SHALL continue to carry its value attribute. The sort menu SHALL continue
to carry the same value vocabulary. Both pills SHALL continue to display the selected option's label.

#### Scenario: The category menu is rebuilt after load

- **GIVEN** the resources have loaded
- **WHEN** the category filter menu is inspected
- **THEN** it contains an "all" option followed by one option per returned category, each with its value
  attribute set

#### Scenario: Selecting an option updates the label and the grid

- **GIVEN** a category option is activated
- **WHEN** the selection is made
- **THEN** the pill's label text updates, the option becomes the active one, the previously active option
  loses that state, and the card grid re-renders

#### Scenario: Selecting an option closes the menu

- **GIVEN** a menu is open
- **WHEN** an option is activated
- **THEN** the menu's open state is removed

#### Scenario: An outside click closes all filter menus

- **GIVEN** one or more filter menus are open
- **WHEN** a click occurs outside every filter wrapper
- **THEN** all open filter menus close

#### Scenario: The sort option vocabulary is unchanged

- **GIVEN** the sort menu offers a fixed set of strategies
- **WHEN** the option value attributes are collected
- **THEN** the same values are present as before, with none added or removed

### Requirement: The view toggle and refresh control keep their behaviour

The grid/list toggle SHALL continue to write the grid's inline column definition and move the active state
between the two buttons. The refresh control SHALL continue to show its spinning state while a forced,
cache-clearing refetch runs and to clear that state afterwards.

#### Scenario: The view toggle restyles the grid

- **GIVEN** the toggle has two buttons
- **WHEN** the list button is activated
- **THEN** the grid's inline column definition is set to a single column, the list button becomes active, and
  the grid button is not

#### Scenario: The refresh control spins and clears

- **GIVEN** the refresh control is activated
- **WHEN** the refetch is in flight
- **THEN** the control shows its spinning state and the grid shows skeletons, and once the fetch settles the
  spinning state is removed and the grid shows real content

#### Scenario: The active-state class is exclusive

- **GIVEN** two mutually exclusive toggle buttons
- **WHEN** either is activated
- **THEN** exactly one carries the active state at a time

### Requirement: The results panel keeps its internal scroll container

The results panel's body SHALL keep its fixed maximum height and its internal vertical scrolling. It is one of
only three nested scroll containers in the application, and converting it to page-level scrolling would
change scroll behaviour.

#### Scenario: Results scroll inside the panel

- **GIVEN** more results than fit in the panel
- **WHEN** the user scrolls within the results body
- **THEN** the results body scrolls internally while the page itself does not move

#### Scenario: The maximum height is unchanged

- **GIVEN** the results body has a maximum height
- **WHEN** the rule is compared before and after the change
- **THEN** the maximum height value is unchanged

### Requirement: The logo wipe contract survives

The hero logo swap container SHALL keep its id, and the theme module SHALL continue to find it, add its
wiping class to trigger the transition animation, force a reflow, and remove the class after its timer. The
two logo layers SHALL remain present so the dark and light artwork can cross-fade.

#### Scenario: The wipe animation still plays on theme change

- **GIVEN** the theme is toggled
- **WHEN** the transition runs
- **THEN** the wiping class is added to the logo container and removed after the same interval as before

#### Scenario: Both logo layers exist

- **GIVEN** one layer is shown per theme
- **WHEN** the hero visual is inspected
- **THEN** two image layers are present, and the correct one is visible for each theme

#### Scenario: The decorative shader layer stays hidden from assistive technology

- **GIVEN** a purely decorative glow layer sits behind the hero logo
- **WHEN** it is inspected
- **THEN** it remains marked as hidden from assistive technology

### Requirement: Home markup edits stay within the whitelist

Any markup change in the Home render functions SHALL be limited to class names, wrapper elements, inline
decorative styles, and inline SVG artwork. No id, no `data-*` attribute, no `data-i18n*` attribute, no
element count that JavaScript depends on, no text content that JavaScript reads, and no URL construction
SHALL be altered. Every such edit SHALL be documented individually.

#### Scenario: Each edit falls inside the whitelist

- **GIVEN** a documented markup edit
- **WHEN** it is classified
- **THEN** it is a class name, a wrapper element, an inline decorative style, or inline SVG artwork

#### Scenario: No text content read by JavaScript is altered

- **GIVEN** elements whose text is read or written by JavaScript
- **WHEN** their content is compared before and after
- **THEN** none changed

#### Scenario: No URL construction is added

- **GIVEN** all links are built through the data layer's URL primitives
- **WHEN** the Home source is searched for literal download or browse path assembly
- **THEN** no new literal path assembly is present

#### Scenario: The XSS surface is not widened

- **GIVEN** two render paths already interpolate server-provided strings without escaping
- **WHEN** the redesigned markup is inspected
- **THEN** no additional unescaped interpolation of server data was introduced, and existing escaping was not
  removed

### Requirement: Pre-existing Home defects are neither fixed nor worsened

The two hard-coded English sort options, the module state that persists across re-renders without its label
matching, and the per-render global listener registration are recorded pre-existing defects. This change
SHALL NOT fix them and SHALL NOT make them more likely to trigger.

#### Scenario: The hard-coded sort labels remain untouched

- **GIVEN** two sort options are written in English in the source rather than from the dictionaries
- **WHEN** the redesigned source is inspected
- **THEN** those two labels are byte-identical to their pre-change state

#### Scenario: No new per-render global listener is introduced

- **GIVEN** existing global click and keyboard listeners are registered during rendering
- **WHEN** the diff is inspected for added global registrations inside render paths
- **THEN** none is added

#### Scenario: The persisted-state label mismatch is not made worse

- **GIVEN** filter state persists across a re-render while its visible label resets
- **WHEN** the redesign is exercised across a route change and back
- **THEN** the behaviour is identical to the pre-change baseline, with no new desynchronisation introduced

### Requirement: The bottom grid, releases UI, and status bar are removed

Per D10, the Latest Releases panel, the Quick Access panel, the OS tabs, the releases auth UI, and the status
bar SHALL be absent from the delivered application. Their DOM elements SHALL NOT exist, their render and logic
functions SHALL NOT exist, and their CSS SHALL NOT exist. This is a deletion, not a restyle: no surviving rule
SHALL reference any of them.

The `showLoginModal` function, its `HomePage.showLoginModal` export, and the `window.triggerAuthModal` binding
SHALL survive, because the frozen Browse page depends on them.

#### Scenario: The deleted DOM elements are absent

- **GIVEN** D10 removes the releases panel, the quick access list, the OS tabs, the releases auth UI, and the
  status bar
- **WHEN** the Home route renders
- **THEN** `.bottom-grid`, `.panel`, `.releases-table`, `.res-row`, `#osTabs`, `#releasesContainer`,
  `#releasesBody`, `#quickAccessList`, `.quick-item`, `#releaseAuthAction`, `#viewAllReleases`,
  `#releaseLogoutBtn`, `.status-bar`, `.status-item`, `.status-dot`, and `#lastSyncTime` are all absent from the
  rendered DOM

#### Scenario: The deleted JavaScript is absent

- **GIVEN** the bottom-section and status-bar logic lived in `assets/js/home.js`
- **WHEN** that file is searched after the change
- **THEN** `renderBottomSection`, `loadReleasesTable`, `renderStatusBar`, `updateLastSyncTime`, the OS-tab
  `data-os` wiring, and the quick-access renderer are all gone, and no surviving function reads a removed element

#### Scenario: The deleted CSS is absent

- **GIVEN** the deleted components had rules in `assets/css/home.css`
- **WHEN** that file is searched after the change
- **THEN** no rule remains whose selector is one of the deleted classes or ids, and no shared primitive that
  the auth modal or the error states still use has been removed along with them

#### Scenario: The pruned Home page renders without error

- **GIVEN** the deletions are applied
- **WHEN** the Home route renders and the search flow is exercised
- **THEN** no console error occurs, and no code path dereferences an element that no longer exists

#### Scenario: `showLoginModal` survives the pruning

- **GIVEN** only the Home page *trigger* for the login modal was removed
- **WHEN** `HomePage.showLoginModal` and `window.triggerAuthModal` are inspected
- **THEN** both are present and bound as before, and the Browse locked state still opens the modal through the
  existing fallback chain

### Requirement: The Enterprise Footer is real, bilingual shell content

The footer SHALL be declared in `index.html`, as a sibling of `.nav` and never inside `#app`, and SHALL be
styled in `assets/css/components.css`. The placeholder's inline `display:none` SHALL be removed. The footer
SHALL contain four columns — Brand/About, Useful Links, Contact, and Socials/Trust — followed by a copyright bar.

Every user-visible string in the footer SHALL carry a `data-i18n` attribute (or `data-i18n-html` for the about
paragraph). No hardcoded English SHALL ship in the footer. Brand names, phone numbers, email addresses, and URLs
are proper nouns and contact data and are not translated, but their labels are.

#### Scenario: The footer renders in the application shell

- **GIVEN** `index.html` contains the Enterprise Footer markup
- **WHEN** any route is loaded
- **THEN** the footer is visible below the routed content, is not inside `#app`, and survives navigation
  between Home and Browse without re-rendering

#### Scenario: The placeholder is gone

- **GIVEN** the footer element previously carried `style="display:none"`
- **WHEN** the footer element is inspected
- **THEN** that inline style is removed and the footer is rendered by stylesheet rules rather than an inline
  override

#### Scenario: Every footer string is translatable

- **GIVEN** the footer renders four columns plus a copyright bar
- **WHEN** every user-visible string in it is inspected
- **THEN** each carries a `data-i18n` or `data-i18n-html` attribute, and no string is hardcoded English

#### Scenario: Both languages render

- **GIVEN** Phase 8 adds the footer keys to both dictionaries
- **WHEN** the language is switched between English and Persian
- **THEN** every footer label, link name, contact label, and the copyright line re-render in the new language,
  and the phone numbers, email address, and URLs stay untranslated

#### Scenario: The footer collapses responsively

- **GIVEN** the footer uses a grid layout
- **WHEN** the viewport is 1024px or narrower, and then 640px or narrower
- **THEN** the layout reduces from four columns to two and then to one, and no horizontal overflow appears at
  any width

#### Scenario: The footer introduces no overflow

- **GIVEN** I2 forbids `.page` and `#app` from gaining an `overflow` value
- **WHEN** the footer styles are added
- **THEN** neither `.page` nor `#app` gains an `overflow` declaration, and the page scrolls without a
  horizontal scrollbar at every supported width
