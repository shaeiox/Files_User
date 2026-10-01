/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @file        file-actions.js
 * @module      FileActions
 * @brief       Per-item action controls (Open, Download) for Browse rows.
 *
 * @description
 * Dedicated File Actions module: renders the independent action controls for a
 * single Browse item as an HTML string. The Browse Page only places this output
 * into each row; all action knowledge lives here.
 *
 * Key Responsibilities:
 *   - Maintain the flat action definition list (id, appliesTo, render).
 *   - Decide action applicability from the existing item `type` field only.
 *   - Render the `.f-actions` container + controls (`href`, `data-file`,
 *     `title`, `aria-label`, inline SVG, escaping).
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
            id: "open",
            appliesTo: (item) => item.type === "directory",
            render: (item, d) => {
                const label = escapeHtml(((d && d.btnOpen) || "Open") + " " + (item.name || ""));
                const href = escapeHtml(ResourceService.browseHref(item.relPath));
                return `<a class="f-action" href="${href}" title="${label}" aria-label="${label}">` +
                    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
                    `<path d="M6 14l1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>` +
                    `</svg></a>`;
            }
        },
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
