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
            appliesTo: (item) => item.type === "file",
            render: (item, d) => {
                const label = escapeHtml(((d && d.btnDownload) || "Download") + " " + (item.name || ""));
                const href = escapeHtml(ResourceService.downloadHref(item.relPath));
                return `<a class="f-action" href="${href}" data-file="true" title="${label}" aria-label="${label}">` +
                    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
                    `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>` +
                    `</svg></a>`;
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

    return { render };
})();
