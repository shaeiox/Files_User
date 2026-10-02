# Capability: Typography

## Purpose

The application declares five font tokens and links three Google Fonts `<link>` tags in `index.html`, but the
server's Content-Security-Policy forbids remote stylesheets and remote fonts, so those links have always been
blocked and the interface has silently fallen back to the system font stack. This capability makes the
typography real by self-hosting three families under `assets/fonts/` as `.woff2` binaries served from the
same origin, declaring them with `@font-face` and `font-display: swap`, re-pointing the five existing font
tokens, and removing the dead remote links. No selector, id, `data-*` attribute, or rendering order outside
`index.html`'s three removed `<link>` lines changes.

## ADDED Requirements

### Requirement: Fonts are self-hosted from the application origin

Three families SHALL be self-hosted as `.woff2` files under `assets/fonts/`: **Inter** (weights 400, 500,
600) as the primary UI typeface, **JetBrains Mono** (weights 400, 500, 600) for monospace, telemetry, `kbd`
and metrics, and **Vazirmatn** (weights 400, 500, 600) for Farsi/RTL text. Every file SHALL be requested from
`/assets/fonts/*.woff2` so that it satisfies the CSP `font-src 'self' data:` directive. Nine files SHALL be
added in total.

#### Scenario: All nine font files are present

- **GIVEN** the three required families at three weights each
- **WHEN** the contents of `assets/fonts/` are listed
- **THEN** exactly nine `.woff2` files are present, three per family, covering weights 400, 500, and 600

#### Scenario: Every font URL satisfies the CSP font directive

- **GIVEN** the CSP declaration `font-src 'self' data:`
- **WHEN** every `url()` referenced by any `@font-face` declaration is collected
- **THEN** every URL is same-origin and points at a `.woff2` file under `/assets/fonts/`

#### Scenario: No remote font reference survives

- **GIVEN** the redesign removes remote font loading
- **WHEN** the whole `assets/` tree and `index.html` are searched for `fonts.googleapis.com`,
  `fonts.gstatic.com`, and `https://` inside a `url()` or a font link
- **THEN** no match is found in `assets/` and no font `<link>` remains in `index.html`

### Requirement: Font faces declare swap and explicit weights

Every `@font-face` declaration SHALL set `font-display: swap` and SHALL declare its `font-weight` explicitly,
so the browser selects a real binary per weight rather than synthesising bold. Declarations SHALL live in
`assets/css/tokens.css`, the first-loaded stylesheet, so font availability is established before any component
stylesheet paints.

#### Scenario: Every face uses swap

- **GIVEN** the `@font-face` declarations added by this change
- **WHEN** each declaration is inspected
- **THEN** every one declares `font-display: swap`

#### Scenario: Every face declares its weight

- **GIVEN** the nine declared faces
- **WHEN** each declaration is inspected
- **THEN** each declares a distinct `font-weight` of 400, 500, or 600, matching its file name

#### Scenario: Faces are declared in the first-loaded stylesheet

- **GIVEN** the stylesheet load order in `index.html`
- **WHEN** the file containing the `@font-face` declarations is identified
- **THEN** it is `tokens.css`, which is loaded before the other five project stylesheets

#### Scenario: Text renders with a swap rather than an invisible period

- **GIVEN** a cold cache load on a slow connection
- **WHEN** the first paint occurs before the fonts finish downloading
- **THEN** body text is already painted in the fallback stack and swaps to Inter when the font loads, with no
  block of invisible text

### Requirement: The five existing font tokens re-point to the self-hosted families

The five pre-existing font tokens SHALL resolve to the self-hosted families without being renamed:
`--font` → Inter, `--font-display` → Inter, `--font-hero` → Inter, `--font-fa` → Vazirmatn, `--mono` →
JetBrains Mono. Each SHALL retain a system-font fallback after the self-hosted family, so a failed font
request degrades gracefully rather than rendering nothing. No consumer selector changes as a result.

#### Scenario: All five tokens resolve to the new families

- **GIVEN** the five pre-existing font token names
- **WHEN** their declarations are inspected
- **THEN** each names its assigned self-hosted family and no token is renamed

#### Scenario: Every token keeps a system fallback

- **GIVEN** a font request that fails
- **WHEN** the browser resolves the family
- **THEN** a system font is used and text remains legible

#### Scenario: No consumer selector is edited

- **GIVEN** the five tokens are consumed across `base.css`, `components.css`, `home.css`, and `browse.css`
- **WHEN** those files are diffed for this change
- **THEN** the only change is the token declaration in `tokens.css`; no `font-family` declaration outside
  `tokens.css` is altered solely to switch family

#### Scenario: The hero typeface changes from serif to Inter

- **GIVEN** `--font-hero` previously resolved to a serif stack led by Cinzel
- **WHEN** its post-change declaration is inspected
- **THEN** it resolves to Inter, matching D6's designation of Inter as the primary UI typeface

### Requirement: Remote Google Fonts links are removed from `index.html`

The three Google Fonts `<link>` tags in `index.html` SHALL be removed: two `preconnect` tags and the
`css2` stylesheet link. No other element of `index.html` SHALL change in this capability — the six
project stylesheet links, the icon link, the inline pre-paint theme/perf script, `<main id="app">`, the
`dir`/`lang` attributes, and the script load order all remain untouched.

#### Scenario: Exactly three lines are removed from `index.html`

- **GIVEN** the pre-change `index.html`
- **WHEN** the diff is inspected
- **THEN** the only changes are deletions of the two `preconnect` links and the Google Fonts stylesheet link

#### Scenario: The six project stylesheets still load

- **GIVEN** `index.html` loads `tokens.css`, `base.css`, `components.css`, `home.css`, `browse.css`, and
  `performance-modes.css`
- **WHEN** the diff is inspected
- **THEN** all six `<link rel="stylesheet">` tags targeting `/assets/css/` are unchanged

#### Scenario: The inline pre-paint script is untouched

- **GIVEN** the inline script at the top of `<head>` resolves the theme and the performance tier before paint
- **WHEN** the diff is inspected
- **THEN** that script is byte-identical to its pre-change state

#### Scenario: The SPA mount and script order are untouched

- **GIVEN** `<main id="app">` is the router's single mount and the script order is
  `resource-service` → `performance-monitor` → `theme` → `i18n` → `autocomplete` → `home` →
  `file-actions` → `browse` → `idle-timer` → `router`
- **WHEN** the diff is inspected
- **THEN** neither the mount element nor the order of any script tag changes

#### Scenario: The pre-change fallback state is not regressed

- **GIVEN** the Google Fonts links were already blocked by CSP before this change, so the interface rendered
  in the system stack
- **WHEN** the post-change page is compared against that baseline
- **THEN** text is at least as resolved as before, with Inter available where the system stack was previously
  the only option

### Requirement: Vazirmatn activates for Persian without new selectors

Because `i18n.js` sets `document.documentElement.lang` to `fa` for Persian, the pre-existing rule that
switches `font-family` to `--font-fa` for that language SHALL become live. No new selector is required to
activate it, and the rest of the interface SHALL continue to use the Latin families.

#### Scenario: Persian text renders in Vazirmatn

- **GIVEN** the active language is Persian, so `<html lang="fa">`
- **WHEN** Farsi body text is inspected
- **THEN** it resolves to the self-hosted Vazirmatn family

#### Scenario: Latin text is unaffected by the language attribute

- **GIVEN** the active language is English, so `<html lang="en">`
- **WHEN** Latin body text is inspected
- **THEN** it resolves to Inter, not Vazirmatn

#### Scenario: Switching languages swaps the family without a reload

- **GIVEN** an active session in one language
- **WHEN** the language picker selects the other language
- **THEN** the `<html lang>` attribute changes, the font family for the new script applies, and the page is
  not fully reloaded from the server

### Requirement: Typography scale tokens are consumed by later phases

The nine `--text-*` tokens from D6 SHALL be declared in `tokens.css` and SHALL be adopted by the Home and
Browse restyles. Their adoption SHALL be limited to font-size, line-height, font-weight, and letter-spacing
declarations, and SHALL NOT alter any layout contract such as the Browse row height, the grid tracks, or the
`≤640px` collapse.

#### Scenario: The nine tokens are declared

- **GIVEN** the D6 typography scale
- **WHEN** `tokens.css` is inspected
- **THEN** all nine tokens are declared with their specified size, line-height, weight, and tracking values

#### Scenario: The browse row height is unaffected by typography

- **GIVEN** the Browse row's fixed height and the `≤640px` auto-height
- **WHEN** a heading or label token is adopted inside a Browse row
- **THEN** the row's height declaration is unchanged and the 26 px action track still aligns

#### Scenario: Mobile headline token is applied at its breakpoint

- **GIVEN** `--text-headline-xl-mobile` exists for narrow viewports
- **WHEN** the `≤640px` rules are inspected
- **THEN** the hero headline resolves through the mobile token at that breakpoint and through the desktop
  token above it