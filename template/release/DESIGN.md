---
name: Obsidian Kinetic
colors:
  surface: '#121316'
  surface-dim: '#121316'
  surface-bright: '#38393d'
  surface-container-lowest: '#0d0e11'
  surface-container-low: '#1b1b1f'
  surface-container: '#1f1f23'
  surface-container-high: '#292a2d'
  surface-container-highest: '#343538'
  on-surface: '#e3e2e6'
  on-surface-variant: '#d5c4ab'
  inverse-surface: '#e3e2e6'
  inverse-on-surface: '#2f3034'
  outline: '#9e8f78'
  outline-variant: '#514532'
  surface-tint: '#ffba20'
  primary: '#ffdca1'
  on-primary: '#412d00'
  primary-container: '#ffb800'
  on-primary-container: '#6b4c00'
  inverse-primary: '#7c5800'
  secondary: '#c3c0ff'
  on-secondary: '#1d00a5'
  secondary-container: '#3626ce'
  on-secondary-container: '#b3b1ff'
  tertiary: '#a5ebff'
  on-tertiary: '#003640'
  tertiary-container: '#49d5f4'
  on-tertiary-container: '#005969'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdea8'
  primary-fixed-dim: '#ffba20'
  on-primary-fixed: '#271900'
  on-primary-fixed-variant: '#5e4200'
  secondary-fixed: '#e2dfff'
  secondary-fixed-dim: '#c3c0ff'
  on-secondary-fixed: '#0f0069'
  on-secondary-fixed-variant: '#3323cc'
  tertiary-fixed: '#acedff'
  tertiary-fixed-dim: '#4cd7f6'
  on-tertiary-fixed: '#001f26'
  on-tertiary-fixed-variant: '#004e5c'
  background: '#121316'
  on-background: '#e3e2e6'
  surface-variant: '#343538'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 2.25rem
    fontWeight: '600'
    lineHeight: 2.75rem
    letterSpacing: -0.03em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 1.75rem
    fontWeight: '600'
    lineHeight: 2.25rem
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '500'
    lineHeight: 1.5rem
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 0.9375rem
    fontWeight: '400'
    lineHeight: 1.5rem
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.25rem
    letterSpacing: 0em
  label-code:
    fontFamily: JetBrains Mono
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: -0.01em
  label-mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 0.6875rem
    fontWeight: '400'
    lineHeight: 0.875rem
    letterSpacing: 0.02em
  label-kpi:
    fontFamily: JetBrains Mono
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.5rem
    letterSpacing: -0.03em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system is engineered for elite infrastructure operators, platform engineers, and systems architects who require total command over hyperscale environments. The emotional posture is defined by surgical precision, instant feedback, and absolute low-latency control. It balances the raw utility of a terminal multiplexer with the tactile, high-craft finish of modern hyper-productivity tools.

The visual style blends **High-Contrast Dark Mode** with **Refined Glassmorphism and Luminescent Micro-Accents**:
- **Palette & Atmosphere:** An obsidian-grounded matrix (`#08090C`) that avoids muddy greys, using pure deep cold-space blacks paired with jet-slate surface containers.
- **Accents:** Cybernetic amber (`#FFB800`) anchors telemetry, alert states, and active primary intents, complemented by electric indigo-blue shifts for operational routing and interactive depth.
- **Aesthetic Tenets:** Sub-pixel hairline borders (`rgba(255, 255, 255, 0.08)`), keyboard-first navigational cues, dense tabular rhythm, and zero-latency micro-interactions.

## Colors

The color system prioritizes visual hierarchy within a high-density, low-light setting:

- **Primary (`#FFB800` - Cyber Amber):** Used for focal points, system-ready calls to action, high-priority telemetry, selection rings, and real-time cursor indicators.
- **Secondary (`#4F46E5` - Electric Indigo):** Reserved for deep system hierarchy, command palettes, network node links, and structural container accents.
- **Tertiary (`#06B6D4` - Cyan Stream):** Deployed for active telemetry spikes, throughput indicators, and secondary data visualizations.
- **Neutrals & Surfaces:**
  - `canvas-base`: `#08090C` (Rich obsidian void)
  - `surface-subtle`: `#0E1015` (Slightly raised canvas tier)
  - `surface-elevated`: `#14171F` (Cards, inspector panels, slide-overs)
  - `surface-overlay`: `rgba(20, 23, 31, 0.75)` (Frosted backdrop panels)
  - `border-hairline`: `rgba(255, 255, 255, 0.07)`
  - `border-active`: `rgba(255, 184, 0, 0.35)`
- **Text & Foreground:**
  - `text-primary`: `#F3F4F6` (96% contrast white-slate)
  - `text-secondary`: `#9CA3AF` (Muted silver)
  - `text-tertiary`: `#4B5563` (Dark slate for metadata and inactive hotkeys)

## Typography

Typography balances rapid scanning with structural elegance:

- **Inter** handles narrative, structure, and navigation. Tight tracking (`-0.01em` to `-0.03em`) produces a dense, unified editorial profile.
- **JetBrains Mono** governs machine readouts, metric deltas, IDs, shortcuts, and tabular data rows. Tabular numerals (`tnum`) must be enforced across all numeric representations.
- **Hierarchy Rules:** Large display titles are minimized in favor of dense utility headers. Operational dashboards should favor `body-md` and `label-code` for interface elements to preserve maximum visible viewport density.

## Layout & Spacing

The layout runs on a responsive multi-column fluid grid tailored for heavy data throughput:

- **Grid Architecture:** 
  - **Desktop (≥1280px):** 12-column layout with fixed split inspector drawers (320px–400px), 24px gutters, and 32px canvas margins.
  - **Tablet (768px–1279px):** 8-column fluid layout with collapsable context panels, 16px gutters, and 20px canvas margins.
  - **Mobile (<768px):** 4-column fluid layout; inspector views convert into stacked bottom-sheets.
- **Density Philosophy:** Compact internal element paddings (`0.25rem` to `0.75rem`) guarantee vertical economy, allowing infrastructure health metrics, traces, and node maps to remain visible without unnecessary scroll chaining.

## Elevation & Depth

Visual hierarchy uses luminous depth layering instead of heavy, muddy drop-shadows:

- **Tonal Layers:** Elevation begins at `#08090C` (Canvas), steps to `#0E1015` (Panels/Sections), and peaks at `#14171F` (Hovered nodes, tooltips, dialogs).
- **Hairline Radiance:** Surfaces are delineated by high-precision ghost borders (`1px solid rgba(255, 255, 255, 0.07)`). Elevated modaled surfaces gain an inner highlight: `inset 0 1px 0 rgba(255, 255, 255, 0.12)`.
- **Cybernetic Ambient Glow:** Focused items and active states cast low-spread amber or indigo diffuse blooms:
  - Active Node: `0 0 16px -2px rgba(255, 184, 0, 0.25)`
  - Elevated Modal: `0 20px 40px -15px rgba(0, 0, 0, 0.8), 0 0 1px 1px rgba(255, 255, 255, 0.08)`
- **Glassmorphism:** Overlays and slide-out command bars use `backdrop-filter: blur(16px)` with a 75% alpha fill to let background network traffic subtly register beneath active tools.

## Shapes

The geometric framework is tailored for compact, technical utility:

- **Soft Contours (`roundedness: 1`):** Base components (buttons, input fields, code blocks, cards) feature `0.25rem` (4px) to `0.375rem` (6px) corners. This maintains the crisp lines of a developer IDE while removing harsh visual clipping.
- **Pill Exceptions:** High-signal badges, cluster status tags, and interactive command toggles utilize full capsule radius (`9999px`) to create immediate contrast against structured modular grids.

## Components

### Buttons & Key Triggers
- **Primary:** Background in `#FFB800` with `#08090C` bold text. Subtle hover glow (`0 0 12px rgba(255, 184, 0, 0.4)`). Active state scales to `0.98`.
- **Secondary / Ghost:** Transparent background with `1px solid rgba(255, 255, 255, 0.1)` border. Text in `#F3F4F6`. Hover triggers `background: rgba(255, 255, 255, 0.04)` and border luminance increase.
- **Keyboard Affordance:** Buttons include an inline key shortcut container (`JetBrains Mono`, 10px, background: `rgba(255, 255, 255, 0.06)`, border: `1px solid rgba(255, 255, 255, 0.1)`).

### Status Pills & Glow Badges
- **Structure:** Pill shape (`rounded-full`), padding `2px 8px`, `font-size: 11px`, `JetBrains Mono`.
- **Telemetry Amber:** `background: rgba(255, 184, 0, 0.1)`, `border: 1px solid rgba(255, 184, 0, 0.3)`, text `#FFB800`. Accompanied by a pulsing 6px radial dot.
- **Operational Indigo:** `background: rgba(79, 70, 229, 0.15)`, `border: 1px solid rgba(99, 102, 241, 0.3)`, text `#A5B4FC`.

### High-Density Data Lists & Tables
- **Rows:** Height set to 36px for dense view, 44px for relaxed view. Subtle border-bottom `1px solid rgba(255, 255, 255, 0.04)`.
- **Interactions:** Hovering a row yields `background: rgba(255, 255, 255, 0.02)` and highlights row actions. Focus outline is a 1px amber ring inset.

### Inputs & Command Palette
- **Inputs:** Base `#0E1015`, hairline outline `rgba(255, 255, 255, 0.08)`, placeholder `#4B5563`. Focus triggers `border-color: #FFB800` and `box-shadow: 0 0 0 1px #FFB800`.
- **Quick-Switcher (Superhuman/Linear style):** Centered floating overlay, `backdrop-filter: blur(20px)`, dark translucent base (`rgba(14, 16, 21, 0.85)`), inner border highlight, with instant-filter search bar and JetBrains Mono navigation indices.

### Cards & Container Panels
- **Composition:** Flat, dark-tier surface (`#0E1015`), hairline perimeter border, zero outer shadow. Padded with `space-md` or `space-lg`.
- **Panel Headers:** Crisp border-bottom separator, category label in `label-mono-sm` uppercase, and trailing live performance telemetry chips.