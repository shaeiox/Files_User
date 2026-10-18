'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '');

function ruleFor(source, selector) {
    const clean = stripComments(source);
    const start = clean.indexOf(selector);
    assert.notEqual(start, -1, `missing CSS rule: ${selector}`);

    const open = clean.indexOf('{', start);
    let depth = 0;
    for (let i = open; i < clean.length; i++) {
        if (clean[i] === '{') depth++;
        if (clean[i] === '}' && --depth === 0) return clean.slice(open + 1, i);
    }

    throw new Error(`unterminated CSS rule: ${selector}`);
}

test('backdrop: one non-interactive, static layer owns the archive aperture', () => {
    const html = read('public/index.html');
    const markup = html.match(/<div class="aura-backdrop" aria-hidden="true">([\s\S]*?)<\/div>/);
    assert.ok(markup, 'the decorative backdrop exists and is hidden from assistive technology');
    assert.equal(markup[1].trim(), '', 'the backdrop needs no child layers');
    assert.doesNotMatch(html, /<canvas\b|WebGL|shader-canvas/i);

    const base = read('public/assets/css/base.css');
    const backdrop = ruleFor(base, '.aura-backdrop {');
    assert.match(backdrop, /position:\s*fixed/);
    assert.match(backdrop, /pointer-events:\s*none/);
    assert.match(backdrop, /z-index:\s*0/);
    assert.match(backdrop, /background-color:\s*var\(--backdrop-ground\)/);
    assert.match(backdrop, /radial-gradient\(/);
    assert.doesNotMatch(backdrop, /(?:backdrop-)?filter\s*:|animation\s*:|will-change\s*:/);

    assert.equal((stripComments(base).match(/\.aura-backdrop\s*\{/g) || []).length, 1,
        'base.css is the single owner of backdrop stacking');
    assert.doesNotMatch(stripComments(read('public/assets/css/home.css')), /\.aura-backdrop\s*\{/,
        'route CSS does not override shared backdrop stacking');
    assert.match(stripComments(base), /\.page\s*\{[^}]*z-index:\s*1/s,
        'page content remains above the backdrop');
});

test('backdrop: performance tiers progressively shed static detail without hiding the ground', () => {
    const base = read('public/assets/css/base.css');
    const perf = read('public/assets/css/performance-modes.css');
    const high = ruleFor(base, '.aura-backdrop {');
    const medium = ruleFor(perf, '[data-perf="medium"] .aura-backdrop {');
    const low = ruleFor(perf, '[data-perf="low"] .aura-backdrop {');
    const potato = ruleFor(perf, '[data-perf="potato"] .aura-backdrop {');
    const gradientCount = (block) => (block.match(/radial-gradient\(/g) || []).length;

    assert.deepEqual(
        [gradientCount(high), gradientCount(medium), gradientCount(low), gradientCount(potato)],
        [2, 1, 1, 0],
        'each tier removes a paint layer, with potato retaining the flat brand ground'
    );
    assert.match(low, /var\(--backdrop-orbit-soft\)/);
    assert.match(potato, /background-image:\s*none/);
    assert.match(potato, /background-color:\s*var\(--backdrop-ground\)/);
    assert.doesNotMatch(potato, /display:\s*none/);
});

test('backdrop: light/dark tokens and mobile browser chrome share the same ground', () => {
    const tokens = read('public/assets/css/tokens.css');
    const html = read('public/index.html');
    const theme = read('public/assets/js/theme.js');
    const light = ruleFor(tokens, ':root,\n[data-theme="light"] {');
    const dark = ruleFor(tokens, '[data-theme="dark"] {');

    assert.match(light, /--backdrop-ground:\s*#f5f5f0/);
    assert.match(dark, /--backdrop-ground:\s*var\(--color-obsidian-canvas\)/);
    assert.match(tokens, /--color-obsidian-canvas:\s*#101110/);
    for (const source of [html, theme]) {
        assert.match(source, /theme === 'dark' \? '#101110' : '#f5f5f0'/);
    }
});
