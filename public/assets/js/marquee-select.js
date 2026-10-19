/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @file        marquee-select.js
 * @module      MarqueeSelect
 * @brief       Drag-to-select (rubber band) for the Browse file table.
 *
 * @description
 * Turns a primary-button mouse/pen drag over the table into a live multi-select.
 * The module owns only the GESTURE. The rules (what a drag does to the selection)
 * live in SelectionModel. The state lives in BulkDownload, which is injected at
 * mount(), so there is no import cycle and no second copy of the selection.
 *
 * ── GESTURE ──────────────────────────────────────────────────────────────────
 *   pointerdown  on a row's inert area, its checkbox cell, or empty table space.
 *                Never on links or buttons, a locked row, the header or the bulk bar.
 *                Touch is ignored, so touch keeps scrolling.
 *   arm          after THRESHOLD px of movement. Below that it is a click, and
 *                BulkDownload's click handler toggles the row exactly as before.
 *   move         rAF-coalesced: band redraw → SelectionModel.hitTest → BulkDownload.paint(quiet).
 *   edges        within 40 px of the scroller's top/bottom the list auto-scrolls.
 *   end          the band is removed, BulkDownload.flush() notifies once, and the
 *                click that follows pointerup is swallowed so the start row is
 *                not toggled again.
 *   Escape       restores the selection from before the drag.
 *
 * Mode: a drag that starts on a selected row REMOVES what it crosses. Otherwise it ADDS.
 *
 * ── COORDINATES ──────────────────────────────────────────────────────────────
 * Everything is measured in "gesture space": client coordinates plus how far the
 * scroller has moved since the drag started. Row rectangles are read once, when
 * the drag arms (one layout read). Auto-scrolling therefore extends the band
 * correctly. This works whether the table scrolls itself (split layout) or the
 * page scrolls (embedded/mobile).
 *
 * @version     1.0.0
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { SelectionModel } from "./selection-model.js?v=4.6.24.6.6";

const MarqueeSelect = (function () {
    'use strict';

    const THRESHOLD = 5;
    const BLOCKED = 'a[href], button, select, textarea, [role="button"], .thead, .browse-bulkbar, .f-actions';

    /** @type {object|null} Active gesture. */
    let g = null;

    /** Set after an armed drag so the trailing click does not toggle the start row. */
    let swallowClick = false;

    /* ── TARGETING ───────────────────────────────────────────────────────── */

    /** @returns {HTMLElement|null} The row the press would start on (null = empty space), or undefined to refuse. */
    function startTarget(e, table) {
        if (e.button !== 0 || e.pointerType === "touch") return undefined;
        if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return undefined;
        const t = /** @type {HTMLElement} */ (e.target);
        if (!t || !t.closest || t.closest(BLOCKED)) return undefined;
        if (t.tagName === "INPUT" && !t.classList.contains("row-select")) return undefined;
        const rowsEl = table.querySelector("#rows");
        if (!rowsEl || !rowsEl.querySelector(".trow[data-rel]")) return undefined;
        const row = t.closest("#rows .trow");
        if (row) return row.classList.contains("is-locked") || !row.dataset.rel ? undefined : row;
        // Empty space inside the table (below the last row, gaps in grid mode).
        return (t === table || t === rowsEl) ? null : undefined;
    }

    /* ── SCROLLER ────────────────────────────────────────────────────────── */

    function scrollerFor(table) {
        const style = getComputedStyle(table);
        const scrolls = /(auto|scroll)/.test(style.overflowY) && table.scrollHeight > table.clientHeight;
        return scrolls ? table : null; // null = the page scrolls
    }

    function scrollPos(scroller) {
        return scroller ? { x: scroller.scrollLeft, y: scroller.scrollTop } : { x: window.scrollX, y: window.scrollY };
    }

    function viewport(scroller) {
        if (!scroller) return { top: 0, bottom: window.innerHeight, left: 0, right: window.innerWidth };
        const r = scroller.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
    }

    /** Offset from client space to gesture space (scroll travelled since the drag started). */
    function offset() {
        const p = scrollPos(g.scroller);
        return { x: p.x - g.scroll0.x, y: p.y - g.scroll0.y };
    }

    function toGesture(clientX, clientY) {
        const o = offset();
        return { x: clientX + o.x, y: clientY + o.y };
    }

    /* ── GESTURE LIFECYCLE ───────────────────────────────────────────────── */

    function onPointerDown(e) {
        const table = /** @type {HTMLElement} */ (e.currentTarget);
        const row = startTarget(e, table);
        if (row === undefined || g) return;
        const scroller = scrollerFor(table);
        g = {
            table, api: table.__marqueeApi, id: e.pointerId, row,
            scroller, scroll0: scrollPos(scroller),
            start: { x: e.clientX, y: e.clientY }, startG: null,
            last: { x: e.clientX, y: e.clientY },
            armed: false, mode: "add", from: null, rects: [], hitKey: "", band: null, raf: 0, loop: 0
        };
        g.startG = toGesture(e.clientX, e.clientY);
        table.addEventListener("pointermove", onPointerMove);
        table.addEventListener("pointerup", onPointerUp);
        table.addEventListener("pointercancel", onPointerCancel);
    }

    /** A press that could become a drag must not start a native text selection. */
    function onMouseDown(e) {
        const table = /** @type {HTMLElement} */ (e.currentTarget);
        if (startTarget(e, table) !== undefined) e.preventDefault();
    }

    function onPointerMove(e) {
        if (!g || e.pointerId !== g.id) return;
        g.last = { x: e.clientX, y: e.clientY };
        if (!g.armed) {
            if (Math.hypot(e.clientX - g.start.x, e.clientY - g.start.y) < THRESHOLD) return;
            arm();
        }
        schedule();
    }

    function arm() {
        const { table, api } = g;
        g.armed = true;
        try { table.setPointerCapture(g.id); } catch { /* pointer already released */ }
        table.classList.add("is-marquee");
        const sel = window.getSelection && window.getSelection();
        if (sel && sel.removeAllRanges) sel.removeAllRanges();

        g.from = api.snapshot();
        g.mode = g.row && api.has(g.row.dataset.rel) ? "remove" : "add";
        g.rects = measureRows(table, new Set(api.order()));

        g.band = document.createElement("div");
        g.band.className = "marquee-band";
        g.band.setAttribute("aria-hidden", "true");
        document.body.appendChild(g.band);

        document.addEventListener("keydown", onKeyDown, true);
        g.loop = requestAnimationFrame(autoScroll);
    }

    /** One layout read: every selectable row's rectangle in gesture space. */
    function measureRows(table, selectable) {
        const o = offset();
        const out = [];
        table.querySelectorAll("#rows .trow[data-rel]").forEach(row => {
            if (!selectable.has(row.dataset.rel)) return;
            const r = row.getBoundingClientRect();
            out.push({ rel: row.dataset.rel, left: r.left + o.x, right: r.right + o.x, top: r.top + o.y, bottom: r.bottom + o.y });
        });
        return out;
    }

    function schedule() {
        if (!g || g.raf) return;
        g.raf = requestAnimationFrame(() => { if (g) { g.raf = 0; frame(); } });
    }

    /** Recomputes the band and the hits from the latest pointer position. */
    function frame() {
        const cur = toGesture(g.last.x, g.last.y);
        const band = SelectionModel.rectFrom(g.startG, cur);
        drawBand(band);
        const hits = SelectionModel.hitTest(g.rects, band);
        const key = hits.join("\u0000");
        if (key === g.hitKey) return;
        g.hitKey = key;
        g.api.paint(hits, g.mode, g.from, { quiet: true });
    }

    /** Draws the band in client space, clipped to the visible scroller area. */
    function drawBand(band) {
        const o = offset();
        const v = viewport(g.scroller);
        const left = Math.max(band.left - o.x, v.left);
        const right = Math.min(band.right - o.x, v.right);
        const top = Math.max(band.top - o.y, v.top);
        const bottom = Math.min(band.bottom - o.y, v.bottom);
        const s = g.band.style;
        s.transform = `translate(${left}px, ${top}px)`;
        s.width = Math.max(0, right - left) + "px";
        s.height = Math.max(0, bottom - top) + "px";
    }

    function autoScroll() {
        if (!g || !g.armed) return;
        const v = viewport(g.scroller);
        const dy = SelectionModel.autoScrollDelta(g.last.y, v.top, v.bottom);
        if (dy) {
            if (g.scroller) g.scroller.scrollTop += dy; else window.scrollBy(0, dy);
            frame();
        }
        g.loop = requestAnimationFrame(autoScroll);
    }

    function onKeyDown(e) {
        if (!g || e.key !== "Escape") return;
        e.preventDefault();
        e.stopPropagation();
        g.api.restore(g.from, { quiet: true });
        end(true);
    }

    function onPointerUp(e) {
        if (!g || e.pointerId !== g.id) return;
        if (g.armed) frame();
        end(true);
    }

    function onPointerCancel(e) {
        if (!g || e.pointerId !== g.id) return;
        end(false);
    }

    /** @param {boolean} swallow  Swallow the click that follows (pointerup / Escape). */
    function end(swallow) {
        const cur = g;
        g = null;
        const { table } = cur;
        table.removeEventListener("pointermove", onPointerMove);
        table.removeEventListener("pointerup", onPointerUp);
        table.removeEventListener("pointercancel", onPointerCancel);
        if (!cur.armed) return;

        document.removeEventListener("keydown", onKeyDown, true);
        cancelAnimationFrame(cur.raf);
        cancelAnimationFrame(cur.loop);
        try { table.releasePointerCapture(cur.id); } catch { /* already released */ }
        table.classList.remove("is-marquee");
        if (cur.band) cur.band.remove();
        cur.api.flush();

        if (swallow) {
            swallowClick = true;
            // The click (if any) is dispatched in the same task as pointerup.
            setTimeout(() => { swallowClick = false; }, 0);
        }
    }

    function onClickCapture(e) {
        if (!swallowClick) return;
        swallowClick = false;
        e.preventDefault();
        e.stopPropagation();
    }

    /* ── PUBLIC ──────────────────────────────────────────────────────────── */

    /**
     * @brief Enables drag-to-select on one table render.
     * @param {HTMLElement} table  `#tableContainer`. BrowsePage replaces it on every
     *                             navigation, so listeners never pile up.
     * @param {object} api         BulkDownload: has, order, snapshot, paint, restore, flush.
     */
    function mount(table, api) {
        if (!table || !api || table.__marqueeApi) return;
        table.__marqueeApi = api;
        table.addEventListener("pointerdown", onPointerDown);
        table.addEventListener("mousedown", onMouseDown);
        table.addEventListener("click", onClickCapture, true);
    }

    return { mount };
})();

export { MarqueeSelect };
