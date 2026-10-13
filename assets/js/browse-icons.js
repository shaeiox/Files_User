/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @file        browse-icons.js
 * @module      BrowseIcons
 * @brief       Inline SVG icon set for the Browse page and its inspector/bulk panels.
 *
 * @description
 * Replaces the Material Symbols glyphs used by the `template/browse/code.html` mockup.
 * Those glyphs require a remote font (`fonts.gstatic.com`), which the CSP in
 * `lib/http-utils.js` blocks via `font-src 'self' data:`. Every icon here is an
 * inline `<svg>` instead, so it inherits `currentColor`, themes automatically,
 * and adds no network request.
 *
 * Markup convention matches the pre-existing `svgIcon()` in `browse.js` and the
 * Download action in `file-actions.js`: 24×24 viewBox, no fill, 2px stroke, round
 * caps and joins, `aria-hidden` so decorative artwork never reaches an accessible
 * name.
 *
 * Deliberately absent — each removed with its feature, not by oversight:
 *   - `account_tree`        Split Tree View was deferred (no lazy-load contract).
 *   - `download_for_offline` archive download was removed (no archive concept).
 *   - `inventory_2`         archive total size was removed (no archive concept).
 *
 * Dependencies: none. Consumers: BrowsePage, FileInspector, BulkDownload.
 *
 * @author      ShaiyaAzizi
 * @version     1.0.0
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const BrowseIcons = (function () {
    'use strict';

    /** @type {Object<string,string>} Icon name → inner SVG markup (no <svg> wrapper). */
    const PATHS = {
        /* ── items ─────────────────────────────────────────────────────────── */
        folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2z"/>',
        file: '<path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M13 2v7h7"/>',
        folder_open: '<path d="M6 14l1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/>',
        folder_special: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/><path d="m12 10.6.92 1.87 2.06.3-1.49 1.45.35 2.05L12 15.22l-1.84.97.35-2.05L8.98 12.7l2.06-.3z"/>',
        description: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
        terminal: '<path d="m4 17 6-6-6-6"/><path d="M12 19h8"/>',
        draft: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
        data_object: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
        image: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
        sports_esports: '<path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/><path d="M6 11h4"/><path d="M8 9v4"/><path d="M15 12h.01"/><path d="M18 10h.01"/>',

        /* ── trust / verification (static labels only — never computed) ───── */
        verified: '<path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/><path d="m9 12 2 2 4-4"/>',
        security: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',

        /* ── actions ───────────────────────────────────────────────────────── */
        search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
        download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
        content_copy: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
        close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
        more_vert: '<circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>',
        expand_more: '<path d="m6 9 6 6 6-6"/>',
        arrow_downward: '<path d="M12 5v14"/><path d="m19 12-7 7-7-7"/>',

        /* ── view modes ────────────────────────────────────────────────────── */
        format_list_bulleted: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
        grid_view: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>'
    };

    /**
     * @brief Renders one icon as a complete inline `<svg>` element.
     * @param   {string} name  Icon key from PATHS.
     * @param   {number} [size=16]  Rendered width/height in px.
     * @returns {string}  SVG markup, or an empty string when the name is unknown.
     */
    function get(name, size = 16) {
        const body = PATHS[name];
        if (!body) return '';
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
            `stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ` +
            `aria-hidden="true" focusable="false">${body}</svg>`;
    }

    /** @brief Reports whether a name exists, so callers can feature-detect. */
    function has(name) {
        return Object.prototype.hasOwnProperty.call(PATHS, name);
    }

    /**
     * @brief Picks an item icon from a normalized Browse item's type and name.
     * @param   {object} item  Browse-normalized item ({ type, name }).
     * @param   {number} [size=18]
     * @returns {string}
     */
    function forItem(item, size = 18) {
        if (!item || item.type === "directory") return get("folder", size);
        return get("file", size);
    }

    return { get, has, forItem, names: () => Object.keys(PATHS) };
})();

if (typeof window !== "undefined") window.BrowseIcons = BrowseIcons;