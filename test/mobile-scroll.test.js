/**
 * Static contract for the mobile touch-scroll fix (browse mobile single-pane).
 *
 * The hover-scroll trap is `data-lenis-prevent` on the browse containers:
 * lenis.css turns it into `overscroll-behavior: contain`, which cuts scroll
 * chaining to the viewport. Below 768px the listing is in normal page flow,
 * so the trap must not survive into touch — a finger on the file list has to
 * be able to page-scroll. Desktop keeps the trap exactly as before.
 */
'use strict';

const { test } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const PUB = path.join(__dirname, '..', 'public');
const browseCss = fs.readFileSync(path.join(PUB, 'assets', 'css', 'browse.css'), 'utf8');
const lenisCss = fs.readFileSync(path.join(PUB, 'assets', 'css', 'lenis.css'), 'utf8');
const browseJs = fs.readFileSync(path.join(PUB, 'assets', 'js', 'browse.js'), 'utf8');

/** Text of the `@media (max-width: 767px)` block in browse.css. */
function mobileBlock() {
    const i = browseCss.indexOf('@media (max-width: 767px)');
    assert.ok(i >= 0, 'browse.css keeps its mobile media block');
    let depth = 0;
    for (let j = browseCss.indexOf('{', i); j < browseCss.length; j++) {
        if (browseCss[j] === '{') depth++;
        else if (browseCss[j] === '}' && --depth === 0) return browseCss.slice(i, j);
    }
    throw new Error('unterminated @media (max-width: 767px) block');
}

test('mobile scroll: touch can page-scroll over the file listing', () => {
    // The trap itself stays: the desktop "mouse over the list scrolls nothing
    // but the list" contract is unchanged.
    assert.match(lenisCss, /\.lenis \[data-lenis-prevent\]\s*,?[\s\S]*?overscroll-behavior:\s*contain/);
    assert.match(browseJs, /id="tableContainer" data-lenis-prevent/);
    assert.match(browseJs, /id="inspector" aria-live="polite" data-lenis-prevent/);

    // The mobile block neutralises it for the vertical axis. browse.css loads
    // before lenis.css, so the override must out-specify `.lenis
    // [data-lenis-prevent]` (three compounds > two), not merely come later.
    const block = mobileBlock();
    const m = block.match(/([^{}]*\[data-lenis-prevent\][^{}]*)\{([^}]*)\}/);
    assert.ok(m, 'mobile block overrides the lenis prevent rule');
    assert.match(m[2], /overscroll-behavior-y:\s*auto/);
    assert.ok(m[1].trim().split(/\s*>\s*|\s+/).length >= 3, `override is specific enough: ${m[1].trim()}`);

    // Desktop-only panes keep the full trap; nothing leaks outside the media block.
    assert.ok(!/overscroll-behavior-y:\s*auto/.test(browseCss.replace(block, '')), 'override is scoped to the mobile block');
});
