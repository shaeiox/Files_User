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
 *   - Manages an in-memory Data Pipeline: Search -> Filter -> Sort -> Render.
 *   - Handles in-page 404 error states without redirecting to a hard 404 page.
 *   - Renders Breadcrumbs for hierarchical navigation.
 *   - Supports Grid and List views with `localStorage` persistence.
 *
 * Dependencies:
 *   - ResourceService (resource-service.js)
 *   - getDict(), getLang() (from i18n/theme engine)
 *
 * @author      ShaiyaAzizi
 * @version     2.1.0
 * ═══════════════════════════════════════════════════════════════════════════════
 */

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

    /* ═══════════════════════════════════════════════════════════════════════════════
     * MAIN RENDERER
     * ═══════════════════════════════════════════════════════════════════════════════ */

    /**
     * @brief   Initializes and renders the Browse page shell.
     * @param   {HTMLElement} container  The DOM element to render into.
     * @param   {string} path            The requested browse path (e.g. "/browse/el9").
     */
    function render(container, path) {
        const d = typeof window.getDict === 'function' ? window.getDict() : getDict();

        // 1. Reset state for the new path navigation
        currentPath = path.endsWith("/") ? path : path + "/";
        if (!currentPath.startsWith("/browse")) {
            currentPath = "/browse/";
        }
        activeType = "all";
        activeSort = "name-asc";
        searchQuery = "";

        document.title = d.browseTitle || "Downloads • CloudAvid";

        // 2. Inject Page Shell (Headers, Controls, Table Shell)
        container.innerHTML = `
      <div class="browse-layout anim-fade-up">

        <header class="browse-head">
          <nav class="crumbs" id="breadcrumb" aria-label="Breadcrumb"></nav>
          
          <div class="browse-title-row">
            <div class="browse-title-left">
              <h1 id="folderName">—</h1>
              <div class="browse-stats">
                <span class="stat-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2z"/></svg>
                  <span class="stat-val" id="folderCount">0</span>
                  <span>${d.folders || "folders"}</span>
                </span>
                <span class="stat-dot">·</span>
                <span class="stat-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M13 2v7h7"/></svg>
                  <span class="stat-val" id="fileCount">0</span>
                  <span>${d.files || "files"}</span>
                </span>
              </div>
            </div>

            <div class="browse-controls" id="browseControls">
              <!-- Local Search -->
              <div class="input-wrap browse-search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <input id="localSearchInput" type="text" autocomplete="off" placeholder="${d.searchFolderPh || 'Search folder...'}" aria-label="Search in folder" />
              </div>

              <!-- Type Filter Dropdown -->
              <div class="filter-dropdown-wrap" id="typeFilterWrap">
                <button class="filter-pill" type="button" aria-haspopup="true">
                  <span class="filter-value" data-val="all">${d.allTypes || "All Types"}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div class="filter-dropdown-menu">
                  <button class="filter-option active" data-val="all" type="button">${d.allTypes || "All Types"}</button>
                  <button class="filter-option" data-val="directory" type="button">${d.folders || "Folders"}</button>
                  <button class="filter-option" data-val="file" type="button">${d.files || "Files"}</button>
                </div>
              </div>

              <!-- Sort Dropdown -->
              <div class="filter-dropdown-wrap" id="sortFilterWrap">
                <button class="filter-pill" type="button" aria-haspopup="true">
                  <span class="filter-value" data-val="name-asc">${d.sortName || "Name (A-Z)"}</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                <div class="filter-dropdown-menu">
                <button class="filter-option active" data-val="name-asc" type="button">${d.sortName || "Name (A-Z)"}</button>
                <button class="filter-option" data-val="name-desc" type="button">${d.sortNameDesc || "Name (Z-A)"}</button>
                <button class="filter-option" data-val="date-desc" type="button">${d.sortLatest || "Newest First"}</button>
                <button class="filter-option" data-val="date-asc" type="button">${d.sortOldest || "Oldest First"}</button>
                <button class="filter-option" data-val="size-desc" type="button">${d.sortSize || "Largest First"}</button>
                </div>
              </div>

              <!-- View Toggles -->
              <div class="view-toggle" role="tablist" aria-label="View mode">
                <button class="vt-btn active" id="viewList" aria-label="List view" type="button">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                </button>
                <button class="vt-btn" id="viewGrid" aria-label="Grid view" type="button">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                </button>
              </div>
            </div>
          </div>
        </header>

        <section class="file-tbl" id="tableContainer">
          <div class="trow thead">
            <div></div>
            <div>${d.name || "Name"}</div>
            <div>${d.type || "Type"}</div>
            <div>${d.modified || "Modified"}</div>
            <div>${d.size || "Size"}</div>
          </div>
          <div id="rows"></div>
          <div class="empty-box" id="empty" style="display:none"></div>
        </section>

      </div>
    `;

        // 3. Initialize components
        buildCrumbs();
        bindEvents();
        renderSkeletons();
        fetchList();
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
        const relPath = currentPath.replace(/^\/browse\/?/, "");

        try {
            if (typeof ResourceService === 'undefined') throw new Error("ResourceService missing");

            const data = await ResourceService.listFiles(relPath);
            if (!Array.isArray(data)) throw new Error("Bad JSON");

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

            allFiles = data
                .filter(x => x && x.name && x.name !== "." && x.name !== "..")
                .filter(x => !isHidden(x.name))
                .map(x => ({
                    name: String(x.name),
                    relPath: x.path || (relPath ? relPath.replace(/\/+$/, "") + "/" + x.name : x.name),
                    type: x.type === "directory" ? "directory" : "file",
                    size: Number(x.size || 0),
                    modified: x.mtime || x.modified || x.time || 0
                }));

            applyFiltersAndRender();

        } catch (err) {
            console.error("[BrowsePage] Fetch Error:", err);
            const container = document.getElementById("tableContainer");
            const controls = document.getElementById("browseControls");

            if (!container) return;
            if (controls) controls.style.display = "none";

            if (err.status === 401 || err.code === "AUTH_REQUIRED") {
                container.innerHTML = `
                  <div class="locked-state" style="padding: 64px 24px; text-align: center; border: 1px solid var(--border); border-radius: var(--radius-panels); background: var(--bg-card);">
                    <div class="locked-icon" style="margin: 0 auto 16px;">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    </div>
                    <div class="locked-title" style="font-size: 18px; font-weight: 600; margin-bottom: 6px;">
                      ${d.authRequired || "Authentication Required"}
                    </div>
                    <div class="locked-desc" style="font-size: 13px; color: var(--text-4); max-width: 400px; margin: 0 auto 24px;">
                      ${d.authRequiredDesc || "Access to this infrastructure path requires clearance."}
                    </div>
                    <button class="btn btn-primary" id="browseAuthBtn" style="margin: 0 auto;">
                      ${d.btnAuth || "Authenticate to Access"}
                    </button>
                  </div>
                `;

                const btn = document.getElementById("browseAuthBtn");
                if (btn) {
                    btn.addEventListener("click", () => {
                        if (typeof HomePage !== "undefined" && typeof HomePage.showLoginModal === "function") {
                            HomePage.showLoginModal(fetchList);
                        } else if (typeof window.triggerAuthModal === "function") {
                            window.triggerAuthModal(fetchList);
                        } else {
                            Router.navigate("/");
                        }
                    });
                }
                return;
            }

            if (err.status === 404 || err.code === "NOT_FOUND") {
                container.innerHTML = `
                  <div class="resources-error" style="flex-direction: column; padding: 64px 24px; text-align: center; border: 1px dashed var(--border); border-radius: var(--radius-panels); background: var(--bg-card);">
                    <div style="font-size: 48px; font-weight: 900; color: var(--danger); font-family: var(--mono); margin-bottom: 8px;">404</div>
                    <div style="font-size: 18px; font-weight: 600; color: var(--text); margin-bottom: 6px;">${d.error404Title || "Directory Not Found"}</div>
                    <div style="font-size: 13px; color: var(--text-4); max-width: 400px; margin: 0 auto 24px;">
                      ${d.error404Desc || "The requested path does not exist on CloudAvid infrastructure."}
                      <br><code class="mono" style="display:inline-block; margin-top:8px; color:var(--text-accent); padding:2px 6px; background:var(--glow); border-radius:4px;">${escapeHtml(relPath)}</code>
                    </div>
                    <a href="/" class="btn btn-primary" style="text-decoration:none; margin: 0 auto;">${d.btnBackPortal || "Back to Downloads"}</a>
                  </div>
                `;
                return;
            }

            container.innerHTML = `
              <div class="resources-error" style="padding: 32px; border-radius: var(--radius-card);">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <div style="display:flex; flex-direction:column; align-items:flex-start; text-align:left;">
                    <span style="font-weight:600; color:var(--text);">${d.errorServerLoad || "Failed to load directory."}</span>
                    <span style="font-size:12px; color:var(--text-4); margin-top:4px;">${escapeHtml(err.message || d.errorServerSub || "Network or server error.")}</span>
                </div>
              </div>
            `;
        }
    }

    /* ═══════════════════════════════════════════════════════════════════════════════
     * DATA PIPELINE (Filter -> Search -> Sort -> Render)
     * ═══════════════════════════════════════════════════════════════════════════════ */

    /**
     * @brief   Applies current state constraints to the raw data and triggers render.
     */
    function applyFiltersAndRender() {
        const d = typeof window.getDict === 'function' ? window.getDict() : getDict();
        let filtered = [...allFiles];

        // 1. Local Search Filter
        if (searchQuery) {
            filtered = filtered.filter(f => f.name.toLowerCase().includes(searchQuery));
        }

        // 2. Type Filter
        if (activeType !== "all") {
            filtered = filtered.filter(f => f.type === activeType);
        }

        // 3. Visual Stats Update (Counts absolute available files, ignoring search)
        const dirsCount = allFiles.filter(f => f.type === "directory").length;
        const filesCount = allFiles.filter(f => f.type === "file").length;
        const fcEl = document.getElementById("folderCount");
        const flcEl = document.getElementById("fileCount");
        if (fcEl) fcEl.textContent = dirsCount;
        if (flcEl) flcEl.textContent = filesCount;

        // 4. Sorting Strategy
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
            row.style.animationDelay = Math.min(idx * 15, 300) + "ms"; // Staggered entry

            const linkAttr = f.type === "directory" ? `href="${href}"` : `href="${href}" data-file="true"`;
            const iconStr = f.type === "directory" ? 'f-icon-dir' : 'f-icon-file';
            const badgeStr = f.type === "directory" ? 'badge-dir' : 'badge-file';
            const badgeLabel = f.type === "directory" ? (d.folder || 'Folder') : (d.file || 'File');

            row.innerHTML = `
                <div class="f-icon ${iconStr}">${svgIcon(f.type)}</div>
                <div class="f-name"><a class="f-link" ${linkAttr} title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</a></div>
                <div><span class="badge ${badgeStr}">${badgeLabel}</span></div>
                <div class="f-sub">${fmtDate(f.modified, lang)}</div>
                <div class="f-sub">${f.type === 'directory' ? '—' : humanSize(f.size, lang)}</div>
            `;
            frag.appendChild(row);
        });

        rowsEl.appendChild(frag);
    }

    /* ═══════════════════════════════════════════════════════════════════════════════
     * EVENT BINDINGS
     * ═══════════════════════════════════════════════════════════════════════════════ */

    function bindEvents() {
        // 1. Search Input Binding
        const searchInput = document.getElementById("localSearchInput");
        if (searchInput) {
            searchInput.addEventListener("input", (e) => {
                searchQuery = e.target.value.trim().toLowerCase();
                applyFiltersAndRender();
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

        // 3. View Toggles Binding (Grid vs List)
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

        const home = document.createElement("a");
        home.href = "/";
        home.className = "crumb";
        home.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg><span>${d.root || "Home"}</span>`;
        el.appendChild(home);

        const parts = currentPath.replace(/^\/browse\/?/, "").split("/").filter(Boolean);
        let acc = "";

        parts.forEach((part, i) => {
            acc = acc ? acc + "/" + part : part;
            const sep = document.createElement("span");
            sep.className = "crumb-sep";
            // RTL-aware chevron
            sep.innerHTML = d.dir === "rtl"
                ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`
                : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
            el.appendChild(sep);

            if (i === parts.length - 1) {
                const cur = document.createElement("span");
                cur.className = "crumb crumb-active";
                cur.textContent = decodeURIComponent(part);
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

    function isHidden(n) {
        const l = (n || "").toLowerCase();
        return l === "index.html" || l === "index.php" || l.startsWith(".");
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

    function svgIcon(type) {
        return type === "directory"
            ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2z"/></svg>`
            : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M13 2v7h7"/></svg>`;
    }

    function renderSkeletons() {
        const rowsEl = document.getElementById("rows");
        if (!rowsEl) return;
        document.getElementById("folderCount").innerHTML = `<span class="skeleton-line" style="display:inline-block; width:16px; height:12px; margin:0"></span>`;
        document.getElementById("fileCount").innerHTML = `<span class="skeleton-line" style="display:inline-block; width:16px; height:12px; margin:0"></span>`;

        let html = "";
        for (let i = 0; i < 6; i++) {
            const randomWidth = Math.floor(Math.random() * 40 + 30);
            html += `
            <div class="trow anim-fade-up" style="animation-delay: ${i * 30}ms; pointer-events: none;">
                <div class="f-icon skeleton-box" style="width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0; margin-right: 8px;"></div>
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
                ? `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
                : `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2z"/><line x1="9" y1="14" x2="15" y2="14"/></svg>`}
      </div>
      <div class="empty-text">${escapeHtml(msg)}</div>`;
    }

    function hideEmpty() {
        const el = document.getElementById("empty");
        if (el) el.style.display = "none";
    }

    return { render };
})();