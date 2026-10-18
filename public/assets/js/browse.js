/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @file        browse.js
 * @module      BrowsePage
 * @brief       Enterprise File Browser Renderer for CloudAvid File Portal.
 *
 * @description
 * Handles the rendering, navigation, and data manipulation for the file browser
 * interface. This module operates as a Single Page Application (SPA) component.
 *
 * Key Responsibilities:
 *   - Fetches directory contents via `ResourceService`.
 *   - Manages an in-memory Data Pipeline: Search -> Extension -> Type -> Sort -> Render.
 *   - Handles in-page 404 error states without redirecting to a hard 404 page.
 *   - Renders Breadcrumbs for hierarchical navigation.
 *   - Supports Grid and List views with `localStorage` persistence.
 *   - Renders the context header, toolbar, file table, and inspector column.
 *
 * Row structure contract
 * ---------------------
 * Each data row emits exactly SEVEN cells so the header and every row share one
 * track count: [1] select, [2] icon, [3] name, [4] type, [5] modified, [6] size,
 * [7] FileActions. Cells 4-6 are the ones hidden responsively, so the
 * `nth-child(4|5|6)` rules in browse.css address exactly those columns.
 *
 * The six pre-existing cells (icon, name, type, modified, size, FileActions) keep
 * their original relative order and quantity per the `file-actions` capability;
 * the select cell is a new leading cell and does not displace them.
 *
 * Dependencies:
 *   - ResourceService (resource-service.js)
 *   - BrowseIcons (browse-icons.js)
 *   - getDict(), getLang() (from i18n/theme engine)
 *
 * @author      ShaiyaAzizi
 * @version     3.0.0
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ES module, imported by router.js when its route is entered (ui-craft-elevation 5.2).
import { BrowseIcons } from "./browse-icons.js?v=4.5.2";
import { BulkDownload } from "./bulk-download.js?v=4.5.2";
import { FileInspector } from "./file-inspector.js?v=4.5.2";
import { BrowseTree } from "./browse-tree.js?v=4.5.2";
import { PaneResize } from "./pane-resize.js?v=4.5.2";
import { mapEntry, isHidden, toEntries } from "./browse-entries.js?v=4.5.2";

const BrowsePage = (function () {
    'use strict';

    /* ─────────────────────────────────────────────────────────────────────────────
     * INTERNAL STATE
     * ───────────────────────────────────────────────────────────────────────────── */

    /** @type {Array} Raw directory contents fetched from the API */
    let allFiles = [];

    /** @type {string} Current absolute path within the SPA */
    let currentPath = "/";

    /** @type {string} Active item type filter ('all' | 'directory' | 'file') */
    let activeType = "all";

    /** @type {string} Active sorting strategy ('name-asc' | 'date-desc' etc.) */
    let activeSort = "name-asc";

    /** @type {string} Current local search query (case-insensitive) */
    let searchQuery = "";

    /** @type {Array|null} Recursive search hits under the current folder (null = not searching) */
    let searchResults = null;

    /** @type {number} Guards against out-of-order search responses */
    let searchSeq = 0;

    /** @type {string} Active extension chip ('' means no extension filter) */
    let activeExt = "";

    /** @type {string|null} File to select once its folder's rows render (tree file activation) */
    let pendingSelect = null;

    /** @type {number} Depth of the previous folder, for the centre pane's entrance direction */
    let lastDepth = -1;

    /** Pane defaults and limits (browse-explorer: resizable panes). */
    const TREE_DEF = 272, TREE_MIN = 200, RAIL_W = 56, CENTRE_MIN = 480, HANDLE_W = 16;
    const INSP_DEF = 340, INSP_MIN = 300, INSP_MAX = 520;

    /** "/browse/a%20b/c/" → "a b/c": decoded, so it matches the server's entry paths. */
    const relOf = (p) => p.replace(/^\/browse\/?/, "").split("/").filter(Boolean)
        .map(s => { try { return decodeURIComponent(s); } catch { return s; } }).join("/");
    const dictNow = () => (typeof window.getDict === 'function' ? window.getDict() : getDict());

    /** Embedded on the home page: folder hops stay in place; "Full screen" opens the route. */
    let embedded = false;
    let host = null;

    /** @brief Opens folder `rel`: in place when embedded, through the router otherwise. */
    function go(rel) {
        if (embedded) render(host, ResourceService.browseHref(rel), { embedded: true });
        else Router.navigate(ResourceService.browseHref(rel));
    }

    /* ═══════════════════════════════════════════════════════════════════════════════
     * MAIN RENDERER
     * ═══════════════════════════════════════════════════════════════════════════════ */

    /**
     * @brief   Initializes and renders the Browse page shell.
     * @param   {HTMLElement} container  The DOM element to render into.
     * @param   {string} path            The requested browse path (e.g. "/browse/el9").
     * @param   {{embedded?: boolean}} [opts]  embedded: rendered inside the home page.
     */
    function render(container, path, opts = {}) {
        const d = typeof window.getDict === 'function' ? window.getDict() : getDict();
        embedded = !!opts.embedded;
        host = container;

        // 1. Reset state for the new path navigation
        currentPath = path.endsWith("/") ? path : path + "/";
        if (!currentPath.startsWith("/browse")) {
            currentPath = "/browse/";
        }
        activeType = "all";
        activeSort = "name-asc";
        searchQuery = "";
        searchResults = null;
        searchSeq++;
        activeExt = "";

        if (!embedded) document.title = d.browseTitle || "Downloads • CloudAvid";

        // Entrance direction for the centre rows: deeper enters from the reading end.
        const depth = relOf(currentPath).split("/").filter(Boolean).length;
        const enterDir = lastDepth < 0 || depth === lastDepth ? "" : depth > lastDepth ? "end" : "start";
        lastDepth = depth;

        // 2. Centre pane (context header, toolbar, table + inspector). The tree pane
        //    beside it is built once and survives folder navigation.
        const centre = `
      <div class="browse-layout">

        <!-- CONTEXT HEADER -->
        <header class="browse-ctx">
          <div class="browse-ctx-top">
            <nav class="crumbs" id="breadcrumb" aria-label="${d.breadcrumb || "Breadcrumb"}"></nav>
            <button type="button" class="browse-full-btn" id="browseFullBtn"
              aria-label="${embedded ? (d.fullScreen || "Full screen") : (d.exitFullScreen || "Exit full screen")}"
              title="${embedded ? (d.fullScreen || "Full screen") : (d.exitFullScreen || "Exit full screen")}">
              ${embedded
                ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>'
                : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>'}
              <span>${embedded ? (d.fullScreen || "Full screen") : (d.exitFullScreen || "Exit full screen")}</span>
            </button>
          </div>
          <div class="browse-title-row">
            <div class="browse-title-left">
              <div class="browse-name-line">
                <h1 id="folderName">—</h1>
                <span class="ctx-badge" id="ctxBadge">
                  <span class="ctx-badge-dot" aria-hidden="true"></span>
                  ${d.ctxSigned || "Signed by CloudAvid Core"}
                </span>
              </div>
              <div class="browse-stats">
                <span class="stat-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2z"/></svg>
                  <span class="stat-val" id="folderCount">0</span>
                  <span>${d.folders || "folders"}</span>
                </span>
                <span class="stat-dot">·</span>
                <span class="stat-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M13 2v7h7"/></svg>
                  <span class="stat-val" id="fileCount">0</span>
                  <span>${d.files || "files"}</span>
                </span>
              </div>
            </div>
          </div>
        </header>

        <!-- TOOLBAR -->
        <div class="browse-toolbar" id="browseControls">
          <div class="input-wrap browse-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input id="localSearchInput" type="text" autocomplete="off" placeholder="${d.searchFolderPh || 'Search folder...'}" aria-label="${d.searchFolderPh || 'Search in folder'}" />
            <kbd class="search-kbd" aria-hidden="true">/</kbd>
          </div>

          <div class="browse-chips" id="extChips" role="group" aria-label="${d.filters || "Filters"}"></div>

          <div class="browse-toolbar-right">
            <div class="filter-dropdown-wrap" id="typeFilterWrap">
              <button class="filter-pill" type="button" aria-haspopup="true">
                <span class="filter-value" data-val="all">${d.allTypes || "All Types"}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="filter-dropdown-menu">
                <button class="filter-option active" data-val="all" type="button">${d.allTypes || "All Types"}</button>
                <button class="filter-option" data-val="directory" type="button">${d.folders || "Folders"}</button>
                <button class="filter-option" data-val="file" type="button">${d.files || "Files"}</button>
              </div>
            </div>

            <div class="filter-dropdown-wrap" id="sortFilterWrap">
              <button class="filter-pill" type="button" aria-haspopup="true">
                <span class="filter-value" data-val="name-asc">${d.sortName || "Name (A-Z)"}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="filter-dropdown-menu">
                <button class="filter-option active" data-val="name-asc" type="button">${d.sortName || "Name (A-Z)"}</button>
                <button class="filter-option" data-val="name-desc" type="button">${d.sortNameDesc || "Name (Z-A)"}</button>
                <button class="filter-option" data-val="date-desc" type="button">${d.sortLatest || "Newest First"}</button>
                <button class="filter-option" data-val="date-asc" type="button">${d.sortOldest || "Oldest First"}</button>
                <button class="filter-option" data-val="size-desc" type="button">${d.sortSize || "Largest First"}</button>
              </div>
            </div>

            <div class="view-toggle" role="tablist" aria-label="${d.viewMode || "View mode"}">
              <button class="vt-btn active" id="viewList" aria-label="${d.viewList || "List view"}" title="${d.viewList || "List view"}" type="button">
                ${BrowseIcons.get("format_list_bulleted", 16)}
              </button>
              <button class="vt-btn" id="viewGrid" aria-label="${d.viewGrid || "Grid view"}" title="${d.viewGrid || "Grid view"}" type="button">
                ${BrowseIcons.get("grid_view", 16)}
              </button>
            </div>
          </div>
        </div>

        <!-- BODY: table + inspector column -->
        <div class="browse-body" id="browseBody">
          <!-- data-lenis-prevent: the table and the card scroll themselves; smooth
               page scrolling (Lenis) must not take their wheel events. Below 768px
               browse.css restores vertical scroll chaining so touch can still
               page-scroll over the listing. -->
          <section class="file-tbl" id="tableContainer" data-lenis-prevent>
            <div class="trow thead">
              <div class="c-select"><input type="checkbox" id="selectAll" aria-label="${d.selectAll || "Select all"}" /></div>
              <div class="c-icon"></div>
              <div class="c-name">${d.name || "Name"}</div>
              <div class="c-type">${d.type || "Type"}</div>
              <div class="c-mod">${d.modified || "Modified"}</div>
              <div class="c-size">${d.size || "Size"}</div>
              <div class="c-act"></div>
            </div>
            <div id="rows"></div>
            <div class="empty-box" id="empty" style="display:none"></div>

            <!-- BULK BAR — selection summary + bulk actions. Hidden while nothing is
                 selected, so bulk controls can never act on an empty selection. -->
            <div class="browse-bulkbar" id="bulkBar" hidden>
              <div class="bulk-info">
                <span class="bulk-count" id="bulkCount">—</span>
                <span class="bulk-dot">·</span>
                <span class="bulk-size" id="bulkSize">—</span>
                <span class="bulk-status" id="bulkStatus"></span>
              </div>
              <div class="bulk-actions">
                <button class="bulk-btn bulk-btn-primary" id="bulkDownload" type="button" disabled>
                  ${BrowseIcons.get("download", 14)}
                  <span class="bulk-btn-text">${d.bulkDownload || "Download Selected"}</span>
                </button>
                <button class="bulk-btn" id="bulkZip" type="button" disabled title="${d.bulkZipTitle || "Download as ZIP"}">
                  ${BrowseIcons.get("data_object", 14)}
                  <span class="bulk-btn-text">${d.bulkZip || "Download ZIP"}</span>
                </button>
                <button class="bulk-btn" id="bulkCopy" type="button" disabled>
                  ${BrowseIcons.get("content_copy", 14)}
                  <span class="bulk-btn-text">${d.bulkCopy || "Copy File List"}</span>
                </button>
              </div>
            </div>
          </section>

          <div class="pane-handle insp-handle" id="inspHandle" role="separator" tabindex="0"
            aria-orientation="vertical" aria-controls="inspector" aria-label="${d.resizeInspector || "Resize details panel"}"></div>
          <aside class="browse-inspector" id="inspector" aria-live="polite" data-lenis-prevent></aside>
        </div>

      </div>
    `;

        // Reuse only this container's own shell: on Home → Browse the old home
        // markup (with its embedded shell) is still inside #app.
        const shell = container.querySelector(":scope > .browse-split");
        let centreEl;
        if (shell && shell.classList.contains("is-embedded") === embedded && BrowseTree.isMounted()) {
            centreEl = shell.querySelector("#browseCenter");
            centreEl.innerHTML = centre;
        } else {
            container.innerHTML = shellHtml(d, centre);
            centreEl = container.querySelector("#browseCenter");
            mountShell(container.querySelector(".browse-split"));
        }
        centreEl.dataset.enter = enterDir;
        bindFullScreenButton();
        bindInspectorHandle();

        // 3. Initialize components
        buildCrumbs();
        // A new directory is a different item universe, so the previous selection
        // is dropped on every navigation (BulkDownload owns the selection set).
        if (typeof BulkDownload !== "undefined") {
            BulkDownload.clear();
            BulkDownload.setDirectory(relOf(currentPath));
        }
        bindEvents();
        if (typeof BulkDownload !== "undefined") BulkDownload.mount();
        if (typeof FileInspector !== "undefined") FileInspector.mount();
        renderSkeletons();
        // The table's listing goes first so the tree reuses the same request.
        fetchList();
        BrowseTree.setCurrent(relOf(currentPath));
    }

    /* ═══════════════════════════════════════════════════════════════════════════════
     * SPLIT SHELL — tree pane · handle · centre pane (browse-explorer)
     * ═══════════════════════════════════════════════════════════════════════════════ */

    function shellHtml(d, centre) {
        const saved = PaneResize.load();
        return `
      <div class="browse-split${saved.collapsed ? " is-collapsed" : ""}${embedded ? " is-embedded" : ""}" style="--tree-w:${Number(saved.tree) || TREE_DEF}px">
        <aside class="browse-tree-pane" id="treePane" aria-label="${d.treeTitle || "Folders"}" data-i18n-aria="treeTitle"></aside>
        <div class="pane-handle tree-handle" id="treeHandle" role="separator" tabindex="0"
          aria-orientation="vertical" aria-controls="treePane" aria-label="${d.resizeTree || "Resize folders panel"}" data-i18n-aria="resizeTree"></div>
        <div class="browse-center" id="browseCenter">${centre}</div>
      </div>`;
    }

    /** @brief One-time wiring of the persistent half of the shell. */
    function mountShell(split) {
        const pane = split.querySelector("#treePane");

        BrowseTree.mount(pane, {
            onActivate: onTreeActivate,
            onCollapse: () => setCollapsed(!split.classList.contains("is-collapsed")),
        });
        syncCollapseBtn(split);

        const tree = PaneResize.attach(split.querySelector("#treeHandle"), {
            host: split, prop: "--tree-w", key: "tree", def: TREE_DEF,
            range: () => {
                const w = split.clientWidth;
                const insp = document.querySelector("#browseBody.has-inspector") ? (PaneResize.load().insp || INSP_DEF) + HANDLE_W : 0;
                return [TREE_MIN, Math.min(w * 0.4, w - CENTRE_MIN - HANDLE_W - insp)];
            },
        });
        // Widths stored on a large monitor are re-clamped on a smaller one.
        window.addEventListener("resize", () => { if (split.isConnected) tree.set(tree.get()); });

        // Embedded on the home page: every in-pane folder link (table rows, breadcrumb,
        // tree title) opens in place instead of leaving the page. Bubble phase on the
        // shell runs before the router's document listener, which this stops.
        split.addEventListener("click", (e) => {
            if (!split.classList.contains("is-embedded") || e.defaultPrevented) return;
            const a = e.target.closest("a[href]");
            if (!a || a.hasAttribute("data-file") || a.target === "_blank") return;
            const url = new URL(a.href, location.origin);
            if (url.origin !== location.origin || !(url.pathname === "/" || url.pathname.startsWith("/browse"))) return;
            e.preventDefault();
            e.stopPropagation();
            go(relOf(url.pathname));
        });
    }

    function bindFullScreenButton() {
        const btn = document.getElementById("browseFullBtn");
        if (!btn) return;
        // Home → full Browse route; the router's View Transition morphs the shell
        // (shared view-transition-name) up into place. Exit morphs it back.
        btn.addEventListener("click", () => Router.navigate(embedded ? ResourceService.browseHref(relOf(currentPath)) : "/"));
    }

    function setCollapsed(on) {
        const split = document.querySelector(".browse-split");
        if (!split) return;
        split.classList.toggle("is-collapsed", on);
        PaneResize.save({ collapsed: on });
        syncCollapseBtn(split);
    }

    function syncCollapseBtn(split) {
        const d = dictNow();
        const btn = split.querySelector("#treeCollapse");
        if (!btn) return;
        const collapsed = split.classList.contains("is-collapsed");
        const label = collapsed ? (d.treeExpand || "Show folders") : (d.treeCollapse || "Collapse folders");
        btn.setAttribute("aria-expanded", String(!collapsed));
        btn.setAttribute("aria-label", label);
        btn.title = label;
    }

    /** @brief Tree activation: folders navigate, files open their folder and select the file. */
    function onTreeActivate(entry) {
        if (entry.locked) {
            FileActions.signIn(() => entry.type === "directory" ? go(entry.relPath) : Router.refresh());
            return;
        }
        const folder = entry.type === "directory" ? entry.relPath
            : entry.relPath.includes("/") ? entry.relPath.slice(0, entry.relPath.lastIndexOf("/")) : "";
        if (entry.type === "file") pendingSelect = entry.relPath;
        if (folder === relOf(currentPath)) {
            if (pendingSelect) applyPendingSelect();
            return;
        }
        go(folder);
    }

    function applyPendingSelect() {
        const rel = pendingSelect;
        pendingSelect = null;
        if (!rel || typeof BulkDownload === "undefined") return;
        const row = [...document.querySelectorAll("#rows .trow")].find(r => r.dataset.rel === rel);
        if (!row) return;
        BulkDownload.clear();
        BulkDownload.toggle(rel, true);
        row.focus();
        row.scrollIntoView({ block: "nearest" });
    }

    /* ── Inspector handle (one per centre render; #browseBody is rebuilt) ── */

    function bindInspectorHandle() {
        const body = document.getElementById("browseBody");
        const handle = document.getElementById("inspHandle");
        if (!body || !handle) return;
        PaneResize.attach(handle, {
            host: body, prop: "--insp-w", key: "insp", def: INSP_DEF, trailing: true,
            range: () => [INSP_MIN, Math.max(INSP_MIN, Math.min(INSP_MAX, body.clientWidth - CENTRE_MIN - HANDLE_W))],
        });
    }

    /* ═══════════════════════════════════════════════════════════════════════════════
     * DATA FETCHING & ERROR HANDLING
     * ═══════════════════════════════════════════════════════════════════════════════ */

    /**
     * @brief   Fetches directory contents and delegates to the data pipeline.
     * @details Implements intelligent 404 handling. If the requested directory
     *          doesn't exist, it transforms the table into an in-page 404 state.
     */
    async function fetchList() {
        const d = typeof window.getDict === 'function' ? window.getDict() : getDict();
        const relPath = relOf(currentPath);

        try {
            if (typeof ResourceService === 'undefined') throw new Error("ResourceService missing");

            // Shared with the tree: one request per folder open, cached for both panes.
            const data = await BrowseTree.load(relPath, { force: true });
            if (relOf(currentPath) !== relPath) return; // navigated away meanwhile

            const authStatus = await ResourceService.checkAuthStatus();
            if (authStatus.enabled && authStatus.authenticated) {
                if (typeof IdleTimer !== "undefined") {
                    IdleTimer.start(30, async () => {
                        await ResourceService.logout();
                        fetchList();
                    });
                }
            } else {
                if (typeof IdleTimer !== "undefined") IdleTimer.stop();
            }

            allFiles = toEntries(data, relPath);

            renderChips(d);
            applyFiltersAndRender();
            applyPendingSelect();

        } catch (err) {
            console.error("[BrowsePage] Fetch Error:", err);
            const container = document.getElementById("tableContainer");
            const controls = document.getElementById("browseControls");

            if (!container) return;
            if (controls) controls.style.display = "none";
            // Collapse the two-column body so an error state is not boxed beside an
            // empty inspector column.
            const body = document.getElementById("browseBody");
            if (body) body.classList.add("is-error");

            if (err.status === 401 || err.code === "AUTH_REQUIRED") {
                container.innerHTML = `
                  <div class="locked-state">
                    <div class="locked-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </div>
                    <div class="locked-title">${d.authRequired || "Authentication Required"}</div>
                    <div class="locked-desc">${d.authRequiredDesc || "Access to this infrastructure path requires clearance."}</div>
                    <button class="btn btn-primary" id="browseAuthBtn">${d.btnAuth || "Authenticate to Access"}</button>
                  </div>
                `;

                // The locked state replaced the table shell, so fetchList() has nothing
                // to render into; signIn() re-renders the whole route after login.
                const btn = document.getElementById("browseAuthBtn");
                if (btn) btn.addEventListener("click", () => FileActions.signIn());
                return;
            }

            if (err.status === 404 || err.code === "NOT_FOUND") {
                container.innerHTML = `
                  <div class="resources-error is-notfound">
                    <div class="err-code">404</div>
                    <div class="err-title">${d.error404Title || "Directory Not Found"}</div>
                    <div class="err-desc">
                      ${d.error404Desc || "The requested path does not exist on CloudAvid infrastructure."}
                      <br><code class="mono">${escapeHtml(relPath)}</code>
                    </div>
                    <a href="/" class="btn btn-primary">${d.btnBackPortal || "Back to Downloads"}</a>
                  </div>
                `;
                return;
            }

            container.innerHTML = `
              <div class="resources-error">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <div class="err-inline">
                  <span class="err-inline-title">${d.errorServerLoad || "Failed to load directory."}</span>
                  <span class="err-inline-sub">${escapeHtml(err.message || d.errorServerSub || "Network or server error.")}</span>
                </div>
              </div>
            `;
        }
    }

    /* ═══════════════════════════════════════════════════════════════════════════════
     * DATA PIPELINE (Search -> Extension -> Type -> Sort -> Render)
     * ═══════════════════════════════════════════════════════════════════════════════ */

    /**
     * @brief   Extracts a lowercase extension from a filename, or '' when there is none.
     */
    function extOf(name) {
        const n = String(name || "");
        const i = n.lastIndexOf(".");
        // A leading dot is a hidden file, not an extension; isHidden() already drops those.
        return i > 0 ? n.slice(i).toLowerCase() : "";
    }

    /**
     * @brief   Renders extension filter chips from the loaded listing, with real counts.
     * @details Derived entirely from `allFiles`; no extra request. A directory with
     *          no files produces no chips because no extension exists to filter.
     */
    function renderChips(d) {
        const wrap = document.getElementById("extChips");
        if (!wrap) return;

        const counts = new Map();
        allFiles.filter(f => f.type === "file").forEach(f => {
            const e = extOf(f.name);
            if (e) counts.set(e, (counts.get(e) || 0) + 1);
        });

        const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

        wrap.innerHTML = `
      <button class="chip${activeExt === "" ? " active" : ""}" data-ext="" type="button">
        ${d.allTypes || "All"} <span class="chip-n">(${allFiles.length})</span>
      </button>
      ${sorted.map(([e, n]) => `
        <button class="chip${activeExt === e ? " active" : ""}" data-ext="${escapeHtml(e)}" type="button">
          ${escapeHtml(e)} <span class="chip-n">(${n})</span>
        </button>`).join("")}
    `;
    }

    /**
     * @brief   Applies current state constraints to the raw data and triggers render.
     */
    function applyFiltersAndRender() {
        const d = typeof window.getDict === 'function' ? window.getDict() : getDict();
        // 1. Search: recursive server hits when available, else filter this folder
        let filtered = searchResults ? [...searchResults] : [...allFiles];
        if (searchQuery && !searchResults) {
            filtered = filtered.filter(f => f.name.toLowerCase().includes(searchQuery));
        }

        // 2. Extension chip filter
        if (activeExt) {
            filtered = filtered.filter(f => f.type === "file" && extOf(f.name) === activeExt);
        }

        // 3. Type Filter
        if (activeType !== "all") {
            filtered = filtered.filter(f => f.type === activeType);
        }

        // 4. Visual Stats Update (Counts absolute available files, ignoring search)
        const dirsCount = allFiles.filter(f => f.type === "directory").length;
        const filesCount = allFiles.filter(f => f.type === "file").length;
        const fcEl = document.getElementById("folderCount");
        const flcEl = document.getElementById("fileCount");
        if (fcEl) fcEl.textContent = dirsCount;
        if (flcEl) flcEl.textContent = filesCount;

        // 5. Sorting Strategy
        filtered.sort((a, b) => {
            const isDirA = a.type === "directory" ? 1 : 0;
            const isDirB = b.type === "directory" ? 1 : 0;

            // Folders always bubble to the top regardless of sort order
            if (isDirA !== isDirB) return isDirB - isDirA;

            if (activeSort === "name-asc") {
                return a.name.localeCompare(b.name);
            } else if (activeSort === "name-desc") {
                return b.name.localeCompare(a.name);
            } else if (activeSort === "size-desc") {
                return b.size - a.size;
            } else if (activeSort === "date-desc") {
                const tA = new Date(a.modified).getTime();
                const tB = new Date(b.modified).getTime();
                return tB - tA; // Newest first
            } else if (activeSort === "date-asc") {
                const tA = new Date(a.modified).getTime() || 0;
                const tB = new Date(b.modified).getTime() || 0;
                return tA - tB; // Oldest first
            }
            return 0;
        });

        renderFilesList(filtered, d);
    }

    /**
     * @brief   Renders the processed array into DOM rows.
     * @param   {Array} files  The filtered & sorted array.
     * @param   {object} d     i18n dictionary.
     */
    function renderFilesList(files, d) {
        const lang = typeof window.getLang === 'function' ? window.getLang() : getLang();
        const rowsEl = document.getElementById("rows");
        if (!rowsEl) return;
        rowsEl.innerHTML = "";

        if (files.length === 0) {
            showEmpty(searchQuery ? (d.emptySearch || "No files matched.") : (d.empty || "This folder is empty."));
            // No rows are rendered, so select-all has nothing to scope to.
            if (typeof BulkDownload !== "undefined") BulkDownload.setRendered([]);
            return;
        }

        hideEmpty();

        // Use DocumentFragment to minimize DOM reflows
        const frag = document.createDocumentFragment();

        files.forEach((f, idx) => {
            const href = f.type === "directory"
                ? ResourceService.browseHref(f.relPath)
                : ResourceService.downloadHref(f.relPath);

            const row = document.createElement("div");
            row.className = "trow anim-fade-up";
            row.tabIndex = -1;
            row.dataset.rel = f.relPath;
            row.dataset.type = f.type;
            // Carried on the row so BulkDownload can resolve an item's real size and
            // type even if it is toggled before setRendered() has run for this pass.
            row.dataset.name = f.name;
            row.dataset.size = String(f.size);
            if (f.locked) row.classList.add("is-locked");
            row.style.animationDelay = Math.min(idx * 15, 300) + "ms"; // Staggered entry

            // A locked folder still navigates (its page shows the sign-in state); a locked
            // file opens sign-in instead of a download (see FileActions download guard).
            const linkAttr = f.type === "directory" ? `href="${href}"`
                : f.locked ? `href="#" data-locked="true"`
                : f.viewOnly ? `aria-disabled="true"` : `href="${href}" data-file="true"`;
            const iconStr = f.type === "directory" ? 'f-icon-dir' : 'f-icon-file';
            const badgeStr = f.type === "directory" ? 'badge-dir' : 'badge-file';
            const badgeLabel = f.type === "directory" ? (d.folder || 'Folder') : (d.file || 'File');

            const iconVerb = f.type === "directory" ? (d.btnOpen || 'Open')
                : f.locked ? (d.signInToOpen || 'Sign in to open')
                : f.viewOnly ? (d.viewOnlyBadge || 'View only') : (d.btnDownload || 'Download');
            const noDownload = f.locked || (f.viewOnly && f.type !== "directory");
            const iconLabel = escapeHtml(iconVerb + " " + f.name);
            const selLabel = escapeHtml((d.select || "Select") + " " + f.name);

            // Cells: [1] select [2] icon [3] name [4] type [5] modified [6] size [7] actions
            row.innerHTML = `
                <div class="c-select"><input type="checkbox" class="row-select" aria-label="${selLabel}"${noDownload ? " disabled" : ""} /></div>
                <div class="f-icon ${iconStr}" data-kind="${BrowseIcons.kindOf(f).kind}"><a class="f-icon-link" ${linkAttr} title="${iconLabel}" aria-label="${iconLabel}">${svgIcon(f)}</a></div>
                <div class="f-name"><a class="f-link" ${linkAttr} title="${escapeHtml(searchResults ? f.relPath : f.name)}">${escapeHtml(f.name)}</a>${f.locked ? ` <span class="badge badge-locked">${escapeHtml(d.lockedBadge || "Locked")}</span>` : ""}${noDownload && !f.locked ? ` <span class="badge badge-locked">${escapeHtml(d.viewOnlyBadge || "View only")}</span>` : ""}</div>
                <div><span class="badge ${badgeStr}">${badgeLabel}</span></div>
                <div class="f-sub">${f.locked ? '—' : fmtDate(f.modified, lang)}</div>
                <div class="f-sub">${f.type === 'directory' || f.locked ? '—' : humanSize(f.size, lang)}</div>
                ${FileActions.render(f, d)}
            `;
            frag.appendChild(row);
        });

        rowsEl.appendChild(frag);

        // Hand the rendered set to BulkDownload so select-all scopes to exactly
        // these rows and checkbox state survives the next filter change.
        // Locked rows cannot be selected, so select-all never includes them.
        if (typeof BulkDownload !== "undefined") BulkDownload.setRendered(files.filter(f => !f.locked && !(f.viewOnly && f.type !== "directory")));
    }

    /* ═══════════════════════════════════════════════════════════════════════════════
     * EVENT BINDINGS
     * ═══════════════════════════════════════════════════════════════════════════════ */

    function bindEvents() {
        // 1. Search Input Binding
        const searchInput = document.getElementById("localSearchInput");
        if (searchInput) {
            let timer = null;
            searchInput.addEventListener("input", (e) => {
                searchQuery = e.target.value.trim().toLowerCase();
                searchResults = null;
                const seq = ++searchSeq;
                applyFiltersAndRender(); // instant filter of this folder meanwhile
                clearTimeout(timer);
                // The server needs 3+ chars; it then searches every subdirectory.
                if (searchQuery.length < 3) return;
                timer = setTimeout(async () => {
                    const relPath = currentPath.replace(/^\/browse\/?/, "").replace(/\/+$/, "");
                    try {
                        const data = await ResourceService.search(searchQuery, { path: relPath, limit: 200 });
                        if (seq !== searchSeq) return;
                        searchResults = (data.results || [])
                            .filter(x => x && x.name && !isHidden(x.name))
                            .map(x => mapEntry(x, relPath));
                        applyFiltersAndRender();
                    } catch (err) {
                        console.error("[BrowsePage] Search Error:", err);
                    }
                }, 250);
            });
        }

        // 2. Custom Dropdowns Binding (Filter & Sort)
        const filterWraps = document.querySelectorAll(".filter-dropdown-wrap");
        filterWraps.forEach(wrap => {
            const pill = wrap.querySelector(".filter-pill");
            const valueSpan = pill.querySelector(".filter-value");
            const options = wrap.querySelectorAll(".filter-option");

            pill.addEventListener("click", (e) => {
                e.stopPropagation();
                // Close others
                filterWraps.forEach(w => { if (w !== wrap) w.classList.remove("show"); });
                wrap.classList.toggle("show");
            });

            options.forEach(opt => {
                opt.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const val = opt.getAttribute("data-val");
                    const text = opt.textContent;

                    valueSpan.textContent = text;
                    options.forEach(o => o.classList.remove("active"));
                    opt.classList.add("active");

                    if (wrap.id === "typeFilterWrap") activeType = val;
                    if (wrap.id === "sortFilterWrap") activeSort = val;

                    wrap.classList.remove("show");
                    applyFiltersAndRender();
                });
            });
        });

        // Close dropdowns on outside click
        document.addEventListener("click", () => {
            filterWraps.forEach(w => w.classList.remove("show"));
        });

        // 3. Extension chips — delegated, because the chip row is re-rendered on every load
        const chips = document.getElementById("extChips");
        if (chips) {
            chips.addEventListener("click", (e) => {
                const btn = e.target.closest(".chip");
                if (!btn) return;
                activeExt = btn.getAttribute("data-ext") || "";
                renderChips(typeof window.getDict === 'function' ? window.getDict() : getDict());
                applyFiltersAndRender();
            });
        }

        // 4. View Toggles Binding (Grid vs List)
        const listBtn = document.getElementById("viewList");
        const gridBtn = document.getElementById("viewGrid");
        const tableEl = document.getElementById("tableContainer");

        if (listBtn && gridBtn && tableEl) {
            listBtn.addEventListener("click", () => {
                tableEl.classList.remove("grid-mode");
                listBtn.classList.add("active");
                gridBtn.classList.remove("active");
                try { localStorage.setItem("view_mode", "list"); } catch { }
            });

            gridBtn.addEventListener("click", () => {
                tableEl.classList.add("grid-mode");
                gridBtn.classList.add("active");
                listBtn.classList.remove("active");
                try { localStorage.setItem("view_mode", "grid"); } catch { }
            });

            // Restore preference from LocalStorage
            try {
                if (localStorage.getItem("view_mode") === "grid") gridBtn.click();
            } catch { }
        }

        // 5. Keyboard: '/' focuses search, arrows move row focus, Enter activates.
        //    Bound once per render; the handler is guarded by `isConnected` so a
        //    re-render cannot leave a stale listener holding a detached node.
        document.addEventListener("keydown", onKeydown);
    }

    /**
     * @brief Keyboard affordances for the Browse page.
     */
    function onKeydown(e) {
        const target = e.target;
        const typing = target && (
            target.tagName === "INPUT" || target.tagName === "TEXTAREA" ||
            target.tagName === "SELECT" || target.isContentEditable
        );

        // "/" focuses search, and must stay inert while the user is typing.
        if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const input = document.getElementById("localSearchInput");
            if (input) {
                e.preventDefault();
                input.focus();
                input.select();
            }
            return;
        }

        // The tree and the splitters own their arrow keys.
        if (target && target.closest && target.closest("#treePane, .pane-handle")) return;

        const rowsEl = document.getElementById("rows");
        if (!rowsEl) return;
        const rows = [...rowsEl.querySelectorAll(".trow")];
        if (!rows.length) return;

        // Arrow keys move focus between rendered rows.
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            if (typing) return;
            const cur = rows.indexOf(document.activeElement);
            const next = e.key === "ArrowDown"
                ? Math.min(cur + 1, rows.length - 1)
                : (cur <= 0 ? 0 : cur - 1);
            if (cur === -1 && e.key === "ArrowUp") return;
            e.preventDefault();
            rows[next].focus();
            return;
        }

        // Enter activates the focused row's primary target. Clicking the existing
        // icon anchor keeps navigation and the data-file download contract in one place.
        if (e.key === "Enter" && !typing) {
            const row = document.activeElement;
            if (row && row.classList && row.classList.contains("trow")) {
                const link = row.querySelector(".f-icon-link");
                if (link) {
                    e.preventDefault();
                    link.click();
                }
            }
        }
    }

    /* ═══════════════════════════════════════════════════════════════════════════════
     * HELPERS & UI COMPONENTS
     * ═══════════════════════════════════════════════════════════════════════════════ */

    /**
     * @brief Dynamically constructs the breadcrumb navigation based on `currentPath`.
     */
    function buildCrumbs() {
        const d = typeof window.getDict === 'function' ? window.getDict() : getDict();
        const el = document.getElementById("breadcrumb");
        if (!el) return;
        el.innerHTML = "";

        // Root crumb: the file tree's root (ResourceService.browseHref("") → /browse/),
        // NOT the site home page. In full-screen Browse, "Home" must never eject the
        // user to "/" — same target as the tree pane title (browse-tree.js).
        const home = document.createElement("a");
        home.href = ResourceService.browseHref("");
        home.className = "crumb";
        home.innerHTML = `${BrowseIcons.get("folder_special", 14)}<span>${escapeHtml(d.root || "Home")}</span>`;
        el.appendChild(home);

        const parts = currentPath.replace(/^\/browse\/?/, "").split("/").filter(Boolean);
        let acc = "";

        parts.forEach((part, i) => {
            acc = acc ? acc + "/" + part : part;
            const sep = document.createElement("span");
            sep.className = "crumb-sep";
            sep.setAttribute("aria-hidden", "true");
            // RTL-aware chevron — direction is set on the wrapper, not by swapping markup.
            sep.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>`;
            el.appendChild(sep);

            if (i === parts.length - 1) {
                const cur = document.createElement("span");
                cur.className = "crumb crumb-active";
                cur.textContent = decodeURIComponent(part);
                cur.setAttribute("aria-current", "page");
                el.appendChild(cur);
            } else {
                const link = document.createElement("a");
                link.href = ResourceService.browseHref(acc);
                link.className = "crumb";
                link.textContent = decodeURIComponent(part);
                el.appendChild(link);
            }
        });

        const fn = document.getElementById("folderName");
        if (fn) fn.textContent = parts.length ? decodeURIComponent(parts[parts.length - 1]) : (d.root || "Home");
    }

    /**
     * @brief Sanitizes strings to prevent XSS when setting innerHTML.
     */
    function escapeHtml(str) {
        return String(str || "").replace(/[&<>'"]/g, tag => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
        }[tag]));
    }


    function humanSize(b, lang) {
        if (!Number.isFinite(b) || b < 0) return "—";
        if (b === 0) return lang === "fa" ? "0 بایت" : "0 B";
        const k = 1024;
        const u = lang === "fa" ? ["بایت", "KB", "MB", "GB", "TB"] : ["B", "KB", "MB", "GB", "TB"];
        const i = Math.min(Math.floor(Math.log(b) / Math.log(k)), u.length - 1);
        return (b / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1) + " " + u[i];
    }

    function fmtDate(ts, lang) {
        if (!ts) return "—";
        try {
            const d = new Date(ts);
            const l = lang === "fa" ? "fa-IR" : "en-US";
            return d.toLocaleDateString(l) + " " + d.toLocaleTimeString(l, { hour: "2-digit", minute: "2-digit" });
        } catch { return "—"; }
    }

    /**
     * @brief Renders the row identity icon via the shared Browse icon set.
     * @details The markup contract (24×24, 2px stroke, aria-hidden) is unchanged;
     *          only the source of the path data moved to browse-icons.js so the
     *          page and its inspector/bulk panels share one icon set.
     */
    function svgIcon(item) {
        return BrowseIcons.forItem(item, 20);
    }

    function renderSkeletons() {
        const rowsEl = document.getElementById("rows");
        if (!rowsEl) return;
        const fc = document.getElementById("folderCount");
        const fl = document.getElementById("fileCount");
        if (fc) fc.innerHTML = `<span class="skeleton-line" style="display:inline-block; width:16px; height:12px; margin:0"></span>`;
        if (fl) fl.innerHTML = `<span class="skeleton-line" style="display:inline-block; width:16px; height:12px; margin:0"></span>`;

        let html = "";
        for (let i = 0; i < 6; i++) {
            const randomWidth = Math.floor(Math.random() * 40 + 30);
            html += `
            <div class="trow anim-fade-up" style="animation-delay: ${i * 30}ms; pointer-events: none;">
                <div class="c-select"></div>
                <div class="f-icon skeleton-box"></div>
                <div class="f-name"><div class="skeleton-line" style="width: ${randomWidth}%; height: 16px;"></div></div>
                <div><div class="skeleton-line" style="width: 48px; height: 20px; border-radius: 10px;"></div></div>
                <div class="f-sub"><div class="skeleton-line" style="width: 100px; height: 12px;"></div></div>
                <div class="f-sub"><div class="skeleton-line" style="width: 60px; height: 12px;"></div></div>
            </div>`;
        }
        rowsEl.innerHTML = html;
    }

    function showEmpty(msg, isErr = false) {
        const el = document.getElementById("empty");
        const rowsEl = document.getElementById("rows");
        if (rowsEl) rowsEl.innerHTML = "";
        if (!el) return;
        el.style.display = "flex";
        el.innerHTML = `
      <div class="empty-circle${isErr ? ' err' : ''}">
        ${isErr
                ? `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
                : `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2z"/><line x1="9" y1="14" x2="15" y2="14"/></svg>`}
      </div>
      <div class="empty-text">${escapeHtml(msg)}</div>`;
    }

    function hideEmpty() {
        const el = document.getElementById("empty");
        if (el) el.style.display = "none";
    }

    return { render, get currentPath() { return currentPath; } };
})();

export { BrowsePage };
