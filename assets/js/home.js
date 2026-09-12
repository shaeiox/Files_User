/* ═══════════════════════════════════════════════════════════════
   home.js — AVID Download Infrastructure (matches new-ui.png)
   Skill: UI UX Pro Max — Flat Design + Enterprise Gateway
   Structure: shadcn card + table primitives
   ═══════════════════════════════════════════════════════════════ */

const HomePage = (function () {
    'use strict';

    const rootsToScan = [
        "/download/download-User/",
        "/download/download-Avid/",
        "/files/"
    ];
    let stopFlag = false;

    function render(container) {
        document.title = getDict().pageTitle || "AVID Download • File Portal";
        container.innerHTML = `
      <div class="home-layout">

        <!-- HERO — white card, search, illustration -->
        <section class="hero-max">
          <div class="hero-content">
            <div class="hero-pill">
              <span class="hero-pill-dot"></span>
              YOUR INFRASTRUCTURE. WITH AVID.
            </div>
            <h1>
              <span class="avid">AVID</span> <span class="accent">Download</span><br>
              Infrastructure
            </h1>
            <p class="hero-desc">
              Access software packages, ISO images, templates and system logs<br>
              — provided by CloudAvid infrastructure team.
            </p>
            <div class="hero-search">
              <div class="input-wrap">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                <input id="globalSearch" type="text" autocomplete="off" placeholder="Search for files, packages, templates..." aria-label="Search files" />
                <div class="search-keys"><kbd>⌘</kbd><kbd>K</kbd></div>
              </div>
              <button class="btn btn-primary" id="searchBtn" type="button">Search</button>
              <button class="btn" id="stopBtn" type="button" style="display:none">Stop</button>
            </div>
          </div>

            <div class="hero-visual">
            <div class="logo-shader" aria-hidden="true"></div>
            <div class="logo-swap" id="logoSwap">
                <img class="logo-layer logo-dark" src="/assets/icon/avid-logo-dark.webp" alt="AVID Download" draggable="false">
                <img class="logo-layer logo-light" src="/assets/icon/avid-logo-light.webp" alt="AVID Download" draggable="false">
            </div>
            </div>
        </section>

        <!-- INFRASTRUCTURE RESOURCES -->
        <section class="resources-section">
          <div class="section-head">
            <div class="section-head-left">
              <div class="section-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
              </div>
              <div>
                <div class="section-title">Infrastructure Resources</div>
                <div class="section-sub">Browse and download all available infrastructure resources and packages.</div>
              </div>
            </div>
            <div class="section-controls">
              <label class="select-pill">
                <span>All categories</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </label>
              <label class="select-pill">
                <span>Sort by: Latest</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </label>
              <div class="view-toggle" role="tablist" aria-label="View mode">
                <button class="vt-btn active" id="viewGridBtn" aria-label="Grid view">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                </button>
                <button class="vt-btn" id="viewListBtn" aria-label="List view">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                </button>
              </div>
            </div>
          </div>

          <div class="resources-grid stagger">
            ${resourceCard("/files/", "System Files", "Public system files and essential packages for infrastructure.", "124 files", "folder")}
            ${resourceCard("/download/download-User/Template/", "Templates", "Common templates and configuration files for deployment.", "48 files", "doc")}
            ${resourceCard("/download/download-User/Sandbox/", "Sandbox", "Isolated environment packages and test files.", "32 files", "box")}
            ${resourceCard("/download/download-User/LogDB/", "Log Server", "Database exports and system logs for troubleshooting.", "18 files", "server")}
            ${resourceCard("/download/download-User/ISO/", "ISO Images", "Operating systems and installation images.", "76 files", "disc")}
            ${resourceCard("/download/download-Avid/", "Documentation", "Guides, manuals and technical documentation.", "21 files", "book")}
          </div>
        </section>

        <!-- BOTTOM 2-COL: Latest Releases + Quick Access -->
        <section class="bottom-grid">
          <!-- Latest Releases -->
          <div class="panel">
            <div class="panel-head">
              <div class="panel-head-left">
                <div class="panel-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                </div>
                <div>
                  <div class="panel-title">Latest Releases</div>
                  <div class="panel-sub">Recently published packages and updates.</div>
                </div>
              </div>
              <a class="panel-link" href="#">View all <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></a>
            </div>
            <div style="overflow-x:auto">
              <table class="releases-table">
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Package Type</th>
                    <th>Updated</th>
                    <th>Size</th>
                    <th>Checksum</th>
                    <th style="text-align:right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${releaseRow("v2.4.1", true, "System Package", "2025-09-12 14:32", "245 MB", "SHA256")}
                  ${releaseRow("v1.8.7", false, "Template", "2025-09-11 09:16", "18 MB", "SHA256")}
                  ${releaseRow("v3.2.0", false, "ISO Image", "2025-09-10 16:05", "4.8 GB", "SHA256")}
                  ${releaseRow("v5.0.3", false, "Documentation", "2025-09-09 11:23", "12 MB", "SHA256")}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Quick Access -->
          <div class="panel">
            <div class="panel-head">
              <div class="panel-head-left">
                <div class="panel-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                </div>
                <div>
                  <div class="panel-title">Quick Access</div>
                  <div class="panel-sub">Frequently used downloads.</div>
                </div>
              </div>
            </div>
            <div class="quick-list">
              ${quickItem("System Update Package", "v2.4.1 · 245 MB", "cube")}
              ${quickItem("Windows ISO", "Windows 10 · 4.2 GB", "disc")}
              ${quickItem("AV Tools Bundle", "Antivirus & Security · 650 MB", "shield")}
              ${quickItem("Deployment Guide", "PDF Document · 2.8 MB", "doc")}
            </div>
          </div>
        </section>

        <!-- Search results overlay (hidden until search) -->
        <section class="results-panel" id="resultsBox" style="display:none">
          <div class="results-bar">
            <div class="results-bar-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <span id="resultsTitle">Results</span>
            </div>
            <div class="results-bar-meta" id="progress"></div>
          </div>
          <div class="results-body" id="resultsList"></div>
        </section>

        <!-- Status bar -->
        <div class="status-bar">
          <div class="status-item">
            <div class="status-item-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
            </div>
            <div class="status-item-text">
              <span class="status-item-label">Infrastructure Status</span>
              <span class="status-item-sub"><span class="status-dot"></span> All systems operational</span>
            </div>
          </div>
          <div class="status-item">
            <div class="status-item-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m8 6 4 4 4-4"/><path d="M12 18v-8"/><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
            </div>
            <div class="status-item-text">
              <span class="status-item-label">Malware Scanning</span>
              <span class="status-item-sub"><span class="status-dot" style="background:#10b981"></span> 7 engines active</span>
            </div>
          </div>
          <div class="status-item">
            <div class="status-item-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
            </div>
            <div class="status-item-text">
              <span class="status-item-label">Storage</span>
              <span class="status-item-sub"><span class="status-dot" style="background:#f59e0b"></span> 72% used (1.4 TB / 2 TB)</span>
            </div>
          </div>
          <div class="status-item">
            <div class="status-item-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div class="status-item-text">
              <span class="status-item-label">Last Sync</span>
              <span class="status-item-sub"><span class="status-dot" style="background:#0ea5e9"></span> 2025-09-12 14:32</span>
            </div>
          </div>
        </div>

      </div>
    `;
        bindEvents();
    }

    function resourceCard(href, title, desc, meta, iconType) {
        const iconSvg = {
            folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2z"/><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2z" fill="#FFB800" opacity="0.18" stroke="none"/><rect x="6" y="10" width="10" height="1.6" rx="0.8" fill="currentColor" opacity="0.15"/></svg>`,
            doc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`,
            box: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
            server: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>`,
            disc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>`,
            book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="12" y2="15"/></svg>`
        }[iconType] || "";
        return `
      <a class="resource-card" href="${href}">
        <div class="resource-icon">${iconSvg}</div>
        <div class="resource-meta">
          <h3>${title}</h3>
          <p>${desc}</p>
          <div class="resource-bottom"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> ${meta} <span style="margin-left:6px; display:inline-flex; align-items:center; gap:4px;"><span class="dot"></span> Updated</span></div>
        </div>
        <div class="resource-arrow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </div>
      </a>
    `;
    }

    function releaseRow(ver, isNew, type, date, size, checksum) {
        const typeIcon = {
            "System Package": `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
            "Template": `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
            "ISO Image": `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>`,
            "Documentation": `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`
        }[type] || "";
        return `
      <tr>
        <td><div class="version-cell">${ver} ${isNew ? `<span class="badge badge-new">NEW</span>` : ``}</div></td>
        <td><div class="type-cell">${typeIcon} ${type}</div></td>
        <td class="mono">${date}</td>
        <td class="mono">${size}</td>
        <td><span class="mono" style="display:inline-flex; align-items:center; gap:6px;">${checksum} <button class="icon-btn" title="Copy checksum" style="width:16px;height:16px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3"/></svg></button></span></td>
        <td style="text-align:right">
          <div class="row-actions">
            <button class="download-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download</button>
            <button class="icon-btn" aria-label="More"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg></button>
          </div>
        </td>
      </tr>
    `;
    }

    function quickItem(title, sub, iconType) {
        const iconSvg = {
            cube: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
            disc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>`,
            shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 2 2 4-4"/></svg>`,
            doc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`
        }[iconType] || "";
        // override shield svg path correctly
        const fixedIcon = iconType === 'shield' ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>` : iconSvg;
        return `
      <div class="quick-item">
        <div class="quick-icon">${fixedIcon}</div>
        <div class="quick-meta">
          <div class="quick-meta-title">${title}</div>
          <div class="quick-meta-sub">${sub}</div>
        </div>
        <div class="quick-arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>
      </div>
    `;
    }

    function bindEvents() {
        const qInput = document.getElementById("globalSearch");
        const searchBtn = document.getElementById("searchBtn");
        const stopBtn = document.getElementById("stopBtn");

        if (!qInput || !searchBtn) return;

        if (typeof Autocomplete !== "undefined") {
            Autocomplete.bind(qInput);
        }

        const doSearch = () => {
            if (typeof Autocomplete !== "undefined") Autocomplete.hide();
            scanAll(qInput.value || "");
        };

        searchBtn.addEventListener("click", doSearch);
        // Avoid double binding — removed duplicate listener from old version
        stopBtn.addEventListener("click", () => { stopFlag = true; });
        qInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") { e.preventDefault(); doSearch(); }
            if (e.key === "Escape") clearResults();
        });

        window._homeKeyHandler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                qInput.focus();
            }
        };
        window.addEventListener("keydown", window._homeKeyHandler);

        // View toggle demo (visual only)
        const gridBtn = document.getElementById("viewGridBtn");
        const listBtn = document.getElementById("viewListBtn");
        const grid = document.querySelector(".resources-grid");
        if (gridBtn && listBtn && grid) {
            listBtn.addEventListener("click", () => {
                grid.style.gridTemplateColumns = "1fr";
                listBtn.classList.add("active");
                gridBtn.classList.remove("active");
            });
            gridBtn.addEventListener("click", () => {
                grid.style.gridTemplateColumns = "";
                gridBtn.classList.add("active");
                listBtn.classList.remove("active");
                if (window.innerWidth <= 1024) grid.style.gridTemplateColumns = "repeat(2, 1fr)";
                if (window.innerWidth <= 640) grid.style.gridTemplateColumns = "1fr";
            });
        }
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
        row.className = "res-row";
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
        resultsBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
        progressEl.textContent = "Scanning…";
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
            progressEl.textContent = `Scanned ${scanned} dirs · ${found} found`;
        }
        progressEl.textContent = `Done · ${found} found`;
        stopBtn.style.display = "none";
        searchBtn.disabled = false;
        qInput.disabled = false;
        if (!found) {
            resultsList.innerHTML = `<div class="ac-empty">No results for “${query}”</div>`;
        }
    }

    return { render };
})();
