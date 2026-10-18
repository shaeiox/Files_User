'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '');

function luminance(hex) {
    const channels = hex.match(/[0-9a-f]{2}/gi).map((channel) => parseInt(channel, 16) / 255);
    const linear = channels.map((value) => value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4);
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground, background) {
    const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    return (lighter + 0.05) / (darker + 0.05);
}

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

test('scrollbars: theme tokens produce an understated brass thumb in light and dark mode', () => {
    const tokens = read('public/assets/css/tokens.css');
    const light = ruleFor(tokens, ':root,\n[data-theme="light"] {');
    const dark = ruleFor(tokens, '[data-theme="dark"] {');

    assert.match(tokens, /--scrollbar-size:\s*12px/);
    assert.match(tokens, /--scrollbar-inset:\s*3px/);
    assert.match(light, /--scrollbar-thumb:\s*#8a5a00/);
    assert.match(light, /--scrollbar-thumb-hover:\s*#6b4300/);
    assert.match(dark, /--scrollbar-thumb:\s*#92733a/);
    assert.match(dark, /--scrollbar-thumb-hover:\s*#ffb800/);

    assert.ok(contrastRatio('#8a5a00', '#f5f5f0') >= 3, 'light thumb remains visible on the page');
    assert.ok(contrastRatio('#8a5a00', '#ffffff') >= 3, 'light thumb remains visible on cards');
    assert.ok(contrastRatio('#92733a', '#101110') >= 3, 'dark thumb remains visible on the page');
    assert.ok(contrastRatio('#92733a', '#1b1b1f') >= 3, 'dark thumb remains visible on cards');
});

test('scrollbars: native and WebKit renderers share a thin inset capsule', () => {
    const base = read('public/assets/css/base.css');
    const standardFallback = ruleFor(base, '@supports not selector(::-webkit-scrollbar) {');
    const standardRules = ruleFor(standardFallback, ':where(*) {');
    const scrollbar = ruleFor(base, '::-webkit-scrollbar {');
    const track = ruleFor(base, '::-webkit-scrollbar-track {');
    const thumb = ruleFor(base, '::-webkit-scrollbar-thumb {');
    const hover = ruleFor(base, '::-webkit-scrollbar-thumb:hover {');

    assert.match(standardRules, /scrollbar-color:\s*var\(--scrollbar-thumb\) transparent/);
    assert.match(standardRules, /scrollbar-width:\s*thin/);
    assert.match(scrollbar, /width:\s*var\(--scrollbar-size\)/);
    assert.match(scrollbar, /height:\s*var\(--scrollbar-size\)/);
    assert.match(track, /background:\s*transparent/);
    assert.match(thumb, /border:\s*var\(--scrollbar-inset\) solid transparent/);
    assert.match(thumb, /border-radius:\s*var\(--r-full\)/);
    assert.match(thumb, /background-clip:\s*padding-box/);
    assert.match(thumb, /background-color:\s*var\(--scrollbar-thumb\)/);
    assert.match(hover, /background-color:\s*var\(--scrollbar-thumb-hover\)/);
});

test('scrollbars: nested panels reuse the global treatment, including potato mode', () => {
    const browse = stripComments(read('public/assets/css/browse.css'));
    const components = stripComments(read('public/assets/css/components.css'));
    const perf = read('public/assets/css/performance-modes.css');
    const potato = ruleFor(perf, '[data-perf="potato"] ::-webkit-scrollbar {');

    assert.doesNotMatch(browse, /scrollbar-(?:color|width):\s*(?:thin|var\(--scrollbar-thumb\))/);
    assert.doesNotMatch(browse, /\.browse-inspector::-webkit-scrollbar/);
    assert.doesNotMatch(components, /\.ac-list::-webkit-scrollbar/);
    assert.match(potato, /width:\s*calc\(var\(--scrollbar-size\) - 2px\)/);
    assert.match(potato, /height:\s*calc\(var\(--scrollbar-size\) - 2px\)/);
    assert.doesNotMatch(perf, /border-radius:\s*0\s*;/);
});
