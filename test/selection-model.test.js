/**
 * @file test/selection-model.test.js
 * @brief The pure selection model behind Browse multi-select: toggle and anchor,
 *        Shift ranges (anchor state, rubber band, baseline kept, missing anchor),
 *        drag painting, select-all, marquee hit-testing in list and grid layouts,
 *        auto-scroll speed, and immutability of every transition.
 *        Spec: openspec/changes/folder-zip-and-range-selection/specs/bulk-download.
 */
'use strict';

const { test, describe } = require('node:test');
const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const load = async () => (await import(pathToFileURL(path.join(__dirname, '..', 'public', 'assets', 'js', 'selection-model.js')).href)).SelectionModel;

const ORDER = ['r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7'];
const sorted = (set) => [...set].sort();

describe('toggle and anchor', () => {
    test('a toggle flips one row and becomes the anchor', async () => {
        const M = await load();
        const s1 = M.toggle(M.empty(), 'r2');
        assert.deepStrictEqual(sorted(s1.selected), ['r2']);
        assert.strictEqual(s1.anchor, 'r2');
        const s2 = M.toggle(s1, 'r2');
        assert.deepStrictEqual(sorted(s2.selected), []);
        assert.strictEqual(s2.anchor, 'r2', 'deselecting still moves the anchor');
    });

    test('an explicit state forces the row on or off', async () => {
        const M = await load();
        const on = M.toggle(M.empty(), 'r1', true);
        assert.ok(on.selected.has('r1'));
        assert.ok(M.toggle(on, 'r1', true).selected.has('r1'));
        assert.ok(!M.toggle(on, 'r1', false).selected.has('r1'));
    });
});

describe('Shift range', () => {
    test('Shift-click after a click selects the inclusive range, in either direction', async () => {
        const M = await load();
        const down = M.extendTo(M.toggle(M.empty(), 'r2'), ORDER, 'r5');
        assert.deepStrictEqual(sorted(down.selected), ['r2', 'r3', 'r4', 'r5']);
        const up = M.extendTo(M.toggle(M.empty(), 'r5'), ORDER, 'r2');
        assert.deepStrictEqual(sorted(up.selected), ['r2', 'r3', 'r4', 'r5']);
    });

    test('repeated Shift-clicks rubber-band from the same anchor', async () => {
        const M = await load();
        const a = M.toggle(M.empty(), 'r2');
        const wide = M.extendTo(a, ORDER, 'r7');
        const narrow = M.extendTo(wide, ORDER, 'r4');
        assert.deepStrictEqual(sorted(narrow.selected), ['r2', 'r3', 'r4']);
        assert.strictEqual(narrow.anchor, 'r2');
        const flipped = M.extendTo(narrow, ORDER, 'r0');
        assert.deepStrictEqual(sorted(flipped.selected), ['r0', 'r1', 'r2']);
    });

    test('rows selected before the Shift run stay selected', async () => {
        const M = await load();
        let s = M.toggle(M.empty(), 'r7');
        s = M.toggle(s, 'r1');
        s = M.extendTo(s, ORDER, 'r3');
        assert.deepStrictEqual(sorted(s.selected), ['r1', 'r2', 'r3', 'r7']);
        s = M.extendTo(s, ORDER, 'r2');
        assert.deepStrictEqual(sorted(s.selected), ['r1', 'r2', 'r7'], 'shrinking never drops the baseline');
    });

    test('the range takes the anchor state: deselecting the anchor then Shift-clicking clears the range', async () => {
        const M = await load();
        let s = M.setAll(M.empty(), ORDER, true);
        s = M.toggle(s, 'r2');                // r2 off -> anchor state is "off"
        s = M.extendTo(s, ORDER, 'r5');
        assert.deepStrictEqual(sorted(s.selected), ['r0', 'r1', 'r6', 'r7']);
    });

    test('a plain toggle ends the Shift run (new baseline next time)', async () => {
        const M = await load();
        let s = M.extendTo(M.toggle(M.empty(), 'r0'), ORDER, 'r2');
        s = M.toggle(s, 'r5');
        assert.strictEqual(s.baseline, null);
        s = M.extendTo(s, ORDER, 'r6');
        assert.deepStrictEqual(sorted(s.selected), ['r0', 'r1', 'r2', 'r5', 'r6']);
    });

    test('without a usable anchor Shift-click selects just the target and anchors it', async () => {
        const M = await load();
        const s = M.extendTo(M.empty(), ORDER, 'r3');
        assert.deepStrictEqual(sorted(s.selected), ['r3']);
        assert.strictEqual(s.anchor, 'r3');
        // An anchor that is no longer visible (filtered out) is unusable too.
        const stale = { selected: new Set(['gone']), anchor: 'gone', baseline: null };
        const t = M.extendTo(stale, ORDER, 'r1');
        assert.deepStrictEqual(sorted(t.selected), ['gone', 'r1']);
        assert.strictEqual(t.anchor, 'r1');
    });

    test('rangeBetween is inclusive and order-independent; unknown ends yield nothing', async () => {
        const M = await load();
        assert.deepStrictEqual(M.rangeBetween(ORDER, 'r3', 'r1'), ['r1', 'r2', 'r3']);
        assert.deepStrictEqual(M.rangeBetween(ORDER, 'r4', 'r4'), ['r4']);
        assert.deepStrictEqual(M.rangeBetween(ORDER, 'x', 'r4'), []);
    });
});

describe('paint, setAll', () => {
    test('add-mode paints hits over the baseline; remove-mode erases them', async () => {
        const M = await load();
        const base = new Set(['r0', 'r5']);
        assert.deepStrictEqual(sorted(M.paint(base, ['r1', 'r2'], 'add')), ['r0', 'r1', 'r2', 'r5']);
        assert.deepStrictEqual(sorted(M.paint(base, ['r5', 'r6'], 'remove')), ['r0']);
    });

    test('setAll selects or clears exactly the given rows and resets the anchor', async () => {
        const M = await load();
        let s = M.toggle(M.empty(), 'outside');
        s = M.setAll(s, ['r1', 'r2'], true);
        assert.deepStrictEqual(sorted(s.selected), ['outside', 'r1', 'r2']);
        assert.strictEqual(s.anchor, null);
        s = M.setAll(s, ['r1', 'r2'], false);
        assert.deepStrictEqual(sorted(s.selected), ['outside']);
    });
});

describe('geometry', () => {
    const LIST = ORDER.map((rel, i) => ({ rel, left: 0, right: 800, top: i * 52, bottom: i * 52 + 52 }));

    test('rectFrom normalizes two points dragged in any direction', async () => {
        const M = await load();
        assert.deepStrictEqual(M.rectFrom({ x: 50, y: 300 }, { x: 10, y: 20 }), { left: 10, top: 20, right: 50, bottom: 300 });
    });

    test('a vertical drag in list mode hits every row it crosses, even with zero width', async () => {
        const M = await load();
        const band = M.rectFrom({ x: 120, y: 60 }, { x: 120, y: 200 });
        assert.deepStrictEqual(M.hitTest(LIST, band), ['r1', 'r2', 'r3']);
    });

    test('touching a row edge is not a hit; one pixel inside is', async () => {
        const M = await load();
        assert.deepStrictEqual(M.hitTest(LIST, M.rectFrom({ x: 5, y: 52 }, { x: 5, y: 104 })), ['r1']);
    });

    test('grid mode needs the band to overlap a card horizontally too', async () => {
        const M = await load();
        const GRID = [
            { rel: 'a', left: 0, right: 100, top: 0, bottom: 100 },
            { rel: 'b', left: 110, right: 210, top: 0, bottom: 100 },
            { rel: 'c', left: 0, right: 100, top: 110, bottom: 210 },
            { rel: 'd', left: 110, right: 210, top: 110, bottom: 210 },
        ];
        assert.deepStrictEqual(M.hitTest(GRID, M.rectFrom({ x: 120, y: 5 }, { x: 150, y: 150 })), ['b', 'd']);
    });

    test('auto-scroll speed grows toward the edge and is zero in the middle', async () => {
        const M = await load();
        assert.strictEqual(M.autoScrollDelta(300, 0, 600), 0);
        const nearBottom = M.autoScrollDelta(590, 0, 600);
        const atBottom = M.autoScrollDelta(605, 0, 600);
        assert.ok(nearBottom > 0 && atBottom >= nearBottom, `${nearBottom} ${atBottom}`);
        assert.ok(M.autoScrollDelta(10, 0, 600) < 0);
        assert.ok(Math.abs(M.autoScrollDelta(-500, 0, 600)) <= 24, 'speed is capped');
    });
});

describe('immutability', () => {
    test('no transition mutates its input state or sets', async () => {
        const M = await load();
        const start = M.toggle(M.empty(), 'r1');
        const snapshot = sorted(start.selected);
        M.toggle(start, 'r2');
        M.extendTo(start, ORDER, 'r4');
        M.setAll(start, ORDER, true);
        const base = new Set(['r0']);
        M.paint(base, ['r1'], 'add');
        assert.deepStrictEqual(sorted(start.selected), snapshot);
        assert.deepStrictEqual(sorted(base), ['r0']);
    });
});
