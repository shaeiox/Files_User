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

// ES module, imported by router.js when its route is entered (ui-craft-elevation 5.2).
const BrowseIcons = (function () {
    'use strict';

    /** @type {Object<string,string>} Icon name → inner SVG markup (no <svg> wrapper). */
    const PATHS = {
        /* ── items ─────────────────────────────────────────────────────────── */
        folder_special: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/><path d="m12 10.6.92 1.87 2.06.3-1.49 1.45.35 2.05L12 15.22l-1.84.97.35-2.05L8.98 12.7l2.06-.3z"/>',
        data_object: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',

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

    /* ── file-type icons ────────────────────────────────────────────────────
       Phosphor duotone, vendored as one same-origin sprite (assets/icon/phosphor,
       MIT) — one cached request, no CDN, satisfies CSP `default-src 'self'`. */
    const SPRITE = '/assets/icon/phosphor/file-icons.svg';

    /** @type {Array<[string, string, RegExp]>} kind → sprite symbol, matched on extension. */
    const KINDS = [
        ['archive', 'file-zip', /^(zip|tar|gz|tgz|xz|txz|bz2|tbz2|7z|rar|zst|lz4|cab)$/],
        ['disk', 'disc', /^(iso|img|qcow2|vmdk|vdi|vhdx?|ova|ovf|raw)$/],
        ['package', 'package', /^(rpm|deb|apk|msi|exe|pkg|dmg|appimage|snap|jar|whl)$/],
        ['code', 'file-code', /^(js|mjs|ts|py|sh|bash|ps1|bat|json|ya?ml|xml|toml|ini|conf|cfg|env|html?|css|sql|go|rs|c|h|cpp|java)$/],
        ['secure', 'file-lock', /^(sha\d*|sha\d+sum|md5|sig|asc|gpg|pgp|pem|crt|cer|key|pub|p12|pfx)$/],
        ['pdf', 'file-pdf', /^pdf$/],
        ['doc', 'file-doc', /^(docx?|odt|rtf)$/],
        ['sheet', 'file-xls', /^(xlsx?|ods|csv|tsv)$/],
        ['image', 'file-image', /^(png|jpe?g|gif|webp|svg|bmp|ico|avif|tiff?)$/],
        ['video', 'file-video', /^(mp4|mkv|mov|avi|webm|wmv|m4v)$/],
        ['audio', 'file-audio', /^(mp3|wav|flac|ogg|m4a|aac|opus)$/],
        ['text', 'file-text', /^(txt|log|md|rst|nfo|readme)$/]
    ];

    /**
     * @brief Classifies a Browse item into a coarse kind ("folder", "archive", "disk", …, "file").
     * @param   {object} item  Browse-normalized item ({ type, name }).
     * @returns {{kind: string, symbol: string}}
     */
    function kindOf(item) {
        if (!item || item.type === "directory") return { kind: 'folder', symbol: 'folder' };
        const m = /\.([a-z0-9]+)$/i.exec(item.name || '');
        const ext = m ? m[1].toLowerCase() : '';
        for (const [kind, symbol, re] of KINDS) if (re.test(ext)) return { kind, symbol };
        return { kind: 'file', symbol: 'file' };
    }

    /**
     * @brief Picks a file-type icon for a normalized Browse item.
     * @param   {object} item  Browse-normalized item ({ type, name }).
     * @param   {number} [size=18]
     * @param   {boolean} [open=false]  Use the open-folder glyph for directories.
     * @returns {string}  `<svg>` referencing the vendored sprite; `data-kind` drives tint.
     */
    function forItem(item, size = 18, open = false) {
        const { kind, symbol } = kindOf(item);
        const id = open && kind === 'folder' ? 'folder-open' : symbol;
        return `<svg class="ficon" data-kind="${kind}" width="${size}" height="${size}" fill="currentColor" ` +
            `aria-hidden="true" focusable="false"><use href="${SPRITE}#${id}"/></svg>`;
    }

    return { get, has, forItem, kindOf, names: () => Object.keys(PATHS) };
})();

export { BrowseIcons };