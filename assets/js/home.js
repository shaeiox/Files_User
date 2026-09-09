/* ═══════════════════════════════════════════════
   home.js — Home Page Renderer

   Renders the home page content (hero + category
   cards + search) into a given container element.

   Does NOT touch the DOM on load — only when
   Router calls HomePage.render().
   ═══════════════════════════════════════════════ */

const HomePage = (function () {
    'use strict';

    const rootsToScan = ["/download/download-User/", "/download/download-Avid/"];
    let stopFlag = false;

    /**
     * Render the home page HTML into the given container.
     */
    function render(container) {
        document.title = getDict().pageTitle || "CloudAvid • File Portal";

        container.innerHTML = `
      <div class="home-layout anim-fade-up">

        <!-- Hero -->
        <section class="hero">
          <div class="hero-inner">
            <div class="hero-text">
              <div class="status-chip">
                <span class="status-dot"></span>
                <span data-i18n="portalStatus">Portal Online</span>
              </div>
              <h1 data-i18n="title">Download Center</h1>
              <p class="hero-desc" data-i18n="desc">Access software packages, ISO images, templates and system logs — provided by CloudAvid infrastructure team.</p>
            </div>
            <div class="hero-search">
              <div class="input-wrap">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <input id="globalSearch" type="text" autocomplete="off" data-i18n-ph="searchPh"/>
                <div class="search-keys"><kbd>⌘</kbd><kbd>K</kbd></div>
              </div>
              <button class="btn btn-primary" id="searchBtn" type="button" data-i18n="searchBtn">Search</button>
              <button class="btn btn-danger-text" id="stopBtn" type="button" style="display:none" data-i18n="stopBtn">Stop</button>
            </div>
          </div>
        </section>

        <!-- Section label -->
        <div class="section-label">
          <h2 data-i18n="categories">Directories</h2>
        </div>

        <!-- Category grid -->
        <div class="cat-grid stagger">
          ${categoryCard("/download/download-User/Template/", "template.png", "ci-teal", "template", "templateDesc")}
          ${categoryCard("/download/download-User/Sandbox/", "sandbox.png", "ci-violet", "sandbox", "sandboxDesc")}
          ${categoryCard("/download/download-User/LogDB/", "Log.png", "ci-amber", "logServer", "logServerDesc")}
          ${categoryCard("/download/download-User/ISO/", "iso.png", "ci-rose", "iso", "isoDesc")}
          ${categoryCard("/download/download-User/imageClone/", "images.png", "ci-sky", "imageClone", "images")}
        </div>

        <!-- Search results -->
        <section class="results-panel" id="resultsBox" style="display:none">
          <div class="results-bar">
            <div class="results-bar-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <span id="resultsTitle">Results</span>
            </div>
            <div class="results-bar-meta" id="progress"></div>
          </div>
          <div class="results-body" id="resultsList"></div>
        </section>

      </div>
    `;

        bindEvents();
    }

    /**
     * Generate a category card HTML string.
     */
    function categoryCard(href, icon, colorClass, titleKey, descKey) {
        return `
      <a class="cat-card" href="${href}">
        <div class="cat-icon ${colorClass}"><img src="/assets/icon/${icon}" alt=""></div>
        <div class="cat-meta">
          <h3 data-i18n="${titleKey}">${titleKey}</h3>
          <p data-i18n="${descKey}">${descKey}</p>
        </div>
        <svg class="cat-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
      </a>
    `;
    }

    /**
     * Bind search-related event listeners.
     * Called after render() injects the HTML.
     */
    function bindEvents() {
        const qInput = document.getElementById("globalSearch");
        const searchBtn = document.getElementById("searchBtn");
        const stopBtn = document.getElementById("stopBtn");

        if (!qInput || !searchBtn) return;

        searchBtn.addEventListener("click", () => scanAll(qInput.value || ""));
        stopBtn.addEventListener("click", () => { stopFlag = true; });

        qInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") scanAll(qInput.value || "");
            if (e.key === "Escape") clearResults();
        });

        // Ctrl+K / Cmd+K shortcut
        window._homeKeyHandler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                qInput.focus();
            }
        };
        window.addEventListener("keydown", window._homeKeyHandler);
    }

    function isHidden(n) {
        const l = (n || "").toLowerCase();
        return l === "index.html" || l === "index.php" || l.startsWith(".");
    }

    function clearResults() {
        const box = document.getElementById("resultsList");
        const panel = document.getElementById("resultsBox");
        if (box) box.innerHTML = "";
        if (panel) panel.style.display = "none";
    }

    function addResult(item) {
        const list = document.getElementById("resultsList");
        if (!list) return;

        const row = document.createElement("div");
        row.className = "res-row";
        row.innerHTML = `
      <div class="res-info">
        <a href="${item.href}">${item.name}</a>
        <span class="res-path">${item.href}</span>
      </div>
      <div>
        <span class="badge ${item.type === 'directory' ? 'badge-dir' : 'badge-file'}">
          ${item.type === 'directory' ? 'DIR' : 'FILE'}
        </span>
      </div>
    `;
        list.appendChild(row);
    }

    async function scanAll(query) {
        stopFlag = false;
        const resultsBox = document.getElementById("resultsBox");
        const resultsList = document.getElementById("resultsList");
        const resultsTitle = document.getElementById("resultsTitle");
        const progressEl = document.getElementById("progress");
        const searchBtn = document.getElementById("searchBtn");
        const stopBtn = document.getElementById("stopBtn");
        const qInput = document.getElementById("globalSearch");

        if (!resultsBox) return;

        resultsList.innerHTML = "";
        resultsBox.style.display = "block";

        const d = getDict();
        resultsTitle.textContent = d.results;
        progressEl.textContent = d.scanning;
        stopBtn.style.display = "inline-flex";
        searchBtn.disabled = true;
        qInput.disabled = true;

        const q = query.trim().toLowerCase();
        let found = 0;
        const queue = [...rootsToScan];
        let scanned = 0;

        while (queue.length) {
            if (stopFlag) break;
            const dir = queue.shift();
            scanned++;

            try {
                const res = await fetch("/__list" + dir, { cache: "no-store" });
                if (!res.ok) continue;
                const entries = await res.json();
                if (!Array.isArray(entries)) continue;

                for (const e of entries) {
                    if (stopFlag) break;
                    if (!e || !e.name || e.name === "." || e.name === "..") continue;
                    if (isHidden(e.name)) continue;

                    const type = e.type === "directory" ? "directory" : "file";
                    const href = dir + e.name + (type === "directory" ? "/" : "");

                    if (type === "directory") queue.push(href);

                    if (!q || e.name.toLowerCase().includes(q)) {
                        addResult({ name: e.name, href, type });
                        found++;
                        if (found >= 200) { stopFlag = true; break; }
                    }
                }
            } catch { }

            progressEl.textContent = `${d.scanning} ${scanned}`;
        }

        progressEl.textContent = d.done + ` · ${found}`;
        stopBtn.style.display = "none";
        searchBtn.disabled = false;
        qInput.disabled = false;
    }

    return { render };
})();