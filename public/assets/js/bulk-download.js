/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @file        bulk-download.js
 * @module      BulkDownload
 * @brief       Selection state and bulk actions for the Browse page.
 *
 * @description
 * Owns everything about acting on more than one Browse row at once: the selection
 * set, the per-row checkbox state, header select-all, the live count/size summary,
 * Copy File List, and staggered multi-file download.
 *
 * ── SELECTION MODEL ──────────────────────────────────────────────────────────
 * Selection is a `Set` of `relPath` strings held OUTSIDE the row markup. The Browse
 * list pipeline rewrites `#rows` on every filter change, so a selection stored in
 * the DOM would be destroyed by typing in the search box. Holding it here means
 * narrowing a filter preserves the user's selection. Navigation resets it, because
 * a new directory is a different item universe (BrowsePage.render calls clear()).
 *
 * ── INTERACTION BOUNDARY ─────────────────────────────────────────────────────
 * Row clicks are delegated and yield to every existing target. A click that
 * originates inside `a[href]`, `button`, or `input` is ignored here, so anchors
 * still bubble to the SPA router unchanged and navigation plus the `data-file`
 * download contract keep working exactly as before. Selection therefore never
 * cancels or competes with an existing control.
 *
 * ── PER-FILE DOWNLOAD REPORTING ──────────────────────────────────────────────
 * The browser owns an anchor-triggered transfer, so its outcome is not observable
 * from script. To report a genuine failure rather than assume success, each file is
 * first probed with a HEAD request (`streamDownload` answers HEAD with headers only,
 * zero body bytes), then the real download is started from its own anchor. A file
 * whose HEAD does not return ok is reported failed and never started; a file that
 * starts is reported "started", never "completed" — the browser owns completion.
 *
 * Dependencies:
 *   - ResourceService (resource-service.js) — the only source of target URLs
 *   - getDict() (from i18n engine)
 *
 * @author      ShaiyaAzizi
 * @version     1.0.0
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ES module, imported by router.js when its route is entered (ui-craft-elevation 5.2).
const BulkDownload = (function () {
    'use strict';

    /** @type {Set<string>} Selected relPaths. Survives re-render; cleared on navigation. */
    let selection = new Set();

    /** @type {Map<string,object>} relPath → { relPath, name, type, size } for KNOWN items. */
    let known = new Map();

    /** @type {Array<object>} Items currently rendered as rows (drives select-all scope). */
    let rendered = [];

    /** @type {number|null} Active multi-download batch id, or null when idle. */
    let batch = null;

    /** @type {number} Monotonic batch counter so late callbacks from a stale run are ignored. */
    let batchSeq = 0;

    /** @type {string} Relative path (from FILES_ROOT) of the directory being browsed. */
    let dirRel = "";

    /** @type {Array<Function>} Listeners notified after every selection change. */
    const listeners = [];

    /**
     * @brief Subscribes to selection changes (used by the metadata inspector).
     * @returns {Function} An unsubscribe function.
     */
    function onChange(fn) {
        if (typeof fn === "function") listeners.push(fn);
        return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); };
    }

    function notify() {
        listeners.slice().forEach(fn => { try { fn(); } catch (e) { console.error("[BulkDownload] listener", e); } });
    }

    const dict = () => (typeof window.getDict === 'function' ? window.getDict() : getDict());

    /* ── SIZE FORMATTING ─────────────────────────────────────────────────── */

    /** @brief Formats a byte count for the bulk summary, mirroring browse.js. */
    function humanSize(b, lang) {
        if (!Number.isFinite(b) || b < 0) return "—";
        if (b === 0) return lang === "fa" ? "۰ بایت" : "0 B";
        const k = 1024;
        const u = lang === "fa" ? ["بایت", "KB", "MB", "GB", "TB"] : ["B", "KB", "MB", "GB", "TB"];
        const i = Math.min(Math.floor(Math.log(b) / Math.log(k)), u.length - 1);
        return (b / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1) + " " + u[i];
    }

    /* ── STATE ────────────────────────────────────────────────────────────── */

    /**
     * @brief Clears the selection. Called by BrowsePage on every navigation.
     */
    function clear() {
        selection.clear();
        known.clear();
        rendered = [];
        dirRel = "";
        cancelBatch();
        render();
    }

    /**
     * @brief Records which directory the current selection belongs to.
     * @details The ZIP endpoint scopes every entry to the browsed directory, so the
     *          selection cannot name a sibling subtree the user is not looking at.
     */
    function setDirectory(rel) {
        dirRel = String(rel || "").replace(/^\/+|\/+$/g, "");
    }

    /**
     * @brief Registers the currently rendered rows and re-syncs checkbox/row state.
     * @param   {Array<object>} items  Normalized items that produced the rendered rows.
     */
    function setRendered(items) {
        rendered = Array.isArray(items) ? items.slice() : [];
        rendered.forEach(it => known.set(it.relPath, it));
        syncRowStates();
        render();
    }

    /**
     * @brief Resolves an item's real metadata, registering it from the row when the
     *        registry does not have it yet.
     * @details Selection can be toggled from the DOM before `setRendered()` has run for
     *          the current pass (e.g. immediately after a manual clear). Reading the
     *          values the row already carries keeps the size/total summary correct
     *          instead of silently degrading to "no size" and an empty Copy File List.
     */
    function resolve(relPath) {
        if (known.has(relPath)) return known.get(relPath);
        const row = rowFor(relPath);
        if (!row) return null;
        const item = {
            relPath: relPath,
            name: row.dataset.name || String(relPath).split("/").pop(),
            type: row.dataset.type || "file",
            size: Number(row.dataset.size) || 0
        };
        known.set(relPath, item);
        return item;
    }

    /**
     * @brief Toggles one item's membership in the selection.
     */
    function toggle(relPath, on) {
        if (!relPath) return;
        resolve(relPath);
        const next = (on === undefined) ? !selection.has(relPath) : !!on;
        if (next) selection.add(relPath); else selection.delete(relPath);
        const row = rowFor(relPath);
        if (row) row.classList.toggle("is-selected", next);
        const cb = row && row.querySelector(".row-select");
        if (cb) cb.checked = next;
        render();
    }

    /** @brief Reports whether an item is selected. */
    function has(relPath) { return selection.has(relPath); }

    /** @brief Reports how many items are selected. */
    function count() { return selection.size; }

    /** @brief Selected items in listing order — the set is order-independent, the list is not. */
    function selectedItems() {
        // Prefer rendered order for a stable, listing-ordered list, then append any
        // selected item that is no longer rendered (selection survives filtering).
        const inList = rendered.filter(it => selection.has(it.relPath));
        const seen = new Set(inList.map(it => it.relPath));
        const rest = [...known.values()].filter(it => selection.has(it.relPath) && !seen.has(it.relPath));
        return inList.concat(rest);
    }

    function rowFor(relPath) {
        return document.querySelector(`#rows .trow[data-rel="${cssEscape(relPath)}"]`);
    }

    function cssEscape(v) {
        return window.CSS && CSS.escape ? CSS.escape(String(v)) : String(v).replace(/["\\]/g, "\\$&");
    }

    /* ── RENDERING ────────────────────────────────────────────────────────── */

    /**
     * @brief Repaints the bulk bar from the live selection.
     */
    function render() {
        const d = dict();
        const bar = document.getElementById("bulkBar");
        if (!bar) return;

        const n = selection.size;
        const items = selectedItems();

        // Folders contribute a count of one and NO byte total — the server exposes no
        // recursive size, and inventing one would be fabrication.
        const fileBytes = items.reduce((sum, it) => sum + (it.type === "file" ? (Number(it.size) || 0) : 0), 0);

        const countEl = document.getElementById("bulkCount");
        const sizeEl = document.getElementById("bulkSize");
        if (countEl) countEl.textContent = (d.bulkSelected || "%n selected").replace("%n", String(n));
        if (sizeEl) sizeEl.textContent = fileBytes > 0
            ? (d.bulkSize || "%s selected").replace("%s", humanSize(fileBytes, currentLang()))
            : (d.bulkNoSize || "files only");

        const disabled = n === 0;
        ["bulkDownload", "bulkCopy", "bulkZip"].forEach(id => {
            const b = document.getElementById(id);
            if (b) b.disabled = disabled;
        });

        bar.hidden = disabled && !batch;
        bar.classList.toggle("is-active", !disabled);

        // Header checkbox reflects the rendered rows only.
        const all = document.getElementById("selectAll");
        if (all) {
            const sel = rendered.filter(it => selection.has(it.relPath)).length;
            all.checked = rendered.length > 0 && sel === rendered.length;
            all.indeterminate = sel > 0 && sel < rendered.length;
            all.disabled = rendered.length === 0;
        }

        notify();
    }

    function currentLang() {
        return typeof window.getLang === 'function' ? window.getLang() : "en";
    }

    /** @brief Applies selection state to every rendered checkbox and row. */
    function syncRowStates() {
        document.querySelectorAll("#rows .trow").forEach(row => {
            const on = selection.has(row.dataset.rel);
            row.classList.toggle("is-selected", on);
            const cb = row.querySelector(".row-select");
            if (cb) cb.checked = on;
        });
    }

    /* ── ACTIONS ──────────────────────────────────────────────────────────── */

    /**
     * @brief Copies the selected relative paths, in listing order, to the clipboard.
     */
    async function copyList() {
        const items = selectedItems();
        if (!items.length) return;
        const text = items.map(it => it.relPath).join("\n");
        try {
            await navigator.clipboard.writeText(text);
            flash("bulkCopy", dict().bulkCopied || "Copied");
        } catch {
            // Clipboard API is unavailable outside a secure context; fall back.
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand("copy"); flash("bulkCopy", dict().bulkCopied || "Copied"); }
            catch { flash("bulkCopy", dict().bulkFailed || "Copy failed"); }
            document.body.removeChild(ta);
        }
    }

    /**
     * @brief Downloads every selected file individually, reporting real outcomes.
     * @details Each file is HEAD-probed first so a genuine failure is reported rather
     *          than assumed. Requests are staggered because browsers throttle bursts
     *          of automatic downloads.
     */
    async function downloadAll() {
        const d = dict();
        const items = selectedItems().filter(it => it.type === "file");
        if (!items.length || batch !== null) return;

        const myBatch = ++batchSeq;
        batch = myBatch;
        const folders = selectedItems().length - items.length;
        setBusy(true, d.bulkStarting || "Starting 0 of 0…");

        let started = 0, failed = 0;
        const STAGGER = 350;

        for (let i = 0; i < items.length; i++) {
            if (batch !== myBatch) return;          // superseded or cancelled
            const it = items[i];
            setBusy(true, (d.bulkStarting || "Starting %s of %t…")
                .replace("%s", String(i + 1)).replace("%t", String(items.length)));

            let ok = false, why = "";
            try {
                const res = await fetch(ResourceService.downloadHref(it.relPath), { method: "HEAD", cache: "no-store" });
                ok = res.ok;
                if (!ok) why = "HTTP " + res.status;
            } catch (e) {
                why = (e && e.message) || "network";
            }

            if (batch !== myBatch) return;

            if (ok) {
                triggerDownload(it);
                started++;
            } else {
                failed++;
                markRow(it.relPath, why);
            }

            if (i < items.length - 1) await new Promise(r => setTimeout(r, STAGGER));
        }

        batch = null;
        setBusy(false);

        const parts = [];
        if (started) parts.push((d.bulkStarted || "%n started").replace("%n", String(started)));
        if (failed) parts.push((d.bulkFailedCount || "%n failed").replace("%n", String(failed)));
        if (folders) parts.push((d.bulkFoldersSkipped || "%n folders skipped").replace("%n", String(folders)));
        flash("bulkDownload", parts.join(" · ") || (d.bulkNothingToDownload || "Nothing to download"), true);
    }

    /**
     * @brief Clicks a transient download anchor and cleans it up on a later tick.
     * @details The anchor must stay in the document until the browser has picked up
     *          the navigation. Removing it synchronously right after `.click()` aborts
     *          the pending download, so removal is deferred to the next macrotask.
     */
    function fireAnchor(a) {
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { if (a.parentNode) a.parentNode.removeChild(a); }, 0);
    }

    /**
     * @brief Downloads the selection as one server-generated ZIP archive.
     * @details The primary bulk action: one user action produces one browser download,
     *          which sidesteps the browser's throttling of multiple automatic downloads.
     *          Only files are included — the endpoint rejects directories, and folders
     *          have no byte total to archive.
     */
    async function downloadZip() {
        const d = dict();
        const files = selectedItems().filter(it => it.type === "file");
        if (!files.length) {
            flash("bulkZip", d.bulkNoFiles || "Select files first", true);
            return;
        }
        if (!dirRel) {
            flash("bulkZip", d.bulkNoFiles || "Select files first", true);
            return;
        }

        const href = ResourceService.zipDownloadHref(dirRel, files.map(it => it.relPath));
        // The server refuses the whole archive if any file is no longer allowed:
        // 401 opens sign-in, 404 means part of the selection is gone or hidden.
        const outcome = await FileActions.preflight(href);
        if (outcome === "locked") { FileActions.signIn(); return; }
        if (outcome !== "ok") {
            flash("bulkZip", outcome === "missing"
                ? (d.bulkUnavailable || "Selection is no longer available")
                : (d.downloadUnavailable || "Download unavailable, try again"), true);
            return;
        }

        const a = document.createElement("a");
        a.href = href;
        a.setAttribute("data-file", "true");   // keeps the SPA router from intercepting
        // No `download` attribute: the endpoint's Content-Disposition already names the
        // archive. Setting an empty `download` value makes Chrome derive an empty name.
        a.style.display = "none";
        fireAnchor(a);

        flash("bulkZip", (d.bulkZipStarted || "ZIP started (%n)")
            .replace("%n", String(files.length)));
    }

    /** @brief Hands one file to the browser as a download via a transient anchor. */
    function triggerDownload(item) {
        const a = document.createElement("a");
        a.href = ResourceService.downloadHref(item.relPath);
        a.setAttribute("data-file", "true");   // keeps the SPA router from intercepting
        a.download = item.name;
        a.style.display = "none";
        fireAnchor(a);
        markRow(item.relPath, null);
    }

    /** @brief Flags a row's outcome without claiming a browser-owned transfer completed. */
    function markRow(relPath, error) {
        const row = rowFor(relPath);
        if (!row) return;
        row.classList.remove("is-started", "is-failed");
        if (error) row.classList.add("is-failed");
        else row.classList.add("is-started");
    }

    function setBusy(on, text) {
        const bar = document.getElementById("bulkBar");
        if (!bar) return;
        bar.classList.toggle("is-busy", !!on);
        const st = document.getElementById("bulkStatus");
        if (st) st.textContent = text || "";
        const b = document.getElementById("bulkDownload");
        if (b) b.disabled = !!on || selection.size === 0;
        if (on) bar.hidden = false;
    }

    function cancelBatch() {
        batchSeq++;
        batch = null;
        const bar = document.getElementById("bulkBar");
        if (bar) bar.classList.remove("is-busy");
        const st = document.getElementById("bulkStatus");
        if (st) st.textContent = "";
    }

    /** @brief Briefly swaps a control's label to report an outcome. */
    function flash(id, msg, isSticky) {
        const b = document.getElementById(id);
        if (!b) return;
        const span = b.querySelector(".bulk-btn-text") || b;
        if (!b.dataset.origLabel) b.dataset.origLabel = span.textContent;
        span.textContent = msg;
        b.classList.add("is-flash");
        setTimeout(() => {
            span.textContent = b.dataset.origLabel;
            b.classList.remove("is-flash");
            if (isSticky) setTimeout(render, 2500);
        }, isSticky ? 4000 : 1400);
    }

    /* ── WIRING ───────────────────────────────────────────────────────────── */

    /**
     * @brief Binds delegated handlers for one page render.
     * @note    Called by BrowsePage after the skeleton is in the DOM. Handlers are
     *          bound on the table container, which BrowsePage replaces wholesale on
     *          navigation, so no listener accumulates across renders.
     */
    function mount() {
        const table = document.getElementById("tableContainer");
        if (table) {
            table.addEventListener("click", onRowClick);
            table.addEventListener("change", onRowChange);
        }

        const all = document.getElementById("selectAll");
        if (all) all.addEventListener("change", onSelectAll);

        const dl = document.getElementById("bulkDownload");
        if (dl) dl.addEventListener("click", () => { downloadAll(); });

        const cp = document.getElementById("bulkCopy");
        if (cp) cp.addEventListener("click", () => { copyList(); });

        const zip = document.getElementById("bulkZip");
        if (zip) zip.addEventListener("click", () => { downloadZip(); });

        // The bulk bar is built at render time and holds no data-i18n nodes, so a
        // language switch has to re-render it or it keeps stale-language text.
        document.addEventListener("i18n:changed", () => { render(); });

        render();
    }

    function onRowClick(e) {
        // Yield to every pre-existing target: anchors (router navigation / download),
        // the row checkbox, and any button. Only inert row area toggles selection.
        if (e.target.closest('a[href], button, input, select, [role="button"]')) return;
        const row = e.target.closest(".trow");
        if (!row || !row.dataset.rel || row.classList.contains("is-locked")) return;
        toggle(row.dataset.rel);
        row.focus();
    }

    function onRowChange(e) {
        const cb = e.target;
        if (!cb.classList || !cb.classList.contains("row-select")) return;
        const row = cb.closest(".trow");
        if (!row) return;
        toggle(row.dataset.rel, cb.checked);
    }

    function onSelectAll(e) {
        const want = e.target.checked;
        // Scope is the rendered rows only — search, type, and extension filters are
        // already applied by the time #rows exists, so filtered-out rows are never hit.
        rendered.forEach(it => {
            if (want) selection.add(it.relPath); else selection.delete(it.relPath);
        });
        syncRowStates();
        render();
    }

    return { mount, setRendered, setDirectory, clear, toggle, has, count, selectedItems, onChange, downloadAll, downloadZip, copyList };
})();

export { BulkDownload };