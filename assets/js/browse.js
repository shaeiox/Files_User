/* ═══════════════════════════════════════════════
   browse.js — File Browser Page Renderer

   Renders directory listing into #app container.
   Fetches file list from /__list/ API endpoint.
   ═══════════════════════════════════════════════ */

const BrowsePage = (function () {
    'use strict';

    let allFiles = [];
    let currentPath = "/";

    /**
     * Render the browse page into the given container.
     */
    function render(container, path) {
        currentPath = path;
        if (!currentPath.endsWith("/")) currentPath += "/";

        document.title = getDict().browseTitle || "Downloads • CloudAvid";

        container.innerHTML = `
      <div class="browse-layout anim-fade-up">

        <header class="browse-head">
          <nav class="crumbs" id="breadcrumb" aria-label="Breadcrumb"></nav>
          <div class="browse-title-row">
            <div>
              <h1 id="folderName">—</h1>
              <div class="browse-stats">
                <span class="stat-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2z"/></svg>
                  <span class="stat-val" id="folderCount">0</span>
                  <span data-i18n="folders">folders</span>
                </span>
                <span class="stat-dot">·</span>
                <span class="stat-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M13 2v7h7"/></svg>
                  <span class="stat-val" id="fileCount">0</span>
                  <span data-i18n="files">files</span>
                </span>
              </div>
            </div>
            <div class="view-toggle" role="tablist">
              <button class="vt-btn active" id="viewList" aria-label="List view">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              </button>
              <button class="vt-btn" id="viewGrid" aria-label="Grid view">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              </button>
            </div>
          </div>
        </header>

        <section class="file-tbl" id="tableContainer">
          <div class="trow thead">
            <div></div>
            <div data-i18n="name">Name</div>
            <div data-i18n="type">Type</div>
            <div data-i18n="modified">Modified</div>
            <div data-i18n="size">Size</div>
          </div>
          <div id="rows"></div>
          <div class="empty-box" id="empty" style="display:none"></div>
        </section>

      </div>
    `;

        buildCrumbs();
        bindEvents();
        fetchList();
    }

    /* ── Helpers ── */
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

    /* ── Breadcrumb ── */
    function buildCrumbs() {
        const d = getDict();
        const el = document.getElementById("breadcrumb");
        if (!el) return;
        el.innerHTML = "";

        const home = document.createElement("a");
        home.href = "/";
        home.className = "crumb";
        home.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg><span>${d.root}</span>`;
        el.appendChild(home);

        const parts = currentPath.split("/").filter(Boolean);
        let acc = "";

        parts.forEach((part, i) => {
            acc += "/" + part;

            const sep = document.createElement("span");
            sep.className = "crumb-sep";
            sep.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
            el.appendChild(sep);

            if (i === parts.length - 1) {
                const cur = document.createElement("span");
                cur.className = "crumb crumb-active";
                cur.textContent = decodeURIComponent(part);
                el.appendChild(cur);
                const fn = document.getElementById("folderName");
                if (fn) fn.textContent = decodeURIComponent(part);
            } else {
                const link = document.createElement("a");
                link.href = acc + "/";
                link.className = "crumb";
                link.textContent = decodeURIComponent(part);
                el.appendChild(link);
            }
        });
    }

    /* ── Empty / Error states ── */
    function showEmpty(msg, isErr) {
        const el = document.getElementById("empty");
        if (!el) return;
        el.style.display = "flex";
        el.innerHTML = `
      <div class="empty-circle${isErr ? ' err' : ''}">
        ${isErr
                ? `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
                : `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2z"/><line x1="9" y1="14" x2="15" y2="14"/></svg>`}
      </div>
      <div class="empty-text">${msg}</div>`;
    }

    function hideEmpty() {
        const el = document.getElementById("empty");
        if (el) el.style.display = "none";
    }

    /* ── Render file rows ── */
    function renderFiles(files) {
        const lang = getLang();
        const d = getDict();
        allFiles = files;

        const rowsEl = document.getElementById("rows");
        if (!rowsEl) return;
        rowsEl.innerHTML = "";

        files.sort((a, b) => {
            if (a.type === "directory" && b.type !== "directory") return -1;
            if (a.type !== "directory" && b.type === "directory") return 1;
            return a.name.localeCompare(b.name);
        });

        const dirs = files.filter(f => f.type === "directory").length;
        const fc = document.getElementById("folderCount");
        const flc = document.getElementById("fileCount");
        if (fc) fc.textContent = dirs;
        if (flc) flc.textContent = files.length - dirs;

        if (!files.length) { showEmpty(d.empty); return; }
        hideEmpty();

        const frag = document.createDocumentFragment();

        files.forEach((f, idx) => {
            const href = currentPath + f.name + (f.type === "directory" ? "/" : "");
            const row = document.createElement("div");
            row.className = "trow anim-fade-up";
            row.dataset.name = f.name.toLowerCase();
            row.style.animationDelay = Math.min(idx * 25, 300) + "ms";

            // For files: direct download link, not SPA navigation
            const linkAttr = f.type === "directory" ? `href="${href}"` : `href="${href}" data-file="true"`;

            row.innerHTML = `
        <div class="f-icon ${f.type === 'directory' ? 'f-icon-dir' : 'f-icon-file'}">${svgIcon(f.type)}</div>
        <div class="f-name"><a class="f-link" ${linkAttr} title="${f.name}">${f.name}</a></div>
        <div><span class="badge ${f.type === 'directory' ? 'badge-dir' : 'badge-file'}">${f.type === 'directory' ? d.folder : d.file}</span></div>
        <div class="f-sub">${fmtDate(f.modified, lang)}</div>
        <div class="f-sub">${f.type === 'directory' ? '—' : humanSize(f.size, lang)}</div>`;

            frag.appendChild(row);
        });

        rowsEl.appendChild(frag);
        filterRows();
    }

    /* ── Search filter ── */
    function filterRows() {
        const d = getDict();
        const searchEl = document.getElementById("search-input");
        const q = searchEl ? (searchEl.value || "").trim().toLowerCase() : "";
        const rowsEl = document.getElementById("rows");
        if (!rowsEl) return;

        const rows = rowsEl.querySelectorAll(".trow");
        let shown = 0;

        rows.forEach(r => {
            const ok = !q || (r.dataset.name || "").includes(q);
            r.style.display = ok ? "" : "none";
            if (ok) shown++;
        });

        if (!shown && rows.length) showEmpty(q ? d.emptySearch : d.empty);
        else if (shown) hideEmpty();
    }

    /* ── Fetch directory listing from API ── */
    async function fetchList() {
        try {
            const res = await fetch("/__list" + currentPath, { cache: "no-store" });
            if (!res.ok) throw new Error("HTTP " + res.status);
            const data = await res.json();
            if (!Array.isArray(data)) throw new Error("Bad JSON");

            const items = data
                .filter(x => x && x.name && x.name !== "." && x.name !== "..")
                .filter(x => !isHidden(x.name))
                .map(x => ({
                    name: String(x.name),
                    type: x.type === "directory" ? "directory" : "file",
                    size: Number(x.size || 0),
                    modified: x.mtime || x.modified || x.time || ""
                }));

            renderFiles(items);
        } catch (e) {
            console.error(e);
            const d = getDict();
            showEmpty(`<strong>${d.loadErrTitle}</strong><div style="margin-top:8px">${d.loadErrHint}</div>`, true);
        }
    }

    /* ── View toggle + search binding ── */
    function bindEvents() {
        const listBtn = document.getElementById("viewList");
        const gridBtn = document.getElementById("viewGrid");
        const tableEl = document.getElementById("tableContainer");

        if (listBtn && gridBtn && tableEl) {
            listBtn.addEventListener("click", () => {
                tableEl.classList.remove("grid-mode");
                listBtn.classList.add("active");
                gridBtn.classList.remove("active");
                localStorage.setItem("view_mode", "list");
            });

            gridBtn.addEventListener("click", () => {
                tableEl.classList.add("grid-mode");
                gridBtn.classList.add("active");
                listBtn.classList.remove("active");
                localStorage.setItem("view_mode", "grid");
            });

            if (localStorage.getItem("view_mode") === "grid") gridBtn.click();
        }

        // In-page search (if there's a search input in nav)
        const searchEl = document.getElementById("search-input");
        if (searchEl) {
            searchEl.addEventListener("input", filterRows);
        }
    }

    return { render };
})();
