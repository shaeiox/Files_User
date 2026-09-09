/* ═══════════════════════════════════════════════
   home.js — AVID Download Center (Pro Max)
   ═══════════════════════════════════════════════ */

const HomePage = (function () {
    'use strict';

    const rootsToScan = ["/download/download-User/", "/download/download-Avid/"];
    let stopFlag = false;

    function render(container) {
        document.title = getDict().pageTitle || "AVID Download • File Portal";

        container.innerHTML = `
      <div class="home-layout">


        <section class="hero-max">
        <div class="hero-content">
            <div class="status-chip">
            <span class="status-dot"></span>
            <span data-i18n="portalStatus">AVID Servers Online</span>
            </div>

            <h1 data-i18n-html="heroTitle">AVID <span>Download</span> Infrastructure</h1>
            
            <p class="hero-desc" data-i18n="desc">Secure, high-speed access to software packages, OS ISO images, and infrastructure templates.</p>
            
            <div class="hero-search">
            <div class="input-wrap">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <input id="globalSearch" type="text" autocomplete="off" data-i18n-ph="searchPh"/>
                <div class="search-keys"><kbd>⌘</kbd><kbd>K</kbd></div>
            </div>
            <button class="btn btn-primary" id="searchBtn" type="button" data-i18n="searchBtn">Search</button>
            <button class="btn btn-danger-text" id="stopBtn" type="button" style="display:none" data-i18n="stopBtn">Stop</button>
            </div>
        </div>

            <div class="hero-visual">
            <div class="logo-shader" aria-hidden="true"></div>
            <div class="logo-swap" id="logoSwap">
                <img class="logo-layer logo-dark" src="/assets/icon/avid-logo-dark.png" alt="AVID Download" draggable="false">
                <img class="logo-layer logo-light" src="/assets/icon/avid-logo-light.png" alt="AVID Download" draggable="false">
            </div>
            </div>
        </section>

        <!-- 5-COLUMN COMPACT CATEGORY GRID -->
        <div class="cat-grid stagger">
          ${categoryCard("/download/download-User/Template/", "template.png", "Template", "Common templates")}
          ${categoryCard("/download/download-User/Sandbox/", "sandbox.png", "Sandbox", "Internal sandbox")}
          ${categoryCard("/download/download-User/LogDB/", "Log.png", "Log Server", "Database exports")}
          ${categoryCard("/download/download-User/ISO/", "iso.png", "ISO Images", "OS installers")}
          ${categoryCard("/download/download-User/imageClone/", "images.png", "VM Images", "Virtual machine disks")}
        </div>

        <!-- SEARCH RESULTS -->
        <section class="results-panel" id="resultsBox" style="display:none">
          <div class="results-bar">
            <div class="results-bar-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
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

    const logo = document.getElementById('logoSwap');
    if (logo && !logo.dataset.bound) {
        logo.dataset.bound = '1';
        let busy = false;
        logo.addEventListener('mouseenter', () => {
            if (busy || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
            busy = true;
            logo.classList.remove('is-flipping');
            void logo.offsetWidth;
            logo.classList.add('is-flipping');
        });
        logo.addEventListener('animationend', (e) => {
            if (e.animationName !== 'logoFlip') return;
            logo.classList.remove('is-flipping');
            busy = false;
        });
    }

    // Card Generator (Sleek layout)
    function categoryCard(href, icon, title, desc) {
        return `
      <a class="cat-card" href="${href}">
        <div class="cat-icon"><img src="/assets/icon/${icon}" alt="${title}"></div>
        <div class="cat-meta">
          <h3>${title}</h3>
          <p>${desc}</p>
        </div>
      </a>
    `;
    }

    // --- Logic remains the same (Search & Fetch) ---
    function bindEvents() {
        const qInput = document.getElementById("globalSearch");
        const searchBtn = document.getElementById("searchBtn");
        const stopBtn = document.getElementById("stopBtn");

        if (!qInput || !searchBtn) return;

        if (typeof Autocomplete !== "undefined") {
            Autocomplete.bind(qInput);
        }

        searchBtn.addEventListener("click", () => {
            if (typeof Autocomplete !== "undefined") Autocomplete.hide();
            scanAll(qInput.value || "");
        });

        searchBtn.addEventListener("click", () => scanAll(qInput.value || ""));
        stopBtn.addEventListener("click", () => { stopFlag = true; });
        qInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") scanAll(qInput.value || "");
            if (e.key === "Escape") clearResults();
        });

        window._homeKeyHandler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                qInput.focus();
            }
        };
        window.addEventListener("keydown", window._homeKeyHandler);
    }

    function isHidden(n) { return (n || "").toLowerCase() === "index.html" || (n || "").startsWith("."); }

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
        row.className = "res-row anim-fade-up";
        row.innerHTML = `
      <div class="res-info">
        <a href="${item.href}">${item.name}</a>
        <div class="res-path">${item.href}</div>
      </div>
      <div>
        <span class="badge ${item.type === 'directory' ? 'badge-dir' : 'badge-file'}">
          ${item.type === 'directory' ? 'DIR' : 'FILE'}
        </span>
      </div>`;
        list.appendChild(row);
    }

    async function scanAll(query) {
        stopFlag = false;
        const resultsBox = document.getElementById("resultsBox");
        const resultsList = document.getElementById("resultsList");
        const progressEl = document.getElementById("progress");
        const searchBtn = document.getElementById("searchBtn");
        const stopBtn = document.getElementById("stopBtn");
        const qInput = document.getElementById("globalSearch");

        if (!resultsBox) return;

        resultsList.innerHTML = "";
        resultsBox.style.display = "block";
        progressEl.textContent = "Scanning AVID Servers...";
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
            progressEl.textContent = `Scanned ${scanned} directories...`;
        }

        progressEl.textContent = `Search Complete · ${found} found`;
        stopBtn.style.display = "none";
        searchBtn.disabled = false;
        qInput.disabled = false;
    }

    return { render };
})();