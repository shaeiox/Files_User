/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @file        file-actions.js
 * @module      FileActions
 * @brief       Dedicated per-item File Action controls (Download) for Browse rows.
 *
 * @description
 * Dedicated File Actions module. It renders the independent, dedicated action controls for a
 * single Browse item as an HTML string. The Browse Page only places this output into each row;
 * all File Action knowledge lives here.
 *
 * ── OWNERSHIP: WHAT THIS MODULE OWNS ──────────────────────────────────────────
 * Every concern that is specific to a dedicated File Action is owned here, and only here:
 *   - Action definitions            — the flat `ACTIONS` list ({ id, appliesTo, render })
 *   - Action applicability          — which items an action applies to, from `item.type`
 *   - Action labels                 — visible text and `aria-label` / `title` composition
 *   - Action targets / URLs         — created ONLY through `ResourceService` (see below)
 *   - Action attributes             — `class`, `href`, `data-file`
 *   - Action accessibility          — accessible naming and decorative-SVG hiding
 *   - Action SVG / icon rendering   — the inline action icon markup
 *   - Action rendering              — the `.f-actions` container and control assembly
 *   - The download guard            — one delegated handler for every download link in the
 *     app (`a[data-file]`) and every locked entry (`[data-locked]`), see `bindGuard()`
 *
 * ── OWNERSHIP: WHAT THIS MODULE DOES *NOT* OWN ─────────────────────────────────
 * The following are BrowsePage-owned and deliberately stay in `assets/js/browse.js`. The
 * primary Browse icon is *navigation UI*, not a File Action, even though it is rendered with
 * an action-shaped icon. Do not move any of these into this module:
 *   - BrowsePage's primary icon navigation target  (`.f-icon-link`, `svgIcon()`, and the
 *     `btnOpen` / `btnDownload` verb selection that labels it)
 *   - BrowsePage's name navigation target         (`.f-link`)
 *   - BrowsePage-specific row rendering           (badge, modified, size cells, and the
 *     `href` / `linkAttr` computation shared by the icon and name targets)
 *   - Generic / shared helpers                    (e.g. HTML escaping). This module keeps its
 *     own private copy; that duplication is accepted and is not a split-ownership defect.
 *     Do not relocate it here or import BrowsePage's copy — that would invert the intended
 *     dependency direction for no action-behavior gain.
 *
 * ── URL CONSTRUCTION ───────────────────────────────────────────────────────────
 * `ResourceService` (resource-service.js) remains the ONLY URL construction primitive.
 * This module never assembles `"/api/download/"` or `"/browse/"` strings itself, and no URL
 * logic is duplicated here or in the Browse Page row construction.
 *
 * ── PRESERVED ITEM BEHAVIOR ────────────────────────────────────────────────────
 * Directory items: the primary icon and the name both navigate into the directory, and the
 *   directory has NO dedicated File Action — `render()` still emits an empty `.f-actions`
 *   container so the row keeps a uniform child count.
 * File items: the dedicated Download action below remains present and unchanged.
 *   A directory-scoped File Action is deliberately not modeled; the primary icon already
 *   provides that navigation, so re-adding one would duplicate a target.
 *
 * Key Responsibilities:
 *   - Maintain the flat action definition list (id, appliesTo, render).
 *   - Decide action applicability from the existing item `type` field only.
 *   - Render the `.f-actions` container + controls (`href`, `data-file`, `title`, `aria-label`,
 *     inline SVG, escaping).
 *   - Produce action hrefs exclusively via `ResourceService` primitives.
 *
 * Dependencies:
 *   - ResourceService (resource-service.js)
 *   - getDict() (from i18n engine) — supplied per call as `d`
 *
 * @author      ShaiyaAzizi
 * @version     1.0.0
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const FileActions = (function () {
    'use strict';

    /**
     * @brief Sanitizes strings to prevent XSS when setting innerHTML.
     */
    function escapeHtml(str) {
        return String(str || "").replace(/[&<>'"]/g, tag => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[tag]));
    }

    const ACTIONS = [
        {
            id: "download",
            appliesTo: (item) => item.type === "file" && !item.locked && !item.viewOnly,
            render: (item, d) => {
                const label = escapeHtml(((d && d.btnDownload) || "Download") + " " + (item.name || ""));
                const href = escapeHtml(ResourceService.downloadHref(item.relPath));
                return `<a class="f-action" href="${href}" data-file="true" title="${label}" aria-label="${label}">` +
                    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
                    `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>` +
                    `</svg></a>`;
            }
        },
        {
            // A locked entry (admin policy) offers sign-in instead of a download.
            id: "sign-in",
            appliesTo: (item) => item.locked === true,
            render: (item, d) => {
                const label = escapeHtml(((d && d.signInToOpen) || "Sign in to open") + " " + (item.name || ""));
                return `<a class="f-action f-action-locked" href="#" data-locked="true" title="${label}" aria-label="${label}">` +
                    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
                    `<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>` +
                    `</svg>` + `</a>`;
            }
        }
    ];

    /**
     * @brief Renders the actions container markup for one item.
     * @param   {object} item Browse-normalized item ({ name, relPath, type, size, modified }).
     * @param   {object} [d]   i18n dictionary.
     * @returns {string} `.f-actions` container HTML.
     */
    function render(item, d) {
        if (!item) return '<div class="f-actions"></div>';
        const controls = ACTIONS
            .filter((action) => action.appliesTo(item))
            .map((action) => action.render(item, d))
            .join("");
        return `<div class="f-actions">${controls}</div>`;
    }

    /* ── DOWNLOAD GUARD ───────────────────────────────────────────────────── */

    /** Re-renders the current page (after sign-in, or when an item has gone away). */
    function refreshView() {
        if (typeof Router !== "undefined" && typeof Router.refresh === "function") Router.refresh();
    }

    /** Opens the existing sign-in modal; the current page re-renders after a successful sign-in. */
    function signIn(onDone) {
        const done = typeof onDone === "function" ? onDone : refreshView;
        if (typeof HomePage !== "undefined" && typeof HomePage.showLoginModal === "function") HomePage.showLoginModal(done);
        else if (typeof window.triggerAuthModal === "function") window.triggerAuthModal(done);
    }

    /**
     * @brief HEAD-probes a download URL without leaving the page.
     * @returns {Promise<"ok"|"locked"|"missing"|"error">}  `locked` = sign-in needed (401),
     *          `missing` = gone or not visible to this caller (404).
     */
    async function preflight(href) {
        try {
            const res = await fetch(href, { method: "HEAD", credentials: "same-origin", cache: "no-store" });
            if (res.ok) return "ok";
            if (res.status === 401) return "locked";
            if (res.status === 404) return "missing";
            return "error";
        } catch {
            return "unreachable";
        }
    }

    /** Hands a URL to the browser as a download through a transient anchor. */
    function startDownload(href, fileName) {
        const a = document.createElement("a");
        a.href = href;
        a.setAttribute("data-file", "true"); // keeps the SPA router out; the guard ignores scripted clicks
        if (fileName) a.download = fileName;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        // Removing the anchor synchronously would abort the pending download.
        setTimeout(() => a.remove(), 0);
    }

    /**
     * @brief Downloads a URL only after the server confirms it may be served.
     * @details 401 opens sign-in, 404 refreshes the view (the item is gone or no longer
     *          visible), anything else is reported. The browser never lands on a JSON
     *          error page.
     */
    async function download(href, fileName, control) {
        const outcome = await preflight(href);
        if (outcome === "ok") return startDownload(href, fileName);
        if (outcome === "locked") return signIn();
        if (outcome === "missing") return refreshView();
        report(control, outcome);
    }

    /**
     * In-place failure report (ui-craft-elevation 1.2 / 6.7): a localised
     * role="alert" note beside the control that started the download, instead
     * of a blocking browser dialog. It clears on the next attempt.
     */
    function report(control, outcome) {
        const d = typeof window.getDict === "function" ? window.getDict() : {};
        const msg = outcome === "unreachable"
            ? (d.downloadUnreachable || "The server could not be reached. Check your connection and try again.")
            : (d.downloadUnavailable || "The download is temporarily unavailable. Try again shortly.");
        const note = document.createElement("span");
        note.className = "dl-error";
        note.setAttribute("role", "alert");
        note.textContent = msg;
        if (control && control.isConnected) control.insertAdjacentElement("afterend", note);
        else document.body.appendChild(note);
        setTimeout(() => note.remove(), 6000);
    }

    /**
     * @brief Binds the one delegated download guard for the whole app (capture phase,
     *        so it runs before the SPA router). Only real user clicks are handled;
     *        scripted clicks from startDownload() and BulkDownload pass through.
     */
    function bindGuard() {
        document.addEventListener("click", (e) => {
            if (!e.isTrusted || e.button !== 0) return;
            if (e.target.closest("[data-locked]")) {
                e.preventDefault();
                e.stopPropagation();
                signIn();
                return;
            }
            const link = e.target.closest("a[data-file]");
            if (!link || !link.href) return;
            e.preventDefault();
            e.stopPropagation();
            if (link.getAttribute("aria-busy") === "true") return;
            // In-progress state on the initiating control; the rest of the UI
            // stays interactive and the control returns to rest when done.
            const next = link.nextElementSibling;
            if (next && next.classList.contains("dl-error")) next.remove();
            link.setAttribute("aria-busy", "true");
            download(link.href, link.getAttribute("download") || "", link)
                .finally(() => link.removeAttribute("aria-busy"));
        }, true);
    }

    /**
     * @brief Navbar sign-in / sign-out toggle plus the version label, both fed by
     *        /api/auth/status. Hidden when auth is disabled on the server.
     */
    function bindNavAuth() {
        const btn = document.getElementById("authBtn");
        if (!btn || typeof ResourceService === "undefined") return;
        let status = null;

        const paint = () => {
            const d = typeof window.getDict === "function" ? window.getDict() : {};
            const on = !!(status && status.enabled && status.authenticated);
            const name = on && status.user && status.user.username;
            const label = on
                ? (d.btnSignOut || "Sign Out") + (name ? " · " + name : "")
                : (d.btnSignIn || "Sign In");
            btn.hidden = !(status && status.enabled);
            btn.classList.toggle("is-auth", on);
            btn.title = label;
            btn.setAttribute("aria-label", label);

            const v = document.getElementById("appVersion");
            if (v && status && status.version) { v.textContent = "v" + status.version; v.hidden = false; }
        };

        const sync = () => ResourceService.checkAuthStatus()
            .then((s) => { status = s; paint(); })
            .catch(() => { /* status unavailable: leave the button as it is */ });

        btn.addEventListener("click", async () => {
            if (!(status && status.authenticated)) return signIn();
            btn.disabled = true;
            try { await ResourceService.logout(); refreshView(); }
            finally { btn.disabled = false; }
        });
        document.addEventListener("auth:changed", sync);
        document.addEventListener("i18n:changed", paint);
        sync();
    }

    bindGuard();
    bindNavAuth();

    return { render, preflight, download, signIn };
})();
