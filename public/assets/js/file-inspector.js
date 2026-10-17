/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @file        file-inspector.js
 * @module      FileInspector
 * @brief       The File Metadata Card for the currently selected Browse item.
 *
 * @description
 * Renders a detail card for the single selected item and owns SHA-256 verification.
 *
 * ── REAL DATA ONLY ───────────────────────────────────────────────────────────
 * Every value shown is derived from the server's own view of the file: exact byte
 * count, human-readable size, modified time, a type label, the resolved relative
 * path, and — only after the user explicitly asks — a checksum computed over the
 * file's real bytes. Fields the host cannot verify (digital signature, third-party
 * scan status) are OMITTED rather than rendered with placeholder text, and no
 * archive total or archive checksum is invented. A slot that would need a value
 * nobody can supply does not appear at all.
 *
 * ── PERSISTENT CONTAINER ─────────────────────────────────────────────────────
 * `#inspector` is a sibling of the table, not part of the rows fragment. The list
 * pipeline rewrites `#rows` on every keystroke of the search box, so a card living
 * inside that fragment would be destroyed and rebuilt and could never animate.
 * Opening and closing toggles a class on this stable element instead.
 *
 * ── ON-DEMAND VERIFICATION ───────────────────────────────────────────────────
 * Selecting a file issues NO network request. A checksum is requested only when the
 * user activates Verify SHA-256, and the result is displayed afterwards. Listing a
 * directory never hashes anything.
 *
 * Dependencies:
 *   - ResourceService (resource-service.js) — the only source of target URLs
 *   - BulkDownload — supplies the current selection
 *   - BrowseIcons (browse-icons.js)
 *   - getDict() / getLang()
 *
 * @author      ShaiyaAzizi
 * @version     1.0.0
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ES module, imported by router.js when its route is entered (ui-craft-elevation 5.2).
import { BrowseIcons } from "./browse-icons.js?v=4.4.2";
import { BulkDownload } from "./bulk-download.js?v=4.4.2";

const FileInspector = (function () {
    'use strict';

    /** @type {object|null} Item currently shown, or null when closed. */
    let current = null;

    /** @type {Array<object>} Every selected item, in listing order; drives the tab strip. */
    let tabItems = [];

    /** @type {string|null} Verified digest for `current`, or null when unverified. */
    let digest = null;

    /** @type {boolean} A verification request is in flight. */
    let verifying = false;

    /** @type {string|null} Failure message for `current`, or null when none.
     *  Held as state rather than written straight into the DOM, because `refresh()`
     *  rebuilds the card from this state — a direct DOM write would be wiped by the
     *  very re-render that follows a failed verification. */
    let digestError = null;

    /** @type {boolean} Guards against re-triggering the entrance animation. */
    let animating = false;

    /** @type {any} Pending `hidden` timer from a close, so a re-open can cancel it. */
    let hideTimer = null;

    const dict = () => (typeof window.getDict === 'function' ? window.getDict() : getDict());
    const lang = () => (typeof window.getLang === 'function' ? window.getLang() : 'en');

    function escapeHtml(str) {
        return String(str || '').replace(/[&<>'"]/g, tag => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[tag]));
    }

    function humanSize(b) {
        const l = lang();
        if (!Number.isFinite(b) || b < 0) return "—";
        if (b === 0) return l === "fa" ? "۰ بایت" : "0 B";
        const k = 1024;
        const u = l === "fa" ? ["بایت", "KB", "MB", "GB", "TB"] : ["B", "KB", "MB", "GB", "TB"];
        const i = Math.min(Math.floor(Math.log(b) / Math.log(k)), u.length - 1);
        return (b / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1) + " " + u[i];
    }

    function fmtDate(ts) {
        if (!ts) return "—";
        try {
            const d = new Date(ts);
            const l = lang() === "fa" ? "fa-IR" : "en-US";
            return d.toLocaleDateString(l) + " " + d.toLocaleTimeString(l, { hour: "2-digit", minute: "2-digit" });
        } catch { return "—"; }
    }

    /* ── FETCHING ─────────────────────────────────────────────────────────── */

    async function parseErr(res) {
        let code = null, message = "HTTP " + res.status;
        try { const body = await res.json(); code = body.code || null; message = body.error || message; }
        catch { /* non-JSON error body */ }
        const e = new Error(message);
        e.status = res.status;
        e.code = code;
        return e;
    }

    /* ── RENDERING ────────────────────────────────────────────────────────── */

    function typeLabel(item) {
        const d = dict();
        if (item.type === "directory") return d.folder || "Folder";
        const ext = String(item.name || "").split(".").pop();
        if (ext && ext !== item.name) return "." + ext.toUpperCase();
        return d.file || "File";
    }

    function fetchSnippet(item) {
        // Built from the app's real download target, never a hard-coded domain.
        const href = ResourceService.downloadHref(item.relPath);
        const origin = window.location.origin || "";
        return `curl -fSL${ResourceService.cliUserArg()} ${origin}${href} -o ${item.name}`;
    }

    /**
     * @brief Builds the tab strip shown above the metadata section when several
     *        items are selected — one tab per selected item, in listing order.
     * @details The active tab carries `aria-selected`; the others do not. Roving
     *          arrow-key navigation is bound in `bindTabs()`.
     */
    function tabsHtml() {
        const d = dict();
        return `
      <div class="insp-tabs" role="tablist" aria-label="${escapeHtml(d.inspTabs || "Selected items")}">
        ${tabItems.map((t, i) => {
            const on = current && t.relPath === current.relPath;
            return `<button class="insp-tab${on ? " is-active" : ""}" id="inspTab-${i}" type="button"
                    role="tab" data-rel="${escapeHtml(t.relPath)}"
                    aria-selected="${on ? "true" : "false"}"
                    tabindex="${on ? "0" : "-1"}"
                    title="${escapeHtml(t.name)}">${escapeHtml(t.name)}</button>`;
        }).join("")}
      </div>`;
    }

    /**
     * @brief Binds tab activation: click, and Left/Right/Home/End per the ARIA
     *        tablist keyboard pattern.
     */
    function bindTabs() {
        const tabs = [...document.querySelectorAll("#inspector .insp-tab")];
        if (!tabs.length) return;

        const activate = (idx) => {
            const el = tabs[idx];
            const item = el && tabItems.find(t => t.relPath === el.dataset.rel);
            if (item) setItems(tabItems, item);
        };

        tabs.forEach((el, i) => {
            el.addEventListener("click", () => activate(i));
            el.addEventListener("keydown", (e) => {
                let next = null;
                if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
                else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
                else if (e.key === "Home") next = 0;
                else if (e.key === "End") next = tabs.length - 1;
                if (next === null) return;
                e.preventDefault();
                activate(next);
                const moved = document.querySelector(`#inspector .insp-tab[data-rel="${CSS.escape(tabItems[next].relPath)}"]`);
                if (moved) moved.focus();
            });
        });
    }

    /** @brief How many selected files the ZIP will hold — folders are not archived. */
    function zipCount() {
        const n = tabItems.filter(t => t.type === "file").length || 1;
        return escapeHtml((dict().bulkSelected || "%n selected").replace("%n", n.toLocaleString(lang() === "fa" ? "fa-IR" : "en-US")));
    }

    /** @brief Renders the card markup for one item. */
    function cardHtml(item) {
        const d = dict();
        const isFile = item.type === "file";

        const rows = [
            [d.size || "Size", isFile
                ? `${Number(item.size).toLocaleString(lang() === "fa" ? "fa-IR" : "en-US")} ${d.bytes || "bytes"} · ${humanSize(item.size)}`
                : (d.folderSizeUnknown || "—")],
            [d.modified || "Modified", fmtDate(item.modified)],
            [d.path || "Path", item.relPath, true],
        ];

        return `
      ${tabItems.length > 1 ? tabsHtml() : ""}
      <div class="insp-head">
        <div class="insp-icon">${BrowseIcons.forItem(item, 26, true)}</div>
        <div class="insp-titles">
          <span class="insp-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
          <span class="insp-kind">${escapeHtml(typeLabel(item))}</span>
        </div>
        <button class="insp-close" id="inspClose" type="button"
                aria-label="${escapeHtml(d.inspClose || "Close details")}" title="${escapeHtml(d.inspClose || "Close")}">
          ${BrowseIcons.get("close", 16)}
        </button>
      </div>

      ${isFile ? `
      <div class="insp-actions">
        <a class="insp-btn insp-btn-primary" href="${escapeHtml(ResourceService.downloadHref(item.relPath))}" data-file="true">
          ${BrowseIcons.get("download", 16)}<span>${escapeHtml(d.btnDownload || "Download")}</span>
          <span class="insp-btn-sub">${escapeHtml(humanSize(item.size))}</span>
        </a>
        <button class="insp-btn insp-btn-ghost insp-zip" id="inspZip" type="button"
                title="${escapeHtml(d.bulkZipTitle || "Download as ZIP")}">
          ${BrowseIcons.get("download", 16)}<span>${escapeHtml(d.bulkZip || "Download ZIP")}</span>
          <span class="insp-btn-sub">${zipCount()}</span>
        </button>
      </div>` : ""}

      <dl class="insp-specs">
        ${rows.map(([k, v, isPath]) => `
          <div class="insp-spec"><dt>${escapeHtml(k)}</dt><dd title="${escapeHtml(String(v))}">${
            // A path wraps at its separators, not in the middle of a name.
            isPath ? escapeHtml(String(v)).replace(/\//g, "/<wbr>") : escapeHtml(String(v))}</dd></div>`).join("")}
      </dl>

      ${isFile ? `
      <div class="insp-section">
        <div class="insp-section-head">
          <span class="insp-section-label">${escapeHtml(d.sha256 || "SHA-256 Checksum")}</span>
        </div>
        <button class="insp-btn insp-btn-ghost" id="inspVerify" type="button"${verifying ? " disabled" : ""}>
          ${BrowseIcons.get("security", 16)}
          <span>${escapeHtml(verifying ? (d.verifying || "Verifying…") : (digest ? (d.reverify || "Verify again") : (d.verify || "Verify SHA-256")))}</span>
        </button>
        <div class="insp-digest-slot" id="inspDigestSlot">${digestHtml()}</div>
      </div>` : ""}

      ${isFile ? `
      <div class="insp-section">
        <div class="insp-section-head">
          <span class="insp-section-label">${escapeHtml(d.cmdFetch || "Command Line Fetch")}</span>
          <button class="insp-copy" id="inspCopyCurl" type="button">${escapeHtml(d.copy || "Copy")}</button>
        </div>
        <div class="insp-snippet"><code>${escapeHtml(fetchSnippet(item))}</code></div>
      </div>` : ""}
    `;
    }

    /** @brief Renders the checksum region for its current state. */
    function digestHtml() {
        const d = dict();
        if (verifying) {
            return `<div class="insp-note insp-note-busy">${escapeHtml(d.verifying || "Computing checksum…")}</div>`;
        }
        if (digestError) {
            return `<div class="insp-note insp-note-error" role="alert">${escapeHtml(digestError)}</div>`;
        }
        if (!digest) {
            return `<div class="insp-note">${escapeHtml(d.shaNotComputed || "Not verified yet.")}</div>`;
        }
        return `
      <div class="insp-digest-row">
        <div class="insp-digest" id="inspDigest" tabindex="0" title="${escapeHtml(d.digestTitle || "Full checksum")}">${escapeHtml(digest)}</div>
        <button class="insp-copy" id="inspCopyDigest" type="button" aria-label="${escapeHtml(d.copyDigest || "Copy checksum")}">
          ${BrowseIcons.get("content_copy", 13)}<span>${escapeHtml(d.copy || "Copy")}</span>
        </button>
      </div>`;
    }

    /** @brief Error text for a verification failure, keyed by the server's code. */
    function errorText(err) {
        const d = dict();
        if (err && err.code === "FILE_TOO_LARGE") return d.shaTooLarge || "This file is too large to verify.";
        if (err && err.code === "AUTH_REQUIRED") return d.signInToVerify || "Sign in to verify this file.";
        if (err && (err.code === "NOT_FOUND" || err.code === "NOT_HASHABLE" || err.status === 404)) {
            return d.shaUnavailable || "The file is no longer available.";
        }
        if (err && err.status === 403) return d.shaForbidden || "You do not have access to this file.";
        return d.shaFailed || "The checksum could not be computed.";
    }

    /* ── OPEN / CLOSE ─────────────────────────────────────────────────────── */

    function container() { return document.getElementById("inspector"); }

    /** @brief The two-column body whose track expands when the card opens. */
    function bodyEl() { return document.getElementById("browseBody"); }

    /**
     * @brief Renders the card for `active`, with one tab per selected item when
     *        more than one item is selected.
     * @details The entrance animation plays only on the closed → open transition.
     *          Switching tabs swaps content in place: the table is already collapsed
     *          and the card is already on screen, so replaying the entrance would
     *          restart an animation the user did not ask for.
     *
     * @param {Array<object>} items  Every currently selected item, in listing order.
     * @param {object} active        The item whose details should be shown.
     */
    function setItems(items, active) {
        const el = container();
        if (!el || !items || !items.length || !active) return;

        const wasOpen = !el.hidden && el.classList.contains("is-open");

        tabItems = items.slice();
        current = active;
        // Checksum state is per-file; never carry one file's digest onto another.
        digest = null;
        digestError = null;
        verifying = false;

        // A pending hide from a previous close must not fire over the new card.
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }

        const body = bodyEl();
        if (body) body.classList.add("has-inspector");

        el.innerHTML = cardHtml(current);
        el.hidden = false;

        if (wasOpen) {
            el.classList.add("is-open");
        } else {
            // The card animates once per open. A forced reflow guarantees the animation
            // restarts even when the same item is re-selected.
            el.classList.remove("is-open");
            if (!animating) {
                animating = true;
                void el.offsetWidth;
                requestAnimationFrame(() => el.classList.add("is-open"));
                setTimeout(() => { animating = false; }, 400);
            } else {
                el.classList.add("is-open");
            }
        }

        el.setAttribute("aria-busy", verifying ? "true" : "false");
        bind();
    }

    /** @brief Opens the card for a single item (no tab strip). */
    function open(item) {
        setItems(item ? [item] : [], item);
    }

    function close() {
        const el = container();
        if (!el) return;
        current = null; digest = null; digestError = null; verifying = false; tabItems = [];

        // Collapse the track and fade the card out together; only then remove it from
        // the layout, so neither half of the animation is cut short.
        const body = bodyEl();
        if (body) body.classList.remove("has-inspector");
        el.classList.remove("is-open");

        if (hideTimer) clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            hideTimer = null;
            if (current) return;          // re-selected while the card was fading out
            el.hidden = true;
            el.innerHTML = "";
        }, 380);
    }

    /** @brief Re-renders in place, preserving the open state (used while verifying). */
    function refresh() {
        if (!current) return;
        const el = container();
        if (!el || el.hidden) return;
        const selDigest = document.activeElement && document.activeElement.id === "inspDigest";
        el.innerHTML = cardHtml(current);
        el.setAttribute("aria-busy", verifying ? "true" : "false");
        bind(current);
        if (selDigest) {
            const d = document.getElementById("inspDigest");
            if (d) d.focus();
        }
    }

    /* ── ACTIONS ──────────────────────────────────────────────────────────── */

    async function verify(item) {
        if (!item || verifying) return;
        verifying = true;
        refresh();

        try {
            const res = await fetch(ResourceService.hashHref(item.relPath), { cache: "no-store" });
            if (!res.ok) throw await parseErr(res);
            const data = await res.json();
            // Only accept a well-formed digest; anything else is treated as a failure
            // so a malformed response can never render as a successful verification.
            if (!data || data.algorithm !== "sha256" || !/^[0-9a-f]{64}$/.test(data.digest || "")) {
                throw new Error("Malformed checksum response");
            }
            digest = data.digest;
            digestError = null;
        } catch (err) {
            digest = null;
            digestError = errorText(err);
            // The session ended or the file became locked: offer sign-in directly.
            if (err && err.code === "AUTH_REQUIRED" && typeof FileActions !== "undefined") FileActions.signIn();
        } finally {
            verifying = false;
            refresh();
        }
    }

    async function copyText(text, btnId) {
        const d = dict();
        const btn = document.getElementById(btnId);
        try {
            await navigator.clipboard.writeText(text);
            flash(btn, d.copied || "Copied");
        } catch {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand("copy"); flash(btn, d.copied || "Copied"); }
            catch { flash(btn, d.copyFailed || "Copy failed"); }
            document.body.removeChild(ta);
        }
    }

    function flash(btn, msg) {
        if (!btn) return;
        const span = btn.querySelector("span") || btn;
        if (!btn.dataset.orig) btn.dataset.orig = span.textContent;
        span.textContent = msg;
        btn.classList.add("is-flash");
        setTimeout(() => { span.textContent = btn.dataset.orig; btn.classList.remove("is-flash"); }, 1400);
    }

    /* ── BINDING ──────────────────────────────────────────────────────────── */

    function bind() {
        bindTabs();

        const item = current;
        const closeBtn = document.getElementById("inspClose");
        if (closeBtn) {
            closeBtn.addEventListener("click", () => {
                // Explicit dismiss clears the ACTIVE selection, so the card and the bulk
                // bar never disagree. With several items selected this falls back to
                // showing the next one rather than closing outright.
                if (typeof BulkDownload !== "undefined" && item) BulkDownload.toggle(item.relPath, false);
                else close();
            });
        }

        // Same server archive as the bulk bar: every selected file, scoped to this folder.
        const zipBtn = document.getElementById("inspZip");
        if (zipBtn && typeof BulkDownload !== "undefined") {
            // The indicator loops only while the archive is being built; aria-busy
            // and :disabled keep that state legible when a tier or reduced motion
            // suppresses the loop (motion-contract).
            zipBtn.addEventListener("click", async () => {
                zipBtn.disabled = true;
                zipBtn.classList.add("is-busy");
                zipBtn.setAttribute("aria-busy", "true");
                try { await BulkDownload.downloadZip(); }
                finally {
                    zipBtn.disabled = false;
                    zipBtn.classList.remove("is-busy");
                    zipBtn.removeAttribute("aria-busy");
                }
            });
        }

        const verifyBtn = document.getElementById("inspVerify");
        if (verifyBtn) verifyBtn.addEventListener("click", () => verify(item));

        const copyDigest = document.getElementById("inspCopyDigest");
        if (copyDigest) copyDigest.addEventListener("click", () => { if (digest) copyText(digest, "inspCopyDigest"); });

        const copyCurl = document.getElementById("inspCopyCurl");
        if (copyCurl) copyCurl.addEventListener("click", () => copyText(fetchSnippet(item), "inspCopyCurl"));
    }

    /* ── PUBLIC ───────────────────────────────────────────────────────────── */

    /**
     * @brief Binds the inspector for one page render and subscribes to selection.
     */
    function mount() {
        close();
        if (typeof BulkDownload === "undefined") return;

        BulkDownload.onChange(() => {
            if (typeof BulkDownload === "undefined") return;
            const items = BulkDownload.selectedItems();
            if (items.length === 0) { close(); return; }

            // Keep showing the current item when it is still selected — otherwise a
            // second selection would yank the card back to whichever item is first.
            const stillThere = current && items.find(i => i.relPath === current.relPath);
            setItems(items, stillThere || items[0]);
        });

        // The card is built at render time and holds no data-i18n nodes, so a language
        // switch re-renders it in place rather than leaving stale-language text behind.
        document.addEventListener("i18n:changed", () => refresh());
    }

    return { mount, close, isOpen: () => !!current };
})();

export { FileInspector };