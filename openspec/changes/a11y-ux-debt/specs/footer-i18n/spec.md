# Capability: Footer Localisation

## Purpose

The Enterprise Footer is fully bilingual for visible text: all 17 footer keys resolve in both dictionaries, and
the language applicator replaces visible content on a language change.

The three social links are the exception. Each carries a `data-i18n-ph` hook, which the applicator implements
as `el.placeholder = d[k]`. An anchor element has no placeholder, so the hook writes a meaningless expando and
the link's accessible name never changes. The Persian strings for Telegram, LinkedIn, and GitHub exist in both
dictionaries and are dead.

The effect is worse than missing translation: a Persian screen reader user hears an English brand name for a
link whose visible glyph is an icon, with no indication of what it does. The footer is the one place a
keyboard or assistive-technology user is guaranteed to encounter these links.

Scope boundary: existing dictionary keys are reused unchanged. No key is added, deleted, renamed, or reworded.
`index.html` and the language applicator are the only files in scope.

## ADDED Requirements

### Requirement: Footer links expose a localised accessible name

Every footer link whose visible content is an icon SHALL carry an accessible name that is set from the
dictionary and updated when the language changes. A placeholder hook SHALL NOT be used on non-input elements.

#### Scenario: **HARD GATE** — Social links announce their purpose

- **GIVEN** the three social links contain only an icon glyph and a hardcoded accessible name
- **WHEN** the rendered footer is inspected
- **THEN** each link has a non-empty accessible name derived from a dictionary key
- **AND** no footer link uses a placeholder hook, since anchors have no placeholder

#### Scenario: Accessible names follow the language

- **GIVEN** the footer is rendered in Persian
- **WHEN** the three social links are inspected
- **THEN** each announces its localised destination name rather than the source-language one

#### Scenario: A language switch updates the names

- **GIVEN** the application is running and the language is switched
- **WHEN** the language applicator runs
- **THEN** every localised accessible name in the footer updates to the new language
- **AND** the update is immediate, with no reload and no re-render of the routed content

### Requirement: The hook is inert on elements that cannot use it

The language applicator SHALL NOT attempt to set a placeholder on an element that does not support one. A
placeholder hook applied to a non-input element SHALL be a detectable authoring error rather than a silent
no-op.

#### Scenario: Misapplied hooks are detectable

- **GIVEN** the placeholder hook sets a property that only inputs and textareas meaningfully support
- **WHEN** a placeholder hook is found on an element that is neither an input nor a textarea
- **THEN** the misuse is reported as an authoring error
- **AND** it does not silently succeed while having no effect

#### Scenario: Input placeholders still work

- **GIVEN** the search field uses the placeholder hook legitimately
- **WHEN** the language is switched
- **THEN** the search field's placeholder updates in the new language

### Requirement: Existing dictionary entries are untouched

This capability reuses the keys already added for the footer. No dictionary entry SHALL be added, deleted,
renamed, or reworded, and the two dictionaries SHALL remain structurally identical.

#### Scenario: **HARD GATE** — No dictionary entry changes

- **GIVEN** the footer keys already exist in both dictionaries and both resolve
- **WHEN** this capability is applied
- **THEN** no entry is added, removed, renamed, or reworded in either dictionary
- **AND** the key sets of both dictionaries remain identical

#### Scenario: No dead keys are left behind

- **GIVEN** the fix moves social link names to a different hook
- **WHEN** the footer markup and both dictionaries are compared
- **THEN** every footer key referenced by the markup exists in both dictionaries
- **AND** no footer key remains defined in both dictionaries while referenced by nothing in the markup