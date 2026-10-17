/**
 * @file test/pane-resize.test.js
 * @brief The splitter math behind the Browse panes: clamping and the pointer-delta
 *        sign in both reading directions, for a leading (tree) and a trailing
 *        (inspector) pane. Spec: openspec/changes/browse-split-explorer/specs/browse-explorer.
 */
'use strict';

const { test } = require('node:test');
const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

const load = () => import(pathToFileURL(path.join(__dirname, '..', 'public', 'assets', 'js', 'pane-resize.js')).href);

test('pane-resize: clamp keeps a width inside its range; min wins when the range is inverted', async () => {
    const { PaneResize: { clamp } } = await load();
    assert.strictEqual(clamp(150, 200, 545), 200);
    assert.strictEqual(clamp(300, 200, 545), 300);
    assert.strictEqual(clamp(900, 200, 545), 545);
    // A viewport too narrow for the centre minimum yields max < min: the tree keeps its floor.
    assert.strictEqual(clamp(300, 200, 120), 200);
});

test('pane-resize: dragging toward the centre widens the pane in LTR and RTL', async () => {
    const { PaneResize: { widthDelta } } = await load();
    // Tree leads: LTR it is on the left, so moving right (+dx) widens it.
    assert.strictEqual(widthDelta(120, false, false), 120);
    // RTL it is on the right, so moving left (-dx) widens it.
    assert.strictEqual(widthDelta(-120, true, false), 120);
    // Inspector trails: LTR it is on the right, so moving left widens it.
    assert.strictEqual(widthDelta(-100, false, true), 100);
    assert.strictEqual(widthDelta(100, true, true), 100);
});
