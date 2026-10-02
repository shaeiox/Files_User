# Capability: Content Strategy

## Purpose

The navbar and the Enterprise Footer currently overlap. Two of the five footer links point at destinations the
navbar already exposes:

| Footer link | Navbar equivalent |
|---|---|
| Home (`/`) | brand link (`.nav-logo`) |
| Documentation | Docs tab |
| Browse Portal | — |
| CloudAvid Main Site | Website tab |
| Rakaard | — |

Duplicated navigation is not harmful, but it is noise: it makes the footer look busier than it is and gives a
user two competing places to look for the same destination.

This capability also depends on `mobile-nav`. Until the navbar is reachable below 900px, the footer is the only
route to some destinations on a phone, and removing a "duplicate" would remove the user's only path. That
dependency is why this module builds last.

Scope boundary: this is a copy decision, not a behaviour change. No route is added or removed, no link becomes
invalid, and no dictionary entry is deleted even when its markup reference is removed.

## ADDED Requirements

### Requirement: The footer links are not redundant with the navbar

Where a footer link points at a destination the navbar already exposes, the footer SHALL NOT repeat it. Every
remaining footer link SHALL be either a destination with no navbar equivalent, or a genuinely distinct action.

#### Scenario: **HARD GATE** — No duplicated destinations

- **GIVEN** the navbar exposes the brand destination, an external website, and external documentation
- **WHEN** the footer's link destinations are compared against the navbar's
- **THEN** no footer link shares a destination with a navbar link
- **AND** each remaining footer link is unique across both regions

#### Scenario: Removing a duplicate does not orphan a user

- **GIVEN** a footer link is removed because the navbar already exposes its destination
- **WHEN** the destination is needed at a narrow viewport
- **THEN** the navbar exposes it there too, because mobile navigation has shipped
- **AND** no destination becomes unreachable at any width as a result of the removal

### Requirement: Removed copy does not leave dead dictionary entries

The footer dictionary is shared with visible content elsewhere. Removing a link from the footer SHALL NOT delete
its dictionary entry, and SHALL NOT leave an entry referenced by nothing.

#### Scenario: **HARD GATE** — Dictionaries stay intact and free of dead entries

- **GIVEN** the footer keys are used by the footer markup and, in some cases, by the fallback source text
- **WHEN** a link is removed from the footer markup
- **THEN** no dictionary entry is deleted or reworded in either language
- **AND** no footer key is left defined in both dictionaries while referenced by no markup
- **AND** the key sets of both dictionaries remain identical

### Requirement: The content decision is reversible and recorded

Because this module makes a judgement about redundancy rather than a mechanical correction, its rationale SHALL
be recorded so it can be reversed deliberately if the footer's role changes.

#### Scenario: The rationale is recorded

- **GIVEN** footer links were removed as duplicates of navbar destinations
- **WHEN** a future change makes the footer the primary navigation on narrow screens
- **THEN** the reason for the removal is discoverable in this capability's specification
- **AND** restoring the links is a deliberate decision rather than an oversight being corrected

#### Scenario: No link is left pointing nowhere

- **GIVEN** links were removed from the footer
- **WHEN** every remaining footer link and the copyright line are inspected
- **THEN** every link resolves to a real destination and no link is a placeholder pointing at the current page
- **AND** contact details remain reachable in the footer