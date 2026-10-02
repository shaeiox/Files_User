# Capability: Design Tokens

## Purpose

`assets/css/tokens.css` is the single theming surface of the application: it is the first-loaded stylesheet,
it declares every custom property the other five stylesheets consume, and no JavaScript mutates any custom
property directly (theming is expressed only through the `data-theme` and `data-perf` attributes). This
capability replaces the live token values with the authoritative "Obsidian Kinetic" palette, introduces the
typography, radius, spacing, and z-index scales plus a `--nav-h` token, and adds a structurally parallel
light-theme block — all without removing any token that has a live consumer, so the re-theme is globally
effective while remaining behavior-neutral.

## ADDED Requirements

### Requirement: Authoritative palette values

`tokens.css` SHALL declare the D4 "Obsidian Kinetic" palette with exactly the values given in
`proposal.md` §Locked Decisions §D4 — the core-surface ramp, foreground ramp, outline ramp, primary
(Cyber Amber) group, secondary (Electric Indigo) group, tertiary (Cyan Stream) group, error group, and the
marked `derive` glow group. No hex or `rgba()` literal outside that palette SHALL be introduced, except the
two entries D4 explicitly marks `derive` and the alias-resolution alpha noted in OQ-8.

#### Scenario: Every palette token is declared with its authoritative value

- **GIVEN** the D4 palette as recorded in `proposal.md`
- **WHEN** each token name is extracted from `tokens.css`
- **THEN** every name is present and its declared value is character-for-character the D4 value

#### Scenario: No unlisted color is introduced

- **GIVEN** the diff of `assets/css/tokens.css` for the whole change
- **WHEN** every hex and `rgba()` literal added by the diff is extracted
- **THEN** each literal appears in the D4 palette, or is one of the explicitly marked `derive` entries

#### Scenario: The name collision on `--background` resolves in D4's favour

- **GIVEN** D4 defines `--background: #121316` and the pre-existing dead shadcn triplet also used the name
  `--background` with an HSL channel value
- **WHEN** `tokens.css` is inspected
- **THEN** `--background` carries the D4 value and the shadcn triplet is dropped or renamed, with no rule
  anywhere wrapping a shadcn token in an `hsl()` function

### Requirement: Legacy token names survive as aliases

Every legacy custom-property name consumed by any stylesheet SHALL remain declared after the change. Each
SHALL resolve to exactly one D4 token, per the alias map in `design.md` §2.4. This makes the re-theme
effective without editing a single `var()` call site outside `tokens.css`.

#### Scenario: No consumed token name is removed

- **GIVEN** the pre-change set of declared custom-property names
- **WHEN** the post-change set is compared
- **THEN** every name with at least one live consumer is still declared, and its resolved value now traces to
  a D4 token

#### Scenario: Each alias resolves to exactly one D4 token

- **GIVEN** the alias map in `design.md` §2.4
- **WHEN** each legacy alias declaration is inspected
- **THEN** it references exactly one D4 token name, not a chain of more than one hop and not multiple
  candidate targets

#### Scenario: Dead tokens are deprecated, not deleted

- **GIVEN** tokens with zero live consumers, including the `--s*` spacing ramp, the `--r*` radius ramp, the
  `--a-*` iris ramp, the unused `--n-*` neutral steps, the unused `--color-*` names, `--warning`,
  `--ease-out`, the `--dur-*` durations, the unused `--text-*` size tokens, and `--hero-grad`
- **WHEN** `tokens.css` is inspected
- **THEN** each is still declared and marked deprecated with a comment; none is removed in this change

#### Scenario: The consumed hero gradient is repointed

- **GIVEN** `--hero-grad` is consumed by `.hero-max`
- **WHEN** its declaration is inspected
- **THEN** it resolves to an Obsidian Kinetic gradient built from D4 surface tokens rather than the
  pre-change value

### Requirement: Dark and light themes are structurally parallel

`tokens.css` SHALL declare two theme blocks: `[data-theme="dark"]` as the primary theme and
`[data-theme="light"]` as the secondary. The two blocks SHALL declare an **identical set of token names**, so
neither theme can carry a token the other lacks. The light block SHALL apply D4's derivation rule — swap the
`surface-container-*` ramp to light tiers, flip the `on-*` foregrounds, and keep `--primary-container` at
`#ffb800` as the brand anchor — sourcing any value D4 does not pin from the already-present light-theme
declarations, so no new hex is introduced.

#### Scenario: Theme blocks declare identical token-name sets

- **GIVEN** the token names declared inside `[data-theme="dark"]` and inside `[data-theme="light"]`
- **WHEN** both sets are extracted and sorted
- **THEN** the two sorted sets are equal, with no name present in one block and absent from the other

#### Scenario: The brand anchor is identical in both themes

- **GIVEN** the light-theme and dark-theme declarations of `--primary-container`
- **WHEN** both are inspected
- **THEN** both carry the value `#ffb800`

#### Scenario: Both themes render without a token falling back to an undeclared value

- **GIVEN** a page load with `data-theme="dark"` and another with `data-theme="light"`
- **WHEN** every `var()` reference in the rendered page is resolved
- **THEN** every reference resolves to a declared token in the active theme, with no fallback to an
  undeclared name

#### Scenario: A bare `:root` load resolves to the primary theme

- **GIVEN** a document where no `data-theme` attribute is present
- **WHEN** the cascade is resolved
- **THEN** the Obsidian Kinetic dark palette applies, because the dark block is declared after the light
  block in `tokens.css`

### Requirement: New scales are declared and consumed

`tokens.css` SHALL declare the D6 typography scale (nine `--text-*` tokens), the D6 radius scale (six tokens
including `--radius-DEFAULT` verbatim), the D6 spacing scale (ten tokens), the D6 z-index scale (nine
`--z-*` tokens), and a single `--nav-h` token. The `--z-*` values SHALL reproduce today's live stacking
numbers exactly so that migrating from magic numbers to the scale produces no numeric change in the
rendered order.

#### Scenario: The four scales are present

- **GIVEN** the D6 scale definitions
- **WHEN** `tokens.css` is inspected
- **THEN** all nine typography tokens, all six radius tokens, all ten spacing tokens, and all nine z-index
  tokens are declared with their specified values

#### Scenario: Migrating to the z-index scale changes no rendered order

- **GIVEN** the pre-change z-index values for `.nav`, `.filter-dropdown-menu`, `.lang-dropdown-menu`,
  `.perf-dropdown-menu`, the `.hero-search`/`.input-wrap` chain, `.cav-banner-host`, `.perf-debug-panel`,
  `.perf-toast`, and `.auth-overlay`
- **WHEN** each is replaced by its `--z-*` token
- **THEN** the computed values are unchanged and the relative stacking order is identical

#### Scenario: `--nav-h` is declared and, in Phase 1, unreferenced

- **GIVEN** Phase 1 adds `--nav-h`
- **WHEN** all stylesheets are inspected for consumers
- **THEN** the token is declared, and Phase 1 adds no `calc()` consumer anywhere

#### Scenario: A `--nav-h` consumer is introduced only in Phase 3

- **GIVEN** Phase 3 is where the navbar is restyled
- **WHEN** `.nav-bar`'s height declaration is inspected
- **THEN** it resolves through `var(--nav-h)`, and no other rule consumes the token in this change

#### Scenario: `--radius-DEFAULT` is declared verbatim

- **GIVEN** D6 names the scale's default token `--radius-DEFAULT`
- **WHEN** the radius scale is inspected
- **THEN** a token with exactly that name is declared with value `0.25rem`

### Requirement: No structural change to the token file

The four-block structure of `tokens.css` SHALL be preserved, no new top-level block SHALL be introduced, and
no `[data-perf]` block SHALL be added to `tokens.css` — all tier overrides SHALL remain in
`performance-modes.css`.

#### Scenario: Block count and order are unchanged

- **GIVEN** the pre-change block structure of `tokens.css`
- **WHEN** the post-change file is inspected
- **THEN** the same four blocks are present in the same order, with no additional top-level block

#### Scenario: Tier overrides stay out of `tokens.css`

- **GIVEN** all `[data-perf]` overrides live in `performance-modes.css`
- **WHEN** `tokens.css` is searched for `[data-perf`
- **THEN** no match is found