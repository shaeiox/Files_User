/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @file        selection-model.js
 * @module      SelectionModel
 * @brief       Pure selection state transitions and marquee geometry for Browse.
 *
 * @description
 * No DOM, no globals, no mutation. Each function takes a state (or plain values)
 * and returns a NEW one, so the same rules run in the browser and in
 * `test/selection-model.test.js`.
 *
 * ── STATE ────────────────────────────────────────────────────────────────────
 *   { selected: Set<string>, anchor: string|null, baseline: Set<string>|null }
 *
 *   - `anchor`   is the last row toggled without Shift. A Shift range runs from here.
 *   - `baseline` is the selection as it was when the current Shift run started.
 *                Every Shift step recomputes `baseline ± range`, which lets the
 *                range shrink (rubber band) without losing earlier picks. Any
 *                non-Shift action ends the run (baseline = null).
 *
 * ── SEMANTICS (checkbox list, not single-select) ────────────────────────────
 * A plain click toggles one row (unchanged Browse behaviour). Shift sets the
 * range to the ANCHOR's state: after selecting row 2, Shift-click on row 7
 * selects 2..7. After deselecting row 2, the same Shift-click clears 2..7.
 * A drag paints: it adds hits to the baseline, or removes them when the drag
 * started on a selected row.
 *
 * @version     1.0.0
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const SelectionModel = (function () {
    'use strict';

    /** Edge zone (px) that triggers auto-scroll during a drag, and the speed cap (px/frame). */
    const SCROLL_EDGE = 40;
    const SCROLL_MAX = 24;

    /** @returns {{selected:Set<string>, anchor:null, baseline:null}} */
    function empty() {
        return { selected: new Set(), anchor: null, baseline: null };
    }

    /**
     * @brief Flips (or forces) one row and anchors it. Ends any Shift run.
     * @param {object}  state
     * @param {string}  rel
     * @param {boolean} [on]  Forced state; omitted = flip.
     */
    function toggle(state, rel, on) {
        const selected = new Set(state.selected);
        const next = on === undefined ? !selected.has(rel) : !!on;
        if (next) selected.add(rel); else selected.delete(rel);
        return { selected, anchor: rel, baseline: null };
    }

    /**
     * @brief Inclusive slice of `order` between two rows, in listing order.
     * @returns {string[]} Empty when either end is not in `order`.
     */
    function rangeBetween(order, a, b) {
        const i = order.indexOf(a);
        const j = order.indexOf(b);
        if (i < 0 || j < 0) return [];
        return order.slice(Math.min(i, j), Math.max(i, j) + 1);
    }

    /**
     * @brief Shift-extends from the anchor to `rel` over the visible `order`.
     * @details Without a usable anchor (none yet, or filtered out of view) this
     *          selects `rel` and anchors it, so the next Shift-click has a start.
     */
    function extendTo(state, order, rel) {
        if (!state.anchor || order.indexOf(state.anchor) < 0) return toggle(state, rel, true);
        const baseline = state.baseline || state.selected;
        const value = baseline.has(state.anchor);
        const selected = new Set(baseline);
        rangeBetween(order, state.anchor, rel).forEach(r => {
            if (value) selected.add(r); else selected.delete(r);
        });
        return { selected, anchor: state.anchor, baseline };
    }

    /**
     * @brief The selection a drag produces: baseline with the hit rows added or removed.
     * @param {Set<string>}  baseline  Selection when the drag started.
     * @param {string[]}     hits      Rows the band currently touches.
     * @param {"add"|"remove"} mode
     * @returns {Set<string>}
     */
    function paint(baseline, hits, mode) {
        const selected = new Set(baseline);
        hits.forEach(r => { if (mode === "remove") selected.delete(r); else selected.add(r); });
        return selected;
    }

    /** @brief Selects or clears exactly `rels`. Resets anchor and Shift run. */
    function setAll(state, rels, on) {
        const selected = new Set(state.selected);
        rels.forEach(r => { if (on) selected.add(r); else selected.delete(r); });
        return { selected, anchor: null, baseline: null };
    }

    /** @brief Normalized rectangle spanning two points dragged in any direction. */
    function rectFrom(a, b) {
        return {
            left: Math.min(a.x, b.x), top: Math.min(a.y, b.y),
            right: Math.max(a.x, b.x), bottom: Math.max(a.y, b.y)
        };
    }

    /**
     * @brief Rows whose rectangle the band overlaps (strictly; touching edges do not count).
     * @details A zero-width or zero-height band still hits a row that contains it,
     *          so a perfectly vertical drag in list mode selects every row it crosses.
     * @param {Array<{rel:string,left:number,right:number,top:number,bottom:number}>} rects  Listing order.
     * @param {{left:number,right:number,top:number,bottom:number}} band
     * @returns {string[]} Hit rows, in listing order.
     */
    function hitTest(rects, band) {
        const overlaps = (lo1, hi1, lo2, hi2) => (lo2 === hi2 ? lo1 < lo2 && hi1 > lo2 : lo1 < hi2 && hi1 > lo2);
        return rects
            .filter(r => overlaps(r.left, r.right, band.left, band.right) && overlaps(r.top, r.bottom, band.top, band.bottom))
            .map(r => r.rel);
    }

    /**
     * @brief Auto-scroll speed for a pointer at `y` in a viewport [top, bottom].
     * @returns {number} px per frame: negative scrolls up, positive down, 0 in the middle.
     */
    function autoScrollDelta(y, top, bottom) {
        const ramp = (depth) => Math.min(SCROLL_MAX, Math.ceil((depth / SCROLL_EDGE) * SCROLL_MAX / 2) * 2);
        if (y < top + SCROLL_EDGE) return -ramp(top + SCROLL_EDGE - y);
        if (y > bottom - SCROLL_EDGE) return ramp(y - (bottom - SCROLL_EDGE));
        return 0;
    }

    return { empty, toggle, rangeBetween, extendTo, paint, setAll, rectFrom, hitTest, autoScrollDelta };
})();

export { SelectionModel };
