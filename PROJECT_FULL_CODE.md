# 📦 Project: files-server-web

> **Auto-generated code extraction for AI review and editing**
> 
> Generated on: 2026-09-16 18:37:32
> Total files: 18
> Total lines of code: 6788

---

## 🤖 Instructions for AI

This document contains the **complete source code** of the project.
Each file is clearly marked with:
- Its **full relative path** from the project root
- The **programming language** for syntax highlighting
- A **separator** between files for clarity

When suggesting edits, please reference files by their **full path** shown in the headers.

---

## 📊 Project Statistics

| Language | Files | Lines | Size |
|----------|-------|-------|------|
| CSS | 6 | 3103 | 81.6 KB |
| HTML | 2 | 296 | 14.6 KB |
| JavaScript | 10 | 3389 | 162.0 KB |

---

## 🗂️ Project Structure

```
📦 files-server-web/
  ├── 📁 assets/
  │   ├── 📁 js/
  │   │   ├── 📁 services/
  │   │   │   ├── 📄 resource-service.js
  │   │   │   └── 📄 performance-monitor.js
  │   │   ├── 📄 i18n.js
  │   │   ├── 📄 router.js
  │   │   ├── 📄 theme.js
  │   │   ├── 📄 home.js
  │   │   ├── 📄 autocomplete.js
  │   │   ├── 📄 banner.js
  │   │   └── 📄 browse.js
  │   ├── 📁 icon/
  │   │   ├── 📄 plaividlogo.png
  │   │   ├── 📄 logo.webp
  │   │   ├── 📄 Log.webp
  │   │   ├── 📄 template.webp
  │   │   ├── 📄 sandbox.webp
  │   │   ├── 📄 rakaard-logo.webp
  │   │   ├── 📄 files-logo.webp
  │   │   ├── 📄 avid-logo-light.webp
  │   │   ├── 📄 avid-logo-dark.webp
  │   │   ├── 📄 iso.webp
  │   │   ├── 📄 images.webp
  │   │   └── 📄 fyladLogo2.webp
  │   └── 📁 css/
  │       ├── 📄 home.css
  │       ├── 📄 performance-modes.css
  │       ├── 📄 tokens.css
  │       ├── 📄 base.css
  │       ├── 📄 browse.css
  │       └── 📄 components.css
  ├── 📄 nginx.conf
  ├── 📄 server.js
  ├── 📄 browse.html
  └── 📄 index.html
```

---

## 📑 Table of Contents

1. [`assets/css/base.css`](#file-1)
2. [`assets/css/browse.css`](#file-2)
3. [`assets/css/components.css`](#file-3)
4. [`assets/css/home.css`](#file-4)
5. [`assets/css/performance-modes.css`](#file-5)
6. [`assets/css/tokens.css`](#file-6)
7. [`assets/js/autocomplete.js`](#file-7)
8. [`assets/js/banner.js`](#file-8)
9. [`assets/js/browse.js`](#file-9)
10. [`assets/js/home.js`](#file-10)
11. [`assets/js/i18n.js`](#file-11)
12. [`assets/js/router.js`](#file-12)
13. [`assets/js/services/performance-monitor.js`](#file-13)
14. [`assets/js/services/resource-service.js`](#file-14)
15. [`assets/js/theme.js`](#file-15)
16. [`browse.html`](#file-16)
17. [`index.html`](#file-17)
18. [`server.js`](#file-18)

---

## 📝 Source Code Files

---

<a id="file-1"></a>

### 📄 File 1/18: `assets/css/base.css`

| Property | Value |
|----------|-------|
| **Path** | `assets/css/base.css` |
| **Language** | CSS |
| **Size** | 4.4 KB |
| **Lines** | 224 |

```css
/* ═══════════════════════════════════════════════════════════════
   base.css — Foundation & Layout (shadcn structure)
   Reset, typography, page container, backdrop
   ═══════════════════════════════════════════════════════════════ */

*,
*::before,
*::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

html {
    scroll-behavior: smooth;
    -webkit-text-size-adjust: 100%;
    font-family: var(--font);
}

body {
    background: var(--bg);
    font-family: var(--font);
    font-size: 14px;
    line-height: 1.6;
    color: var(--text);
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
    transition: background-color var(--dur-2) ease, color var(--dur-2) ease;
}

::selection {
    background: rgba(255, 184, 0, 0.22);
}

a {
    color: inherit;
    text-decoration: none;
}

button {
    font-family: inherit;
    cursor: pointer;
}

img {
    display: block;
    max-width: 100%;
}

/* ── Page container — wider to match mock (1240px) ── */
.page {
    position: relative;
    z-index: 1;
    width: min(1240px, calc(100% - 32px));
    margin: 0 auto;
    padding: 16px 0 32px;
}

@media (max-width: 768px) {
    .page {
        width: min(100% - 20px, 100%);
        padding: 12px 0 24px;
    }
}

/* ── AVID Signature Backdrop — subtle, light-first ── */
.aura-backdrop {
    position: fixed;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 0;
}

.aura-base {
    position: absolute;
    inset: 0;
    background: var(--bg);
}

.aura-glow-1 {
    position: absolute;
    top: -15%;
    right: -8%;
    width: 60%;
    height: 55%;
    background: radial-gradient(ellipse at center,
            rgba(255, 184, 0, 0.07) 0%,
            rgba(255, 184, 0, 0.03) 35%,
            transparent 70%);
    filter: blur(40px);
}

.aura-glow-2 {
    position: absolute;
    bottom: -20%;
    left: -10%;
    width: 65%;
    height: 60%;
    background: radial-gradient(ellipse at center,
            rgba(148, 163, 184, 0.08) 0%,
            transparent 65%);
    filter: blur(50px);
}

.aura-vignette {
    display: none;
}

[data-theme="dark"] .aura-glow-1 {
    background: radial-gradient(ellipse at center,
            rgba(255, 184, 0, 0.10) 0%,
            rgba(255, 184, 0, 0.04) 35%,
            transparent 70%);
}

[data-theme="dark"] .aura-glow-2 {
    background: radial-gradient(ellipse at center,
            rgba(30, 41, 59, 0.5) 0%,
            transparent 70%);
}

/* ── Animations (reduced-motion aware) ── */
@keyframes fadeUp {
    from {
        opacity: 0;
        transform: translateY(8px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes scaleIn {
    from {
        opacity: 0;
        transform: scale(0.98);
    }

    to {
        opacity: 1;
        transform: scale(1);
    }
}

@keyframes shimmer {
    0% {
        transform: translateX(-100%)
    }

    100% {
        transform: translateX(100%)
    }
}

.anim-fade-up {
    animation: fadeUp 220ms var(--ease) both;
}

.stagger>* {
    animation: fadeUp 220ms var(--ease) both;
}

.stagger>*:nth-child(1) {
    animation-delay: 0
}

.stagger>*:nth-child(2) {
    animation-delay: 40ms
}

.stagger>*:nth-child(3) {
    animation-delay: 80ms
}

.stagger>*:nth-child(4) {
    animation-delay: 120ms
}

.stagger>*:nth-child(5) {
    animation-delay: 160ms
}

.stagger>*:nth-child(6) {
    animation-delay: 200ms
}

@media (prefers-reduced-motion: reduce) {

    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
    }
}

/* ── Scrollbar ── */
::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}

::-webkit-scrollbar-track {
    background: transparent;
}

::-webkit-scrollbar-thumb {
    background: var(--n-5);
    border-radius: 999px;
}

::-webkit-scrollbar-thumb:hover {
    background: var(--n-6);
}

:focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: 2px;
}
```

---

<a id="file-2"></a>

### 📄 File 2/18: `assets/css/browse.css`

| Property | Value |
|----------|-------|
| **Path** | `assets/css/browse.css` |
| **Language** | CSS |
| **Size** | 10.1 KB |
| **Lines** | 509 |

```css
/* ═══════════════════════════════════════════════════════════════
   browse.css — File Browser Styles (Enterprise Layout)
   ═══════════════════════════════════════════════════════════════ */

.browse-layout {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 16px;
}

/* ── BROWSE HEADER ── */
.browse-head {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 18px 20px;
    border-radius: 12px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-card);
}

/* Breadcrumbs */
.crumbs {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 2px;
    font-size: 12px;
}

.crumb {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 8px;
    border-radius: 6px;
    color: var(--text-3);
    font-weight: 500;
    transition: all 120ms ease;
}

a.crumb:hover {
    background: var(--bg-hover);
    color: var(--text);
}

.crumb-active {
    color: var(--text);
    background: var(--n-4);
    font-weight: 600;
}

.crumb-sep {
    color: var(--text-4);
    display: flex;
    align-items: center;
}

html[dir="rtl"] .crumb-sep svg {
    transform: scaleX(-1);
}

/* Title & Controls Row */
.browse-title-row {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
}

.browse-title-left h1 {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--text);
    word-break: break-all;
    line-height: 1.2;
}

.browse-stats {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--text-4);
    margin-top: 4px;
}

.stat-item {
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.stat-val {
    color: var(--text);
    font-weight: 700;
}

.stat-dot {
    color: var(--border);
}

/* ── CONTROLS (Search, Dropdowns, View Toggle) ── */
.browse-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

/* Local Search Input */
.browse-search {
    height: 32px;
    padding: 0 10px 0 12px;
    border-radius: 6px;
    width: 180px;
    background: var(--bg-card);
    transition: width var(--dur-2) ease, border-color var(--dur-1) ease;
}

.browse-search:focus-within {
    width: 220px;
}

.browse-search input {
    font-size: 12px;
}

/* Custom Filter Dropdowns */
.filter-dropdown-wrap {
    position: relative;
    display: inline-flex;
}

.filter-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 32px;
    padding: 0 12px;
    border-radius: 6px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    font-size: 12px;
    font-weight: 500;
    color: var(--text-3);
    box-shadow: var(--shadow-sm);
    cursor: pointer;
    transition: all var(--dur-1) ease;
}

.filter-pill:hover,
.filter-dropdown-wrap.show .filter-pill {
    border-color: var(--border-hover);
    background: var(--bg-hover);
    color: var(--text);
}

.filter-pill svg {
    color: var(--text-4);
    transition: transform var(--dur-1) ease;
}

.filter-dropdown-wrap.show .filter-pill svg {
    transform: rotate(180deg);
}

.filter-dropdown-menu {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    min-width: 100%;
    padding: 4px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
    opacity: 0;
    visibility: hidden;
    transform: translateY(-4px) scale(0.98);
    transition: all 0.15s ease;
    z-index: 100;
    display: flex;
    flex-direction: column;
    gap: 2px;
    white-space: nowrap;
}

[dir="rtl"] .filter-dropdown-menu {
    left: auto;
    right: 0;
}

.filter-dropdown-wrap.show .filter-dropdown-menu {
    opacity: 1;
    visibility: visible;
    transform: translateY(0) scale(1);
}

.filter-option {
    padding: 8px 12px;
    border: none;
    border-radius: 5px;
    background: transparent;
    color: var(--text-2);
    font-size: 12px;
    font-weight: 500;
    text-align: left;
    cursor: pointer;
    transition: background 0.12s ease;
}

[dir="rtl"] .filter-option {
    text-align: right;
}

.filter-option:hover {
    background: var(--bg-hover);
    color: var(--text);
}

.filter-option.active {
    font-weight: 700;
    color: var(--text);
    background: var(--bg-hover);
}

[data-theme="dark"] .filter-option.active {
    background: rgba(255, 184, 0, 0.12);
    color: #ffb800;
}

/* View Toggle */
.view-toggle {
    display: flex;
    padding: 3px;
    border-radius: 8px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    gap: 2px;
}

.vt-btn {
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 5px;
    color: var(--text-4);
    background: transparent;
    border: none;
    transition: all 120ms ease;
}

.vt-btn:hover {
    color: var(--text);
}

.vt-btn.active {
    background: #fffbeb;
    color: #d97706;
    border: 1px solid #fde68a;
}

[data-theme="dark"] .vt-btn.active {
    background: rgba(255, 184, 0, 0.18);
    color: #fbbf24;
    border-color: rgba(255, 184, 0, 0.3);
}

/* ── FILE TABLE ── */
.file-tbl {
    border-radius: 12px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    overflow: hidden;
    box-shadow: var(--shadow-card);
}

.file-tbl .trow {
    display: grid;
    grid-template-columns: 40px 1fr 90px 160px 90px;
    gap: 12px;
    align-items: center;
    height: 52px;
    padding: 0 16px;
    border-bottom: 1px solid #f1f5f9;
    transition: background 120ms ease, transform 150ms var(--ease), border-color 150ms ease;
}

[data-theme="dark"] .file-tbl .trow {
    border-color: rgba(255, 255, 255, 0.06);
}

.file-tbl .trow:last-child {
    border-bottom: none;
}

.file-tbl .trow:not(.thead):hover {
    background: #f8fafc;
}

[data-theme="dark"] .file-tbl .trow:not(.thead):hover {
    background: rgba(255, 255, 255, 0.03);
}

.thead {
    height: 40px;
    background: #f8fafc;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--text-4);
}

[data-theme="dark"] .thead {
    background: rgba(255, 255, 255, 0.04);
}

.f-icon {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    border: 1px solid var(--border);
}

.f-icon-dir {
    background: #fffbeb;
    border-color: #fde68a;
    color: #d97706;
}

.f-icon-file {
    background: #f1f5f9;
    border-color: #e2e8f0;
    color: #64748b;
}

[data-theme="dark"] .f-icon-dir {
    background: rgba(255, 184, 0, 0.15);
    border-color: rgba(255, 184, 0, 0.3);
    color: #fbbf24;
}

[data-theme="dark"] .f-icon-file {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.1);
    color: #94a3b8;
}

.f-name {
    min-width: 0;
}

.f-link {
    display: block;
    font-weight: 600;
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--text);
}

.f-link:hover {
    color: var(--a-5);
}

.f-sub {
    font-size: 11px;
    color: var(--text-4);
    font-variant-numeric: tabular-nums;
}

/* Empty State */
.empty-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 40px 20px;
    text-align: center;
}

.empty-circle {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--n-4);
    color: var(--text-4);
}

.empty-circle.err {
    background: rgba(239, 68, 68, 0.08);
    color: var(--danger);
}

.empty-text {
    font-size: 13px;
    color: var(--text-3);
    line-height: 1.5;
}

.empty-text strong {
    display: block;
    color: var(--text);
    font-size: 14px;
    margin-bottom: 2px;
}

/* Grid Mode */
.file-tbl.grid-mode .thead {
    display: none;
}

.file-tbl.grid-mode #rows {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
    padding: 14px;
}

.file-tbl.grid-mode .trow {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    height: auto;
    padding: 18px 12px;
    border: 1px solid var(--border);
    border-radius: 10px;
    gap: 8px;
}

.file-tbl.grid-mode .trow:hover {
    border-color: #fde68a;
    transform: translateY(-2px);
}

[data-theme="dark"] .file-tbl.grid-mode .trow:hover {
    border-color: rgba(255, 184, 0, 0.3);
}

.file-tbl.grid-mode .f-icon {
    width: 40px;
    height: 40px;
}

.file-tbl.grid-mode .trow>div:nth-child(3),
.file-tbl.grid-mode .trow>div:nth-child(4),
.file-tbl.grid-mode .trow>div:nth-child(5) {
    display: none;
}

/* ── RESPONSIVE ── */
@media (max-width: 900px) {
    .browse-search {
        width: 100%;
        order: 1;
        /* Push search to bottom row */
    }

    .browse-search:focus-within {
        width: 100%;
    }
}

@media (max-width: 640px) {
    .browse-head {
        padding: 14px;
    }

    .browse-title-row {
        flex-direction: column;
        align-items: stretch;
    }

    .browse-controls {
        justify-content: space-between;
    }

    .file-tbl .trow {
        grid-template-columns: 36px 1fr;
        height: auto;
        padding: 10px 14px;
    }

    .file-tbl .trow>div:nth-child(3),
    .file-tbl .trow>div:nth-child(4),
    .file-tbl .trow>div:nth-child(5) {
        display: none;
    }

    .thead {
        display: none;
    }
}
```

---

<a id="file-3"></a>

### 📄 File 3/18: `assets/css/components.css`

| Property | Value |
|----------|-------|
| **Path** | `assets/css/components.css` |
| **Language** | CSS |
| **Size** | 15.6 KB |
| **Lines** | 781 |

```css
/* ═══════════════════════════════════════════════════════════════
   components.css — shadcn-style primitives
   Nav, Button, Input, Badge, Select, Card, Table
   ═══════════════════════════════════════════════════════════════ */

/* ── Top Navigation — white pill, tabs centered ── */
.nav {
    position: sticky;
    top: 12px;
    z-index: 50;
    animation: fadeUp 250ms var(--ease) both;
}

.nav-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    height: 56px;
    padding: 0 16px 0 14px;
    border-radius: 9px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-sm);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
}

.nav-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
}

.nav-logo img {
    width: 36px;
    height: 36px;
    border-radius: 6px;
    object-fit: contain;
}

.nav-logo-text {
    display: flex;
    flex-direction: column;
    line-height: 1;
    gap: 2px;
}

.nav-logo-text strong {
    font-size: 14px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--text);
}

.nav-logo-text span {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-4);
}

/* — Center tabs (Website / Docs / Downloads) — */
.nav-tabs {
    display: flex;
    align-items: center;
    gap: 4px;
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
}

.nav-tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 14px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-3);
    border: 1px solid transparent;
    transition: all var(--dur-1) ease;
    position: relative;
}

.nav-tab svg {
    opacity: 0.7;
}

.nav-tab:hover {
    background: var(--bg-hover);
    color: var(--text);
}

.nav-tab.active {
    color: var(--text);
    font-weight: 700;
}

.nav-tab.active::after {
    content: "";
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: -9px;
    height: 2.5px;
    background: var(--a-5);
    border-radius: 999px;
}

.nav-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}

/* ── Buttons (shadcn) ── */
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 36px;
    padding: 0 16px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    border: 1px solid var(--border);
    background: var(--bg-card);
    color: var(--text-2);
    white-space: nowrap;
    transition: all var(--dur-1) ease;
    user-select: none;
}

.btn:hover {
    background: var(--bg-hover);
    border-color: var(--border-hover);
    color: var(--text);
}

.btn:active {
    transform: scale(0.97);
}

.btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
}

.btn:focus-visible {
    outline: 2px solid var(--ring);
    outline-offset: 2px;
}

.btn-primary {
    background: var(--a-5);
    border-color: #e6a600;
    color: #111;
    font-weight: 700;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.btn-primary:hover {
    background: #ffb31a;
    border-color: #d99000;
    color: #000;
}

.btn-sm {
    height: 32px;
    padding: 0 12px;
    font-size: 12.5px;
    border-radius: 6px;
}

.btn-icon {
    width: 36px;
    padding: 0;
    border-radius: 6px;
}

.btn-icon.btn-sm {
    width: 32px;
    height: 32px;
}

/* — Theme btn— */
.theme-btn {
    width: 36px;
    min-width: 36px;
    height: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--bg-card);
    color: var(--text-3);
    position: relative;
    overflow: hidden;
    transition: all var(--dur-1) ease;
}

.theme-btn:hover {
    background: var(--bg-hover);
    color: var(--text);
    border-color: var(--border-hover);
}

.theme-btn svg {
    position: absolute;
    transition: all var(--dur-2) var(--ease);
}

.theme-btn .icon-sun {
    opacity: 0;
    transform: rotate(-90deg) scale(0.6);
}

.theme-btn .icon-moon {
    opacity: 1;
    transform: rotate(0) scale(1);
}

[data-theme="light"] .theme-btn .icon-sun {
    opacity: 1;
    transform: rotate(0) scale(1);
}

[data-theme="light"] .theme-btn .icon-moon {
    opacity: 0;
    transform: rotate(90deg) scale(0.6);
}

/* — Language pill — */
.lang-pill {
    height: 36px;
    min-height: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 0 11px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--bg-card);
    color: var(--text-3);
    font: inherit;
    line-height: 1;
    cursor: default;
    /* Trigger is hover-only, not a language toggle */
    white-space: nowrap;
    transition: border-color var(--dur-1) ease, background var(--dur-1) ease;
}

.lang-pill svg {
    display: block;
    flex-shrink: 0;
}

/* ── Optional visual feedback on hover ── */
.lang-dropdown-wrap:hover .lang-pill {
    border-color: var(--border-hover);
    background: var(--bg-hover);
}

/* ── Language Dropdown ── */
.lang-dropdown-wrap {
    position: relative;
    display: inline-flex;
    align-items: stretch;
    height: 36px;
}

/* Menu */
.lang-dropdown-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    min-width: 132px;
    padding: 4px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
    opacity: 0;
    visibility: hidden;
    transform: translateY(-4px) scale(0.98);
    transition: all 0.15s ease;
    z-index: 200;
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.lang-dropdown-wrap:hover .lang-dropdown-menu {
    opacity: 1;
    visibility: visible;
    transform: translateY(0) scale(1);
}

/* RTL */
[dir="rtl"] .lang-dropdown-menu {
    right: auto;
    left: 0;
}

/* Options */
.lang-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 7px 10px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--text-main);
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.12s ease;
}

.lang-option span {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    opacity: 0.7;
}

.lang-option:hover {
    background: var(--bg-hover);
}

/* Active language */
:root .lang-option.active,
[data-theme="light"] .lang-option.active {
    background: #fef3c7;
    color: #b45309;
    font-weight: 600;
}


[data-theme="light"] .lang-option.active span {
    color: #d97706;
    opacity: 1;
}

[data-theme="dark"] .lang-option.active {
    background: rgba(255, 184, 0, 0.14);
    color: #ffb800;
    font-weight: 600;
}

[data-theme="dark"] .lang-option.active span {
    color: #ffb800;
    opacity: 0.9;
}

/* ── Inputs ── */
.input-wrap {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;
    height: 42px;
    padding: 0 8px 0 12px;
    border-radius: 8px;
    background: var(--input-bg);
    border: 1px solid var(--border);
    transition: border-color var(--dur-1) ease, box-shadow var(--dur-1) ease;
}

.input-wrap:focus-within {
    border-color: var(--border-focus);
    box-shadow: 0 0 0 3px rgba(255, 184, 0, 0.18);
}

.input-wrap svg {
    color: var(--text-4);
    flex-shrink: 0;
}

.input-wrap input {
    flex: 1;
    min-width: 0;
    height: 100%;
    border: none;
    outline: none;
    background: none;
    color: var(--text);
    font-family: var(--font);
    font-size: 13.5px;
}

.input-wrap input::placeholder {
    color: var(--text-4);
}

.search-keys {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
}

kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 5px;
    border-radius: 5px;
    font-family: var(--mono);
    font-size: 10px;
    font-weight: 600;
    color: var(--text-4);
    background: var(--n-4);
    border: 1px solid var(--border);
}

/* ── Badges ── */
.badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 20px;
    padding: 0 7px;
    border-radius: 5px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
}

.badge-new {
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fde68a;
}

.badge-dir {
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #fde68a;
}

.badge-file {
    background: #f1f5f9;
    color: #475569;
    border: 1px solid #e2e8f0;
}

[data-theme="dark"] .badge-new {
    background: rgba(255, 184, 0, 0.18);
    color: #fcd34d;
    border-color: rgba(255, 184, 0, 0.3);
}

[data-theme="dark"] .badge-file {
    background: rgba(255, 255, 255, 0.08);
    color: #94a3b8;
    border-color: rgba(255, 255, 255, 0.12);
}

/* ── Card primitive ── */
.card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 9px;
    box-shadow: var(--shadow-card);
}

/* ── Footer — status bar style ── */
.footer {
    margin-top: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 11px;
    color: var(--text-4);
    gap: 12px;
    flex-wrap: wrap;
}

.footer a {
    color: var(--text-3);
}

.footer a:hover {
    color: var(--text);
}

/* — Status bar (bottom 4-col) — */
.status-bar {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: var(--shadow-card);
}

.status-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    position: relative;
}

.status-item+.status-item {
    border-left: 1px solid var(--border);
}

.status-item-icon {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    background: var(--n-4);
    color: var(--text-3);
    flex-shrink: 0;
}

.status-item-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
}

.status-item-label {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-2);
    line-height: 1;
}

.status-item-sub {
    font-size: 11px;
    color: var(--text-4);
    display: flex;
    align-items: center;
    gap: 5px;
    white-space: nowrap;
}

.status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 6px rgba(16, 185, 129, 0.4);
}

@media (max-width: 900px) {
    .status-bar {
        grid-template-columns: 1fr 1fr;
    }

    .status-item+.status-item {
        border-left: none;
        border-top: 1px solid var(--border);
    }

    .status-item:nth-child(2) {
        border-top: none;
    }

    .status-item:nth-child(even) {
        border-left: 1px solid var(--border);
    }
}

@media (max-width: 480px) {
    .status-bar {
        grid-template-columns: 1fr;
    }

    .status-item:nth-child(even) {
        border-left: none;
    }

    .status-item+.status-item {
        border-left: none;
    }
}

/* ── Autocomplete dropdown — light card ── */
.ac-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
    z-index: 100;
    /* High z-index to stay above everything */
    overflow: hidden;
    opacity: 0;
    transform: translateY(-6px) scale(0.98);
    pointer-events: none;
    transition: opacity 180ms ease, transform 180ms ease;
    backdrop-filter: blur(12px);
}

.ac-dropdown.show {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
}

.ac-list {
    list-style: none;
    margin: 0;
    padding: 6px;
    max-height: 280px;
    overflow-y: auto;
}

/* Custom Scrollbar for list */
.ac-list::-webkit-scrollbar {
    width: 5px;
}

.ac-list::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 3px;
}

/* ── AUTOCOMPLETE ITEM ── */
.ac-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 14px;
    border-radius: 8px;
    cursor: pointer;
    border-left: 2.5px solid transparent;
    transition: all 140ms ease;
}

.ac-item:hover,
.ac-item.active {
    background: var(--bg-hover);
    border-left-color: var(--a-5);
}

.ac-item-left {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    flex: 1;
}

/* ── ICONS (Light Theme Defaults) ── */
.ac-icon {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    flex-shrink: 0;
    border: 1px solid var(--border);
    transition: all 0.2s ease;
}

.ac-icon-dir {
    background: #fef3c7;
    color: #d97706;
    border-color: #fde68a;
}

.ac-icon-file {
    background: #f1f5f9;
    color: #64748b;
    border-color: #e2e8f0;
}

/* ── ICONS (Dark Theme Overrides) ── */
[data-theme="dark"] .ac-icon-dir {
    background: rgba(255, 184, 0, 0.12);
    color: #fcd34d;
    border-color: rgba(255, 184, 0, 0.25);
}

[data-theme="dark"] .ac-icon-file {
    background: rgba(255, 255, 255, 0.05);
    color: #94a3b8;
    border-color: rgba(255, 255, 255, 0.1);
}

.ac-info {
    min-width: 0;
}

.ac-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ac-path {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--text-4);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ac-highlight {
    background: rgba(255, 184, 0, 0.18);
    color: #92400e;
    padding: 0 2px;
    border-radius: 3px;
    font-weight: 700;
}

[data-theme="dark"] .ac-highlight {
    color: #fcd34d;
}

.ac-footer {
    padding: 8px 12px;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--text-4);
    background: var(--n-4);
}

.ac-empty {
    padding: 16px;
    text-align: center;
    color: var(--text-4);
    font-size: 13px;
}

/* ── Responsive nav ── */
@media (max-width: 900px) {
    .nav-tabs {
        display: none;
    }
}

@media (max-width: 640px) {
    .nav-bar {
        height: 52px;
    }

    .search-keys {
        display: none;
    }
}
```

---

<a id="file-4"></a>

### 📄 File 4/18: `assets/css/home.css`

| Property | Value |
|----------|-------|
| **Path** | `assets/css/home.css` |
| **Language** | CSS |
| **Size** | 26.4 KB |
| **Lines** | 1274 |

```css
/* ═══════════════════════════════════════════════════════════════
   home.css — AVID Download Infrastructure (matches new-ui.png)
   Skill-guided: Flat Design + Enterprise Gateway pattern
   ───────────────────────────────────────────────────────────────
   Sections:
   1. Hero (white card, search, illustration)
   2. Infrastructure Resources (6 cards)
   3. Latest Releases + Quick Access (2-col)
   4. Search Results panel (overlay)
   ═══════════════════════════════════════════════════════════════ */

.home-layout {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 16px;
    width: 100%;
}

/* ── HERO — white card with soft glow, matches mock ── */
.hero-max {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 32px;
    padding: 28px 28px 28px 32px;
    border-radius: 10px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-sm);
    position: relative;
    overflow: visible !important;
    min-height: 260px;
}

.hero-max::before {
    content: "";
    position: absolute;
    inset: 0 0 auto 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 184, 0, 0.5), transparent);
    opacity: 0.6;
}

.hero-content {
    position: relative;
    z-index: 2;
    flex: 1;
    max-width: 620px;
    /* Expands content area to balance visual weight */
}

[dir="rtl"] .hero-content,
html[lang="fa"] .hero-content,
body.rtl .hero-content {
    margin-right: 0;
    margin-left: auto;
}

/* — pill — */
.hero-pill {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    width: fit-content;
    padding: 5px 12px;
    border-radius: 999px;
    background: #fffbeb;
    border: 1px solid #fde68a;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #b45309;
    margin-bottom: 14px;
}

.hero-pill-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #f59e0b;
}

[data-theme="dark"] .hero-pill {
    background: rgba(255, 184, 0, 0.12);
    border-color: rgba(255, 184, 0, 0.25);
    color: #fcd34d;
}


/* ── TITLE & TYPOGRAPHY ── */
.hero-content h1 {
    font-size: 2.4rem;
    line-height: 1.15;
    margin-bottom: 12px;
    letter-spacing: -0.02em;
}

.hero-content h1 .avid {
    color: #0f172a;
}

[data-theme="dark"] .hero-content h1 .avid {
    color: #fff;
}

.hero-content h1 .accent {
    color: var(--a-5);
}

/* ── DESCRIPTION ── */
.hero-desc {
    font-size: 14.5px;
    line-height: 1.6;
    color: #64748b;
    margin-bottom: 22px;
    /* Generous spacing before the search bar */
}

[data-theme="dark"] .hero-desc {
    color: #94a3b8;
}

/* ── SEARCH ROW (Modern 48px Height) ── */
.hero-search {
    display: flex;
    gap: 10px;
    align-items: center;
    width: 100%;
    max-width: 600px;
    /* Extended width to fill empty middle space */
    position: relative;
    z-index: 30;
}

.hero-search .input-wrap {
    flex: 1;
    height: 48px;
    /* Increased from 42px for better ergonomics */
    border-radius: 12px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    box-shadow: 0 2px 4px rgba(15, 23, 42, 0.04);
    display: flex;
    align-items: center;
    padding: 0 12px 0 16px;
    gap: 10px;
    transition: all 0.2s ease;
}

[data-theme="dark"] .hero-search .input-wrap {
    background: rgba(15, 23, 42, 0.6);
    border-color: rgba(255, 255, 255, 0.12);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.hero-search .input-wrap:focus-within {
    border-color: var(--a-5);
    box-shadow: 0 0 0 3px rgba(255, 184, 0, 0.2);
}

.hero-search .input-wrap input {
    width: 100%;
    height: 100%;
    background: transparent;
    border: none;
    outline: none;
    font-size: 14px;
    color: inherit;
    padding-left: 4px;
}

.hero-search .btn-primary {
    height: 48px;
    /* Matches input height */
    padding: 0 24px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 700;
    background: var(--a-5);
    border: 1px solid var(--a-5);
    color: #111;
    box-shadow: 0 2px 6px rgba(255, 184, 0, 0.25);
    flex-shrink: 0;
    cursor: pointer;
    transition: all 0.2s ease;
}

.hero-search .btn-primary:hover {
    background: #ffb31a;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(255, 184, 0, 0.35);
}

[dir="rtl"] .hero-search .input-wrap input,
html[lang="fa"] .hero-search .input-wrap input,
body.rtl .hero-search .input-wrap input {
    padding-left: 0;
    padding-right: 4px;
}

.hero-visual {
    position: absolute;
    right: -30px;
    top: 50%;
    transform: translateY(-50%) rotate(-12deg);
    transform-origin: center center;
    width: 700px;
    height: auto;
    opacity: 0.14;
    pointer-events: none;
    z-index: 1;
    overflow: visible;
    padding: 0;
    transition: transform 0.3s ease;
}

[dir="rtl"] .hero-visual,
html[lang="fa"] .hero-visual,
body.rtl .hero-visual {
    right: auto;
    /* Reset right positioning */
    left: -60px;
    /* Push logo to the left side */
    transform: translateY(-50%) rotate(12deg);
    /* Mirrored 12deg rotation for RTL */
}

.hero-illust {
    position: relative;
    width: 100%;
    max-width: 440px;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* city silhouette bg */
.hero-city {
    position: absolute;
    inset: 10% -10% 0 -10%;
    opacity: 0.06;
    background:
        linear-gradient(180deg, transparent 0%, var(--bg) 90%),
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 200'%3E%3Cpath fill='%2364748b' d='M0 200 V80 H40 V40 H80 V100 H110 V60 H150 V120 H180 V30 H220 V90 H260 V50 H300 V130 H340 V20 H380 V100 H420 V70 H460 V140 H500 V40 H540 V110 H600 V200 Z'/%3E%3C/svg%3E");
    background-size: cover;
    background-position: bottom;
    pointer-events: none;
    border-radius: 12px;
}

.hero-cloud-wrap {
    position: relative;
    z-index: 2;
    width: 100%;
    max-width: 340px;
    height: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    filter: drop-shadow(0 12px 28px rgba(255, 184, 0, 0.18));
    animation: floatCloud 6s ease-in-out infinite;
}

.hero-cloud-wrap img {
    width: 100%;
    height: auto;
    max-height: 220px;
    object-fit: contain;
}

@keyframes floatCloud {

    0%,
    100% {
        transform: translateY(0)
    }

    50% {
        transform: translateY(-6px)
    }
}

/* — DUAL-THEME LOGO-SWAP (your markup) — */
.logo-shader {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 340px;
    height: 340px;
    transform: translate(-50%, -50%);
    background: radial-gradient(circle, var(--glow-strong, rgba(255, 184, 0, 0.18)) 0%, transparent 70%);
    filter: blur(36px);
    pointer-events: none;
    opacity: 0.85;
    z-index: 0;
}

.logo-swap {
    display: grid;
    place-items: center;
    width: 100%;
}

[data-theme="dark"] .logo-swap {
    filter: drop-shadow(0 12px 32px rgba(0, 0, 0, 0.45));
}

.logo-layer {
    grid-area: 1 / 1;
    width: 100%;
    height: auto;
    object-fit: contain;
    filter: blur(0.5px);
}

.logo-dark {
    opacity: 1;
    transform: scale(1);
    filter: blur(0);
}

.logo-light {
    opacity: 0;
    transform: scale(1.02);
    filter: blur(6px);
}

[data-theme="light"] .logo-dark {
    opacity: 0;
    transform: scale(0.98);
    filter: blur(6px);
}

[data-theme="light"] .logo-light {
    opacity: 1;
    transform: scale(1);
    filter: blur(0);
}

@media (prefers-reduced-motion: reduce) {

    .hero-cloud-wrap,
    .logo-swap {
        animation: none;
    }
}

/* cloud SVG styling */
.hero-cloud-svg {
    width: 100%;
    height: 100%;
    overflow: visible;
}

/* — responsive hero — */
@media (max-width: 1024px) {
    .hero-max {
        flex-direction: column;
        align-items: stretch;
        padding: 24px;
        gap: 20px;
    }

    .hero-content {
        max-width: none;
    }

    .hero-visual {
        flex: none;
        min-height: 200px;
        height: auto;
        justify-content: center;
    }

    .hero-illust {
        max-width: 460px;
        margin: 0 auto;
    }

    .logo-swap {
        max-width: 340px;
    }

    .logo-layer {
        max-height: 180px;
    }
}

@media (max-width: 640px) {
    .hero-content h1 {
        font-size: 28px;
    }

    .hero-search {
        flex-direction: column;
        align-items: stretch;
    }

    .hero-search .btn-primary {
        width: 100%;
    }

    .hero-visual {
        min-height: 160px;
        height: auto;
    }

    .logo-layer {
        max-height: 150px;
    }
}

/* ═══════════════════════════════════════════════════════════════
   INFRASTRUCTURE RESOURCES — section header + 6 cards (3x2)
   ═══════════════════════════════════════════════════════════════ */

.resources-section {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.section-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
}

.section-head-left {
    display: flex;
    gap: 12px;
    align-items: flex-start;
}

.section-icon {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    color: var(--text);
    box-shadow: var(--shadow-sm);
    flex-shrink: 0;
}

.section-title {
    font-size: 15px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--text);
    line-height: 1.2;
}

.section-sub {
    font-size: 12px;
    color: var(--text-4);
    margin-top: 2px;
}

.section-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

/* ── CUSTOM FILTER DROPDOWNS (Category & Sorting) ── */
.filter-dropdown-wrap {
    position: relative;
    display: inline-flex;
}

.filter-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 32px;
    padding: 0 12px;
    border-radius: 6px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    font-size: 12px;
    font-weight: 500;
    color: var(--text-3);
    box-shadow: var(--shadow-sm);
    cursor: pointer;
    transition: all var(--dur-1) ease;
}

.filter-pill:hover,
.filter-dropdown-wrap.show .filter-pill {
    border-color: var(--border-hover);
    background: var(--bg-hover);
    color: var(--text);
}

.filter-pill svg {
    color: var(--text-4);
    transition: transform var(--dur-1) ease;
}

.filter-dropdown-wrap.show .filter-pill svg {
    transform: rotate(180deg);
}

/* Dropdown Menu */
.filter-dropdown-menu {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    min-width: 100%;
    padding: 4px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
    opacity: 0;
    visibility: hidden;
    transform: translateY(-4px) scale(0.98);
    transition: all 0.15s ease;
    z-index: 100;
    display: flex;
    flex-direction: column;
    gap: 2px;
    white-space: nowrap;
}

/* RTL Support */
[dir="rtl"] .filter-dropdown-menu {
    left: auto;
    right: 0;
}

.filter-dropdown-wrap.show .filter-dropdown-menu {
    opacity: 1;
    visibility: visible;
    transform: translateY(0) scale(1);
}

/* Dropdown Options */
.filter-option {
    padding: 8px 12px;
    border: none;
    border-radius: 5px;
    background: transparent;
    color: var(--text-2);
    font-size: 12px;
    font-weight: 500;
    text-align: left;
    cursor: pointer;
    transition: background 0.12s ease;
}

[dir="rtl"] .filter-option {
    text-align: right;
}

.filter-option:hover {
    background: var(--bg-hover);
    color: var(--text);
}

.filter-option.active {
    font-weight: 700;
    color: var(--text);
    background: var(--bg-hover);
}

[data-theme="dark"] .filter-option.active {
    background: rgba(255, 184, 0, 0.12);
    color: #ffb800;
}

.view-toggle {
    display: flex;
    padding: 3px;
    border-radius: 6px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-sm);
    gap: 2px;
}

.vt-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    color: var(--text-4);
    background: transparent;
    border: none;
    transition: all 120ms ease;
}

.vt-btn.active {
    background: #fffbeb;
    color: #d97706;
    border: 1px solid #fde68a;
    border-radius: 4px;
}

[data-theme="dark"] .vt-btn.active {
    background: rgba(255, 184, 0, 0.18);
    color: #fbbf24;
    border-color: rgba(255, 184, 0, 0.3);
}

.vt-btn:hover {
    color: var(--text);
    border-radius: 8px;
}

/* — 6 cards grid 3x2 — */
.resources-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
}

@media (max-width: 1024px) {
    .resources-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 640px) {
    .resources-grid {
        grid-template-columns: 1fr;
    }
}

.resource-card {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 9px;
    box-shadow: var(--shadow-card);
    text-decoration: none;
    color: inherit;
    position: relative;
    transition: all var(--dur-2) var(--ease);
    cursor: pointer;
}

.resource-card:hover {
    border-color: #fde68a;
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
    transform: translateY(-2px);
}

[data-theme="dark"] .resource-card:hover {
    border-color: rgba(255, 184, 0, 0.25);
}

.resource-icon {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    color: #334155;
    flex-shrink: 0;
    font-size: 18px;
}

.resource-card:nth-child(1) .resource-icon {
    background: #fffbeb;
    border-color: #fde68a;
    color: #d97706;
}

.resource-icon svg {
    width: 22px;
    height: 22px;
}

.resource-meta {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.resource-meta h3 {
    font-size: 13px;
    font-weight: 700;
    color: var(--text);
    line-height: 1.2;
}

.resource-meta p {
    font-size: 11.5px;
    color: var(--text-3);
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.resource-bottom {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    font-size: 11px;
    color: var(--text-4);
}

.resource-bottom .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #10b981;
}

.resource-arrow {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--bg-card);
    color: var(--text-4);
    flex-shrink: 0;
    align-self: center;
    transition: all 150ms ease;
}

.resource-card:hover .resource-arrow {
    background: var(--a-5);
    border-color: var(--a-5);
    color: #111;
    transform: translateX(2px);
}

/* ═══════════════════════════════════════════════════════════════
   BOTTOM 2-COL — Latest Releases (table) + Quick Access (list)
   ═══════════════════════════════════════════════════════════════ */
.bottom-grid {
    display: grid;
    grid-template-columns: 1.65fr 0.9fr;
    gap: 12px;
    align-items: start;
}

@media (max-width: 1024px) {
    .bottom-grid {
        grid-template-columns: 1fr;
    }
}

.panel {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 9px;
    box-shadow: var(--shadow-card);
    overflow: hidden;
}

.panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px 12px;
    border-bottom: 1px solid var(--border);
}

.panel-head-left {
    display: flex;
    align-items: center;
    gap: 8px;
}

.panel-icon {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #f59e0b;
}

.panel-title {
    font-size: 13px;
    font-weight: 800;
    color: var(--text);
    line-height: 1;
}

.panel-sub {
    font-size: 11px;
    color: var(--text-4);
    margin-top: 2px;
}

.panel-link {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-3);
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.panel-link:hover {
    color: var(--text);
}

/* — Latest Releases table — */
.releases-table {
    width: 100%;
    border-collapse: collapse;
}

.releases-table th {
    text-align: left;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-4);
    background: #f8fafc;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
}

[data-theme="dark"] .releases-table th {
    background: rgba(255, 255, 255, 0.04);
}

.releases-table td {
    padding: 10px 12px;
    font-size: 12px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
}

[data-theme="dark"] .releases-table td {
    border-color: rgba(255, 255, 255, 0.06);
}

.releases-table tr:last-child td {
    border-bottom: none;
}

.releases-table tr:hover td {
    background: #f8fafc;
}

[data-theme="dark"] .releases-table tr:hover td {
    background: rgba(255, 255, 255, 0.03);
}

.version-cell {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    color: var(--text);
}

.version-cell .badge-new {
    font-size: 9px;
    height: 16px;
    padding: 0 5px;
}

.type-cell {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text-3);
    font-size: 11px;
}

.type-cell svg {
    opacity: 0.7;
}

.mono {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--text-4);
}

.download-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 26px;
    padding: 0 10px;
    border-radius: 7px;
    background: #fffbeb;
    border: 1px solid #fde68a;
    color: #92400e;
    font-size: 11px;
    font-weight: 600;
    transition: all 120ms ease;
    white-space: nowrap;
}

.download-btn:hover {
    background: #fef3c7;
    border-color: #fcd34d;
}

.download-btn svg {
    width: 12px;
    height: 12px;
}

.row-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    justify-content: flex-end;
}

.icon-btn {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--text-4);
}

.icon-btn:hover {
    background: var(--bg-hover);
    border-color: var(--border);
    color: var(--text);
}

@media (max-width: 768px) {
    .releases-table {
        display: block;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
    }

    .releases-table th:nth-child(3),
    .releases-table td:nth-child(3) {
        display: none;
    }

    .releases-table th:nth-child(5),
    .releases-table td:nth-child(5) {
        display: none;
    }
}

/* — Quick Access list — */
.quick-list {
    display: flex;
    flex-direction: column;
}

.quick-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border-bottom: 1px solid #f1f5f9;
    transition: background 120ms ease;
    cursor: pointer;
}

.quick-item:last-child {
    border-bottom: none;
}

.quick-item:hover {
    background: #f8fafc;
}

[data-theme="dark"] .quick-item {
    border-color: rgba(255, 255, 255, 0.06);
}

[data-theme="dark"] .quick-item:hover {
    background: rgba(255, 255, 255, 0.03);
}

.quick-icon {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 5px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    color: #475569;
    flex-shrink: 0;
}

.quick-icon svg {
    width: 16px;
    height: 16px;
}

.quick-meta {
    flex: 1;
    min-width: 0;
}

.quick-meta-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--text);
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.quick-meta-sub {
    font-size: 11px;
    color: var(--text-4);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 1px;
}

.quick-arrow {
    color: var(--text-4);
    flex-shrink: 0;
}

.quick-item:hover .quick-arrow {
    color: var(--text);
    transform: translateX(2px);
}

/* ── Results panel (search results) — overlay card ── */
.results-panel {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: var(--shadow-md);
    overflow: hidden;
    animation: scaleIn 200ms var(--ease) both;
}

.results-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 44px;
    padding: 0 14px;
    border-bottom: 1px solid var(--border);
    background: #f8fafc;
}

[data-theme="dark"] .results-bar {
    background: rgba(255, 255, 255, 0.04);
}

.results-bar-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 700;
    color: var(--text);
}

.results-bar-meta {
    font-size: 11px;
    color: var(--text-4);
}

.results-body {
    max-height: 360px;
    overflow-y: auto;
}

.res-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid #f1f5f9;
    transition: background 120ms ease;
}

[data-theme="dark"] .res-row {
    border-color: rgba(255, 255, 255, 0.05);
}

.res-row:hover {
    background: #f8fafc;
}

[data-theme="dark"] .res-row:hover {
    background: rgba(255, 255, 255, 0.03);
}

.res-info a {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
}

.res-info a:hover {
    color: var(--text-accent);
}

.res-path {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--text-4);
}

@media (prefers-reduced-motion: reduce) {
    .hero-cloud-wrap {
        animation: none;
    }
}

/* ── SKELETON LOADING STATES ── */
.resource-card-skeleton {
    pointer-events: none;
    cursor: default;
}

.resource-card-skeleton .resource-arrow {
    display: none;
}

.skeleton-box,
.skeleton-line {
    background: linear-gradient(90deg,
            rgba(255, 255, 255, 0.05) 0%,
            rgba(255, 255, 255, 0.12) 50%,
            rgba(255, 255, 255, 0.05) 100%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s ease-in-out infinite;
    border-radius: 4px;
}

.skeleton-line-title {
    height: 16px;
    width: 60%;
    margin-bottom: 8px;
}

.skeleton-line-desc {
    height: 12px;
    width: 90%;
    margin-bottom: 6px;
}

.skeleton-line-desc-sm {
    height: 12px;
    width: 70%;
    margin-bottom: 12px;
}

.skeleton-line-meta {
    display: inline-block;
    height: 10px;
    width: 80px;
}

@keyframes skeleton-shimmer {
    0% {
        background-position: -200% 0;
    }

    100% {
        background-position: 200% 0;
    }
}

/* Light theme skeleton */
[data-theme="light"] .skeleton-box,
[data-theme="light"] .skeleton-line {
    background: linear-gradient(90deg,
            rgba(0, 0, 0, 0.04) 0%,
            rgba(0, 0, 0, 0.08) 50%,
            rgba(0, 0, 0, 0.04) 100%);
    background-size: 200% 100%;
}

/* ── STATUS INDICATORS ── */
.resource-status {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-left: 6px;
}

[dir="rtl"] .resource-status {
    margin-left: 0;
    margin-right: 6px;
}

.status-live {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: #10b981;
    font-weight: 500;
}

.status-error {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: #ef4444;
    font-weight: 500;
}

.dot-error {
    background: #ef4444 !important;
}

.badge-error {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.25);
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
}

.stat-empty {
    color: var(--text-muted, #94a3b8);
    font-style: italic;
    opacity: 0.7;
}

/* ── GLOBAL ERROR STATE ── */
.resources-error {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 40px 24px;
    background: rgba(239, 68, 68, 0.05);
    border: 1px dashed rgba(239, 68, 68, 0.25);
    border-radius: 10px;
    color: #ef4444;
    font-size: 14px;
}
```

---

<a id="file-5"></a>

### 📄 File 5/18: `assets/css/performance-modes.css`

| Property | Value |
|----------|-------|
| **Path** | `assets/css/performance-modes.css` |
| **Language** | CSS |
| **Size** | 18.7 KB |
| **Lines** | 585 |

```css
/* ═══════════════════════════════════════════════════════════════
   performance-modes.css — Adaptive Performance Tiers & UI
   Architecture: Progressive Visual Degradation (Enterprise Standard)
   
   Table of Contents:
   1. Tier: HIGH (Default)
   2. Tier: MEDIUM (Balanced)
   3. Tier: LOW (Power Saver)
   4. Tier: POTATO (Maximum Performance)
   5. User Interface (Performance Dropdown)
   6. System UI (Toast Notifications)
   7. Developer Tools (Debug Panel)
   8. Accessibility (Reduced Motion)
   ═══════════════════════════════════════════════════════════════ */

/* ───────────────────────────────────────────────────────────────
   1. TIER: HIGH (Default — Everything Enabled)
   ───────────────────────────────────────────────────────────────
   No CSS overrides are required. The system runs at maximum 
   visual fidelity with full blurs, shadows, and animations.
   ─────────────────────────────────────────────────────────────── */

/* ───────────────────────────────────────────────────────────────
   2. TIER: MEDIUM (Balanced)
   ───────────────────────────────────────────────────────────────
   Strategy: Reduce heavy compositing tasks (blur intensity) and
   slow down infinite background animations to save GPU cycles.
   ─────────────────────────────────────────────────────────────── */
[data-perf="medium"] .aura-glow-1,
[data-perf="medium"] .aura-glow-2 {
    filter: blur(20px);
    /* Reduced from 40-50px */
}

[data-perf="medium"] .nav-bar,
[data-perf="medium"] .ac-dropdown {
    backdrop-filter: blur(6px);
    /* Reduced from 12px */
    -webkit-backdrop-filter: blur(6px);
}

[data-perf="medium"] .logo-shader {
    filter: blur(20px);
    /* Reduced from 36px */
}

[data-perf="medium"] .hero-cloud-wrap {
    animation-duration: 10s;
    /* Slower animation = less GPU repaint */
}

/* ───────────────────────────────────────────────────────────────
   3. TIER: LOW (Power Saver)
   ───────────────────────────────────────────────────────────────
   Strategy: Completely disable expensive filters (backdrop-filter),
   remove ambient glows, simplify box-shadows, and convert complex
   bezier animations to rapid linear transitions.
   ─────────────────────────────────────────────────────────────── */

/* Disable all backdrop filters (heaviest CSS property) */
[data-perf="low"] .nav-bar,
[data-perf="low"] .ac-dropdown {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
}

/* Remove ambient background glows entirely */
[data-perf="low"] .aura-glow-1,
[data-perf="low"] .aura-glow-2,
[data-perf="low"] .logo-shader {
    display: none;
}

/* Simplify logo transition, remove blur filter */
[data-perf="low"] .logo-layer {
    filter: none !important;
    transition: opacity 100ms linear !important;
}

/* Flatten multi-layered shadows to a single, cheap drop-shadow */
[data-perf="low"] .resource-card,
[data-perf="low"] .panel,
[data-perf="low"] .file-tbl,
[data-perf="low"] .browse-head,
[data-perf="low"] .status-bar,
[data-perf="low"] .results-panel {
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08) !important;
}

/* Dark mode specific simplified shadows */
[data-theme="dark"][data-perf="low"] .resource-card,
[data-theme="dark"][data-perf="low"] .panel,
[data-theme="dark"][data-perf="low"] .file-tbl,
[data-theme="dark"][data-perf="low"] .browse-head,
[data-theme="dark"][data-perf="low"] .status-bar,
[data-theme="dark"][data-perf="low"] .results-panel {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3) !important;
}

/* Halt infinite decorative animations */
[data-perf="low"] .hero-cloud-wrap {
    animation: none;
}

/* Simplify skeleton shimmer to a static, low-opacity pulse */
[data-perf="low"] .skeleton-box,
[data-perf="low"] .skeleton-line {
    animation: none;
    opacity: 0.5;
}

/* Disable staggered entry animations (avoids layout recalculations) */
[data-perf="low"] .stagger>* {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
}

/* Force UI elements to use cheap, linear transitions */
[data-perf="low"] .resource-card,
[data-perf="low"] .btn,
[data-perf="low"] .nav-tab,
[data-perf="low"] .crumb {
    transition-duration: 80ms !important;
    transition-timing-function: linear !important;
}

/* Disable structural hover transforms to prevent composite layer creation */
[data-perf="low"] .resource-card:hover,
[data-perf="low"] .file-tbl.grid-mode .trow:hover {
    transform: none !important;
}

/* Remove decorative layout elements */
[data-perf="low"] .hero-max::before {
    display: none;
}

[data-perf="low"] .cav-banner-timer-bar {
    animation: none !important;
    transform: scaleX(1) !important;
}

/* ───────────────────────────────────────────────────────────────
   4. TIER: POTATO (Maximum Performance / Zero Eye Candy)
   ───────────────────────────────────────────────────────────────
   Strategy: Absolute zero visual overhead. Inherits all LOW 
   overrides, then forcefully kills ALL animations, transitions, 
   shadows, and decorative backdrops globally.
   ─────────────────────────────────────────────────────────────── */

/* Inherit LOW tier overrides */
[data-perf="potato"] .nav-bar,
[data-perf="potato"] .ac-dropdown {
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
}

/* Nuke all background aesthetics */
[data-perf="potato"] .aura-glow-1,
[data-perf="potato"] .aura-glow-2,
[data-perf="potato"] .logo-shader,
[data-perf="potato"] .hero-max::before,
[data-perf="potato"] .aura-backdrop {
    display: none !important;
}

/* ☢️ Force kill ALL animations and transitions globally */
[data-perf="potato"] *,
[data-perf="potato"] *::before,
[data-perf="potato"] *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
}

/* Eradicate all box-shadows to bypass drawing entirely */
[data-perf="potato"] .resource-card,
[data-perf="potato"] .panel,
[data-perf="potato"] .file-tbl,
[data-perf="potato"] .browse-head,
[data-perf="potato"] .status-bar,
[data-perf="potato"] .results-panel,
[data-perf="potato"] .nav-bar,
[data-perf="potato"] .ac-dropdown,
[data-perf="potato"] .card,
[data-perf="potato"] .btn {
    box-shadow: none !important;
}

/* Suppress all remaining hover transforms */
[data-perf="potato"] .resource-card:hover,
[data-perf="potato"] .file-tbl.grid-mode .trow:hover,
[data-perf="potato"] .resource-arrow,
[data-perf="potato"] .btn:active {
    transform: none !important;
}

/* Pure static skeletons */
[data-perf="potato"] .skeleton-box,
[data-perf="potato"] .skeleton-line {
    animation: none !important;
    background: var(--n-4) !important;
    opacity: 0.6;
}

/* Remove functional toggle animations (Theme, Wipe, etc.) */
[data-perf="potato"] .theme-btn svg {
    transition: none !important;
}

[data-perf="potato"] .logo-layer {
    filter: none !important;
    transition: none !important;
}

[data-perf="potato"] .logo-swap.wiping {
    clip-path: none !important;
}

/* Highly simplified scrollbar */
[data-perf="potato"] ::-webkit-scrollbar {
    width: 4px;
}

[data-perf="potato"] ::-webkit-scrollbar-thumb {
    border-radius: 0;
}

/* ───────────────────────────────────────────────────────────────
   5. USER INTERFACE (Performance Setting Dropdown)
   shadcn-inspired minimal architecture
   ─────────────────────────────────────────────────────────────── */

/* Dropdown Container */
.perf-dropdown-wrap {
    position: relative;
    display: inline-flex;
    align-items: stretch;
    height: 36px;
}

/* Trigger Button (Pill) */
.perf-pill {
    height: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 0 11px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--bg-card);
    color: var(--text-3);
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    line-height: 1;
    cursor: pointer;
    white-space: nowrap;
    transition: all var(--dur-1) ease;
}

/* SVG Icon in Pill */
.perf-pill svg {
    color: var(--text-4);
    transition: color var(--dur-1) ease;
}

/* Pill Hover & Active State */
.perf-dropdown-wrap:hover .perf-pill,
.perf-dropdown-wrap.show .perf-pill {
    border-color: var(--border-hover);
    background: var(--bg-hover);
    color: var(--text);
}

/* Highlight icon with brand color when active/hovered */
.perf-dropdown-wrap:hover .perf-pill svg,
.perf-dropdown-wrap.show .perf-pill svg {
    color: var(--a-5);
}

/* Dropdown Menu Panel */
.perf-dropdown-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    min-width: 170px;
    padding: 4px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
    opacity: 0;
    visibility: hidden;
    transform: translateY(-4px) scale(0.98);
    transition: all 0.15s ease;
    z-index: 200;
    /* Stays above general content */
    display: flex;
    flex-direction: column;
    gap: 3px;
    pointer-events: none;
}

/* RTL Layout Flip */
[dir="rtl"] .perf-dropdown-menu {
    right: auto;
    left: 0;
}

/* Menu Visible State */
.perf-dropdown-wrap.show .perf-dropdown-menu {
    opacity: 1;
    visibility: visible;
    transform: translateY(0) scale(1);
    pointer-events: auto;
}

/* Menu Item (Option) */
.perf-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 8px 10px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--text-2);
    font-size: 12.5px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    text-align: start;
    transition: background 0.12s ease, color 0.12s ease;
}

.perf-option:hover {
    background: var(--bg-hover);
    color: var(--text);
}

/* Selected Indicator Dot */
.perf-indicator-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: transparent;
    transition: background-color 0.12s ease, box-shadow 0.12s ease;
}

/* Selected Item - Base Active State */
.perf-option.active {
    font-weight: 700;
}

/* Selected Item - Light Theme */
:root .perf-option.active,
[data-theme="light"] .perf-option.active {
    background: #fffbeb;
    color: #b45309;
}

:root .perf-option.active .perf-indicator-dot,
[data-theme="light"] .perf-option.active .perf-indicator-dot {
    background: #d97706;
    box-shadow: 0 0 6px rgba(217, 119, 6, 0.4);
}

/* Selected Item - Dark Theme */
[data-theme="dark"] .perf-option.active {
    background: rgba(255, 184, 0, 0.12);
    color: #ffb800;
}

[data-theme="dark"] .perf-option.active .perf-indicator-dot {
    background: #ffb800;
    box-shadow: 0 0 6px rgba(255, 184, 0, 0.6);
}

/* Mobile Responsiveness for Dropdown Trigger */
@media (max-width: 480px) {
    .perf-pill span {
        display: none;
        /* Hide text, keep only icon */
    }

    .perf-pill {
        padding: 0 10px;
    }
}

/* ───────────────────────────────────────────────────────────────
   6. SYSTEM UI (Toast Notifications for Auto-Downgrades)
   ─────────────────────────────────────────────────────────────── */
.perf-toast {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    z-index: 99999;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-radius: 8px;
    background: var(--bg-card, #1e293b);
    border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    color: var(--text, #fff);
    font-family: var(--font, system-ui);
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 200ms ease, transform 200ms ease;
}

.perf-toast.show {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
    pointer-events: auto;
}

.perf-toast svg {
    color: #f59e0b;
    flex-shrink: 0;
}

/* Toast RTL Alignment */
[dir="rtl"] .perf-toast {
    left: auto;
    right: 50%;
    transform: translateX(50%) translateY(20px);
}

[dir="rtl"] .perf-toast.show {
    transform: translateX(50%) translateY(0);
}

/* ───────────────────────────────────────────────────────────────
   7. DEVELOPER TOOLS (Debug Panel via Ctrl+Shift+P)
   ─────────────────────────────────────────────────────────────── */
.perf-debug-panel {
    position: fixed;
    top: 70px;
    right: 16px;
    z-index: 99998;
    width: 260px;
    border-radius: 10px;
    background: var(--bg-card, #161922);
    border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
    font-family: var(--mono, monospace);
    font-size: 11px;
    color: var(--text, #e2e8f0);
    opacity: 0;
    visibility: hidden;
    transform: translateY(-8px) scale(0.96);
    transition: all 150ms ease;
    overflow: hidden;
}

/* Debug Panel RTL Alignment */
[dir="rtl"] .perf-debug-panel {
    right: auto;
    left: 16px;
}

.perf-debug-panel.show {
    opacity: 1;
    visibility: visible;
    transform: translateY(0) scale(1);
}

.perf-debug-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    font-weight: 700;
    font-size: 12px;
}

.perf-debug-close {
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: var(--text-4, #64748b);
    cursor: pointer;
    border-radius: 4px;
    font-size: 16px;
    line-height: 1;
}

.perf-debug-close:hover {
    background: var(--bg-hover, rgba(255, 255, 255, 0.06));
    color: var(--text, #fff);
}

.perf-debug-body {
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.perf-debug-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 3px 0;
}

.perf-debug-label {
    color: var(--text-4, #64748b);
    font-weight: 500;
}

.perf-debug-value {
    font-weight: 700;
    color: var(--text, #e2e8f0);
}

.perf-debug-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 8px 12px 10px;
    border-top: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}

.perf-debug-btn {
    flex: 1;
    min-width: 48px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--border, rgba(255, 255, 255, 0.1));
    border-radius: 5px;
    background: var(--bg-hover, rgba(255, 255, 255, 0.04));
    color: var(--text-3, #94a3b8);
    font-family: var(--mono, monospace);
    font-size: 9px;
    font-weight: 700;
    cursor: pointer;
    transition: all 100ms ease;
}

.perf-debug-btn:hover {
    background: var(--a-5, #ffb800);
    color: #111;
    border-color: var(--a-5, #ffb800);
}

.perf-debug-btn-auto {
    flex-basis: 100%;
}

/* ───────────────────────────────────────────────────────────────
   8. ACCESSIBILITY (Reduced Motion)
   ───────────────────────────────────────────────────────────────
   Respect OS-level user preferences unconditionally.
   Disables layout shifts and animated state changes globally.
   ─────────────────────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {

    [data-perf] *,
    [data-perf] *::before,
    [data-perf] *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
    }
}
```

---

<a id="file-6"></a>

### 📄 File 6/18: `assets/css/tokens.css`

| Property | Value |
|----------|-------|
| **Path** | `assets/css/tokens.css` |
| **Language** | CSS |
| **Size** | 6.4 KB |
| **Lines** | 221 |

```css
/* ═══════════════════════════════════════════════════════════════
   tokens.css — CloudAvid / AVID Download — Design System
   Architecture: shadcn/ui-inspired + UI-UX Pro Max Skill
   Pattern: Product Demo + Features | Style: Flat Design + Minimal Swiss
   Colors: Enterprise gold + neutral infrastructure (light-first)
   Generated via UI UX Pro Max Skill — design-system + color + typography
   ═══════════════════════════════════════════════════════════════ */

:root {
    /* ── Spacing scale (4px base) ── */
    --s1: 4px;
    --s2: 8px;
    --s3: 12px;
    --s4: 16px;
    --s5: 20px;
    --s6: 24px;
    --s7: 28px;
    --s8: 32px;
    --s10: 40px;
    --s12: 48px;
    --s14: 56px;
    --s16: 64px;
    --s20: 80px;
    --s24: 96px;

    /* ── Radius (shadcn) ── */
    --r1: 6px;
    --r2: 8px;
    --r3: 10px;
    --r4: 12px;
    --r5: 14px;
    --r6: 16px;
    --r-full: 9999px;
    --radius: 12px;

    /* ── Gold enterprise palette ── */
    --a-1: #332200;
    --a-2: #664400;
    --a-3: #b37700;
    --a-4: #e69900;
    --a-5: #ffb800;
    --a-6: #ffc733;
    --a-7: #ffd666;
    --a-8: #ffefb3;

    --danger: #ef4444;
    --success: #10b981;
    --warning: #f59e0b;

    /* ── Motion ── */
    --ease: cubic-bezier(0.16, 1, 0.3, 1);
    --ease-out: cubic-bezier(0.33, 1, 0.68, 1);
    --dur-1: 150ms;
    --dur-2: 200ms;
    --dur-3: 350ms;
    --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    --mono: 'JetBrains Mono', 'SF Mono', ui-monospace, monospace;
}

/* ───────────────────────────────────────────────────────────────
   LIGHT THEME — Default (matches mock: new-ui.png)
   Background: #f1f3f6 page, Card #ffffff, Border #e2e8f0
   Primary gold #FFB800 used for CTA, accent, pills
   ─────────────────────────────────────────────────────────────── */
:root,
[data-theme="light"] {
    color-scheme: light;

    /* — shadcn semantic tokens (HSL for Tailwind compat, plus hex fallbacks) — */
    --background: 0 0% 100%;
    --foreground: 222 47% 11%;

    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;

    --popover: 0 0% 100%;
    --popover-foreground: 222 47% 11%;

    --primary: 42 100% 50%;
    /* #ffb800 */
    --primary-foreground: 0 0% 7%;
    /* #111 */

    --secondary: 210 40% 96%;
    /* #f1f5f9 */
    --secondary-foreground: 222 47% 11%;

    --muted: 210 40% 98%;
    /* #f8fafc */
    --muted-foreground: 215 16% 47%;
    /* #64748b */

    --accent: 42 100% 50%;
    --accent-foreground: 0 0% 7%;

    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 98%;

    --border: 214 25% 82%;
    /* #e2e8f0 */
    --input: 214 32% 91%;
    --ring: 42 100% 50%;

    /* — legacy aliases for existing CSS — */
    --n-0: #ffffff;
    --n-1: #f1f3f6;
    --n-2: #f8fafc;
    --n-3: #ffffff;
    --n-4: #f1f5f9;
    --n-5: #e2e8f0;
    --n-6: #cbd5e1;
    --n-7: #94a3b8;
    --n-8: #64748b;
    --n-9: #475569;
    --n-10: #334155;
    --n-11: #1e293b;
    --n-12: #0f172a;

    --bg: #f1f3f6;
    --bg-card: #ffffff;
    --bg-hover: #f8fafc;
    --bg-input: #ffffff;
    --bg-elevated: #ffffff;

    --border: #e2e8f0;
    --border-hover: #cbd5e1;
    --border-focus: #ffb800;

    --text: #0f172a;
    --text-2: #334155;
    --text-3: #64748b;
    --text-4: #94a3b8;
    --text-accent: #b45309;

    --surface-glass: #ffffff;
    --nav-bg: #ffffff;
    --hero-grad: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
    --input-bg: #ffffff;
    --glow: rgba(255, 184, 0, 0.06);
    --glow-strong: rgba(255, 184, 0, 0.12);

    --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.05), 0 1px 3px rgba(15, 23, 42, 0.06);
    --shadow-md: 0 4px 12px rgba(15, 23, 42, 0.06), 0 2px 6px rgba(15, 23, 42, 0.04);
    --shadow-lg: 0 10px 30px rgba(15, 23, 42, 0.08), 0 4px 12px rgba(15, 23, 42, 0.05);
    --shadow-card: 0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04);
}

/* ── DARK THEME — OLED-inspired, enterprise gold retained ── */
[data-theme="dark"] {
    color-scheme: dark;

    --background: 232 18% 6%;
    --foreground: 0 0% 100%;

    --card: 232 14% 10%;
    --card-foreground: 0 0% 100%;

    --popover: 232 14% 10%;
    --popover-foreground: 0 0% 100%;

    --primary: 42 100% 50%;
    --primary-foreground: 0 0% 7%;

    --secondary: 232 14% 16%;
    --secondary-foreground: 0 0% 98%;

    --muted: 232 12% 14%;
    --muted-foreground: 215 16% 60%;

    --accent: 42 100% 50%;
    --accent-foreground: 0 0% 7%;

    --destructive: 0 62% 30%;
    --destructive-foreground: 0 0% 98%;

    --border: 232 12% 18%;
    --input: 232 12% 18%;
    --ring: 42 100% 50%;

    --n-0: #000000;
    --n-1: #08090e;
    --n-2: #0f1118;
    --n-3: #161922;
    --n-4: #1e2530;
    --n-5: #2d3545;
    --n-6: #3d465e;
    --n-7: #5c647e;
    --n-8: #7f88a3;
    --n-9: #a4adc7;
    --n-10: #c9d1e5;
    --n-11: #eef1f8;
    --n-12: #ffffff;

    --bg: #08090e;
    --bg-card: rgba(22, 25, 34, 0.9);
    --bg-hover: rgba(30, 37, 52, 0.95);
    --bg-input: rgba(15, 18, 28, 0.9);
    --bg-elevated: rgba(22, 25, 34, 0.95);

    --border: rgba(255, 255, 255, 0.08);
    --border-hover: rgba(255, 255, 255, 0.14);
    --border-focus: #ffb800;

    --text: #ffffff;
    --text-2: #e2e8f0;
    --text-3: #94a3b8;
    --text-4: #64748b;
    --text-accent: #ffb800;

    --surface-glass: rgba(22, 25, 34, 0.6);
    --nav-bg: rgba(12, 14, 22, 0.85);
    --hero-grad: linear-gradient(180deg, rgba(22, 25, 34, 0.9) 0%, rgba(12, 13, 19, 0.9) 100%);
    --input-bg: rgba(0, 0, 0, 0.35);
    --glow: rgba(255, 184, 0, 0.06);
    --glow-strong: rgba(255, 184, 0, 0.14);

    --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.4);
    --shadow-md: 0 8px 24px rgba(0, 0, 0, 0.5);
    --shadow-lg: 0 24px 48px rgba(0, 0, 0, 0.6);
    --shadow-card: 0 4px 12px rgba(0, 0, 0, 0.35);
}
```

---

<a id="file-7"></a>

### 📄 File 7/18: `assets/js/autocomplete.js`

| Property | Value |
|----------|-------|
| **Path** | `assets/js/autocomplete.js` |
| **Language** | JavaScript |
| **Size** | 8.4 KB |
| **Lines** | 244 |

```javascript
/* ═══════════════════════════════════════════════
   autocomplete.js — Smart Search Autocomplete Engine
   (With i18n / Multi-Language Support)
   ═══════════════════════════════════════════════ */

const Autocomplete = (function () {
    'use strict';

    const rootsToPreCache = [
        "/download/download-User/",
        "/download/download-Avid/",
        "/files/",
        "/download/download-User/Template/",
        "/download/download-User/ISO/",
        "/download/download-User/Sandbox/",
        "/download/download-User/LogDB/",
        "/download/download-User/imageClone/",
        "/download/download-User/Documents/",
        "/download/download-User/files/"
    ];

    let cache = []; // Cached file/folder index
    let activeIndex = -1;
    let matches = [];
    let dropdownEl = null;
    let inputEl = null;
    let debounceTimer = null;

    // Fetch directory list silently
    async function fetchDir(path) {
        try {
            const res = await fetch("/__list" + path, { cache: "force-cache" });
            if (!res.ok) return [];
            const data = await res.json();
            if (!Array.isArray(data)) return [];

            return data
                .filter(x => x && x.name && x.name !== "." && x.name !== "..")
                .map(x => ({
                    name: String(x.name),
                    type: x.type === "directory" ? "directory" : "file",
                    href: path + x.name + (x.type === "directory" ? "/" : "")
                }));
        } catch {
            return [];
        }
    }

    // Pre-load top-level directories into cache on boot
    async function initCache() {
        for (const root of rootsToPreCache) {
            const items = await fetchDir(root);
            items.forEach(item => {
                if (!cache.some(c => c.href === item.href)) {
                    cache.push(item);
                }
            });
        }
    }

    function escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function highlightMatch(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
        return text.replace(regex, '<span class="ac-highlight">$1</span>');
    }

    function renderDropdown(query) {
        const d = getDict(); // 🌍 گرفتن دیکشنری برای ترجمه کلمات منو

        if (!dropdownEl) return;

        if (!matches.length) {
            hide();
            return;
        }

        const listHtml = matches.map((item, index) => {
            const isActive = index === activeIndex ? 'active' : '';
            const iconSvg = item.type === 'directory'
                ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2z"/></svg>`
                : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M13 2v7h7"/></svg>`;

            return `
        <li class="ac-item ${isActive}" data-index="${index}" data-href="${item.href}">
          <div class="ac-item-left">
            <div class="ac-icon ${item.type === 'directory' ? 'ac-icon-dir' : 'ac-icon-file'}">
              ${iconSvg}
            </div>
            <div class="ac-info">
              <span class="ac-name">${highlightMatch(item.name, query)}</span>
              <span class="ac-path">${item.href}</span>
            </div>
          </div>
          <span class="badge ${item.type === 'directory' ? 'badge-dir' : 'badge-file'}">
            ${item.type === 'directory' ? (d.dirBadge || 'DIR') : (d.fileBadge || 'FILE')}
          </span>
        </li>
      `;
        }).join('');

        const footerHtml = `
      <div class="ac-footer">
        <span>${d.navNavigate || "Navigate"} <kbd>↑</kbd> <kbd>↓</kbd></span>
        <span>${d.navSelect || "Select"} <kbd>↵</kbd></span>
      </div>
    `;

        dropdownEl.innerHTML = `<ul class="ac-list">${listHtml}</ul>${footerHtml}`;
        dropdownEl.classList.add('show');

        // Attach click events to items
        dropdownEl.querySelectorAll('.ac-item').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                const href = el.getAttribute('data-href');
                selectItem(href);
            });
            el.addEventListener('mouseenter', () => {
                activeIndex = parseInt(el.getAttribute('data-index'), 10);
                updateActiveState();
            });
        });
    }

    function updateActiveState() {
        if (!dropdownEl) return;
        const items = dropdownEl.querySelectorAll('.ac-item');
        items.forEach((item, idx) => {
            if (idx === activeIndex) {
                item.classList.add('active');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('active');
            }
        });
    }

    function selectItem(href) {
        hide();
        if (inputEl) inputEl.value = '';
        if (typeof Router !== 'undefined') {
            Router.navigate(href);
        } else {
            window.location.href = href;
        }
    }

    function search(query) {
        const q = query.trim().toLowerCase();
        if (!q || q.length < 1) {
            matches = [];
            hide();
            return;
        }

        // Filter cache for top 6 matching items
        matches = cache
            .filter(item => item.name.toLowerCase().includes(q))
            .slice(0, 3);

        activeIndex = -1;
        renderDropdown(q);
    }

    function hide() {
        if (dropdownEl) dropdownEl.classList.remove('show');
        activeIndex = -1;
    }

    function bindInput(input) {
        inputEl = input;
        const wrap = input.closest('.input-wrap');
        if (!wrap) return;

        // Create dropdown container if not exists
        dropdownEl = wrap.querySelector('.ac-dropdown');
        if (!dropdownEl) {
            dropdownEl = document.createElement('div');
            dropdownEl.className = 'ac-dropdown';
            wrap.appendChild(dropdownEl);
        }

        // Typing listener with 150ms debounce
        input.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                search(e.target.value);
            }, 150);
        });

        // Keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
        input.addEventListener('keydown', (e) => {
            if (!dropdownEl.classList.contains('show')) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeIndex = (activeIndex + 1) % matches.length;
                updateActiveState();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeIndex = (activeIndex - 1 + matches.length) % matches.length;
                updateActiveState();
            } else if (e.key === 'Enter') {
                if (activeIndex >= 0 && matches[activeIndex]) {
                    e.preventDefault();
                    e.stopPropagation();
                    selectItem(matches[activeIndex].href);
                }
            } else if (e.key === 'Escape') {
                hide();
            }
        });

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (!wrap.contains(e.target)) {
                hide();
            }
        });

        // Re-open on focus if query exists
        input.addEventListener('focus', () => {
            if (input.value.trim()) {
                search(input.value);
            }
        });
    }

    // Pre-fetch cache on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCache);
    } else {
        initCache();
    }

    return {
        bind: bindInput,
        hide: hide
    };
})();
```

---

<a id="file-8"></a>

### 📄 File 8/18: `assets/js/banner.js`

| Property | Value |
|----------|-------|
| **Path** | `assets/js/banner.js` |
| **Language** | JavaScript |
| **Size** | 19.1 KB |
| **Lines** | 579 |

```javascript
/* ═══════════════════════════════════════════════
   banner.js — Self-Contained In-App Banner

   ✓ Works across page navigations (index → browse → ...)
   ✓ Tracks total session time via sessionStorage
   ✓ Includes its own CSS injection — zero external dependencies
   ✓ Single file — just load this and done
   ═══════════════════════════════════════════════ */

const CavBanner = (function () {
    'use strict';

    /* ═════════════════════════════════════════════
       ⚙️  CONFIGURATION
       Edit content, timing, and behavior here.
       ═════════════════════════════════════════════ */
    const CONFIG = {

        // Time before showing banner (ms) — counted across ALL pages
        delay: 10000, // 10 seconds total time on site

        // Auto-dismiss after showing (ms). 0 = manual close only.
        displayDuration: 9000,

        // Storage keys
        shownKey: "session_cav_banner_shown",   // localStorage — permanent "shown once" flag
        startKey: "cav_banner_session",     // sessionStorage — session start timestamp

        // Set to false in production to respect "show once" rule
        debugMode: false,

        // Content per language
        content: {
            en: {
                title: "Explore CloudAvid Docs",
                message: "Setup guides, SysAdmin Skills, and architecture documentation.",
                actionText: "Open Docs",
                actionUrl: "https://docs.cloudavid.com",
            },
            fa: {
                title: "مستندات کلود آوید",
                message: "راهنمای نصب، آموزش و ارتقای مهارت ادمین و مستندات معماری زیرساخت.",
                actionText: "مشاهده مستندات",
                actionUrl: "https://docs.cloudavid.com",
            },
        },

        // Icons (SVG)
        icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>`,
        arrowIcon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,

        // Enable console logging
        debug: false,
    };

    /* ═════════════════════════════════════════════
       🎨 SELF-CONTAINED CSS
       Injected once into <head> automatically.
       No external CSS file needed.
       ═════════════════════════════════════════════ */
    const BANNER_CSS = `
    /* ═══════════════════════════════════════
    banner.css — In-App Banner Component
    Standalone DOM element — always works
    ═══════════════════════════════════════ */

    .cav-banner-host {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 9999;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
        max-width: calc(100% - 48px);
    }

    html[dir="rtl"] .cav-banner-host {
        right: auto;
        left: 24px;
        align-items: flex-start;
    }

    /* ── Banner card ── */
    .cav-banner {
        pointer-events: auto;
        position: relative;
        display: flex;
        align-items: flex-start;
        gap: 14px;
        width: 400px;
        max-width: 100%;
        padding: 16px 18px 16px 16px;
        border-radius: 10px;
        background: linear-gradient(180deg, #1a1a20, #131318);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow:
            0 10px 40px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.04);
        color: rgba(255, 255, 255, 0.92);
        font-family: 'Inter', -apple-system, system-ui, sans-serif;
        font-size: 0.88rem;
        line-height: 1.5;
        overflow: hidden;

        animation: cav-banner-in 380ms cubic-bezier(0.22, 1, 0.36, 1) both;
        will-change: transform, opacity;
    }

    /* Accent line on top */
    .cav-banner::before {
        content: "";
        position: absolute;
        top: 0;
        left: 20%;
        right: 20%;
        height: 1px;
        background: linear-gradient(90deg, transparent, #2dd4bf, transparent);
        opacity: 0.5;
    }

    .cav-banner.cav-out {
        animation: cav-banner-out 220ms cubic-bezier(0.4, 0, 1, 1) both;
    }

    @keyframes cav-banner-in {
        from {
            opacity: 0;
            transform: translateY(20px) scale(0.94);
        }

        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    @keyframes cav-banner-out {
        from {
            opacity: 1;
            transform: translateY(0) scale(1);
        }

        to {
            opacity: 0;
            transform: translateY(10px) scale(0.96);
        }
    }

    /* ── Icon ── */
    .cav-banner-icon {
        width: 40px;
        height: 40px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 7px;
        background: linear-gradient(180deg, rgba(20, 184, 166, 0.15), rgba(20, 184, 166, 0.05));
        border: 1px solid rgba(20, 184, 166, 0.20);
        color: #2dd4bf;
        position: relative;
    }

    /* subtle glow */
    .cav-banner-icon::after {
        content: "";
        position: absolute;
        inset: -1px;
        border-radius: 7px;
        background: radial-gradient(circle at 50% 0%, rgba(45, 212, 191, 0.25), transparent 70%);
        opacity: 0.6;
        pointer-events: none;
    }

    /* ── Body ── */
    .cav-banner-body {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding-top: 2px;
    }

    .cav-banner-title {
        font-weight: 700;
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.98);
        letter-spacing: -0.005em;
    }

    .cav-banner-msg {
        font-size: 0.82rem;
        color: rgba(255, 255, 255, 0.55);
        line-height: 1.5;
        margin-bottom: 10px;
    }

    /* ── Action button ── */
    .cav-banner-action {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 5px;
        background: rgba(20, 184, 166, 0.12);
        border: 1px solid rgba(20, 184, 166, 0.22);
        color: #5eead4;
        font-size: 0.78rem;
        font-weight: 600;
        text-decoration: none;
        width: fit-content;
        transition:
            background 150ms ease,
            border-color 150ms ease,
            transform 150ms ease;
    }

    .cav-banner-action:hover {
        background: rgba(20, 184, 166, 0.20);
        border-color: rgba(20, 184, 166, 0.35);
        color: #99f6e4;
    }

    .cav-banner-action:active {
        transform: scale(0.97);
    }

    .cav-banner-action svg {
        flex-shrink: 0;
        transition: transform 150ms ease;
    }

    .cav-banner-action:hover svg {
        transform: translateX(2px);
    }

    html[dir="rtl"] .cav-banner-action svg {
        transform: scaleX(-1);
    }

    html[dir="rtl"] .cav-banner-action:hover svg {
        transform: scaleX(-1) translateX(2px);
    }

    /* ── Close ── */
    .cav-banner-close {
        flex-shrink: 0;
        width: 26px;
        height: 26px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        border: none;
        background: transparent;
        color: rgba(255, 255, 255, 0.35);
        cursor: pointer;
        transition: background 120ms, color 120ms;
        padding: 0;
        margin: -3px -6px 0 0;
    }

    html[dir="rtl"] .cav-banner-close {
        margin: -3px 0 0 -6px;
    }

    .cav-banner-close:hover {
        background: rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.85);
    }

    .cav-banner-close:active {
        transform: scale(0.9);
    }

    /* ── Timer bar ── */
    .cav-banner-timer {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: rgba(255, 255, 255, 0.04);
        overflow: hidden;
    }

    .cav-banner-timer-bar {
        height: 100%;
        background: linear-gradient(90deg, #14b8a6, #2dd4bf, #5eead4);
        transform-origin: left center;
        animation: cav-timer-shrink var(--cav-duration, 8s) linear both;
    }

    html[dir="rtl"] .cav-banner-timer-bar {
        transform-origin: right center;
    }

    @keyframes cav-timer-shrink {
        from {
            transform: scaleX(1);
        }

        to {
            transform: scaleX(0);
        }
    }

    .cav-banner:hover .cav-banner-timer-bar {
        animation-play-state: paused;
    }

    /* ── Responsive ── */
    @media (max-width: 480px) {
        .cav-banner-host {
            right: 12px;
            left: 12px;
            bottom: 12px;
            max-width: none;
            align-items: stretch;
        }

        html[dir="rtl"] .cav-banner-host {
            right: 12px;
            left: 12px;
        }

        .cav-banner {
            width: auto;
        }
    }

    /* ── Reduced motion ── */
    @media (prefers-reduced-motion: reduce) {

        .cav-banner,
        .cav-banner.cav-out,
        .cav-banner-timer-bar {
            animation-duration: 0.01ms !important;
        }
    }
  `;

    /* ═════════════════════════════════════════════
       🔒 INTERNAL
       ═════════════════════════════════════════════ */
    let host = null;
    let cssInjected = false;

    function log(...args) {
        if (CONFIG.debug) {
            console.log("%c🔔 [Banner]", "color:#2dd4bf;font-weight:bold", ...args);
        }
    }

    function getLang() {
        try { return localStorage.getItem("ui_lang") || "en"; }
        catch { return "en"; }
    }

    function getContent() {
        return CONFIG.content[getLang()] || CONFIG.content.en;
    }

    /* ── Storage helpers ── */
    function wasShownBefore() {
        try { return sessionStorage.getItem(CONFIG.shownKey) === "1"; }
        catch { return false; }
    }

    function markAsShown() {
        try { sessionStorage.setItem(CONFIG.shownKey, "1"); }
        catch { }
    }

    function getSessionStart() {
        try {
            const val = sessionStorage.getItem(CONFIG.startKey);
            if (val) return parseInt(val, 10);
            // First page in this session — record timestamp
            const now = Date.now();
            sessionStorage.setItem(CONFIG.startKey, String(now));
            return now;
        } catch {
            return Date.now();
        }
    }

    function getSessionTime() {
        return Date.now() - getSessionStart();
    }

    /* ── CSS injection ── */
    function injectCSS() {
        if (cssInjected) return;
        if (document.getElementById("cav-banner-styles")) { cssInjected = true; return; }
        const style = document.createElement("style");
        style.id = "cav-banner-styles";
        style.textContent = BANNER_CSS;
        document.head.appendChild(style);
        cssInjected = true;
        log("CSS injected into <head>");
    }

    /* ── DOM ── */
    function ensureHost() {
        if (host && document.body.contains(host)) return host;
        host = document.createElement("div");
        host.className = "cav-banner-host";
        host.setAttribute("role", "status");
        host.setAttribute("aria-live", "polite");
        document.body.appendChild(host);
        return host;
    }

    function dismiss(el) {
        if (!el || el.classList.contains("cav-out")) return;
        el.classList.add("cav-out");
        const cleanup = () => {
            el.remove();
            if (host && !host.children.length) {
                host.remove();
                host = null;
            }
        };
        el.addEventListener("animationend", cleanup, { once: true });
        setTimeout(cleanup, 400);
    }

    /* ═════════════════════════════════════════════
       🎬 DISPLAY
       ═════════════════════════════════════════════ */
    function show(overrides = {}) {
        injectCSS();

        const content = { ...getContent(), ...overrides };
        const duration = overrides.displayDuration != null
            ? overrides.displayDuration
            : CONFIG.displayDuration;
        const icon = overrides.icon || CONFIG.icon;

        const wrap = ensureHost();
        const el = document.createElement("div");
        el.className = "cav-banner";
        el.style.setProperty("--cav-dur", duration + "ms");

        el.innerHTML = `
      <div class="cav-banner-icon">${icon}</div>
      <div class="cav-banner-body">
        <div class="cav-banner-title">${content.title}</div>
        <div class="cav-banner-msg">${content.message}</div>
        <a class="cav-banner-action" href="${content.actionUrl}" target="_blank" rel="noopener noreferrer">
          <span>${content.actionText}</span>
          ${CONFIG.arrowIcon}
        </a>
      </div>
      <button class="cav-banner-close" aria-label="Close" type="button">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
      ${duration > 0 ? '<div class="cav-banner-timer"><div class="cav-banner-timer-bar"></div></div>' : ''}
    `;

        el.querySelector(".cav-banner-close").addEventListener("click", () => dismiss(el));

        if (duration > 0) {
            let timer = null;
            const startTimer = () => { timer = setTimeout(() => dismiss(el), duration); };
            const stopTimer = () => { if (timer) { clearTimeout(timer); timer = null; } };

            startTimer();
            el.addEventListener("mouseenter", stopTimer);
            el.addEventListener("mouseleave", () => {
                stopTimer();
                startTimer();
                const bar = el.querySelector(".cav-banner-timer-bar");
                if (bar) {
                    bar.style.animation = "none";
                    void bar.offsetHeight;
                    bar.style.animation = "";
                }
            });
        }

        wrap.appendChild(el);
        log("Banner displayed on", window.location.pathname);
        return el;
    }

    function showOnce(overrides) {
        if (!CONFIG.debugMode && wasShownBefore()) {
            log("Skipped — already shown in a previous session");
            return null;
        }
        markAsShown();
        return show(overrides);
    }

    function reset() {
        try {
            localStorage.removeItem(CONFIG.shownKey);
            sessionStorage.removeItem(CONFIG.startKey);
            log("All storage cleared — banner will re-trigger");
        } catch { }
    }

    /* ═════════════════════════════════════════════
       ⏱️ AUTO TRIGGER (time-based, cross-page)
       Uses sessionStorage to persist start time
       across page navigations.
       ═════════════════════════════════════════════ */
    let triggerTimer = null;
    let triggerFired = false;

    function startTrigger() {
        if (triggerFired) return;

        // Check if already shown before (production mode)
        if (!CONFIG.debugMode && wasShownBefore()) {
            log("Trigger skipped — banner was already shown");
            return;
        }

        const sessionStart = getSessionStart();
        const elapsed = Date.now() - sessionStart;
        const remaining = Math.max(0, CONFIG.delay - elapsed);

        if (remaining <= 0) {
            // Already past the delay threshold (user navigated between pages)
            fireTrigger();
        } else {
            log(`Trigger set — banner in ${(remaining / 1000).toFixed(1)}s (${(elapsed / 1000).toFixed(1)}s already elapsed)`);
            triggerTimer = setTimeout(fireTrigger, remaining);
        }
    }

    function fireTrigger() {
        if (triggerFired) return;
        triggerFired = true;

        if (triggerTimer) {
            clearTimeout(triggerTimer);
            triggerTimer = null;
        }

        const elapsed = (getSessionTime() / 1000).toFixed(1);
        log(`✨ Trigger fired after ${elapsed}s total session time`);

        showOnce();
    }

    /* ═════════════════════════════════════════════
       🔌 BOOT
       ═════════════════════════════════════════════ */
    function boot() {
        injectCSS();
        startTrigger();
        log("Booted on", window.location.pathname);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    }

    /* ═════════════════════════════════════════════
       🎬 PUBLIC API
       ═════════════════════════════════════════════ */
    return {
        show,
        showOnce,
        reset,
        config: CONFIG,
        getSessionTime: () => (getSessionTime() / 1000).toFixed(1) + "s",
    };
})();
```

---

<a id="file-9"></a>

### 📄 File 9/18: `assets/js/browse.js`

| Property | Value |
|----------|-------|
| **Path** | `assets/js/browse.js` |
| **Language** | JavaScript |
| **Size** | 22.8 KB |
| **Lines** | 447 |

```javascript
/* ═══════════════════════════════════════════════════════════════
   browse.js — Enterprise File Browser Renderer
   Skill: UI UX Pro Max — Data Pipeline (Search + Filter + Sort)
   
   Responsibilities:
   - Render directory contents (Grid / List)
   - Handle Breadcrumb navigation
   - Unified Data Pipeline: Local Search + Type Filter + Sort
   - Custom Dropdowns with Click-Outside handling
   - Skeleton Loaders & Empty States
   ═══════════════════════════════════════════════════════════════ */

const BrowsePage = (function () {
    'use strict';

    /* ── Internal State ── */
    let allFiles = [];         // Raw fetched directory contents
    let currentPath = "/";
    let activeType = "all";    // 'all' | 'directory' | 'file'
    let activeSort = "name-asc"; // 'name-asc' | 'name-desc' | 'date-desc' | 'size-desc'
    let searchQuery = "";      // Local search query

    /* ═══════════════════════════════════════════════
       MAIN RENDERER
       ═══════════════════════════════════════════════ */
    function render(container, path) {
        const d = typeof window.getDict === 'function' ? window.getDict() : getDict();

        // Reset state for new path
        currentPath = path.endsWith("/") ? path : path + "/";
        activeType = "all";
        activeSort = "name-asc";
        searchQuery = "";

        document.title = d.browseTitle || "Downloads • CloudAvid";

        container.innerHTML = `
      <div class="browse-layout anim-fade-up">

        <header class="browse-head">
          <nav class="crumbs" id="breadcrumb" aria-label="Breadcrumb"></nav>
          
          <div class="browse-title-row">
            <div class="browse-title-left">
              <h1 id="folderName">—</h1>
              <div class="browse-stats">
                <span class="stat-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2z"/></svg>
                  <span class="stat-val" id="folderCount">0</span>
                  <span>${d.folders || "folders"}</span>
                </span>
                <span class="stat-dot">·</span>
                <span class="stat-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M13 2v7h7"/></svg>
                  <span class="stat-val" id="fileCount">0</span>
                  <span>${d.files || "files"}</span>
                </span>
              </div>
            </div>

            <div class="browse-controls">
              <!-- Local Search -->
              <div class="input-wrap browse-search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <input id="localSearchInput" type="text" autocomplete="off" placeholder="${d.searchFolderPh || 'Search folder...'}" aria-label="Search in folder" />
              </div>

              <!-- Type Filter Dropdown -->
              <div class="filter-dropdown-wrap" id="typeFilterWrap">
                <button class="filter-pill" type="button" aria-haspopup="true">
                  <span class="filter-value" data-val="all">${d.allTypes || "All Types"}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div class="filter-dropdown-menu">
                  <button class="filter-option active" data-val="all" type="button">${d.allTypes || "All Types"}</button>
                  <button class="filter-option" data-val="directory" type="button">${d.folders || "Folders"}</button>
                  <button class="filter-option" data-val="file" type="button">${d.files || "Files"}</button>
                </div>
              </div>

              <!-- Sort Dropdown -->
              <div class="filter-dropdown-wrap" id="sortFilterWrap">
                <button class="filter-pill" type="button" aria-haspopup="true">
                  <span class="filter-value" data-val="name-asc">${d.sortName || "Name (A-Z)"}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div class="filter-dropdown-menu">
                <button class="filter-option active" data-val="name-asc" type="button">${d.sortName || "Name (A-Z)"}</button>
                <button class="filter-option" data-val="name-desc" type="button">${d.sortNameDesc || "Name (Z-A)"}</button>
                <button class="filter-option" data-val="date-desc" type="button">${d.sortLatest || "Newest First"}</button>
                <button class="filter-option" data-val="date-asc" type="button">${d.sortOldest || "Oldest First"}</button>
                <button class="filter-option" data-val="size-desc" type="button">${d.sortSize || "Largest First"}</button>
                </div>
              </div>

              <!-- View Toggles -->
              <div class="view-toggle" role="tablist" aria-label="View mode">
                <button class="vt-btn active" id="viewList" aria-label="List view" type="button">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                </button>
                <button class="vt-btn" id="viewGrid" aria-label="Grid view" type="button">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                </button>
              </div>
            </div>
          </div>
        </header>

        <section class="file-tbl" id="tableContainer">
          <div class="trow thead">
            <div></div>
            <div>${d.name || "Name"}</div>
            <div>${d.type || "Type"}</div>
            <div>${d.modified || "Modified"}</div>
            <div>${d.size || "Size"}</div>
          </div>
          <div id="rows"></div>
          <div class="empty-box" id="empty" style="display:none"></div>
        </section>

      </div>
    `;

        buildCrumbs();
        bindEvents();
        renderSkeletons();
        fetchList();
    }

    /* ═══════════════════════════════════════════════
       DATA FETCHING
       ═══════════════════════════════════════════════ */
    async function fetchList() {
        const d = typeof window.getDict === 'function' ? window.getDict() : getDict();
        try {
            const res = await fetch("/__list" + currentPath, { cache: "no-store" });
            if (!res.ok) throw new Error("HTTP " + res.status);
            const data = await res.json();
            if (!Array.isArray(data)) throw new Error("Bad JSON");

            allFiles = data
                .filter(x => x && x.name && x.name !== "." && x.name !== "..")
                .filter(x => !isHidden(x.name))
                .map(x => ({
                    name: String(x.name),
                    type: x.type === "directory" ? "directory" : "file",
                    size: Number(x.size || 0),
                    modified: x.mtime || x.modified || x.time || 0
                }));

            // Initial render
            applyFiltersAndRender();

        } catch (e) {
            console.error(e);
            showEmpty(`<strong>${d.loadErrTitle || "Failed to load"}</strong><div style="margin-top:8px">${d.loadErrHint || "Check API endpoint."}</div>`, true);
        }
    }

    /* ═══════════════════════════════════════════════
       DATA PIPELINE (Filter -> Search -> Sort -> Render)
       ═══════════════════════════════════════════════ */
    function applyFiltersAndRender() {
        const d = typeof window.getDict === 'function' ? window.getDict() : getDict();
        let filtered = [...allFiles];

        // 1. Apply Search Query
        if (searchQuery) {
            filtered = filtered.filter(f => f.name.toLowerCase().includes(searchQuery));
        }

        // 2. Apply Type Filter
        if (activeType !== "all") {
            filtered = filtered.filter(f => f.type === activeType);
        }

        // Update counts visually (based on un-searched but type-filtered data)
        const dirsCount = allFiles.filter(f => f.type === "directory").length;
        const filesCount = allFiles.filter(f => f.type === "file").length;
        const fcEl = document.getElementById("folderCount");
        const flcEl = document.getElementById("fileCount");
        if (fcEl) fcEl.textContent = dirsCount;
        if (flcEl) flcEl.textContent = filesCount;

        // 3. Apply Sorting (Directories ALWAYS first, then sort logic)
        filtered.sort((a, b) => {
            const isDirA = a.type === "directory" ? 1 : 0;
            const isDirB = b.type === "directory" ? 1 : 0;

            // Directories always bubble to the top
            if (isDirA !== isDirB) return isDirB - isDirA;

            if (activeSort === "name-asc") {
                return a.name.localeCompare(b.name);
            } else if (activeSort === "name-desc") {
                return b.name.localeCompare(a.name);
            } else if (activeSort === "size-desc") {
                return b.size - a.size;
            } else if (activeSort === "date-desc") {
                const tA = new Date(a.modified).getTime();
                const tB = new Date(b.modified).getTime();
                return tB - tA;
            } else if (activeSort === "date-asc") {
                // Oldest First
                const tA = new Date(a.modified).getTime() || 0;
                const tB = new Date(b.modified).getTime() || 0;
                return tA - tB;
            }
            return 0;
        });

        renderFilesList(filtered, d);
    }

    function renderFilesList(files, d) {
        const lang = typeof window.getLang === 'function' ? window.getLang() : getLang();
        const rowsEl = document.getElementById("rows");
        if (!rowsEl) return;
        rowsEl.innerHTML = "";

        if (files.length === 0) {
            showEmpty(searchQuery ? (d.emptySearch || "No files matched.") : (d.empty || "This folder is empty."));
            return;
        }

        hideEmpty();
        const frag = document.createDocumentFragment();

        files.forEach((f, idx) => {
            const href = currentPath + f.name + (f.type === "directory" ? "/" : "");
            const row = document.createElement("div");
            row.className = "trow anim-fade-up";
            row.style.animationDelay = Math.min(idx * 15, 300) + "ms";

            const linkAttr = f.type === "directory" ? `href="${href}"` : `href="${href}" data-file="true"`;
            const iconStr = f.type === "directory" ? 'f-icon-dir' : 'f-icon-file';
            const badgeStr = f.type === "directory" ? 'badge-dir' : 'badge-file';
            const badgeLabel = f.type === "directory" ? (d.folder || 'Folder') : (d.file || 'File');

            row.innerHTML = `
                <div class="f-icon ${iconStr}">${svgIcon(f.type)}</div>
                <div class="f-name"><a class="f-link" ${linkAttr} title="${f.name}">${f.name}</a></div>
                <div><span class="badge ${badgeStr}">${badgeLabel}</span></div>
                <div class="f-sub">${fmtDate(f.modified, lang)}</div>
                <div class="f-sub">${f.type === 'directory' ? '—' : humanSize(f.size, lang)}</div>
            `;
            frag.appendChild(row);
        });

        rowsEl.appendChild(frag);
    }

    /* ═══════════════════════════════════════════════
       EVENT BINDINGS
       ═══════════════════════════════════════════════ */
    function bindEvents() {
        const d = typeof window.getDict === 'function' ? window.getDict() : getDict();

        // 1. Search Input Binding
        const searchInput = document.getElementById("localSearchInput");
        if (searchInput) {
            searchInput.addEventListener("input", (e) => {
                searchQuery = e.target.value.trim().toLowerCase();
                applyFiltersAndRender();
            });
        }

        // 2. Custom Dropdowns Binding
        const filterWraps = document.querySelectorAll(".filter-dropdown-wrap");
        filterWraps.forEach(wrap => {
            const pill = wrap.querySelector(".filter-pill");
            const valueSpan = pill.querySelector(".filter-value");
            const options = wrap.querySelectorAll(".filter-option");

            pill.addEventListener("click", (e) => {
                e.stopPropagation();
                filterWraps.forEach(w => { if (w !== wrap) w.classList.remove("show"); });
                wrap.classList.toggle("show");
            });

            options.forEach(opt => {
                opt.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const val = opt.getAttribute("data-val");
                    const text = opt.textContent;

                    valueSpan.textContent = text;
                    options.forEach(o => o.classList.remove("active"));
                    opt.classList.add("active");

                    if (wrap.id === "typeFilterWrap") activeType = val;
                    if (wrap.id === "sortFilterWrap") activeSort = val;

                    wrap.classList.remove("show");
                    applyFiltersAndRender();
                });
            });
        });

        // Close dropdowns on outside click
        document.addEventListener("click", () => {
            filterWraps.forEach(w => w.classList.remove("show"));
        });

        // 3. View Toggles Binding
        const listBtn = document.getElementById("viewList");
        const gridBtn = document.getElementById("viewGrid");
        const tableEl = document.getElementById("tableContainer");

        if (listBtn && gridBtn && tableEl) {
            listBtn.addEventListener("click", () => {
                tableEl.classList.remove("grid-mode");
                listBtn.classList.add("active");
                gridBtn.classList.remove("active");
                try { localStorage.setItem("view_mode", "list"); } catch { }
            });

            gridBtn.addEventListener("click", () => {
                tableEl.classList.add("grid-mode");
                gridBtn.classList.add("active");
                listBtn.classList.remove("active");
                try { localStorage.setItem("view_mode", "grid"); } catch { }
            });

            // Restore preference
            try {
                if (localStorage.getItem("view_mode") === "grid") gridBtn.click();
            } catch { }
        }
    }

    /* ═══════════════════════════════════════════════
       HELPERS & UI COMPONENTS
       ═══════════════════════════════════════════════ */
    function buildCrumbs() {
        const d = typeof window.getDict === 'function' ? window.getDict() : getDict();
        const el = document.getElementById("breadcrumb");
        if (!el) return;
        el.innerHTML = "";

        const home = document.createElement("a");
        home.href = "/";
        home.className = "crumb";
        home.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg><span>${d.root || "Home"}</span>`;
        el.appendChild(home);

        const parts = currentPath.split("/").filter(Boolean);
        let acc = "";

        parts.forEach((part, i) => {
            acc += "/" + part;
            const sep = document.createElement("span");
            sep.className = "crumb-sep";
            sep.innerHTML = d.dir === "rtl"
                ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`
                : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
            el.appendChild(sep);

            if (i === parts.length - 1) {
                const cur = document.createElement("span");
                cur.className = "crumb crumb-active";
                cur.textContent = decodeURIComponent(part);
                el.appendChild(cur);
                const fn = document.getElementById("folderName");
                if (fn) fn.textContent = decodeURIComponent(part);
            } else {
                const link = document.createElement("a");
                link.href = acc + "/";
                link.className = "crumb";
                link.textContent = decodeURIComponent(part);
                el.appendChild(link);
            }
        });
    }

    function isHidden(n) {
        const l = (n || "").toLowerCase();
        return l === "index.html" || l === "index.php" || l.startsWith(".");
    }

    function humanSize(b, lang) {
        if (!Number.isFinite(b) || b < 0) return "—";
        if (b === 0) return lang === "fa" ? "0 بایت" : "0 B";
        const k = 1024;
        const u = lang === "fa" ? ["بایت", "KB", "MB", "GB", "TB"] : ["B", "KB", "MB", "GB", "TB"];
        const i = Math.min(Math.floor(Math.log(b) / Math.log(k)), u.length - 1);
        return (b / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1) + " " + u[i];
    }

    function fmtDate(ts, lang) {
        if (!ts) return "—";
        try {
            const d = new Date(ts);
            const l = lang === "fa" ? "fa-IR" : "en-US";
            return d.toLocaleDateString(l) + " " + d.toLocaleTimeString(l, { hour: "2-digit", minute: "2-digit" });
        } catch { return "—"; }
    }

    function svgIcon(type) {
        return type === "directory"
            ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2z"/></svg>`
            : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M13 2v7h7"/></svg>`;
    }

    function renderSkeletons() {
        const rowsEl = document.getElementById("rows");
        if (!rowsEl) return;
        document.getElementById("folderCount").innerHTML = `<span class="skeleton-line" style="display:inline-block; width:16px; height:12px; margin:0"></span>`;
        document.getElementById("fileCount").innerHTML = `<span class="skeleton-line" style="display:inline-block; width:16px; height:12px; margin:0"></span>`;

        let html = "";
        for (let i = 0; i < 6; i++) {
            const randomWidth = Math.floor(Math.random() * 40 + 30);
            html += `
            <div class="trow anim-fade-up" style="animation-delay: ${i * 30}ms; pointer-events: none;">
                <div class="f-icon skeleton-box" style="width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0; margin-right: 8px;"></div>
                <div class="f-name"><div class="skeleton-line" style="width: ${randomWidth}%; height: 16px;"></div></div>
                <div><div class="skeleton-line" style="width: 48px; height: 20px; border-radius: 10px;"></div></div>
                <div class="f-sub"><div class="skeleton-line" style="width: 100px; height: 12px;"></div></div>
                <div class="f-sub"><div class="skeleton-line" style="width: 60px; height: 12px;"></div></div>
            </div>`;
        }
        rowsEl.innerHTML = html;
    }

    function showEmpty(msg, isErr = false) {
        const el = document.getElementById("empty");
        const rowsEl = document.getElementById("rows");
        if (rowsEl) rowsEl.innerHTML = "";
        if (!el) return;
        el.style.display = "flex";
        el.innerHTML = `
      <div class="empty-circle${isErr ? ' err' : ''}">
        ${isErr
                ? `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
                : `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2z"/><line x1="9" y1="14" x2="15" y2="14"/></svg>`}
      </div>
      <div class="empty-text">${msg}</div>`;
    }

    function hideEmpty() {
        const el = document.getElementById("empty");
        if (el) el.style.display = "none";
    }

    return { render };
})();
```

---

<a id="file-10"></a>

### 📄 File 10/18: `assets/js/home.js`

| Property | Value |
|----------|-------|
| **Path** | `assets/js/home.js` |
| **Language** | JavaScript |
| **Size** | 36.9 KB |
| **Lines** | 728 |

```javascript
/* ═══════════════════════════════════════════════════════════════
   home.js — AVID Download Infrastructure
   Skill: UI UX Pro Max — Flat Design + Enterprise Gateway + i18n
   Architecture: Component-based + Service Layer + Progressive Loading

   Dependencies:
   - i18n.js         (window.getDict, window.getLang)
   - resource-service.js (ResourceService)
   - autocomplete.js (Autocomplete) [optional]
   ═══════════════════════════════════════════════════════════════ */

const HomePage = (function () {
  'use strict';

  /* ── Configuration ── */
  const SEARCH_ROOTS = [
    "/download/download-User/",
    "/download/download-Avid/",
    "/files/"
  ];
  const SEARCH_MAX_RESULTS = 200;

  /* ── Internal State ── */
  let stopFlag = false;
  let rawResources = [];      // Cached raw data from API
  let activeCategory = "all"; // Current active category filter
  let activeSort = "latest";  // Current active sort filter

  /* ═══════════════════════════════════════════════
     MAIN RENDER
     ═══════════════════════════════════════════════ */
  function render(container) {
    const d = typeof window.getDict === 'function' ? window.getDict() : getDict();
    document.title = d.pageTitle || "AVID Download • File Portal";

    container.innerHTML = `
      <div class="home-layout">
        ${renderHeroSection(d)}
        ${renderResourcesSection(d)}
        ${renderBottomSection(d)}
        ${renderSearchResultsPanel(d)}
        ${renderStatusBar(d)}
      </div>
    `;

    bindEvents();
    loadResources(); // Async fetch infrastructure resources
  }

  /* ═══════════════════════════════════════════════
     SECTION: HERO
     ═══════════════════════════════════════════════ */
  function renderHeroSection(d) {
    return `
      <section class="hero-max">
        <div class="hero-content">
          <div class="hero-pill">
            <span class="hero-pill-dot"></span>
            ${d.portalStatus || "YOUR INFRASTRUCTURE. WITH AVID."}
          </div>
          <h1>
            ${d.heroTitle || `<span class="avid">AVID</span> <span class="accent">Download</span><br>Infrastructure`}
          </h1>
          <p class="hero-desc">
            ${d.desc || "Access software packages, ISO images, templates and system logs — provided by CloudAvid infrastructure team."}
          </p>
          <div class="hero-search">
            <div class="input-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input id="globalSearch" type="text" autocomplete="off" placeholder="${d.searchPh || 'Search for files, packages, templates...'}" aria-label="Search files" />
              <div class="search-keys"><kbd>⌘</kbd><kbd>K</kbd></div>
            </div>
            <button class="btn btn-primary" id="searchBtn" type="button">${d.searchBtn || 'Search'}</button>
            <button class="btn" id="stopBtn" type="button" style="display:none">${d.stopBtn || 'Stop'}</button>
          </div>
        </div>

        <div class="hero-visual">
          <div class="logo-shader" aria-hidden="true"></div>
          <div class="logo-swap" id="logoSwap">
            <img class="logo-layer logo-dark" src="/assets/icon/avid-logo-dark.webp" alt="AVID Download" draggable="false">
            <img class="logo-layer logo-light" src="/assets/icon/avid-logo-light.webp" alt="AVID Download" draggable="false">
          </div>
        </div>
      </section>
    `;
  }

  /* ═══════════════════════════════════════════════
     SECTION: INFRASTRUCTURE RESOURCES
     ═══════════════════════════════════════════════ */
  function renderResourcesSection(d) {
    return `
      <section class="resources-section">
        <div class="section-head">
          <div class="section-head-left">
            <div class="section-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            </div>
            <div>
              <div class="section-title">${d.infraTitle || "Infrastructure Resources"}</div>
              <div class="section-sub">${d.infraSub || "Browse and download all available infrastructure resources and packages."}</div>
            </div>
          </div>
          
          <div class="section-controls">
            
            <!-- 1. Custom Category Filter -->
            <div class="filter-dropdown-wrap" id="catFilterWrap">
              <button class="filter-pill" type="button" aria-haspopup="true">
                <span class="filter-value" data-val="all">${d.allCategories || "All categories"}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="filter-dropdown-menu">
                <button class="filter-option active" data-val="all" type="button">${d.allCategories || "All categories"}</button>
                <button class="filter-option" data-val="system-files" type="button">${d.sysFiles || "System Files"}</button>
                <button class="filter-option" data-val="templates" type="button">${d.template || "Templates"}</button>
                <button class="filter-option" data-val="sandbox" type="button">${d.sandbox || "Sandbox"}</button>
                <button class="filter-option" data-val="log-server" type="button">${d.logServer || "Log Server"}</button>
                <button class="filter-option" data-val="iso-images" type="button">${d.iso || "ISO Images"}</button>
                <button class="filter-option" data-val="documentation" type="button">${d.docsTitle || "Documentation"}</button>
              </div>
            </div>

            <!-- 2. Custom Sort Filter -->
            <div class="filter-dropdown-wrap" id="sortFilterWrap">
              <button class="filter-pill" type="button" aria-haspopup="true">
                <span class="filter-value" data-val="latest">${d.sortLatest || "Sort by: Latest"}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="filter-dropdown-menu">
                <button class="filter-option active" data-val="latest" type="button">${d.sortLatest || "Sort by: Latest"}</button>
                <button class="filter-option" data-val="name-asc" type="button">Sort by: Name (A-Z)</button>
                <button class="filter-option" data-val="count-desc" type="button">Sort by: File Count</button>
              </div>
            </div>

            <!-- Refresh Button -->
            <button class="icon-btn" id="refreshResourcesBtn" title="${d.refresh || 'Refresh'}" aria-label="Refresh resources" type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            </button>

            <!-- Grid/List View Toggle -->
            <div class="view-toggle" role="tablist" aria-label="View mode">
              <button class="vt-btn active" id="viewGridBtn" aria-label="Grid view" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              </button>
              <button class="vt-btn" id="viewListBtn" aria-label="List view" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              </button>
            </div>
          </div>
        </div>

        <div class="resources-grid stagger" id="resourcesGrid">
          ${renderSkeletonCards()}
        </div>
      </section>
    `;
  }

  /* ═══════════════════════════════════════════════
     SECTION: BOTTOM PANELS (Latest Releases + Quick Access)
     ═══════════════════════════════════════════════ */
  function renderBottomSection(d) {
    return `
      <section class="bottom-grid">
        <div class="panel">
          <div class="panel-head">
            <div class="panel-head-left">
              <div class="panel-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              </div>
              <div>
                <div class="panel-title">${d.latestReleases || "Latest Releases"}</div>
                <div class="panel-sub">${d.latestSub || "Recently published packages and updates."}</div>
              </div>
            </div>
            <a class="panel-link" href="#">${d.viewAll || "View all"} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></a>
          </div>
          <div style="overflow-x:auto">
            <table class="releases-table">
              <thead>
                <tr>
                  <th>${d.thVersion || "Version"}</th>
                  <th>${d.thType || "Package Type"}</th>
                  <th>${d.thUpdated || "Updated"}</th>
                  <th>${d.thSize || "Size"}</th>
                  <th>${d.thChecksum || "Checksum"}</th>
                  <th style="text-align:${d.dir === 'rtl' ? 'left' : 'right'}">${d.thAction || "Action"}</th>
                </tr>
              </thead>
              <tbody>
                ${releaseRow("v2.4.1", true, "System Package", "2025-09-12 14:32", "245 MB", "SHA256")}
                ${releaseRow("v1.8.7", false, "Template", "2025-09-11 09:16", "18 MB", "SHA256")}
                ${releaseRow("v3.2.0", false, "ISO Image", "2025-09-10 16:05", "4.8 GB", "SHA256")}
                ${releaseRow("v5.0.3", false, "Documentation", "2025-09-09 11:23", "12 MB", "SHA256")}
              </tbody>
            </table>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">
            <div class="panel-head-left">
              <div class="panel-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              </div>
              <div>
                <div class="panel-title">${d.quickAccess || "Quick Access"}</div>
                <div class="panel-sub">${d.quickSub || "Frequently used downloads."}</div>
              </div>
            </div>
          </div>
          <div class="quick-list">
            ${quickItem("System Update Package", "v2.4.1 · 245 MB", "cube")}
            ${quickItem("Windows ISO", "Windows 10 · 4.2 GB", "disc")}
            ${quickItem("AV Tools Bundle", "Antivirus & Security · 650 MB", "shield")}
            ${quickItem("Deployment Guide", "PDF Document · 2.8 MB", "doc")}
          </div>
        </div>
      </section>
    `;
  }

  /* ═══════════════════════════════════════════════
     SECTION: SEARCH RESULTS PANEL
     ═══════════════════════════════════════════════ */
  function renderSearchResultsPanel(d) {
    return `
      <section class="results-panel" id="resultsBox" style="display:none">
        <div class="results-bar">
          <div class="results-bar-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <span id="resultsTitle">${d.results || "Results"}</span>
          </div>
          <div class="results-bar-meta" id="progress"></div>
        </div>
        <div class="results-body" id="resultsList"></div>
      </section>
    `;
  }

  /* ═══════════════════════════════════════════════
     SECTION: STATUS BAR
     ═══════════════════════════════════════════════ */
  function renderStatusBar(d) {
    return `
      <div class="status-bar">
        <div class="status-item">
          <div class="status-item-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
          </div>
          <div class="status-item-text">
            <span class="status-item-label">${d.statusInfra || "Infrastructure Status"}</span>
            <span class="status-item-sub"><span class="status-dot"></span> ${d.statusOperational || "All systems operational"}</span>
          </div>
        </div>
        <div class="status-item">
          <div class="status-item-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m8 6 4 4 4-4"/><path d="M12 18v-8"/><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
          </div>
          <div class="status-item-text">
            <span class="status-item-label">${d.statusMalware || "Malware Scanning"}</span>
            <span class="status-item-sub"><span class="status-dot" style="background:#10b981"></span> 7 ${d.statusEngines || "engines active"}</span>
          </div>
        </div>
        <div class="status-item">
          <div class="status-item-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
          </div>
          <div class="status-item-text">
            <span class="status-item-label">${d.statusStorage || "Storage"}</span>
            <span class="status-item-sub"><span class="status-dot" style="background:#f59e0b"></span> 72% ${d.statusUsed || "used"} (1.4 TB / 2 TB)</span>
          </div>
        </div>
        <div class="status-item">
          <div class="status-item-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div class="status-item-text">
            <span class="status-item-label">${d.statusSync || "Last Sync"}</span>
            <span class="status-item-sub"><span class="status-dot" style="background:#0ea5e9"></span> <span id="lastSyncTime">—</span></span>
          </div>
        </div>
      </div>
    `;
  }

  /* ═══════════════════════════════════════════════
     RESOURCE CARDS RENDERING & FILTERING
     ═══════════════════════════════════════════════ */
  function renderSkeletonCards() {
    if (typeof ResourceService === 'undefined') {
      return '<div class="resources-error">ResourceService not loaded</div>';
    }
    return ResourceService.getRegistry().map(() => `
      <div class="resource-card resource-card-skeleton" aria-busy="true">
        <div class="resource-icon skeleton-box"></div>
        <div class="resource-meta">
          <h3 class="skeleton-line skeleton-line-title"></h3>
          <p class="skeleton-line skeleton-line-desc"></p>
          <p class="skeleton-line skeleton-line-desc-sm"></p>
          <div class="resource-bottom">
            <span class="skeleton-line skeleton-line-meta"></span>
          </div>
        </div>
      </div>
    `).join('');
  }

  // Triggered on Dropdown selections
  function applyFiltersAndRender() {
    let filtered = [...rawResources];

    // 1. Apply Category Filter
    if (activeCategory !== "all") {
      filtered = filtered.filter(item => item.id === activeCategory);
    }

    // 2. Apply Sorting Filter
    filtered.sort((a, b) => {
      if (activeSort === "name-asc") {
        const d = typeof window.getDict === 'function' ? window.getDict() : getDict();
        const titleA = d[a.titleKey] || a.defaultTitle;
        const titleB = d[b.titleKey] || b.defaultTitle;
        return titleA.localeCompare(titleB);
      } else if (activeSort === "count-desc") {
        const countA = a.stats?.total || 0;
        const countB = b.stats?.total || 0;
        return countB - countA;
      } else { // "latest"
        const timeA = a.stats?.latestModified || 0;
        const timeB = b.stats?.latestModified || 0;
        return timeB - timeA;
      }
    });

    renderResourceCards(filtered);
  }

  function renderResourceCards(resources) {
    const d = typeof window.getDict === 'function' ? window.getDict() : getDict();
    const grid = document.getElementById("resourcesGrid");
    if (!grid) return;

    if (resources.length === 0) {
      grid.innerHTML = `<div class="ac-empty" style="grid-column:1/-1; padding:32px; text-align:center;">${d.empty || "No resources found."}</div>`;
      return;
    }

    grid.innerHTML = resources.map(resource => {
      const title = d[resource.titleKey] || resource.defaultTitle;
      const desc = d[resource.descKey] || resource.defaultDesc;

      let statsBadge;
      if (!resource.stats || !resource.stats.available) {
        statsBadge = `<span class="badge badge-error">${d.unavailable || "Unavailable"}</span>`;
      } else if (resource.stats.total === 0) {
        statsBadge = `<span class="stat-empty">${d.emptyFolder || "Empty"}</span>`;
      } else {
        const count = resource.stats.total;
        const label = count === 1 ? (d.file || "file") : (d.files || "files");
        statsBadge = `${count} ${label}`;
      }

      const statusHtml = (resource.stats && resource.stats.available)
        ? `<span class="status-live"><span class="dot"></span> ${d.updated || "Updated"}</span>`
        : `<span class="status-error"><span class="dot dot-error"></span> ${d.offline || "Offline"}</span>`;

      return resourceCard(resource.path, title, desc, statsBadge, resource.iconType, statusHtml);
    }).join('');

    updateLastSyncTime();
  }

  function resourceCard(href, title, desc, meta, iconType, statusHtml) {
    const iconSvg = getResourceIcon(iconType);
    return `
      <a class="resource-card" href="${href}">
        <div class="resource-icon">${iconSvg}</div>
        <div class="resource-meta">
          <h3>${title}</h3>
          <p>${desc}</p>
          <div class="resource-bottom">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span>${meta}</span>
            <span class="resource-status">${statusHtml}</span>
          </div>
        </div>
        <div class="resource-arrow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </div>
      </a>
    `;
  }

  function getResourceIcon(iconType) {
    const icons = {
      folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2z"/></svg>`,
      doc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
      box: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
      server: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>`,
      disc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>`,
      book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="12" y2="15"/></svg>`,
      shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>`
    };
    return icons[iconType] || icons.folder;
  }

  /* ═══════════════════════════════════════════════
     DATA FETCHING & SYNC
     ═══════════════════════════════════════════════ */
  async function loadResources(options = {}) {
    if (typeof ResourceService === 'undefined') {
      console.error("[Home] ResourceService is not available");
      return;
    }

    try {
      rawResources = await ResourceService.getResources(options);
      applyFiltersAndRender();
    } catch (err) {
      console.error("[Home] Failed to load resources:", err);
      const grid = document.getElementById("resourcesGrid");
      if (grid) {
        const d = typeof window.getDict === 'function' ? window.getDict() : getDict();
        grid.innerHTML = `
          <div class="resources-error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>${d.resourcesLoadError || "Unable to load resources. Please try again later."}</span>
          </div>
        `;
      }
    }
  }

  function updateLastSyncTime() {
    const el = document.getElementById("lastSyncTime");
    if (!el) return;
    const now = new Date();
    const lang = typeof window.getLang === 'function' ? window.getLang() : getLang();
    const locale = lang === "fa" ? "fa-IR" : "en-US";
    el.textContent = now.toLocaleDateString(locale) + " " +
      now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  }

  /* ═══════════════════════════════════════════════
     UI COMPONENTS HELPERS
     ═══════════════════════════════════════════════ */
  function releaseRow(ver, isNew, type, date, size, checksum) {
    const d = typeof window.getDict === 'function' ? window.getDict() : getDict();

    // Icon mapping for Release Table
    const typeIcons = {
      "System Package": `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
      "Template": `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
      "ISO Image": `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>`,
      "Documentation": `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`
    };
    const typeIcon = typeIcons[type] || "";

    return `
      <tr>
        <td><div class="version-cell">${ver} ${isNew ? `<span class="badge badge-new">${d.badgeNew || "NEW"}</span>` : ``}</div></td>
        <td><div class="type-cell">${typeIcon} ${type}</div></td>
        <td class="mono">${date}</td>
        <td class="mono">${size}</td>
        <td><span class="mono" style="display:inline-flex; align-items:center; gap:6px;">${checksum} <button class="icon-btn" title="Copy checksum" style="width:16px;height:16px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3"/></svg></button></span></td>
        <td style="text-align:${d.dir === 'rtl' ? 'left' : 'right'}">
          <div class="row-actions">
            <button class="download-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> ${d.btnDownload || "Download"}</button>
            <button class="icon-btn" aria-label="More"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg></button>
          </div>
        </td>
      </tr>
    `;
  }

  function quickItem(title, sub, iconType) {
    const icon = getResourceIcon(iconType);
    return `
      <div class="quick-item">
        <div class="quick-icon">${icon}</div>
        <div class="quick-meta">
          <div class="quick-meta-title">${title}</div>
          <div class="quick-meta-sub">${sub}</div>
        </div>
        <div class="quick-arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>
      </div>
    `;
  }

  /* ═══════════════════════════════════════════════
     DOM BINDINGS
     ═══════════════════════════════════════════════ */
  function bindEvents() {
    bindSearchEvents();
    bindViewToggleEvents();
    bindRefreshEvent();
    bindFilterEvents();
  }

  function bindFilterEvents() {
    const filterWraps = document.querySelectorAll(".filter-dropdown-wrap");

    filterWraps.forEach(wrap => {
      const pill = wrap.querySelector(".filter-pill");
      const valueSpan = pill.querySelector(".filter-value");
      const options = wrap.querySelectorAll(".filter-option");

      // 1. Open/Close custom dropdown
      pill.addEventListener("click", (e) => {
        e.stopPropagation();
        // Close other open menus
        filterWraps.forEach(w => { if (w !== wrap) w.classList.remove("show"); });
        wrap.classList.toggle("show");
      });

      // 2. Handle option click
      options.forEach(opt => {
        opt.addEventListener("click", (e) => {
          e.stopPropagation();
          const val = opt.getAttribute("data-val");
          const text = opt.textContent;

          // Update trigger button text
          valueSpan.textContent = text;

          // Update active styling
          options.forEach(o => o.classList.remove("active"));
          opt.classList.add("active");

          // Save state & Apply
          if (wrap.id === "catFilterWrap") activeCategory = val;
          if (wrap.id === "sortFilterWrap") activeSort = val;

          wrap.classList.remove("show");
          applyFiltersAndRender();
        });
      });
    });

    // 3. Close on outside click
    document.addEventListener("click", () => {
      filterWraps.forEach(w => w.classList.remove("show"));
    });
  }

  function bindSearchEvents() {
    const qInput = document.getElementById("globalSearch");
    const searchBtn = document.getElementById("searchBtn");
    const stopBtn = document.getElementById("stopBtn");

    if (!qInput || !searchBtn) return;

    if (typeof Autocomplete !== "undefined") {
      Autocomplete.bind(qInput);
    }

    const doSearch = () => {
      if (typeof Autocomplete !== "undefined") Autocomplete.hide();
      scanAll(qInput.value || "");
    };

    searchBtn.addEventListener("click", doSearch);
    stopBtn.addEventListener("click", () => { stopFlag = true; });

    qInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); doSearch(); }
      if (e.key === "Escape") clearResults();
    });

    // Global keyboard shortcut: Cmd/Ctrl + K
    window._homeKeyHandler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        qInput.focus();
      }
    };

    // Remove previous listener to avoid duplicates if re-rendered
    window.removeEventListener("keydown", window._homeKeyHandler);
    window.addEventListener("keydown", window._homeKeyHandler);
  }

  function bindViewToggleEvents() {
    const gridBtn = document.getElementById("viewGridBtn");
    const listBtn = document.getElementById("viewListBtn");
    const grid = document.querySelector(".resources-grid");
    if (!gridBtn || !listBtn || !grid) return;

    listBtn.addEventListener("click", () => {
      grid.style.gridTemplateColumns = "1fr";
      listBtn.classList.add("active");
      gridBtn.classList.remove("active");
    });

    gridBtn.addEventListener("click", () => {
      grid.style.gridTemplateColumns = "";
      gridBtn.classList.add("active");
      listBtn.classList.remove("active");
    });
  }

  function bindRefreshEvent() {
    const refreshBtn = document.getElementById("refreshResourcesBtn");
    if (!refreshBtn) return;

    refreshBtn.addEventListener("click", async () => {
      refreshBtn.classList.add("spinning");
      const grid = document.getElementById("resourcesGrid");
      if (grid) grid.innerHTML = renderSkeletonCards();

      try {
        await loadResources({ forceRefresh: true });
      } finally {
        setTimeout(() => refreshBtn.classList.remove("spinning"), 500);
      }
    });
  }

  /* ═══════════════════════════════════════════════
     SEARCH ENGINE
     ═══════════════════════════════════════════════ */
  function clearResults() {
    const box = document.getElementById("resultsList");
    const panel = document.getElementById("resultsBox");
    if (box) box.innerHTML = "";
    if (panel) panel.style.display = "none";
  }

  function addResult(item) {
    const d = typeof window.getDict === 'function' ? window.getDict() : getDict();
    const list = document.getElementById("resultsList");
    if (!list) return;

    const row = document.createElement("div");
    row.className = "res-row";
    row.innerHTML = `
      <div class="res-info">
        <a href="${item.href}">${item.name}</a>
        <div class="res-path">${item.href}</div>
      </div>
      <div>
        <span class="badge ${item.type === 'directory' ? 'badge-dir' : 'badge-file'}">
          ${item.type === 'directory' ? (d.dirBadge || 'DIR') : (d.fileBadge || 'FILE')}
        </span>
      </div>`;
    list.appendChild(row);
  }

  async function scanAll(query) {
    const d = typeof window.getDict === 'function' ? window.getDict() : getDict();
    stopFlag = false;

    const resultsBox = document.getElementById("resultsBox");
    const resultsList = document.getElementById("resultsList");
    const progressEl = document.getElementById("progress");
    const searchBtn = document.getElementById("searchBtn");
    const stopBtn = document.getElementById("stopBtn");
    const qInput = document.getElementById("globalSearch");

    if (!resultsBox) return;

    resultsList.innerHTML = "";
    resultsBox.style.display = "block";
    resultsBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
    progressEl.textContent = d.scanning || "Scanning…";
    stopBtn.style.display = "inline-flex";
    searchBtn.disabled = true;
    qInput.disabled = true;

    const q = query.trim().toLowerCase();
    let found = 0;
    let scanned = 0;
    const queue = [...SEARCH_ROOTS];

    while (queue.length) {
      if (stopFlag) break;
      const dir = queue.shift();
      scanned++;

      try {
        const res = await fetch("/__list" + dir, { cache: "no-store" });
        if (!res.ok) continue;

        const entries = await res.json();
        for (const e of entries) {
          if (stopFlag) break;
          // Ignore hidden or standard . / .. 
          if (!e || !e.name || e.name === "." || e.name === "..") continue;
          if ((e.name || "").toLowerCase() === "index.html" || (e.name || "").startsWith(".")) continue;

          const type = e.type === "directory" ? "directory" : "file";
          const href = dir + e.name + (type === "directory" ? "/" : "");

          if (type === "directory") queue.push(href);

          if (!q || e.name.toLowerCase().includes(q)) {
            addResult({ name: e.name, href, type });
            found++;
            if (found >= SEARCH_MAX_RESULTS) { stopFlag = true; break; }
          }
        }
      } catch { }

      progressEl.textContent = `${d.scannedDirs || 'Scanned'} ${scanned} · ${found} ${d.foundText || 'found'}`;
    }

    progressEl.textContent = `${d.done || 'Done'} · ${found} ${d.foundText || 'found'}`;
    stopBtn.style.display = "none";
    searchBtn.disabled = false;
    qInput.disabled = false;

    if (!found) {
      resultsList.innerHTML = `<div class="ac-empty">${d.emptySearch || 'No results for'} "${query}"</div>`;
    }
  }

  /* ═══════════════════════════════════════════════
     PUBLIC API
     ═══════════════════════════════════════════════ */
  return {
    render,
    refreshResources: () => loadResources({ forceRefresh: true })
  };
})();
```

---

<a id="file-11"></a>

### 📄 File 11/18: `assets/js/i18n.js`

| Property | Value |
|----------|-------|
| **Path** | `assets/js/i18n.js` |
| **Language** | JavaScript |
| **Size** | 11.6 KB |
| **Lines** | 309 |

```javascript
/* ═══════════════════════════════════════════════════════════════
   i18n.js — Shared Internationalization & Language System
   Skill: UI UX Pro Max — Multi-language Engine & Dropdown Controller
   ═══════════════════════════════════════════════════════════════ */

const i18n = {
    en: {
        dir: "ltr",
        lang: "en",

        // Global Header / Navbar
        brand: "CloudAvid",
        subtitle: "File Portal",
        website: "Website",
        docs: "Docs",
        downloads: "Downloads",
        home: "Home",
        root: "Home",
        pageTitle: "CloudAvid • File Portal",
        browseTitle: "Downloads • CloudAvid",

        // Hero Section
        portalStatus: "YOUR INFRASTRUCTURE. WITH AVID.",
        heroTitle: `<span class="avid">AVID</span> <span class="accent">Download</span><br>Infrastructure`,
        desc: "Access software packages, ISO images, templates and system logs — provided by CloudAvid infrastructure team.",
        searchPh: "Search for files, packages, templates...",
        searchBtn: "Search",
        stopBtn: "Stop",

        // Infrastructure Resources Cards
        infraTitle: "Infrastructure Resources",
        infraSub: "Browse and download all available infrastructure resources and packages.",
        allCategories: "All categories",
        sortLatest: "Sort by: Latest",
        sysFiles: "System Files",
        sysFilesDesc: "Public system files and essential packages for infrastructure.",
        template: "Templates",
        templateDesc: "Common templates and configuration files for deployment.",
        sandbox: "Sandbox",
        sandboxDesc: "Isolated environment packages and test files.",
        logServer: "Log Server",
        logServerDesc: "Database exports and system logs for troubleshooting.",
        iso: "ISO Images",
        isoDesc: "Operating systems and installation images.",
        docsTitle: "Documentation",
        docsDesc: "Guides, manuals and technical documentation.",
        files: "files",
        folders: "folders",
        folder: "Folder",
        file: "File",
        updated: "Updated",

        // Latest Releases & Quick Access
        latestReleases: "Latest Releases",
        latestSub: "Recently published packages and updates.",
        viewAll: "View all",
        thVersion: "Version",
        thType: "Package Type",
        thUpdated: "Updated",
        thSize: "Size",
        thChecksum: "Checksum",
        thAction: "Action",
        badgeNew: "NEW",
        btnDownload: "Download",
        quickAccess: "Quick Access",
        quickSub: "Frequently used downloads.",

        // Status Bar
        statusInfra: "Infrastructure Status",
        statusOperational: "All systems operational",
        statusMalware: "Malware Scanning",
        statusEngines: "engines active",
        statusStorage: "Storage",
        statusUsed: "used",
        statusSync: "Last Sync",

        // Search Overlay & Autocomplete
        results: "Results",
        scanning: "Scanning…",
        scannedDirs: "Scanned",
        foundText: "found",
        done: "Done",
        empty: "This folder is empty.",
        emptySearch: "No files matched.",
        dirBadge: "DIR",
        fileBadge: "FILE",
        navNavigate: "Navigate",
        navSelect: "Select",

        // Table & Browse Page
        name: "Name",
        type: "Type",
        modified: "Modified",
        size: "Size",
        loadErrTitle: "Failed to load",
        loadErrHint: "Check /__list/ endpoint.",

        perfLabel: "Performance",
        perfAuto: "Auto Detect",
        perfHigh: "High Power",
        perfMed: "Balanced",
        perfLow: "Power Saver",
        perfPotato: "Potato Mode",

        // Browse Page Filters & Sorting
        searchFolderPh: "Search in folder...",
        allTypes: "All Types",
        sortName: "Name (A-Z)",
        sortNameDesc: "Name (Z-A)",
        sortOldest: "Oldest First",
        sortSize: "Largest First",
    },

    fa: {
        dir: "rtl",
        lang: "fa",

        // Global Header / Navbar
        brand: "کلود آوید",
        subtitle: "پرتال فایل",
        website: "وب‌سایت",
        docs: "مستندات",
        downloads: "دانلودها",
        home: "خانه",
        root: "خانه",
        pageTitle: "کلود آوید • پرتال فایل",
        browseTitle: "دانلودها • کلود آوید",

        // Hero Section
        portalStatus: "زیرساخت شما، با آوید",
        heroTitle: `<span class="avid">مرکز</span> <span class="accent">دانلود</span><br>آوید`,
        desc: "دسترسی به بسته‌های نرم‌افزاری، ایمیج‌های ISO، قالب‌ها و لاگ‌های سیستمی — ارائه شده توسط تیم زیرساخت کلود آوید.",
        searchPh: "جستجو در فایل‌ها، بسته‌ها، قالب‌ها...",
        searchBtn: "جستجو",
        stopBtn: "توقف",

        // Infrastructure Resources Cards
        infraTitle: "منابع زیرساخت",
        infraSub: "مرور و دانلود تمام منابع و بسته‌های زیرساختی موجود.",
        allCategories: "همه دسته‌بندی‌ها",
        sortLatest: "مرتب‌سازی: جدیدترین",
        sysFiles: "فایل‌های سیستمی",
        sysFilesDesc: "فایل‌های عمومی سیستم و بسته‌های ضروری زیرساخت.",
        template: "قالب‌ها",
        templateDesc: "قالب‌های عمومی و فایل‌های پیکربندی راه‌اندازی.",
        sandbox: "سندباکس",
        sandboxDesc: "بسته‌های محیط ایزوله و فایل‌های آزمایشی.",
        logServer: "لاگ سرور",
        logServerDesc: "خروجی‌های دیتابیس و لاگ‌های سیستم برای عیب‌یابی.",
        iso: "ایمیج‌های ISO",
        isoDesc: "ایمیج‌های سیستم‌عامل و نصب‌کننده‌ها.",
        docsTitle: "مستندات فنی",
        docsDesc: "راهنماها، دفترچه‌ها و مستندات فنی.",
        files: "فایل",
        folders: "پوشه",
        folder: "پوشه",
        file: "فایل",
        updated: "به‌روزرسانی شد",

        // Latest Releases & Quick Access
        latestReleases: "آخرین انتشارها",
        latestSub: "بسته‌ها و به‌روزرسانی‌های اخیر.",
        viewAll: "مشاهده همه",
        thVersion: "نسخه",
        thType: "نوع بسته",
        thUpdated: "تاریخ به‌روزرسانی",
        thSize: "حجم",
        thChecksum: "چک‌سام",
        thAction: "عملیات",
        badgeNew: "جدید",
        btnDownload: "دانلود",
        quickAccess: "دسترسی سریع",
        quickSub: "دانلودهای پرکاربرد.",

        // Status Bar
        statusInfra: "وضعیت زیرساخت",
        statusOperational: "همه سیستم‌ها فعال هستند",
        statusMalware: "اسکن بدافزار",
        statusEngines: "موتور فعال",
        statusStorage: "فضای ذخیره‌سازی",
        statusUsed: "استفاده شده",
        statusSync: "آخرین همگام‌سازی",

        // Search Overlay & Autocomplete
        results: "نتایج",
        scanning: "در حال اسکن…",
        scannedDirs: "اسکن شد",
        foundText: "مورد یافت شد",
        done: "پایان",
        empty: "این پوشه خالی است.",
        emptySearch: "فایلی پیدا نشد.",
        dirBadge: "پوشه",
        fileBadge: "فایل",
        navNavigate: "جابه‌جایی",
        navSelect: "انتخاب",

        // Table & Browse Page
        name: "نام",
        type: "نوع",
        modified: "آخرین تغییر",
        size: "حجم",
        loadErrTitle: "بارگذاری ناموفق",
        loadErrHint: "مسیر /__list/ را بررسی کنید.",

        perfLabel: "عملکرد سیستم",
        perfAuto: "تشخیص خودکار",
        perfHigh: "حداکثر گرافیک",
        perfMed: "عملکرد متعادل",
        perfLow: "کاهش مصرف باتری",
        perfPotato: "بسیار سبک (سیب‌زمینی)",

        // Browse Page Filters & Sorting
        searchFolderPh: "جستجو در این پوشه...",
        allTypes: "همه موارد",
        sortName: "نام (الف - ی)",
        sortNameDesc: "نام (ی - الف)",
        sortOldest: "قدیمی‌ترین",
        sortSize: "بیشترین حجم",
    }
};

/* ── Core Language Getters ── */
function getLang() {
    try {
        return localStorage.getItem("ui_lang") || "en";
    } catch {
        return "en";
    }
}

function getDict(lang) {
    return i18n[lang || getLang()] || i18n.en;
}

/* ── Main Language Applicator ── */
function applyLang(lang) {
    const targetLang = lang || getLang();
    const d = getDict(targetLang);

    // 1. Set HTML Direction & Language
    document.documentElement.lang = d.lang;
    document.documentElement.dir = d.dir;

    // 2. Standard Text Translation
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const k = el.getAttribute("data-i18n");
        if (d[k] != null) el.textContent = d[k];
    });

    // 3. Input Placeholders Translation
    document.querySelectorAll("[data-i18n-ph]").forEach(el => {
        const k = el.getAttribute("data-i18n-ph");
        if (d[k] != null) el.placeholder = d[k];
    });

    // 4. HTML Content Translation (Preserves tags like <span>)
    document.querySelectorAll("[data-i18n-html]").forEach(el => {
        const k = el.getAttribute("data-i18n-html");
        if (d[k] != null) el.innerHTML = d[k];
    });

    // 5. Update Language Pill Label in Header
    const currentLangLabel = document.getElementById("currentLangLabel");
    if (currentLangLabel) {
        currentLangLabel.textContent = targetLang === "fa" ? "FA" : "EN";
    }

    // 6. Highlight Active Language in Dropdown
    document.querySelectorAll(".lang-option").forEach(btn => {
        if (btn.getAttribute("data-lang") === targetLang) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    // 7. Save Preference
    try {
        localStorage.setItem("ui_lang", targetLang);
    } catch { }
}

function setupLanguageDropdown() {
    applyLang(getLang());

    document.addEventListener("click", (e) => {
        const langOption = e.target.closest(".lang-option");
        if (langOption) {
            const selectedLang = langOption.getAttribute("data-lang");

            if (selectedLang && selectedLang !== getLang()) {
                applyLang(selectedLang);

                if (typeof Router !== "undefined") {
                    Router.refresh();
                } else {
                    window.location.reload();
                }
            }
        }
    });
}

/* ── Auto-Boot on DOM Ready ── */
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupLanguageDropdown);
} else {
    setupLanguageDropdown();
}
```

---

<a id="file-12"></a>

### 📄 File 12/18: `assets/js/router.js`

| Property | Value |
|----------|-------|
| **Path** | `assets/js/router.js` |
| **Language** | JavaScript |
| **Size** | 3.6 KB |
| **Lines** | 111 |

```javascript
/* ═══════════════════════════════════════════════
   router.js — Smart SPA Router (File Aware)
   Skill: Enterprise Architecture — Decoupled & State-managed
   ═══════════════════════════════════════════════ */
const Router = (function () {
    'use strict';

    const app = document.getElementById("app");
    const fileExtensions = /\.(html|backhtml|zip|tar|gz|iso|qcow2|vmdk|pdf|txt|log|sql|docx|xlsx|pptx|png|jpg|exec|sh)$/i;

    // Internal State
    let currentPath = window.location.pathname;

    function resolveRoute(path) {
        if (path === "/" || path === "/index.html") return "home";
        if (path.startsWith("/download/") || path.startsWith("/files/")) return "browse";
        return null;
    }

    function navigate(path, pushState = true) {
        const route = resolveRoute(path);

        // Fallback for external or unknown routes
        if (!route) {
            window.location.href = path;
            return;
        }

        // Update State & Browser History
        currentPath = path;
        if (pushState) {
            history.pushState({ path }, "", path);
        }

        // 1. Transition Out
        app.style.opacity = "0";
        app.style.transform = "translateY(8px)";

        setTimeout(() => {
            // 2. Render Component
            if (route === "home") {
                HomePage.render(app);
            } else if (route === "browse") {
                BrowsePage.render(app, path);
            }

            // 3. Apply Language to newly rendered DOM safely
            if (typeof applyLang === 'function') {
                applyLang(getLang());
            }

            // 4. Transition In
            requestAnimationFrame(() => {
                app.style.transition = "opacity 250ms ease, transform 250ms ease";
                app.style.opacity = "1";
                app.style.transform = "translateY(0)";
            });

            window.scrollTo({ top: 0, behavior: "instant" });
        }, 150);
    }

    // A clean method for other modules to request a page re-render (e.g. after language change)
    function refresh() {
        navigate(currentPath, false);
    }

    // Global Link Interceptor
    document.addEventListener("click", (e) => {
        const link = e.target.closest("a[href]");
        if (!link) return;

        const href = link.getAttribute("href");

        if (href.startsWith("http") && !href.startsWith(window.location.origin)) return;
        if (link.target === "_blank") return;
        if (href.startsWith("#") || href.startsWith("mailto:")) return;

        if (fileExtensions.test(href) || link.hasAttribute("data-file")) {
            return;
        }

        e.preventDefault();
        navigate(href);
    });

    // Handle Browser Back/Forward Buttons
    window.addEventListener("popstate", (e) => {
        const path = e.state?.path || window.location.pathname;
        navigate(path, false);
    });

    // Boot
    function init() {
        history.replaceState({ path: currentPath }, "", currentPath);
        navigate(currentPath, false);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    // Public API
    return {
        navigate,
        refresh,
        get currentPath() { return currentPath; }
    };
})();
```

---

<a id="file-13"></a>

### 📄 File 13/18: `assets/js/services/performance-monitor.js`

| Property | Value |
|----------|-------|
| **Path** | `assets/js/services/performance-monitor.js` |
| **Language** | JavaScript |
| **Size** | 31.3 KB |
| **Lines** | 761 |

```javascript
/* ═══════════════════════════════════════════════════════════════
   performance-monitor.js — Adaptive Performance Engine
   Skill: Enterprise Architecture — Real-time FPS + Hardware Probe

   Responsibilities:
   - Detect device capability (CPU, RAM, GPU, Connection, Battery)
   - Monitor real-time FPS via requestAnimationFrame
   - Classify device into tiers: HIGH / MEDIUM / LOW / POTATO
   - Apply data-perf attribute to <html> for CSS-driven overrides
   - Auto-downgrade on sustained FPS drops (adaptive)
   - Auto-upgrade on FPS recovery
   - Cache classification result in localStorage (7 days TTL)
   - Respect prefers-reduced-motion & Data Saver preferences
   - Provide developer debug panel (Ctrl+Shift+P)
   - Provide user-facing dropdown for manual tier selection
   ═══════════════════════════════════════════════════════════════ */

const PerformanceMonitor = (function () {
    'use strict';

    /* ═══════════════════════════════════════════════
       CONFIGURATION
       ═══════════════════════════════════════════════ */
    const CONFIG = {
        CACHE_KEY: "cav_perf_tier",
        CACHE_TTL: 7 * 24 * 60 * 60 * 1000, // 7 days in ms

        FPS_SAMPLE_SIZE: 60,          // Frames buffered per sample window
        FPS_CHECK_INTERVAL: 1000,     // ms between FPS evaluations
        DOWNGRADE_THRESHOLD: 3,       // Consecutive low-FPS checks before downgrade
        UPGRADE_THRESHOLD: 5,         // Consecutive high-FPS checks before upgrade

        FPS_THRESHOLDS: {
            HIGH: 50,
            MEDIUM: 35,
            LOW: 20
            // Anything below LOW is classified as POTATO
        },

        TOAST_DURATION: 4000,
        DEBUG_SHORTCUT: { ctrl: true, shift: true, key: "p" },
        debug: false
    };

    // Ordered tiers (index-based navigation for upgrade/downgrade logic)
    const TIERS = ["HIGH", "MEDIUM", "LOW", "POTATO"];
    const TIER_EMOJI = { HIGH: "🚀", MEDIUM: "⚡", LOW: "🐌", POTATO: "🥔" };

    /* ═══════════════════════════════════════════════
       INTERNAL STATE
       ═══════════════════════════════════════════════ */
    let currentTier = "HIGH";
    let isInitialized = false;
    let isManualOverride = false;

    // FPS tracking buffers
    let fpsBuffer = [];
    let lastFrameTime = 0;
    let fpsRafId = null;
    let checkIntervalId = null;
    let lowFpsCount = 0;
    let highFpsCount = 0;
    let currentFps = 60;

    // Hardware profile snapshot
    let hardwareReport = {};

    // Event system + UI references
    let listeners = {};
    let debugPanelEl = null;
    let debugVisible = false;

    /* ═══════════════════════════════════════════════
       UTILITY — Logging helper (only in debug mode)
       ═══════════════════════════════════════════════ */
    function log(...args) {
        if (CONFIG.debug) {
            console.log("%c⚡ [PerfMonitor]", "color:#ffb800;font-weight:bold", ...args);
        }
    }

    /* ═══════════════════════════════════════════════
       LAYER 1: DETECTION — Hardware capability probing
       ═══════════════════════════════════════════════ */
    function detectHardware() {
        const report = {
            cores: navigator.hardwareConcurrency || 2,
            ram: navigator.deviceMemory || 4, // GB (Chrome only, fallback to 4)
            gpu: "Unknown",
            gpuTier: "unknown",
            connection: "unknown",
            connectionSpeed: null,
            prefersReducedMotion: false,
            prefersDataSaver: false,
            batteryLow: false,
            touchDevice: false,
            pixelRatio: window.devicePixelRatio || 1,
            screenWidth: screen.width,
            screenHeight: screen.height
        };

        // GPU detection via WebGL renderer string
        try {
            const canvas = document.createElement("canvas");
            const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

            if (gl) {
                const ext = gl.getExtension("WEBGL_debug_renderer_info");

                if (ext) {
                    report.gpu = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
                    const gpuLower = report.gpu.toLowerCase();

                    // Categorize GPU strength based on known vendor keywords
                    if (/intel|mesa|swiftshader|llvmpipe|microsoft basic/i.test(gpuLower)) {
                        report.gpuTier = "integrated";
                    } else if (/nvidia|amd|radeon|geforce|rtx|gtx|rx/i.test(gpuLower)) {
                        report.gpuTier = "dedicated";
                    } else {
                        report.gpuTier = "unknown";
                    }
                }

                // Release the WebGL context immediately to free GPU resources
                const loseCtx = gl.getExtension("WEBGL_lose_context");
                if (loseCtx) loseCtx.loseContext();
            }
        } catch {
            // WebGL not supported — GPU stays "Unknown"
        }

        // Network Information API (Chrome, Edge, Opera)
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (conn) {
            report.connection = conn.effectiveType || "unknown"; // '4g', '3g', '2g', 'slow-2g'
            report.connectionSpeed = conn.downlink || null;      // Mbps
            report.prefersDataSaver = conn.saveData === true;
        }

        // User accessibility preference
        report.prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        // Touch capability heuristic
        report.touchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;

        // Battery API is asynchronous — handle separately to avoid blocking
        if (navigator.getBattery) {
            navigator.getBattery().then(battery => {
                report.batteryLow = battery.level < 0.2 && !battery.charging;

                // Force downgrade if battery is critical and user hasn't manually overridden
                if (report.batteryLow && !isManualOverride) {
                    log("Battery low — forcing LOW tier");
                    applyTier("LOW", "battery");
                }

                // Keep watching battery level changes
                battery.addEventListener("levelchange", () => {
                    report.batteryLow = battery.level < 0.2 && !battery.charging;
                });
            }).catch(() => { /* Battery API not permitted */ });
        }

        return report;
    }

    /* ═══════════════════════════════════════════════
       LAYER 2: CLASSIFICATION — Tier decision logic
       ═══════════════════════════════════════════════ */
    function classifyDevice(report) {
        // Hard overrides — user or network preferences take priority
        if (report.prefersReducedMotion) return "LOW";
        if (report.prefersDataSaver) return "MEDIUM";
        if (report.connection === "slow-2g" || report.connection === "2g") return "POTATO";
        if (report.connection === "3g") return "LOW";

        // Weighted scoring system (max 8 points)
        let score = 0;

        // CPU cores (0–3 points)
        if (report.cores >= 8) score += 3;
        else if (report.cores >= 4) score += 2;
        else if (report.cores >= 2) score += 1;

        // RAM (0–3 points)
        if (report.ram >= 8) score += 3;
        else if (report.ram >= 4) score += 2;
        else if (report.ram >= 2) score += 1;

        // GPU (0–2 points)
        if (report.gpuTier === "dedicated") score += 2;
        else if (report.gpuTier === "integrated") score += 1;

        // High-DPI on weak devices = extra rendering load
        if (report.pixelRatio >= 2 && report.ram < 4) score -= 1;

        // Small touch device = likely low-end mobile = be conservative
        if (report.touchDevice && report.screenWidth < 768) score -= 1;

        // Final tier mapping
        if (score >= 6) return "HIGH";
        if (score >= 3) return "MEDIUM";
        if (score >= 1) return "LOW";
        return "POTATO";
    }

    // Map real-time FPS to a tier for comparison against currentTier
    function classifyByFps(fps) {
        if (fps >= CONFIG.FPS_THRESHOLDS.HIGH) return "HIGH";
        if (fps >= CONFIG.FPS_THRESHOLDS.MEDIUM) return "MEDIUM";
        if (fps >= CONFIG.FPS_THRESHOLDS.LOW) return "LOW";
        return "POTATO";
    }

    /* ═══════════════════════════════════════════════
       LAYER 3: APPLICATION — Apply tier to the DOM
       ═══════════════════════════════════════════════ */
    function applyTier(tier, reason = "auto") {
        const prevTier = currentTier;
        const tierIndex = TIERS.indexOf(tier);

        // Clamp tier to a valid value inside the TIERS array
        const clampedTier = TIERS[Math.max(0, Math.min(tierIndex, TIERS.length - 1))];

        // Skip re-application if tier hasn't actually changed after init
        if (clampedTier === prevTier && isInitialized) return;

        currentTier = clampedTier;
        document.documentElement.setAttribute("data-perf", clampedTier.toLowerCase());

        log(`${TIER_EMOJI[clampedTier]} Tier: ${clampedTier} (reason: ${reason}, FPS: ${currentFps})`);

        // Notify subscribers about the change
        emit("tierChange", {
            tier: clampedTier,
            prevTier,
            reason,
            fps: currentFps
        });

        // Show toast notification ONLY on automatic downgrades (not on init or manual)
        if (isInitialized && !isManualOverride && reason === "fps-drop") {
            showToast(`Performance mode: ${TIER_EMOJI[clampedTier]} ${clampedTier}`, "perf-downgrade");
        }

        // Sync UI components
        updateDebugPanel();
        updateUiActiveStates();
    }

    /* ═══════════════════════════════════════════════
       LAYER 4: FEEDBACK — Real-time FPS monitoring
       ═══════════════════════════════════════════════ */
    function startFpsMonitor() {
        // Reset buffer before starting to avoid stale data
        fpsBuffer = [];
        lastFrameTime = performance.now();

        // Per-frame sampler using requestAnimationFrame
        function frame(now) {
            const delta = now - lastFrameTime;
            lastFrameTime = now;

            // Ignore invalid deltas (e.g., tab-switch spikes > 1s)
            if (delta > 0 && delta < 1000) {
                fpsBuffer.push(1000 / delta);

                // Trim buffer to configured sample size
                if (fpsBuffer.length > CONFIG.FPS_SAMPLE_SIZE) {
                    fpsBuffer.shift();
                }
            }

            fpsRafId = requestAnimationFrame(frame);
        }

        fpsRafId = requestAnimationFrame(frame);

        // Periodic evaluation of averaged FPS
        checkIntervalId = setInterval(evaluateFps, CONFIG.FPS_CHECK_INTERVAL);
    }

    function evaluateFps() {
        // Manual override disables adaptive behavior
        if (isManualOverride) return;

        // Wait until enough samples are collected
        if (fpsBuffer.length < 10) return;

        // Calculate rolling average FPS
        const sum = fpsBuffer.reduce((a, b) => a + b, 0);
        currentFps = Math.round(sum / fpsBuffer.length);

        const fpsTier = classifyByFps(currentFps);
        const currentIdx = TIERS.indexOf(currentTier);
        const fpsIdx = TIERS.indexOf(fpsTier);

        // Downgrade — FPS is consistently worse than current tier
        if (fpsIdx > currentIdx) {
            lowFpsCount++;
            highFpsCount = 0;

            if (lowFpsCount >= CONFIG.DOWNGRADE_THRESHOLD) {
                const newTier = TIERS[Math.min(currentIdx + 1, TIERS.length - 1)];
                applyTier(newTier, "fps-drop");
                lowFpsCount = 0;
            }
        }
        // Upgrade — FPS is consistently better than current tier
        else if (fpsIdx < currentIdx) {
            highFpsCount++;
            lowFpsCount = 0;

            if (highFpsCount >= CONFIG.UPGRADE_THRESHOLD) {
                const newTier = TIERS[Math.max(currentIdx - 1, 0)];
                applyTier(newTier, "fps-recovery");
                highFpsCount = 0;
            }
        }
        // Stable — reset both counters
        else {
            lowFpsCount = 0;
            highFpsCount = 0;
        }

        updateDebugPanel();
    }

    function stopFpsMonitor() {
        if (fpsRafId) cancelAnimationFrame(fpsRafId);
        if (checkIntervalId) clearInterval(checkIntervalId);
        fpsRafId = null;
        checkIntervalId = null;
    }

    /* ═══════════════════════════════════════════════
       CACHE LAYER — localStorage persistence
       ═══════════════════════════════════════════════ */
    function getCachedTier() {
        try {
            const raw = localStorage.getItem(CONFIG.CACHE_KEY);
            if (!raw) return null;

            const data = JSON.parse(raw);

            // Invalidate expired cache
            if (Date.now() - data.timestamp > CONFIG.CACHE_TTL) return null;

            // Guard against malformed data
            if (!TIERS.includes(data.tier)) return null;

            return data.tier;
        } catch {
            return null;
        }
    }

    function setCachedTier(tier) {
        try {
            localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({
                tier,
                timestamp: Date.now(),
                hw: {
                    cores: hardwareReport.cores,
                    ram: hardwareReport.ram,
                    gpu: hardwareReport.gpuTier
                }
            }));
        } catch {
            // Storage quota exceeded or disabled — ignore silently
        }
    }

    function clearCache() {
        try {
            localStorage.removeItem(CONFIG.CACHE_KEY);
        } catch { /* noop */ }
    }

    /* ═══════════════════════════════════════════════
       TOAST NOTIFICATION — Auto-downgrade alerts
       ═══════════════════════════════════════════════ */
    function showToast(message, type = "info") {
        // Remove any previous toast to prevent stacking
        const existing = document.querySelector(".perf-toast");
        if (existing) existing.remove();

        const toast = document.createElement("div");
        toast.className = "perf-toast";
        toast.setAttribute("role", "status");
        toast.setAttribute("aria-live", "polite");
        toast.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4"/>
                <path d="M12 16h.01"/>
            </svg>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);

        // Defer .show class to next frame to trigger CSS transition
        requestAnimationFrame(() => toast.classList.add("show"));

        // Auto-dismiss after configured duration
        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 300);
        }, CONFIG.TOAST_DURATION);
    }

    /* ═══════════════════════════════════════════════
       DEBUG PANEL — Developer-only diagnostic UI
       ═══════════════════════════════════════════════ */
    function createDebugPanel() {
        if (debugPanelEl) return;

        debugPanelEl = document.createElement("div");
        debugPanelEl.className = "perf-debug-panel";
        debugPanelEl.innerHTML = `
            <div class="perf-debug-header">
                <span>⚙️ Performance</span>
                <button class="perf-debug-close" aria-label="Close">&times;</button>
            </div>
            <div class="perf-debug-body">
                <div class="perf-debug-row">
                    <span class="perf-debug-label">Tier</span>
                    <span class="perf-debug-value" id="perfDbgTier">—</span>
                </div>
                <div class="perf-debug-row">
                    <span class="perf-debug-label">FPS</span>
                    <span class="perf-debug-value" id="perfDbgFps">—</span>
                </div>
                <div class="perf-debug-row">
                    <span class="perf-debug-label">CPU Cores</span>
                    <span class="perf-debug-value" id="perfDbgCores">—</span>
                </div>
                <div class="perf-debug-row">
                    <span class="perf-debug-label">RAM</span>
                    <span class="perf-debug-value" id="perfDbgRam">—</span>
                </div>
                <div class="perf-debug-row">
                    <span class="perf-debug-label">GPU</span>
                    <span class="perf-debug-value" id="perfDbgGpu">—</span>
                </div>
                <div class="perf-debug-row">
                    <span class="perf-debug-label">Connection</span>
                    <span class="perf-debug-value" id="perfDbgConn">—</span>
                </div>
                <div class="perf-debug-row">
                    <span class="perf-debug-label">Pixel Ratio</span>
                    <span class="perf-debug-value" id="perfDbgDpr">—</span>
                </div>
                <div class="perf-debug-row">
                    <span class="perf-debug-label">Override</span>
                    <span class="perf-debug-value" id="perfDbgOverride">Auto</span>
                </div>
            </div>
            <div class="perf-debug-actions">
                <button class="perf-debug-btn" data-set-tier="HIGH">🚀 HIGH</button>
                <button class="perf-debug-btn" data-set-tier="MEDIUM">⚡ MED</button>
                <button class="perf-debug-btn" data-set-tier="LOW">🐌 LOW</button>
                <button class="perf-debug-btn" data-set-tier="POTATO">🥔 POT</button>
                <button class="perf-debug-btn perf-debug-btn-auto" data-set-tier="AUTO">↻ Auto</button>
            </div>
        `;

        document.body.appendChild(debugPanelEl);

        // Close button
        debugPanelEl.querySelector(".perf-debug-close").addEventListener("click", toggleDebugPanel);

        // Tier selection buttons
        debugPanelEl.querySelectorAll("[data-set-tier]").forEach(btn => {
            btn.addEventListener("click", () => {
                const tier = btn.getAttribute("data-set-tier");

                if (tier === "AUTO") {
                    // Return control back to the adaptive engine
                    isManualOverride = false;
                    clearCache();
                    const newTier = classifyDevice(hardwareReport);
                    applyTier(newTier, "manual-auto");
                    setCachedTier(newTier);
                } else {
                    // Lock tier manually
                    isManualOverride = true;
                    applyTier(tier, "manual");
                    setCachedTier(tier);
                }
            });
        });

        updateDebugPanel();
    }

    function updateDebugPanel() {
        if (!debugPanelEl || !debugVisible) return;

        const tierEl = document.getElementById("perfDbgTier");
        const fpsEl = document.getElementById("perfDbgFps");
        const coresEl = document.getElementById("perfDbgCores");
        const ramEl = document.getElementById("perfDbgRam");
        const gpuEl = document.getElementById("perfDbgGpu");
        const connEl = document.getElementById("perfDbgConn");
        const dprEl = document.getElementById("perfDbgDpr");
        const overrideEl = document.getElementById("perfDbgOverride");

        if (tierEl) tierEl.textContent = `${TIER_EMOJI[currentTier]} ${currentTier}`;

        if (fpsEl) {
            fpsEl.textContent = `${currentFps} fps`;
            // Color-code FPS: green (good) → amber (mid) → red (bad)
            fpsEl.style.color = currentFps >= 50 ? "#10b981"
                : currentFps >= 30 ? "#f59e0b"
                    : "#ef4444";
        }

        if (coresEl) coresEl.textContent = `${hardwareReport.cores} cores`;
        if (ramEl) ramEl.textContent = `${hardwareReport.ram} GB`;
        if (gpuEl) gpuEl.textContent = hardwareReport.gpuTier;
        if (connEl) connEl.textContent = hardwareReport.connection;
        if (dprEl) dprEl.textContent = `${hardwareReport.pixelRatio}x`;
        if (overrideEl) overrideEl.textContent = isManualOverride ? "Manual" : "Auto";
    }

    function toggleDebugPanel() {
        if (!debugPanelEl) createDebugPanel();
        debugVisible = !debugVisible;
        debugPanelEl.classList.toggle("show", debugVisible);
        if (debugVisible) updateDebugPanel();
    }

    /* ═══════════════════════════════════════════════
       USER INTERFACE BINDING — Dropdown in navbar
       ═══════════════════════════════════════════════ */
    function bindUserInterface() {
        const wrap = document.querySelector(".perf-dropdown-wrap");
        if (!wrap) return;

        const pill = wrap.querySelector(".perf-pill");
        const options = wrap.querySelectorAll(".perf-option");

        // 1. Toggle dropdown visibility on pill click
        pill.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            wrap.classList.toggle("show");
        });

        // 2. Handle option selection
        options.forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                const val = btn.getAttribute("data-perf-val");
                wrap.classList.remove("show");

                if (val === "AUTO") {
                    // Restore adaptive behavior
                    isManualOverride = false;
                    clearCache();
                    const computed = classifyDevice(hardwareReport);
                    applyTier(computed, "manual-auto");
                    setCachedTier(computed);
                } else {
                    // Lock manual tier selection
                    isManualOverride = true;
                    applyTier(val, "manual");
                    setCachedTier(val);
                }

                updateUiActiveStates();
            });
        });

        // 3. Click-outside dismissal (mobile-friendly)
        document.addEventListener("click", (e) => {
            if (!wrap.contains(e.target)) {
                wrap.classList.remove("show");
            }
        });

        // Initial sync of active-state indicator
        updateUiActiveStates();
    }

    // Reflect currently selected tier in the navbar dropdown UI
    function updateUiActiveStates() {
        const wrap = document.querySelector(".perf-dropdown-wrap");
        if (!wrap) return;

        const options = wrap.querySelectorAll(".perf-option");
        // If user hasn't overridden, "AUTO" is considered active
        const currentActive = isManualOverride ? currentTier : "AUTO";

        options.forEach(btn => {
            const val = btn.getAttribute("data-perf-val");
            btn.classList.toggle("active", val === currentActive);
        });
    }

    /* ═══════════════════════════════════════════════
       EVENT SYSTEM — Pub/Sub for external modules
       ═══════════════════════════════════════════════ */
    function emit(event, data) {
        if (!listeners[event]) return;

        listeners[event].forEach(cb => {
            try {
                cb(data);
            } catch (e) {
                console.error("[PerfMonitor] Listener error:", e);
            }
        });
    }

    function on(event, callback) {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(callback);
    }

    function off(event, callback) {
        if (!listeners[event]) return;
        listeners[event] = listeners[event].filter(cb => cb !== callback);
    }

    /* ═══════════════════════════════════════════════
       BOOT — Bootstrapping the engine
       ═══════════════════════════════════════════════ */
    function init(options = {}) {
        // Prevent double initialization
        if (isInitialized) return;
        isInitialized = true;

        if (options.debug) CONFIG.debug = true;

        log("Initializing...");

        // Step 1 — Detect hardware capabilities
        hardwareReport = detectHardware();
        log("Hardware:", hardwareReport);

        // Step 2 — Try cached tier first (avoids re-classification cost)
        const cached = getCachedTier();

        if (cached) {
            log(`Cache hit: ${cached}`);
            currentTier = cached;
        } else {
            // Step 3 — Classify fresh, then cache the result
            currentTier = classifyDevice(hardwareReport);
            setCachedTier(currentTier);
            log(`Classified as: ${currentTier}`);
        }

        // Step 4 — Apply tier attribute to <html> immediately
        document.documentElement.setAttribute("data-perf", currentTier.toLowerCase());

        // Step 5 — Defer FPS monitor startup to avoid blocking initial paint
        if ("requestIdleCallback" in window) {
            requestIdleCallback(() => startFpsMonitor());
        } else {
            setTimeout(startFpsMonitor, 500);
        }

        // Step 6 — Register debug panel keyboard shortcut
        document.addEventListener("keydown", (e) => {
            const s = CONFIG.DEBUG_SHORTCUT;

            if (
                (s.ctrl ? (e.ctrlKey || e.metaKey) : true) &&
                (s.shift ? e.shiftKey : true) &&
                e.key.toLowerCase() === s.key.toLowerCase()
            ) {
                e.preventDefault();
                toggleDebugPanel();
            }
        });

        // Step 7 — React to changes in prefers-reduced-motion at runtime
        const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
        motionMq.addEventListener("change", (e) => {
            if (!isManualOverride) {
                hardwareReport.prefersReducedMotion = e.matches;
                const newTier = classifyDevice(hardwareReport);
                applyTier(newTier, "preference-change");
                setCachedTier(newTier);
            }
        });

        // Step 8 — Pause FPS monitoring on hidden tabs to save battery
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) {
                stopFpsMonitor();
            } else {
                startFpsMonitor();
            }
        });

        // Step 9 — Wire up the navbar dropdown UI when DOM is ready
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", bindUserInterface);
        } else {
            bindUserInterface();
        }

        log(`✅ Ready — Tier: ${TIER_EMOJI[currentTier]} ${currentTier}`);
    }

    /* ═══════════════════════════════════════════════
       PUBLIC API — Exposed methods
       ═══════════════════════════════════════════════ */
    return {
        init,

        // Getters
        getTier: () => currentTier,
        getFPS: () => currentFps,
        getReport: () => ({
            tier: currentTier,
            fps: currentFps,
            isManualOverride,
            hardware: { ...hardwareReport }
        }),

        // Manual tier override
        setTier: (tier) => {
            if (!TIERS.includes(tier)) return;
            isManualOverride = true;
            applyTier(tier, "manual");
            setCachedTier(tier);
        },

        // Reset back to fully automatic behavior
        reset: () => {
            isManualOverride = false;
            clearCache();
            stopFpsMonitor();
            const newTier = classifyDevice(hardwareReport);
            applyTier(newTier, "reset");
            setCachedTier(newTier);
            startFpsMonitor();
        },

        // Event subscription API
        on,
        off,

        // Debug panel controls
        showDebugPanel: () => {
            if (!debugPanelEl) createDebugPanel();
            debugVisible = true;
            debugPanelEl.classList.add("show");
            updateDebugPanel();
        },
        hideDebugPanel: () => {
            debugVisible = false;
            if (debugPanelEl) debugPanelEl.classList.remove("show");
        }
    };
})();
```

---

<a id="file-14"></a>

### 📄 File 14/18: `assets/js/services/resource-service.js`

| Property | Value |
|----------|-------|
| **Path** | `assets/js/services/resource-service.js` |
| **Language** | JavaScript |
| **Size** | 7 KB |
| **Lines** | 202 |

```javascript
/* ═══════════════════════════════════════════════════════════════
   resource-service.js — Enterprise Resource Data Layer
   Skill: Clean Architecture — Caching, Parallel Fetching, Fallback
   
   Responsibilities:
   - Fetch directory metadata from /__list/ API
   - Cache results (in-memory + sessionStorage)
   - Provide unified resource metadata (icons, keys, paths)
   - Graceful degradation on API failure
   ═══════════════════════════════════════════════════════════════ */

const ResourceService = (function () {
    'use strict';

    /* ── Cache Configuration ── */
    const CACHE_KEY = "cav_resources_cache";
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache lifetime
    let memoryCache = null;

    /* ── Resource Registry (Metadata Definition) ── */
    // Central config for all infrastructure resources
    // Each entry defines: path, icon type, i18n keys for title/description
    const RESOURCE_REGISTRY = [
        {
            id: "system-files",
            path: "/files/",
            iconType: "folder",
            titleKey: "sysFiles",
            descKey: "sysFilesDesc",
            defaultTitle: "System Files",
            defaultDesc: "Public system files and essential packages for infrastructure."
        },
        {
            id: "templates",
            path: "/download/download-User/Template/",
            iconType: "doc",
            titleKey: "template",
            descKey: "templateDesc",
            defaultTitle: "Templates",
            defaultDesc: "Common templates and configuration files for deployment."
        },
        {
            id: "sandbox",
            path: "/download/download-User/Sandbox/",
            iconType: "box",
            titleKey: "sandbox",
            descKey: "sandboxDesc",
            defaultTitle: "Sandbox",
            defaultDesc: "Isolated environment packages and test files."
        },
        {
            id: "log-server",
            path: "/download/download-User/LogDB/",
            iconType: "server",
            titleKey: "logServer",
            descKey: "logServerDesc",
            defaultTitle: "Log Server",
            defaultDesc: "Database exports and system logs for troubleshooting."
        },
        {
            id: "iso-images",
            path: "/download/download-User/ISO/",
            iconType: "disc",
            titleKey: "iso",
            descKey: "isoDesc",
            defaultTitle: "ISO Images",
            defaultDesc: "Operating systems and installation images."
        },
        {
            id: "documentation",
            path: "/download/download-Avid/",
            iconType: "book",
            titleKey: "docsTitle",
            descKey: "docsDesc",
            defaultTitle: "Documentation",
            defaultDesc: "Guides, manuals and technical documentation."
        }
    ];

    /* ── Utility: Check hidden files ── */
    function isHidden(name) {
        const l = (name || "").toLowerCase();
        return l === "index.html" || l === "index.php" || l.startsWith(".");
    }

    /* ── Cache Layer ── */
    function getCachedData() {
        // Try memory first (fastest)
        if (memoryCache && (Date.now() - memoryCache.timestamp) < CACHE_TTL) {
            return memoryCache.data;
        }

        // Try sessionStorage (survives page navigation)
        try {
            const raw = sessionStorage.getItem(CACHE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if ((Date.now() - parsed.timestamp) < CACHE_TTL) {
                    memoryCache = parsed;
                    return parsed.data;
                }
            }
        } catch { }

        return null;
    }

    function setCachedData(data) {
        const payload = { timestamp: Date.now(), data };
        memoryCache = payload;
        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
        } catch { }
    }

    function clearCache() {
        memoryCache = null;
        try {
            sessionStorage.removeItem(CACHE_KEY);
        } catch { }
    }

    /* ── Fetch a single directory & compute stats ── */
    async function fetchDirectoryStats(path) {
        try {
            const res = await fetch("/__list" + path, { cache: "no-store" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const entries = await res.json();
            if (!Array.isArray(entries)) throw new Error("Invalid JSON");

            const visible = entries.filter(e =>
                e && e.name && e.name !== "." && e.name !== ".." && !isHidden(e.name)
            );

            const files = visible.filter(e => e.type !== "directory").length;
            const folders = visible.filter(e => e.type === "directory").length;
            const total = visible.length;

            // Find latest modified item
            let latestModified = null;
            visible.forEach(e => {
                const mtime = e.mtime || e.modified || e.time;
                if (mtime) {
                    const t = new Date(mtime).getTime();
                    if (!latestModified || t > latestModified) latestModified = t;
                }
            });

            return {
                available: true,
                total,
                files,
                folders,
                latestModified,
                error: null
            };
        } catch (err) {
            return {
                available: false,
                total: 0,
                files: 0,
                folders: 0,
                latestModified: null,
                error: err.message
            };
        }
    }

    /* ── Main API: fetch all resources in parallel ── */
    async function getResources(options = {}) {
        const { forceRefresh = false } = options;

        // Return cached data if available
        if (!forceRefresh) {
            const cached = getCachedData();
            if (cached) return cached;
        }

        // Fetch all resources in parallel
        const promises = RESOURCE_REGISTRY.map(async (resource) => {
            const stats = await fetchDirectoryStats(resource.path);
            return { ...resource, stats };
        });

        const resources = await Promise.all(promises);
        setCachedData(resources);
        return resources;
    }

    /* ── Get raw registry (for skeleton rendering) ── */
    function getRegistry() {
        return RESOURCE_REGISTRY.map(r => ({ ...r, stats: null }));
    }

    /* ── Public API ── */
    return {
        getResources,
        getRegistry,
        clearCache
    };
})();
```

---

<a id="file-15"></a>

### 📄 File 15/18: `assets/js/theme.js`

| Property | Value |
|----------|-------|
| **Path** | `assets/js/theme.js` |
| **Language** | JavaScript |
| **Size** | 2.9 KB |
| **Lines** | 102 |

```javascript
const Theme = (function () {
    'use strict';

    const STORAGE_KEY = 'cav_theme';
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const WIPE_MS = 700;

    function getSystemTheme() {
        return mq.matches ? 'dark' : 'light';
    }

    function getStored() {
        try {
            const v = localStorage.getItem(STORAGE_KEY);
            if (v === 'light' || v === 'dark') return v;
        } catch { }
        return null;
    }

    function resolve() {
        return getStored() || getSystemTheme();
    }

    function apply(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.content = theme === 'dark' ? '#08090e' : '#f5f6fa';
    }

    /**
     * Trigger diagonal wipe on hero logo (if present).
     * Adds .wiping → CSS transitions clip-path + line animation.
     */
    function triggerLogoWipe() {
        const el = document.getElementById('logoSwap');
        if (!el) return;

        // restart animation cleanly
        el.classList.remove('wiping');
        void el.offsetWidth; // force reflow
        el.classList.add('wiping');

        clearTimeout(el._wipeTimer);
        el._wipeTimer = setTimeout(() => {
            el.classList.remove('wiping');
        }, WIPE_MS + 50);
    }

    function set(theme, { animate = true } = {}) {
        const current = document.documentElement.getAttribute('data-theme');
        if (theme === current) return theme;

        try { localStorage.setItem(STORAGE_KEY, theme); } catch { }

        if (animate) triggerLogoWipe();
        apply(theme);
        return theme;
    }

    function toggle() {
        const next = resolve() === 'dark' ? 'light' : 'dark';
        return set(next, { animate: true });
    }

    function reset() {
        try { localStorage.removeItem(STORAGE_KEY); } catch { }
        const sys = getSystemTheme();
        triggerLogoWipe();
        apply(sys);
    }

    function init() {
        // already applied by inline head script; just sync listeners
        apply(resolve());

        mq.addEventListener('change', () => {
            if (!getStored()) {
                triggerLogoWipe();
                apply(getSystemTheme());
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.closest('#themeBtn')) toggle();
        });
    }

    // prevent FOUC — applied before paint via head script,
    // but ensure attribute exists if script order differs
    if (!document.documentElement.getAttribute('data-theme')) {
        apply(resolve());
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { toggle, set, reset, resolve, getSystemTheme };
})();
```

---

<a id="file-16"></a>

### 📄 File 16/18: `browse.html`

| Property | Value |
|----------|-------|
| **Path** | `browse.html` |
| **Language** | HTML |
| **Size** | 2.8 KB |
| **Lines** | 65 |

```html
<!doctype html>
<html lang="en" dir="ltr">

<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CloudAvid • File Portal</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/assets/css/tokens.css">
    <link rel="stylesheet" href="/assets/css/base.css">
    <link rel="stylesheet" href="/assets/css/components.css">
    <link rel="stylesheet" href="/assets/css/home.css">
    <link rel="stylesheet" href="/assets/css/browse.css">
    <link rel="icon" href="/assets/icon/files-logo.webp">
</head>

<body>
    <div class="page">

        <!-- NAV — always visible, never destroyed -->
        <nav class="nav">
            <div class="nav-bar">
                <a class="nav-logo" href="/" data-link>
                    <img src="/assets/icon/logo.png" alt="CloudAvid">
                    <div class="nav-logo-text">
                        <strong data-i18n="brand">CloudAvid</strong>
                        <span data-i18n="subtitle">File Portal</span>
                    </div>
                </a>
                <div class="nav-actions">
                    <a class="btn btn-sm" href="https://cloudavid.com" data-i18n="website">Website</a>
                    <button class="btn btn-sm btn-icon" id="langBtn" type="button" title="Toggle language">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="2" y1="12" x2="22" y2="12" />
                            <path
                                d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                        </svg>
                    </button>
                </div>
            </div>
        </nav>

        <!-- MAIN CONTENT — this is the only part that changes -->
        <main id="app"></main>

        <!-- FOOTER — always visible, never destroyed -->
        <footer class="footer">
            <span>© 2025 CloudAvid Co</span>
            <a href="https://cloudavid.com">cloudavid.com</a>
        </footer>

    </div>

    <script src="/assets/js/i18n.js"></script>
    <script src="/assets/js/banner.js"></script>
    <script src="/assets/js/home.js"></script>
    <script src="/assets/js/browse.js"></script>
    <script src="/assets/js/router.js"></script>
</body>

</html>
```

---

<a id="file-17"></a>

### 📄 File 17/18: `index.html`

| Property | Value |
|----------|-------|
| **Path** | `index.html` |
| **Language** | HTML |
| **Size** | 11.8 KB |
| **Lines** | 266 |

```html
<!doctype html>
<html lang="en" dir="ltr">

<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#f1f3f6" />
  <title>AVID Download • File Portal</title>
  <script>
    (function () {
      'use strict';

      var root = document.documentElement;

      /* ── Apply theme before first paint ── */
      var theme = 'light';

      try {
        if (
          window.matchMedia &&
          window.matchMedia('(prefers-color-scheme: dark)').matches
        ) {
          theme = 'dark';
        }
      } catch (_) { }

      try {
        var savedTheme = localStorage.getItem('cav_theme');

        if (savedTheme === 'light' || savedTheme === 'dark') {
          theme = savedTheme;
        }
      } catch (_) { }

      root.setAttribute('data-theme', theme);

      /* ── Apply cached performance tier before first paint ── */
      var perfTier = 'medium';
      var reducedMotion = false;

      try {
        reducedMotion = window.matchMedia &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      } catch (_) { }

      if (reducedMotion) {
        perfTier = 'low';
      } else {
        try {
          var rawPerf = localStorage.getItem('cav_perf_tier');

          if (rawPerf) {
            var cachedPerf = JSON.parse(rawPerf);
            var cachedTier = String(cachedPerf.tier || '').toUpperCase();
            var timestamp = Number(cachedPerf.timestamp);
            var cacheTTL = 7 * 24 * 60 * 60 * 1000;
            var cacheAge = Date.now() - timestamp;
            var validTiers = ['HIGH', 'MEDIUM', 'LOW', 'POTATO'];

            if (
              validTiers.indexOf(cachedTier) !== -1 &&
              Number.isFinite(timestamp) &&
              cacheAge >= 0 &&
              cacheAge < cacheTTL
            ) {
              perfTier = cachedTier.toLowerCase();
            } else {
              localStorage.removeItem('cav_perf_tier');
            }
          }
        } catch (_) {
        }
      }

      root.setAttribute('data-perf', perfTier);
    })();
    document.addEventListener('DOMContentLoaded', function () {
      if (typeof PerformanceMonitor !== 'undefined') {
        PerformanceMonitor.init({
          debug: false
        });
      }
    }, { once: true });
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/css/tokens.css">
  <link rel="stylesheet" href="/assets/css/base.css">
  <link rel="stylesheet" href="/assets/css/components.css">
  <link rel="stylesheet" href="/assets/css/home.css">
  <link rel="stylesheet" href="/assets/css/browse.css">
  <link rel="stylesheet" href="/assets/css/performance-modes.css">
  <link rel="icon" href="/assets/icon/files-logo.webp">
</head>

<body>
  <!-- ═══════════════════════════════════════════════════════════════
       BACKGROUND AURA BACKDROP (Glow Effects)
       ═══════════════════════════════════════════════════════════════ -->
  <div class="aura-backdrop" aria-hidden="true">
    <div class="aura-base"></div>
    <div class="aura-glow-1"></div>
    <div class="aura-glow-2"></div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════
       PAGE CONTAINER
       ═══════════════════════════════════════════════════════════════ -->
  <div class="page">

    <!-- MAIN NAVIGATION HEADER -->
    <header class="nav">
      <div class="nav-bar">

        <!-- BRAND LOGO -->
        <a class="nav-logo" href="/" data-link>
          <img src="/assets/icon/logo.webp" alt="CloudAvid Logo" class="nav-logo-img"
            onerror="this.style.display='none'">
          <div class="nav-logo-text">
            <strong data-i18n="brand">CloudAvid</strong>
            <span data-i18n="subtitle">FILE PORTAL</span>
          </div>
        </a>

        <!-- CENTER NAVIGATION TABS -->
        <div class="nav-tabs" role="tablist" aria-label="Primary">
          <a class="nav-tab" href="https://cloudavid.com" target="_blank" rel="noopener">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span data-i18n="website">Website</span>
          </a>
          <a class="nav-tab" href="https://docs.cloudavid.com" target="_blank" rel="noopener">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <span data-i18n="docs">Docs</span>
          </a>
          <a class="nav-tab active" href="/" aria-current="page">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span data-i18n="downloads">Downloads</span>
          </a>
        </div>

        <!-- RIGHT ACTIONS TOOLBAR -->
        <div class="nav-actions">

          <!-- 1. Performance Selector Dropdown -->
          <div class="perf-dropdown-wrap">
            <button class="perf-pill" type="button" aria-haspopup="true" aria-expanded="false"
              title="Performance Settings" aria-label="Performance Settings">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="m12 14 4-4" />
                <path d="M3.34 19a10 10 0 1 1 17.32 0" />
              </svg>
              <span id="currentPerfLabel" data-i18n="perfLabel">Performance</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <div class="perf-dropdown-menu" role="menu">
              <button class="perf-option" data-perf-val="AUTO" type="button" role="menuitem">
                <span data-i18n="perfAuto">Auto Detect</span>
                <span class="perf-indicator-dot"></span>
              </button>
              <button class="perf-option" data-perf-val="HIGH" type="button" role="menuitem">
                <span data-i18n="perfHigh">High Power</span>
                <span class="perf-indicator-dot"></span>
              </button>
              <button class="perf-option" data-perf-val="MEDIUM" type="button" role="menuitem">
                <span data-i18n="perfMed">Balanced</span>
                <span class="perf-indicator-dot"></span>
              </button>
              <button class="perf-option" data-perf-val="LOW" type="button" role="menuitem">
                <span data-i18n="perfLow">Power Saver</span>
                <span class="perf-indicator-dot"></span>
              </button>
              <button class="perf-option" data-perf-val="POTATO" type="button" role="menuitem">
                <span data-i18n="perfPotato">Potato Mode</span>
                <span class="perf-indicator-dot"></span>
              </button>
            </div>
          </div>

          <!-- 2. Language Selector Dropdown -->
          <div class="lang-dropdown-wrap">
            <button class="lang-pill" id="langBtn" type="button" aria-haspopup="true" aria-expanded="false"
              title="Select language" aria-label="Select language">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span id="currentLangLabel">EN</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            <div class="lang-dropdown-menu" role="menu">
              <button class="lang-option" data-lang="en" type="button" role="menuitem">
                <span class="lang-opt-title">English</span>
                <span class="lang-opt-sub">EN</span>
              </button>
              <button class="lang-option" data-lang="fa" type="button" role="menuitem">
                <span class="lang-opt-title">فارسی</span>
                <span class="lang-opt-sub">FA</span>
              </button>
            </div>
          </div>

          <!-- 3. Theme Toggle Button -->
          <button class="theme-btn" id="themeBtn" type="button" title="Toggle theme" aria-label="Toggle theme">
            <svg class="icon-sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path
                d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
            <svg class="icon-moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          </button>

        </div>
      </div>
    </header>

    <!-- SPA DYNAMIC CONTENT MOUNT POINT -->
    <main id="app"></main>

    <!-- FOOTER -->
    <footer class="footer" style="display:none">
      <span>© 2025 CloudAvid Co</span>
      <a href="https://cloudavid.com" target="_blank" rel="noopener">cloudavid.com</a>
    </footer>
  </div>
  <script src="/assets/js/services/resource-service.js" defer></script>
  <script src="/assets/js/services/performance-monitor.js" defer></script>
  <script src="/assets/js/theme.js" defer></script>
  <script src="/assets/js/i18n.js" defer></script>
  <script src="/assets/js/autocomplete.js" defer></script>
  <script src="/assets/js/banner.js"></script>
  <script src="/assets/js/home.js" defer></script>
  <script src="/assets/js/browse.js" defer></script>
  <script src="/assets/js/router.js" defer></script>
</body>

</html>
```

---

<a id="file-18"></a>

### 📄 File 18/18: `server.js`

| Property | Value |
|----------|-------|
| **Path** | `server.js` |
| **Language** | JavaScript |
| **Size** | 18.5 KB |
| **Lines** | 417 |

```javascript
/* ═══════════════════════════════════════════════════════════════
   server.js — CloudAvid File Portal · Dev / Mock Server
   Skill: Enterprise Local Simulation
   
   Features:
   ✓ Mock /__list/ API with realistic filesystem tree
   ✓ SPA shell for all frontend routes
   ✓ Static asset serving with MIME types
   ✓ CORS + Security headers
   ✓ Health check endpoint
   ✓ Optional artificial latency (for skeleton testing)
   ✓ Colored structured logging
   ═══════════════════════════════════════════════════════════════ */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

/* ── Config ── */
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const ARTIFICIAL_LATENCY_MS = 600; // set to 400–800 to test skeleton loading

/* ── Colors for console ── */
const c = {
    reset: "\x1b[0m",
    dim: "\x1b[2m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    cyan: "\x1b[36m",
    red: "\x1b[31m",
    magenta: "\x1b[35m",
    bold: "\x1b[1m",
};

/* ── MIME map ── */
const MIMES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".map": "application/json",
    ".txt": "text/plain; charset=utf-8",
    ".pdf": "application/pdf",
    ".iso": "application/octet-stream",
    ".zip": "application/zip",
    ".gz": "application/gzip",
    ".qcow2": "application/octet-stream",
    ".vmdk": "application/octet-stream",
    ".sql": "application/sql",
    ".log": "text/plain; charset=utf-8",
    ".yml": "text/yaml; charset=utf-8",
    ".yaml": "text/yaml; charset=utf-8",
    ".sh": "text/x-shellscript",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".vsdx": "application/vnd.ms-visio.drawing",
};

/* ═══════════════════════════════════════════════
   MOCK FILESYSTEM TREE
   Mirrors production layout expected by ResourceService
   ═══════════════════════════════════════════════ */
const MOCK_FS = {
    /* ── Root used by ResourceService: System Files ── */
    "/files/": [
        { name: "kernel-modules", type: "directory", mtime: "2027-06-12T08:00:00Z" },
        { name: "ca-certificates", type: "directory", mtime: "2025-06-10T09:30:00Z" },
        { name: "sysctl.conf", type: "file", size: 4200, mtime: "2025-05-01T12:00:00Z" },
        { name: "hosts.allow", type: "file", size: 890, mtime: "2025-04-20T10:00:00Z" },
        { name: "sshd_config.hardened", type: "file", size: 12500, mtime: "2025-06-01T14:00:00Z" },
    ],
    "/files/kernel-modules/": [
        { name: "nvidia-535.ko", type: "file", size: 24500000, mtime: "2025-06-12T08:00:00Z" },
        { name: "wireguard.ko", type: "file", size: 890000, mtime: "2025-06-08T11:00:00Z" },
    ],
    "/files/ca-certificates/": [
        { name: "cloudavid-root-ca.crt", type: "file", size: 2100, mtime: "2025-01-15T00:00:00Z" },
        { name: "intermediate-ca.crt", type: "file", size: 1800, mtime: "2025-01-15T00:00:00Z" },
    ],

    /* ── download-User root ── */
    "/download/download-User/": [
        { name: "Template", type: "directory", mtime: "2025-06-15T10:30:00Z" },
        { name: "Sandbox", type: "directory", mtime: "2025-06-20T14:20:00Z" },
        { name: "LogDB", type: "directory", mtime: "2025-06-18T09:00:00Z" },
        { name: "ISO", type: "directory", mtime: "2025-06-10T16:45:00Z" },
        { name: "imageClone", type: "directory", mtime: "2025-06-22T11:15:00Z" },
        { name: "Documents", type: "directory", mtime: "2025-06-21T09:00:00Z" },
    ],

    /* Templates */
    "/download/download-User/Template/": [
        { name: "Archived", type: "directory", mtime: "2024-12-01T10:00:00Z" },
        { name: "CloudAvid_Proposal.docx", type: "file", size: 152400, mtime: "2025-06-15T10:30:00Z" },
        { name: "Network_Diagram.vsdx", type: "file", size: 892000, mtime: "2025-06-16T11:20:00Z" },
        { name: "Security_Checklist.pdf", type: "file", size: 312000, mtime: "2025-06-14T09:00:00Z" },
        { name: "Deployment_Runbook.md", type: "file", size: 28500, mtime: "2025-06-17T15:00:00Z" },
        { name: "SLA_Template.docx", type: "file", size: 98000, mtime: "2025-06-10T08:00:00Z" },
    ],
    "/download/download-User/Template/Archived/": [
        { name: "Legacy_Proposal_2022.docx", type: "file", size: 78900, mtime: "2022-03-22T09:00:00Z" },
        { name: "Old_Network_Map_2021.vsdx", type: "file", size: 450000, mtime: "2021-11-05T14:00:00Z" },
    ],

    /* Sandbox */
    "/download/download-User/Sandbox/": [
        { name: "deploy_test.sh", type: "file", size: 2400, mtime: "2025-06-20T14:20:00Z" },
        { name: "api_mock.json", type: "file", size: 15600, mtime: "2025-06-19T13:00:00Z" },
        { name: "kernel_debug.log", type: "file", size: 890000, mtime: "2025-06-21T08:45:00Z" },
        { name: "load_test_results.csv", type: "file", size: 125000, mtime: "2025-06-22T10:00:00Z" },
        { name: "chaos_experiment.yml", type: "file", size: 4800, mtime: "2025-06-18T16:30:00Z" },
    ],

    /* LogDB */
    "/download/download-User/LogDB/": [
        { name: "pg_backup_2025-06.sql.gz", type: "file", size: 245000000, mtime: "2025-06-01T02:00:00Z" },
        { name: "nginx_access.log", type: "file", size: 12500000, mtime: "2025-06-22T00:00:00Z" },
        { name: "redis_snapshot.rdb", type: "file", size: 8900000, mtime: "2025-06-20T03:00:00Z" },
        { name: "mysql_dump_full.sql.gz", type: "file", size: 890000000, mtime: "2025-06-15T02:30:00Z" },
        { name: "audit_trail_2025-Q2.log", type: "file", size: 45000000, mtime: "2025-06-21T23:59:00Z" },
    ],

    /* ISO Images */
    "/download/download-User/ISO/": [
        { name: "Ubuntu_24.04_Server.iso", type: "file", size: 2100000000, mtime: "2025-05-10T16:45:00Z" },
        { name: "Rocky_9.4_Minimal.iso", type: "file", size: 1800000000, mtime: "2025-04-15T10:00:00Z" },
        { name: "ESXi_8.0u3.iso", type: "file", size: 620000000, mtime: "2025-05-20T08:30:00Z" },
        { name: "Alpine_3.20_Virt.iso", type: "file", size: 45000000, mtime: "2025-06-05T12:00:00Z" },
        { name: "Debian_12_Netinst.iso", type: "file", size: 680000000, mtime: "2025-05-28T09:00:00Z" },
        { name: "Proxmox_VE_8.2.iso", type: "file", size: 1200000000, mtime: "2025-06-01T11:00:00Z" },
    ],

    /* VM Images */
    "/download/download-User/imageClone/": [
        { name: "WebServer_Nginx.qcow2", type: "file", size: 12000000000, mtime: "2025-06-22T11:15:00Z" },
        { name: "DB_PostgreSQL_15.vmdk", type: "file", size: 25000000000, mtime: "2025-06-20T15:30:00Z" },
        { name: "PfSense_2.7.qcow2", type: "file", size: 3200000000, mtime: "2025-06-18T10:00:00Z" },
        { name: "K8s_Worker_Node.qcow2", type: "file", size: 8500000000, mtime: "2025-06-21T14:00:00Z" },
    ],

    /* Documents */
    "/download/download-User/Documents/": [
        { name: "Onboarding_Guide.pdf", type: "file", size: 4500000, mtime: "2025-06-10T09:00:00Z" },
        { name: "API_Reference.pdf", type: "file", size: 8900000, mtime: "2025-06-15T11:00:00Z" },
    ],

    /* ── download-Avid (Documentation) ── */
    "/download/download-Avid/": [
        { name: "Security_Policy.pdf", type: "file", size: 2400000, mtime: "2025-06-14T10:00:00Z" },
        { name: "Ansible_Playbooks", type: "directory", mtime: "2025-06-19T16:00:00Z" },
        { name: "Architecture_Diagrams", type: "directory", mtime: "2025-06-20T10:00:00Z" },
        { name: "Runbooks", type: "directory", mtime: "2025-06-18T14:00:00Z" },
        { name: "CHANGELOG.md", type: "file", size: 18500, mtime: "2025-06-22T08:00:00Z" },
    ],
    "/download/download-Avid/Ansible_Playbooks/": [
        { name: "setup_nginx.yml", type: "file", size: 3400, mtime: "2025-06-19T16:00:00Z" },
        { name: "harden_server.yml", type: "file", size: 5600, mtime: "2025-06-18T12:00:00Z" },
        { name: "deploy_monitoring.yml", type: "file", size: 7200, mtime: "2025-06-20T09:00:00Z" },
        { name: "inventory.ini", type: "file", size: 1200, mtime: "2025-06-19T15:00:00Z" },
    ],
    "/download/download-Avid/Architecture_Diagrams/": [
        { name: "Network_Topology.drawio", type: "file", size: 89000, mtime: "2025-06-20T10:00:00Z" },
        { name: "Service_Mesh_Overview.pdf", type: "file", size: 3200000, mtime: "2025-06-15T14:00:00Z" },
    ],
    "/download/download-Avid/Runbooks/": [
        { name: "Incident_Response.md", type: "file", size: 45000, mtime: "2025-06-18T14:00:00Z" },
        { name: "Backup_Restore.md", type: "file", size: 28000, mtime: "2025-06-12T11:00:00Z" },
        { name: "Failover_Procedure.md", type: "file", size: 35000, mtime: "2025-06-16T09:00:00Z" },
    ],
};

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */
function log(method, status, url, extra = "") {
    const color =
        status >= 500 ? c.red :
            status >= 400 ? c.yellow :
                status >= 300 ? c.cyan :
                    c.green;
    const time = new Date().toISOString().slice(11, 19);
    console.log(
        `${c.dim}${time}${c.reset} ${c.bold}${method.padEnd(6)}${c.reset} ${color}${status}${c.reset} ${url} ${c.dim}${extra}${c.reset}`
    );
}

function normalizeListPath(p) {
    // Ensure trailing slash for directory keys
    if (!p.endsWith("/")) p += "/";
    // Collapse duplicate slashes
    p = p.replace(/\/+/g, "/");
    return p;
}

function sendJSON(res, status, data, headers = {}) {
    const body = JSON.stringify(data, null, 0);
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "no-store",
        ...headers,
    });
    res.end(body);
}

function sendText(res, status, text, contentType = "text/plain; charset=utf-8") {
    res.writeHead(status, {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
    });
    res.end(text);
}

function securityHeaders(res) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
}

function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

function serveSPA(res) {
    const indexPath = path.join(ROOT, "index.html");
    fs.readFile(indexPath, (err, data) => {
        if (err) {
            sendText(res, 500, "index.html missing — place it next to server.js");
            return;
        }
        securityHeaders(res);
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(data);
    });
}

function serveStatic(reqPath, res) {
    // Prevent path traversal
    const safe = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, "");
    const fp = path.join(ROOT, safe === "/" || safe === "" ? "index.html" : safe);
    const ext = path.extname(fp).toLowerCase();

    // Block serving outside project root
    if (!fp.startsWith(ROOT)) {
        sendText(res, 403, "Forbidden");
        return;
    }

    fs.readFile(fp, (err, data) => {
        if (err) {
            // Friendly SVG placeholder for missing images
            if ([".png", ".jpg", ".jpeg", ".webp", ".ico", ".svg"].includes(ext)) {
                const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3" opacity="0.3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`;
                res.writeHead(200, { "Content-Type": "image/svg+xml" });
                res.end(svg);
                return;
            }

            // SPA fallback for unknown routes (client-side router handles them)
            if (!ext || ext === ".html") {
                serveSPA(res);
                return;
            }

            sendText(res, 404, `404 — ${reqPath}`);
            return;
        }

        securityHeaders(res);
        res.writeHead(200, {
            "Content-Type": MIMES[ext] || "application/octet-stream",
            "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600",
        });
        res.end(data);
    });
}

/* ═══════════════════════════════════════════════
   REQUEST HANDLER
   ═══════════════════════════════════════════════ */
const server = http.createServer(async (req, res) => {
    const start = Date.now();
    let pathname;

    try {
        pathname = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
    } catch {
        sendText(res, 400, "Bad Request");
        return;
    }

    // CORS preflight
    if (req.method === "OPTIONS") {
        res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "86400",
        });
        res.end();
        return;
    }

    // Only GET supported for mock
    if (req.method !== "GET" && req.method !== "HEAD") {
        sendText(res, 405, "Method Not Allowed");
        return;
    }

    /* ── Health check ── */
    if (pathname === "/__health") {
        sendJSON(res, 200, {
            status: "ok",
            service: "CloudAvid File Portal Mock",
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            routes: Object.keys(MOCK_FS).length,
        });
        log("GET", 200, pathname, `${Date.now() - start}ms`);
        return;
    }

    /* ── List API ── */
    if (pathname.startsWith("/__list")) {
        if (ARTIFICIAL_LATENCY_MS > 0) {
            await delay(ARTIFICIAL_LATENCY_MS);
        }

        let listPath = pathname.replace(/^\/__list/, "") || "/";
        listPath = normalizeListPath(listPath);

        const entries = MOCK_FS[listPath];

        if (entries) {
            sendJSON(res, 200, entries);
            log("GET", 200, pathname, `${entries.length} items · ${Date.now() - start}ms`);
        } else {
            // Empty directory (not 404) — matches real nginx autoindex behaviour
            sendJSON(res, 200, []);
            log("GET", 200, pathname, `empty · ${Date.now() - start}ms`);
        }
        return;
    }

    /* ── SPA routes (download/files browse pages) ── */
    if (
        pathname === "/" ||
        pathname.startsWith("/download/") ||
        pathname.startsWith("/files/") ||
        pathname === "/index.html"
    ) {
        // If it looks like a real file download (has extension), try static first
        const ext = path.extname(pathname).toLowerCase();
        if (ext && MIMES[ext] && ext !== ".html") {
            // Simulate file download for mock assets
            serveStatic(pathname, res);
            log("GET", 200, pathname, `static/download · ${Date.now() - start}ms`);
            return;
        }

        serveSPA(res);
        log("GET", 200, pathname, `SPA · ${Date.now() - start}ms`);
        return;
    }

    /* ── Static assets ── */
    serveStatic(pathname, res);
    // status logged inside serveStatic is harder; approximate:
    log("GET", 200, pathname, `asset · ${Date.now() - start}ms`);
});

/* ═══════════════════════════════════════════════
   BOOT
   ═══════════════════════════════════════════════ */
server.listen(PORT, () => {
    console.log(`
${c.cyan}${c.bold}
  ╔══════════════════════════════════════════════════╗
  ║     CloudAvid File Portal — Mock API Server      ║
  ╚══════════════════════════════════════════════════╝${c.reset}

  ${c.green}➜${c.reset}  Local:    ${c.bold}http://localhost:${PORT}/${c.reset}
  ${c.green}➜${c.reset}  Health:   http://localhost:${PORT}/__health
  ${c.green}➜${c.reset}  List API: http://localhost:${PORT}/__list/files/

  ${c.dim}Sample browse routes:${c.reset}
  ${c.magenta}•${c.reset} Home          http://localhost:${PORT}/
  ${c.magenta}•${c.reset} System Files  http://localhost:${PORT}/files/
  ${c.magenta}•${c.reset} ISO Images    http://localhost:${PORT}/download/download-User/ISO/
  ${c.magenta}•${c.reset} Templates     http://localhost:${PORT}/download/download-User/Template/
  ${c.magenta}•${c.reset} Documentation http://localhost:${PORT}/download/download-Avid/

  ${c.dim}Mock directories: ${Object.keys(MOCK_FS).length}${c.reset}
  ${c.dim}Latency simulation: ${ARTIFICIAL_LATENCY_MS}ms${c.reset}
  ${c.dim}Press Ctrl+C to stop${c.reset}
`);
});

/* Graceful shutdown */
process.on("SIGINT", () => {
    console.log(`\n${c.yellow}Shutting down mock server…${c.reset}`);
    server.close(() => process.exit(0));
});
```

---

## ✅ End of Project Code

> Total files extracted: **18**
> Total lines of code: **6788**
> Generated by: **Project Code Extractor v2.1**


