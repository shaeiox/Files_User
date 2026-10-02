# Capability: i18n Keys

## Purpose

Text is translated through two mechanisms that must both keep working: static markup declares a key on an
attribute and the language applicator rewrites it, while dynamically rendered content is interpolated from a
dictionary at render time and the router re-runs the applicator after every render. Language selection is
persisted, and changing it re-renders the current route rather than reloading. Because the redesign introduces
no new user-visible copy, this capability's primary job is not to add keys but to prove that the two
dictionaries stay structurally parallel, that no existing key is disturbed, and that a language switch rebuilds
every piece of dynamic text correctly in both languages and both directions.

## ADDED Requirements

### Requirement: The two dictionaries remain structurally parallel

The English and Persian dictionaries SHALL declare an identical set of keys. The only keys whose values may
differ in content are the direction and language codes themselves. Any additive change SHALL be applied to both
dictionaries at mirrored positions.

#### Scenario: The sorted key sets are identical

- **GIVEN** the English and Persian dictionaries
- **WHEN** each key set is extracted and sorted
- **THEN** the two sorted sets are equal, with no key present in one dictionary and absent from the other

#### Scenario: No existing key is deleted, renamed, or reworded

- **GIVEN** the pre-change key set and values of both dictionaries
- **WHEN** the post-change dictionaries are compared
- **THEN** every pre-existing key is still present with its original value

#### Scenario: Only the direction and language codes differ by design

- **GIVEN** every key other than the direction and language codes
- **WHEN** the two dictionaries are compared key by key
- **THEN** the direction and language codes carry the expected differing values, and every other key is
  localised rather than copied verbatim from the other dictionary

#### Scenario: Additions land at mirrored positions

- **GIVEN** a new key added to the English dictionary
- **WHEN** the Persian dictionary is inspected
- **THEN** the same key exists at the mirrored position with a Persian value

### Requirement: No existing dictionary entry is modified

The redesign SHALL NOT change any existing key's key name, its value, or its meaning. Existing copy is part of
the behaviour being preserved.

#### Scenario: The navigation keys are untouched

- **GIVEN** the navbar's translated strings
- **WHEN** the dictionaries are compared before and after
- **THEN** the brand, subtitle, navigation, and performance-tier labels are byte-identical

#### Scenario: The Browse keys are untouched

- **GIVEN** the Browse page's translated strings, including column headers, filter labels, sort labels, and
  the authentication, not-found, and server-error messages
- **WHEN** the dictionaries are compared
- **THEN** all are byte-identical

#### Scenario: The Home keys are untouched

- **GIVEN** the Home page's translated strings, including hero copy, section titles, table headers, status
  labels, and search-result copy
- **WHEN** the dictionaries are compared
- **THEN** all are byte-identical

### Requirement: New strings require both an attribute and both dictionaries

Any genuinely new user-visible string SHALL be added only as follows: static markup SHALL carry a
translation attribute, and the key SHALL exist in **both** dictionaries. Because the redesign is a visual
change, the expected count of new keys is zero, and zero is a passing outcome.

#### Scenario: No new keys are required

- **GIVEN** the redesign introduces no new user-visible copy
- **WHEN** the Home and Browse render functions are diffed for new literal user-facing text
- **THEN** none is found, and consequently no key was added

#### Scenario: A static label would carry a translation attribute

- **GIVEN** any new static label added in a later revision
- **WHEN** its markup is inspected
- **THEN** it carries a translation attribute naming a key that exists in both dictionaries

#### Scenario: A dynamic label would be interpolated from a dictionary

- **GIVEN** any new dynamic label added in a later revision
- **WHEN** its rendering code is inspected
- **THEN** it is produced by reading a key from the active dictionary, with a fallback, rather than written as
  a literal

#### Scenario: A key present in only one dictionary is a defect

- **GIVEN** the parallel-structure requirement
- **WHEN** a key is added
- **THEN** its absence from the other dictionary is treated as a failure, not as an acceptable partial change

### Requirement: Language switch rebuilds all dynamic text

Selecting a different language SHALL re-render the current route and SHALL rebuild every piece of dynamically
generated text from the newly selected dictionary, with no English text left over on a Persian page.

#### Scenario: **HARD GATE** — Language switch rebuilds all dynamic text

- **GIVEN** the active language is English and a search has produced results
- **WHEN** the Persian option is selected
- **THEN** the page re-renders without a full document load, and the hero copy, the section titles, the card
  metadata, the panel titles, the status bar, the search results, the badges, the filter labels, the sort
  labels, and the breadcrumbs are all displayed in Persian

#### Scenario: **HARD GATE** — Browse page text is rebuilt

- **GIVEN** the active language is Persian and a directory listing is rendered
- **WHEN** the English option is selected
- **THEN** the column headers, the filter and sort option labels, the type badges, and the breadcrumb segments
  are all displayed in English, and no Persian text remains

#### Scenario: The direction attribute follows the language

- **GIVEN** two languages with opposite writing directions
- **WHEN** the language is switched
- **THEN** the root element's language attribute and its direction attribute both update, and the mirrored
  layout applies in the new direction

#### Scenario: The current-language label updates

- **GIVEN** the header shows a short language code
- **WHEN** the language is switched
- **THEN** the label reflects the newly selected language

#### Scenario: The active option in the menu is marked

- **GIVEN** the language menu lists the available languages
- **WHEN** the language is switched
- **THEN** the newly selected option is marked active and the previously active option is not

#### Scenario: The selection persists

- **GIVEN** a language has been selected
- **WHEN** the page is reloaded
- **THEN** the same language is active, having been read back from persisted storage

#### Scenario: Browser history is not polluted by a language change

- **GIVEN** a language change triggers a re-render of the current route
- **WHEN** the browser's back button is pressed
- **THEN** the previous route is shown rather than a duplicate history entry for the language change

### Requirement: The three translation attributes keep their distinct behaviours

The application supports three separate translation attributes with distinct behaviours: one replaces text
content, one replaces a placeholder, and one replaces inner markup. Each SHALL keep its own behaviour, and a
redesign SHALL NOT substitute one for another.

#### Scenario: Text-content translation still replaces text

- **GIVEN** an element carrying the text-content translation attribute
- **WHEN** the language applicator runs
- **THEN** its text content is replaced with the dictionary value

#### Scenario: Placeholder translation still replaces the placeholder

- **GIVEN** an input carrying the placeholder translation attribute
- **WHEN** the language applicator runs
- **THEN** its placeholder is replaced and its text content is left alone

#### Scenario: Inner-markup translation still replaces markup

- **GIVEN** an element carrying the inner-markup translation attribute
- **WHEN** the language applicator runs
- **THEN** its inner markup is replaced with the dictionary value, preserving any markup inside that value

#### Scenario: An element with no attribute is untouched

- **GIVEN** an element carrying no translation attribute
- **WHEN** the language applicator runs
- **THEN** its content is unchanged

#### Scenario: A missing dictionary value leaves the element alone

- **GIVEN** an element whose attribute names a key that the active dictionary does not define
- **WHEN** the language applicator runs
- **THEN** the element's content is left unchanged rather than blanked

### Requirement: Localised formatting follows the selected language

Sizes and dates SHALL continue to be formatted using the active language's locale conventions, including the
Persian calendar for Persian and the Latin calendar with Latin unit names for English. The distinctive action
verbs that label row targets SHALL continue to be composed from the dictionary so that the icon target and the
name target remain distinguishable to assistive technology in both languages.

#### Scenario: Dates follow the selected locale

- **GIVEN** a listing of dated items
- **WHEN** the page renders in each language
- **THEN** dates are formatted using that language's locale conventions

#### Scenario: Sizes follow the selected locale

- **GIVEN** items with byte sizes
- **WHEN** the page renders in each language
- **THEN** unit names are localised, matching the pre-change behaviour

#### Scenario: Zero-byte items render a localised zero

- **GIVEN** an item whose size is zero
- **WHEN** it renders in each language
- **THEN** the zero-size label is localised rather than left blank or English-only

#### Scenario: Action verbs remain localised and distinguishable

- **GIVEN** a row's icon target whose accessible name combines an action verb with the item name
- **WHEN** the page renders in each language
- **THEN** the verb is localised, and the icon target's name differs from the plain item name so the two links
  to the same destination are not announced identically

#### Scenario: A zero-byte directory shows the placeholder

- **GIVEN** a directory row
- **WHEN** it renders
- **THEN** its size cell shows the placeholder dash rather than a zero-byte label

### Requirement: Translation is reapplied after every route render

Every route render SHALL be followed by a re-application of the active language, so that dynamically generated
markup is translated for the language that is currently active rather than the one active at load time.

#### Scenario: A route change re-applies the language

- **GIVEN** the active language is Persian
- **WHEN** the user navigates between the home and listing routes
- **THEN** the newly rendered markup is in Persian on arrival at each route

#### Scenario: The document title is localised per route

- **GIVEN** each route sets a document title from the dictionary
- **WHEN** the language changes
- **THEN** the document title updates to the newly selected language's value

#### Scenario: An in-page not-found message is localised

- **GIVEN** the listing reports that a path does not exist
- **WHEN** the message renders
- **THEN** its title and description come from the dictionary in the active language, while the requested path
  itself is displayed as data rather than translated

#### Scenario: The authentication-required message is localised

- **GIVEN** the listing requires authentication
- **WHEN** the lock state renders
- **THEN** its title, description, and activate control label come from the dictionary in the active language

#### Scenario: The modal's own strings are localised

- **GIVEN** the login modal is opened
- **WHEN** it renders
- **THEN** its heading, field labels, and submit control label come from the dictionary in the active language

### Requirement: Pre-existing localisation defects are neither fixed nor worsened

The source contains hard-coded English sort labels and a message-grammar defect in a search-empty string. Both
are recorded pre-existing defects. This change SHALL NOT fix them and SHALL NOT make them more likely to
trigger.

#### Scenario: The hard-coded sort labels remain untouched

- **GIVEN** two sort options written as English literals in the source rather than from the dictionaries
- **WHEN** the redesigned source is inspected
- **THEN** those two labels are byte-identical to their pre-change state

#### Scenario: The message-grammar defect is not made worse

- **GIVEN** a full sentence is reused as a prefix for a quoted query in an empty search result
- **WHEN** the redesign is exercised with a query that matches nothing
- **THEN** the message renders exactly as it did before, with no additional or altered wording

#### Scenario: No new hard-coded user-facing text is introduced

- **GIVEN** the redesign touches the Home and Browse render functions
- **WHEN** the diff is inspected for new user-facing string literals
- **THEN** none is added, so the defect count cannot grow

### Requirement: No banned content appears in any localised string

No dictionary entry SHALL contain, and no rendered page SHALL display, any banned trust, compliance, tier, or
version claim, and no fabricated data.

#### Scenario: No banned claim is present in either dictionary

- **GIVEN** the banned set
- **WHEN** both dictionaries are searched for each banned string
- **THEN** none is present

#### Scenario: No fabricated count or date is present in either dictionary

- **GIVEN** the reference design's fixed package counts, version strings, and card figures
- **WHEN** both dictionaries are searched for those values
- **THEN** none is present, and no dictionary entry encodes a fabricated figure