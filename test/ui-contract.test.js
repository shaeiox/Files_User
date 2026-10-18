/**
 * Static checks for the frontend contracts in openspec/changes/ui-craft-elevation.
 *
 * Covers every acceptance criterion that can be decided from source alone:
 * token contract (no undefined or component-scoped tokens, one focus colour,
 * reproducible contrast figures), font scoping, motion-contract prohibitions,
 * route payload, router shape, dead-code removal, dictionary parity and the
 * style guide's stated figures. Browser-only criteria (layout, animation
 * timing, focus order) are verified separately and recorded in the report.
 */
'use strict';

const { test } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PUB = path.join(__dirname, '..', 'public');
const CSS = path.join(PUB, 'assets', 'css');
const JS = path.join(PUB, 'assets', 'js');
const read = (p) => fs.readFileSync(p, 'utf8');
const cssFiles = fs.readdirSync(CSS).filter((f) => f.endsWith('.css'));
const css = Object.fromEntries(cssFiles.map((f) => [f, read(path.join(CSS, f))]));
const allCss = Object.values(css).join('\n');
const jsFiles = [];
(function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) { if (e.name !== 'vendor') walk(p); } else if (e.name.endsWith('.js')) jsFiles.push(p);
    }
})(JS);
const allJs = jsFiles.map(read).join('\n');
const indexHtml = read(path.join(PUB, 'index.html'));
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

/* ── WCAG contrast ── */
function lum(hex) {
    const h = hex.replace('#', '');
    const ch = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
        .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
function ratio(a, b) {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return Math.round(((x + 0.05) / (y + 0.05)) * 100) / 100;
}

/** Declarations of one theme block in tokens.css, by its selector line. */
function themeBlock(selectorStart) {
    const t = css['tokens.css'];
    const i = t.indexOf(selectorStart);
    assert.ok(i >= 0, 'theme block ' + selectorStart);
    let depth = 0;
    for (let j = t.indexOf('{', i); j < t.length; j++) {
        if (t[j] === '{') depth++;
        if (t[j] === '}' && --depth === 0) return stripComments(t.slice(i, j));
    }
    throw new Error('unterminated ' + selectorStart);
}
const tokenIn = (block, name) => {
    const m = block.match(new RegExp('--' + name + ':\\s*([^;]+);'));
    return m && m[1].trim();
};
const LIGHT = themeBlock(':root,\n[data-theme="light"]'.replace(/\n/g, css['tokens.css'].includes('\r\n') ? '\r\n' : '\n'));
const DARK = themeBlock('[data-theme="dark"] {');
const ROOT = themeBlock(':root {');

test('design-tokens: every var() reference resolves to a declared custom property', () => {
    const declared = new Set();
    for (const m of (allCss + allJs + indexHtml).matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)) declared.add(m[1]);
    for (const m of allJs.matchAll(/setProperty\(\s*['"](--[a-zA-Z0-9-]+)/g)) declared.add(m[1]);
    const missing = [];
    for (const [file, src] of Object.entries(css)) {
        for (const m of stripComments(src).matchAll(/var\(\s*(--[a-zA-Z0-9-]+)\s*([,)])/g)) {
            if (m[2] === ')' && !declared.has(m[1])) missing.push(file + ': ' + m[1]);
        }
    }
    assert.deepStrictEqual(missing, []);
});

test('design-tokens: no token is redeclared inside a component scope in home.css', () => {
    const body = stripComments(css['home.css']);
    assert.doesNotMatch(body, /--(text|text-[0-9]|border|border-focus|color-ember-pulse|glow|input-bg|radius-panels)\s*:/);
    assert.doesNotMatch(css['home.css'], /HERO DRIFT INSULATION -- Phase 1/);
});

test('design-tokens: one focus-ring colour per theme (--ring aliases --border-focus)', () => {
    assert.strictEqual(tokenIn(LIGHT, 'ring'), 'var(--border-focus)');
    assert.strictEqual(tokenIn(DARK, 'ring'), 'var(--border-focus)');
    // Every focus outline in the stylesheets uses one of the two names.
    for (const m of allCss.matchAll(/outline:\s*2px solid ([^;]+);/g)) {
        assert.match(m[1], /var\(--(ring|border-focus)\)/, 'outline ' + m[1]);
    }
});

test('design-tokens: palette has one accent plus one primary-action role', () => {
    assert.doesNotMatch(allCss, /--color-electric-iris/);
    assert.doesNotMatch(stripComments(allCss), /--a-[1-8]\b/);
    assert.strictEqual(tokenIn(LIGHT, 'info'), 'var(--text-accent)');
    assert.strictEqual(tokenIn(DARK, 'info'), 'var(--text-accent)');
    assert.doesNotMatch(stripComments(css['tokens.css']), /--(primary|accent):/);
    // The old iris/coral literals are gone from every stylesheet.
    assert.doesNotMatch(stripComments(allCss), /rgba\(86, 131, 218|#5683da|#a9c3ee|#7ea4e5|rgba\(255, 137, 100|rgba\(255, 170, 129/);
    for (const sel of ['.btn-primary {', '.hero-search .btn-primary {', '.btn-login {']) {
        const all = allCss.split(sel).slice(1).map((s) => s.slice(0, s.indexOf('}')));
        assert.ok(all.some((b) => /background:\s*var\(--action\)/.test(b)), sel + ' uses --action');
    }
});

test('design-tokens: quoted contrast ratios are reproducible from the token values', () => {
    const rows = [
        ['#ffffff', tokenIn(ROOT, 'action'), 5.09],
        ['#ffffff', tokenIn(ROOT, 'action-hover'), 6.37],
        [tokenIn(LIGHT, 'border-focus'), tokenIn(LIGHT, 'bg'), 5.42],
        [tokenIn(LIGHT, 'border-focus'), tokenIn(LIGHT, 'bg-card'), 5.93],
        [tokenIn(LIGHT, 'text-accent'), tokenIn(LIGHT, 'bg-card'), 5.93],
        [tokenIn(LIGHT, 'text-accent'), tokenIn(LIGHT, 'bg'), 5.42],
        [tokenIn(LIGHT, 'text-3'), tokenIn(LIGHT, 'bg-card'), 9.35],
        [tokenIn(DARK, 'border-focus'), tokenIn(DARK, 'bg'), 10.71],
        [tokenIn(DARK, 'border-focus'), tokenIn(DARK, 'bg-card'), 9.9],
        [tokenIn(DARK, 'text-accent'), tokenIn(DARK, 'bg-card'), 13.08],
        [tokenIn(DARK, 'text-accent'), tokenIn(DARK, 'bg-sunken'), 14.71],
        [tokenIn(DARK, 'text-accent'), tokenIn(DARK, 'bg-elevated'), 9.35],
        [tokenIn(DARK, 'text-on-accent'), tokenIn(ROOT, 'color-ember-pulse'), 7.57],
        [tokenIn(DARK, 'text-3'), tokenIn(DARK, 'bg-card'), 6.44],
        [tokenIn(DARK, 'text-3'), tokenIn(DARK, 'n-4'), 5.17],
        [tokenIn(DARK, 'text-3'), tokenIn(DARK, 'bg-elevated'), 4.6],
    ];
    for (const [fg, bg, quoted] of rows) {
        assert.ok(/^#[0-9a-f]{6}$/i.test(fg) && /^#[0-9a-f]{6}$/i.test(bg), `hex tokens ${fg} ${bg}`);
        assert.strictEqual(ratio(fg, bg), quoted, `${fg} on ${bg}`);
        assert.ok(css['tokens.css'].includes(quoted.toFixed(2)), `figure ${quoted.toFixed(2)} quoted in tokens.css`);
    }
});

test('design-tokens: Arabic-script faces declare a unicode-range; hero type is not tightened', () => {
    const faces = css['tokens.css'].split('@font-face').slice(1).map((b) => b.slice(0, b.indexOf('}')));
    const vazir = faces.filter((f) => /font-family:\s*'Vazirmatn'/.test(f));
    assert.strictEqual(vazir.length, 3);
    for (const f of vazir) assert.match(f, /unicode-range:\s*U\+0600-06FF/);
    // Every .hero-content h1 rule (all breakpoints and directions).
    const home = stripComments(css['home.css']);
    for (const m of home.matchAll(/\.hero-content h1\s*\{([^}]*)\}/g)) {
        const ls = m[1].match(/letter-spacing:\s*(-?[\d.]+)/);
        const lh = m[1].match(/line-height:\s*([\d.]+)/);
        if (ls) assert.ok(parseFloat(ls[1]) >= 0, 'letter-spacing ' + ls[1]);
        if (lh) assert.ok(parseFloat(lh[1]) >= 1, 'line-height ' + lh[1]);
    }
});

test('motion-contract: no blanket transition, no raw scroll listener, keyframes stay on the compositor', () => {
    for (const [f, src] of Object.entries({ ...css, 'index.html': indexHtml, '404.html': read(path.join(PUB, '404.html')) })) {
        assert.doesNotMatch(src, /transition:\s*all\b/, f);
    }
    assert.doesNotMatch(allJs, /addEventListener\(\s*['"]scroll['"]/);
    assert.doesNotMatch(allJs, /\bonscroll\s*=/);
    // Loading placeholders (skeleton shimmer) are the one justified exception.
    for (const m of stripComments(allCss).matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?)\n\}/g)) {
        if (m[1] === 'skeleton-shimmer') continue;
        const props = [...m[2].matchAll(/([a-z-]+)\s*:/g)].map((p) => p[1]);
        for (const p of props) assert.ok(p === 'opacity' || p === 'transform', `@keyframes ${m[1]} animates ${p}`);
    }
    // Every new Phase 2 primitive has a potato override.
    const perf = css['performance-modes.css'];
    for (const sel of ['.reveal-pending', '#app.route-enter', '.nav.is-condensed .nav-bar', '.insp-zip.is-busy svg']) {
        assert.ok(perf.includes('[data-perf="potato"] ' + sel), 'potato override for ' + sel);
    }
    assert.match(css['base.css'], /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.reveal-pending/);
});

test('app-shell: the documented theme transition exists; the phantom wipe is gone', () => {
    assert.doesNotMatch(allCss + allJs, /wiping|triggerLogoWipe|diagonal wipe/i);
    assert.match(read(path.join(JS, 'theme.js')), /startViewTransition/);
    assert.match(css['base.css'], /::view-transition-old\(root\)/);
});

test('app-shell: dropdowns share one mechanism and report real state', () => {
    assert.doesNotMatch(stripComments(css['components.css']), /lang-dropdown-wrap:(hover|focus-within) \.lang-dropdown-menu/);
    assert.match(css['components.css'], /\.lang-dropdown-wrap\.show \.lang-dropdown-menu/);
    assert.match(css['components.css'], /\.lang-dropdown-wrap::after/); // hover bridge kept
    assert.match(read(path.join(JS, 'i18n.js')), /setAttribute\("aria-expanded"/);
    assert.match(read(path.join(JS, 'services', 'performance-monitor.js')), /pill\.setAttribute\("aria-expanded"/);
    // The tier override is not in the navbar.
    const nav = indexHtml.slice(indexHtml.indexOf('<header class="nav">'), indexHtml.indexOf('</header>'));
    assert.doesNotMatch(nav, /perf-dropdown-wrap/);
    const footer = indexHtml.slice(indexHtml.indexOf('<footer'));
    assert.match(footer, /perf-dropdown-wrap/);
});

test('app-shell / home-page: no blocking alert and no hardcoded single-language failure text', () => {
    const code = allJs.split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*)/.test(l)).join('\n');
    assert.doesNotMatch(code.replace(/role=.alert./g, ''), /\balert\(/);
    // No Persian string literal in behaviour code (markup comments are not visible text).
    const homeCode = stripComments(read(path.join(JS, 'home.js'))).replace(/<!--[\s\S]*?-->/g, '')
        .split(/\r?\n/).filter((l) => !/^\s*\/\//.test(l)).join('\n');
    assert.doesNotMatch(homeCode, /[؀-ۿ]/);
    assert.doesNotMatch(homeCode, /data-url|hero-pill-dot/);
});

test('app-shell: one legal line with the current year; the dialog has dialog semantics', () => {
    const g = { localStorage: { getItem: () => null, setItem() { } }, document: { readyState: 'loading', addEventListener() { } } };
    vm.runInNewContext(read(path.join(JS, 'i18n.js')) + ';this.__i18n = i18n;', g);
    const { en, fa } = g.__i18n;
    assert.deepStrictEqual(Object.keys(en).sort(), Object.keys(fa).sort());
    for (const d of [en, fa]) {
        assert.match(d['footer.copyright'], /\{year\}/);
        assert.doesNotMatch(d['footer.about'], /15|۱۵/);
    }
    assert.doesNotMatch(indexHtml, /All rights reserved for/);
    const home = read(path.join(JS, 'home.js'));
    assert.match(home, /role="dialog" aria-modal="true" aria-labelledby="authTitle"/);
    assert.match(home, /e\.key === 'Escape'/);
    assert.match(home, /trigger && trigger\.isConnected/);
});

test('routing: the shell loads no route-only script or stylesheet; one navigate()', () => {
    for (const f of ['browse.js', 'releases.js', 'file-inspector.js', 'bulk-download.js', 'browse-icons.js']) {
        assert.doesNotMatch(indexHtml, new RegExp('src="/assets/js/' + f.replace('.', '\\.')), f);
        assert.match(read(path.join(JS, f)), /^export \{ \w+ \};/m, f + ' is an ES module');
    }
    assert.doesNotMatch(indexHtml, /href="\/assets\/css\/(browse|release)\.css"/);
    assert.match(indexHtml, /src="\/assets\/js\/idle-timer\.js\?v=4.6.2[^"]+" defer/);
    assert.match(indexHtml, /var perfTier = 'high';/);
    const router = read(path.join(JS, 'router.js'));
    assert.strictEqual((router.match(/function navigate\(/g) || []).length, 1);
    assert.match(router, /import\("\/assets\/js\/browse\.js\?v=4.6.2[^"]+"\)/);
    assert.match(router, /startViewTransition/);
    assert.doesNotMatch(router, /setTimeout\(/);
    assert.doesNotMatch(router, /app\.style\.transition/);
    assert.ok(!fs.existsSync(path.join(PUB, 'browse.html')), 'browse.html deleted');
});

test('dead code: removed identifiers stay removed', () => {
    for (const id of ['hero-cloud-wrap', 'aura-vignette', '@keyframes shimmer', '--error-container']) {
        assert.ok(!stripComments(allCss).includes(id), id);
    }
});

test('docs: the style guide states the current stylesheet line counts', () => {
    const guide = read(path.join(__dirname, '..', 'docs', 'STYLEGUIDE.md'));
    for (const f of ['tokens.css', 'base.css', 'components.css', 'home.css', 'browse.css', 'release.css', 'performance-modes.css', 'lenis.css']) {
        const n = (css[f].match(/\n/g) || []).length; // same as `wc -l`
        const m = guide.match(new RegExp(f.replace('.', '\\.') + '\\s+\\(([\\d,]+) L\\)'));
        assert.ok(m, 'count for ' + f);
        assert.strictEqual(Number(m[1].replace(',', '')), n, f);
    }
});

test('deploy: every first-party JS/CSS URL carries the package version (cache busting)', () => {
    // nginx serves CSS/JS with `expires 30d` + `immutable` (ADR-007): an unversioned
    // URL keeps a stale copy for a month. scripts/stamp-assets.js writes the version.
    const { TARGETS, version } = require('../scripts/stamp-assets.js');
    for (const [rel, re] of TARGETS) {
        const src = read(path.join(__dirname, '..', rel));
        const urls = [...src.matchAll(new RegExp(re.source, 'g'))];
        assert.ok(urls.length > 0, rel + ' has asset URLs');
        for (const m of urls) {
            assert.ok(m[0].endsWith('?v=4.6.2' + version + '"'), `${rel}: ${m[0]} — run: node scripts/stamp-assets.js`);
        }
    }
});
