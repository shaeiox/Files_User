/**
 * @file test/hero-orbit.test.js
 * @brief Smoothness contract for the hero orbit (ADR-014 Amendments 6 and 7).
 *
 * Each satellite runs ONE transform animation, `rotate(θ) translateY(-R) rotate(-θ)`.
 * Both angles are interpolated from the same progress value in the same frame,
 * so the logo's orientation is exactly 0 and its centre sits exactly on the ring
 * at every frame. The earlier design (a rotating stage plus a separately animated
 * counter-spin per logo) made uprightness the difference of two animations. Any
 * difference in their clocks showed up as the logos' angle stepping.
 *
 * The orbit's position is `elapsed / animation-duration`. The performance monitor
 * switches `data-perf` tiers at runtime from live FPS, so tier rules may only
 * pause the orbit. Changing the duration or replacing the animation makes it jump.
 *
 * Frame pacing itself is browser-only. These checks pin everything that makes a
 * step or a jump possible.
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const CSS = path.join(__dirname, '..', 'public', 'assets', 'css');
const JS = path.join(__dirname, '..', 'public', 'assets', 'js');
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const read = (f) => stripComments(fs.readFileSync(f, 'utf8'));

/** Flat list of { selector, body, media }, with @media/@supports walked and @keyframes kept apart. */
function parse(src, media = '', out = { rules: [], keyframes: {} }) {
    let i = 0;
    while (i < src.length) {
        const open = src.indexOf('{', i);
        if (open < 0) break;
        const selector = src.slice(i, open).trim();
        let depth = 1, j = open + 1;
        while (j < src.length && depth) { if (src[j] === '{') depth++; else if (src[j] === '}') depth--; j++; }
        const body = src.slice(open + 1, j - 1);
        if (/^@(media|supports)/.test(selector)) parse(body, selector, out);
        else if (selector.startsWith('@keyframes')) out.keyframes[selector.split(/\s+/)[1]] = body;
        else out.rules.push({ selector, body, media });
        i = j;
    }
    return out;
}

const decl = (body, prop) => {
    const m = body.match(new RegExp(`(?:^|;|\\s)${prop}\\s*:\\s*([^;]+)`));
    return m ? m[1].trim() : null;
};
const home = parse(read(path.join(CSS, 'home.css')));
const perf = parse(read(path.join(CSS, 'performance-modes.css')));
const base = (sel) => home.rules.find(r => r.selector === sel && !r.media);
const ORBIT_ANY = /\.hero-orbit\b|\.orbit-(anchor|logo|spin|item)\b/;

/** Transform list -> [{ fn, arg }] for rotate(deg) / translateY(%) / var-free values. */
function fns(list) {
    const out = [];
    const re = /([a-zA-Z]+)\(/g;
    let m;
    while ((m = re.exec(list))) {
        let depth = 1, j = re.lastIndex;
        while (j < list.length && depth) { if (list[j] === '(') depth++; else if (list[j] === ')') depth--; j++; }
        out.push({ fn: m[1], arg: list.slice(re.lastIndex, j - 1).trim() });
        re.lastIndex = j;                      // top-level functions only
    }
    return out;
}
const num = (s) => parseFloat(s);

/** 2D affine helpers: [a b c d e f] column-major like CSS matrix(). */
const mul = (m, n) => [
    m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
const rot = (deg) => { const r = deg * Math.PI / 180; return [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0]; };
const ty = (px) => [1, 0, 0, 1, 0, px];

describe('hero orbit: one animation per satellite', () => {
    const anchor = base('.orbit-anchor');
    const frames = home.keyframes['orbit-path'];

    test('nothing in the orbit is animated except the satellite itself (no counter-spin to desync)', () => {
        const animated = home.rules
            .filter(r => ORBIT_ANY.test(r.selector) && !/prefers-reduced-motion/.test(r.media))
            .filter(r => /(^|[;\s])animation(-name)?\s*:/.test(r.body))
            .map(r => r.selector.replace(/\s+/g, ' '));
        assert.deepStrictEqual(animated, ['.orbit-anchor']);
        assert.match(decl(anchor.body, 'animation'), /^orbit-path\s+\d+(\.\d+)?s\s+linear\s+var\(--orbit-delay,\s*0s\)\s+infinite$/);
        assert.strictEqual(decl(anchor.body, 'will-change'), 'transform');
    });

    test('the keyframes interpolate function-by-function: same list shape at both ends', () => {
        assert.ok(frames, '@keyframes orbit-path exists');
        const from = fns(decl(frames.match(/from\s*\{([^}]*)\}/)[1], 'transform'));
        const to = fns(decl(frames.match(/to\s*\{([^}]*)\}/)[1], 'transform'));
        assert.deepStrictEqual(from.map(f => f.fn), ['rotate', 'translateY', 'rotate']);
        assert.deepStrictEqual(to.map(f => f.fn), from.map(f => f.fn), 'a shape mismatch would fall back to matrix interpolation');
        assert.strictEqual(num(to[0].arg) - num(from[0].arg), 360);
        assert.strictEqual(num(to[2].arg) - num(from[2].arg), -360, 'the counter-rotation must cancel the orbit at every progress value');
        assert.strictEqual(from[1].arg, to[1].arg, 'radius is constant');
    });

    test('at every progress value the logo is upright and exactly on the ring line', () => {
        const from = fns(decl(frames.match(/from\s*\{([^}]*)\}/)[1], 'transform'));
        const to = fns(decl(frames.match(/to\s*\{([^}]*)\}/)[1], 'transform'));
        // Geometry: the satellite box is centred in the stage by `inset: X%`, so its side is
        // (100 - 2X)% of the stage; translateY(%) resolves against the satellite's own height.
        const inset = num(decl(anchor.body, 'inset'));
        const stage = 1000;                          // any stage size in px
        const side = stage * (100 - 2 * inset) / 100;
        const ringRadius = stage / 2;                // .hero-ring and .hero-orbit share one box
        for (let i = 0; i <= 720; i++) {
            const p = i / 720;
            const at = (k) => num(from[k].arg) + (num(to[k].arg) - num(from[k].arg)) * p;
            const m = [rot(at(0)), ty(num(from[1].arg) / 100 * side), rot(at(2))].reduce(mul);
            const radius = Math.hypot(m[4], m[5]);
            const tilt = Math.atan2(m[1], m[0]) * 180 / Math.PI;
            assert.ok(Math.abs(radius - ringRadius) < 0.05, `p=${p}: radius ${radius} vs ring ${ringRadius}`);
            assert.ok(Math.abs(tilt) < 1e-9, `p=${p}: logo tilted ${tilt}deg`);
            const travelled = (Math.atan2(m[4], -m[5]) * 180 / Math.PI + 360) % 360;
            assert.ok(Math.abs(((travelled - 360 * p) % 360 + 540) % 360 - 180) < 1e-6, `p=${p}: angle must advance linearly`);
        }
    });

    test('without animation (reduced motion) the base transform places logos where the animation would', () => {
        const still = fns(decl(anchor.body, 'transform'));
        const moving = fns(decl(frames.match(/from\s*\{([^}]*)\}/)[1], 'transform'));
        assert.deepStrictEqual(still.map(f => f.fn), moving.map(f => f.fn));
        assert.strictEqual(still[0].arg, 'var(--a)');
        assert.strictEqual(still[1].arg, moving[1].arg);
        assert.match(still[2].arg, /^calc\(-1 \* var\(--a\)\)$/);
        const rm = home.rules.find(r => /prefers-reduced-motion/.test(r.media) && /\.orbit-anchor\b/.test(r.selector));
        assert.ok(rm && /animation\s*:\s*none/.test(rm.body), 'reduced motion stops the orbit');
    });

    test('the logo layer only scales; it no longer carries a static counter-rotation', () => {
        assert.strictEqual(decl(base('.orbit-logo').body, 'transform'), 'scale(1)');
    });
});

describe('hero orbit continuity', () => {
    test('no performance tier changes the orbit duration or replaces its animation', () => {
        const offenders = perf.rules
            .filter(r => ORBIT_ANY.test(r.selector))
            .filter(r => /(^|[;\s])animation\s*:|animation-(duration|name|delay|timing-function)\s*:/.test(r.body))
            .map(r => r.selector.replace(/\s+/g, ' '));
        assert.deepStrictEqual(offenders, [],
            'a runtime tier switch would make the orbit jump; use animation-play-state instead');
    });

    test('low and potato tiers freeze the orbit in place', () => {
        for (const tier of ['low', 'potato']) {
            const hit = perf.rules.find(r => r.selector.split(',').some(s => s.includes(`[data-perf="${tier}"]`) && s.includes('.orbit-anchor'))
                && /paused/.test(decl(r.body, 'animation-play-state') || ''));
            assert.ok(hit, `${tier}: .orbit-anchor must be paused (not removed)`);
        }
    });

    test('hover / focus pauses every satellite together', () => {
        const r = home.rules.find(x => /:has\(\.orbit-anchor:hover\)/.test(x.selector) && /animation-play-state\s*:\s*paused/.test(x.body));
        assert.ok(r && /\.orbit-anchor:focus-visible/.test(r.selector) && /\)\s*\.orbit-anchor\b/.test(r.selector));
    });

    test('home.js derives every delay from ONE page-clock reading and the CSS period', () => {
        const js = read(path.join(JS, 'home.js'));
        const css = decl(base('.orbit-anchor').body, 'animation');
        const seconds = Number(css.match(/(\d+(?:\.\d+)?)s\b/)[1]);
        const m = js.match(/ORBIT_PERIOD_MS\s*=\s*(\d+)/);
        assert.ok(m, 'ORBIT_PERIOD_MS constant');
        assert.strictEqual(Number(m[1]), seconds * 1000, 'JS period must equal the CSS duration');
        assert.match(js, /--orbit-delay/);
        assert.match(js, /% ORBIT_PERIOD_MS/);
        assert.strictEqual((js.match(/performance\.now\(\)/g) || []).length >= 1, true);
        assert.doesNotMatch(js, /orbit-(item|spin)|--orbit-phase/, 'the counter-spin markup is gone');
    });
});
