/* ═══════════════════════════════════════════════════════════════
   home.js — AVID Download Infrastructure
   Skill: UI UX Pro Max — Flat Design + Enterprise Gateway + i18n
   Architecture: Component-based + Service Layer + Progressive Loading
   
   Dependencies:
   - i18n.js         (getDict, getLang)
   - resource-service.js (ResourceService)
   - autocomplete.js (Autocomplete) [optional]
   ═══════════════════════════════════════════════════════════════ */

const HomePage = (function () {
  'use strict';

  /* ── Configuration ── */
  const SEARCH_ROOTS = [
    "/download/download-User/",
    "/download/download-Avid/",
    "/files/"
  ];
  const SEARCH_MAX_RESULTS = 200;

  /* ── Internal State ── */
  let stopFlag = false;

  /* ═══════════════════════════════════════════════
     MAIN RENDER
     ═══════════════════════════════════════════════ */
  function render(container) {
    const d = getDict();
    document.title = d.pageTitle || "AVID Download • File Portal";

    container.innerHTML = `
      <div class="home-layout">
        ${renderHeroSection(d)}
        ${renderResourcesSection(d)}
        ${renderBottomSection(d)}
        ${renderSearchResultsPanel(d)}
        ${renderStatusBar(d)}
      </div>
    `;

    bindEvents();
    loadResources(); // 🚀 Fetch real infrastructure data
  }

  /* ═══════════════════════════════════════════════
     SECTION: HERO
     ═══════════════════════════════════════════════ */
  function renderHeroSection(d) {
    return `
      <section class="hero-max">
        <div class="hero-content">
          <div class="hero-pill">
            <span class="hero-pill-dot"></span>
            ${d.portalStatus || "YOUR INFRASTRUCTURE. WITH AVID."}
          </div>
          <h1>
            ${d.heroTitle || `<span class="avid">AVID</span> <span class="accent">Download</span><br>Infrastructure`}
          </h1>
          <p class="hero-desc">
            ${d.desc || "Access software packages, ISO images, templates and system logs — provided by CloudAvid infrastructure team."}
          </p>
          <div class="hero-search">
            <div class="input-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              <input id="globalSearch" type="text" autocomplete="off" placeholder="${d.searchPh || 'Search for files, packages, templates...'}" aria-label="Search files" />
              <div class="search-keys"><kbd>⌘</kbd><kbd>K</kbd></div>
            </div>
            <button class="btn btn-primary" id="searchBtn" type="button">${d.searchBtn || 'Search'}</button>
            <button class="btn" id="stopBtn" type="button" style="display:none">${d.stopBtn || 'Stop'}</button>
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
    `;
  }

  /* ═══════════════════════════════════════════════
     SECTION: INFRASTRUCTURE RESOURCES
     Initial render shows Skeleton placeholders
     Real data is loaded asynchronously via loadResources()
     ═══════════════════════════════════════════════ */
  function renderResourcesSection(d) {
    return `
      <section class="resources-section">
        <div class="section-head">
          <div class="section-head-left">
            <div class="section-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            </div>
            <div>
              <div class="section-title">${d.infraTitle || "Infrastructure Resources"}</div>
              <div class="section-sub">${d.infraSub || "Browse and download all available infrastructure resources and packages."}</div>
            </div>
          </div>
          <div class="section-controls">
            <label class="select-pill">
              <span>${d.allCategories || "All categories"}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </label>
            <label class="select-pill">
              <span>${d.sortLatest || "Sort by: Latest"}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </label>
            <button class="icon-btn" id="refreshResourcesBtn" title="${d.refresh || 'Refresh'}" aria-label="Refresh resources">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            </button>
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

        <div class="resources-grid stagger" id="resourcesGrid">
          ${renderSkeletonCards()}
        </div>
      </section>
    `;
  }

  /* ═══════════════════════════════════════════════
     SECTION: BOTTOM (Latest Releases + Quick Access)
     Note: Still uses mock data. Can be wired to a service later.
     ═══════════════════════════════════════════════ */
  function renderBottomSection(d) {
    return `
      <section class="bottom-grid">
        <div class="panel">
          <div class="panel-head">
            <div class="panel-head-left">
              <div class="panel-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              </div>
              <div>
                <div class="panel-title">${d.latestReleases || "Latest Releases"}</div>
                <div class="panel-sub">${d.latestSub || "Recently published packages and updates."}</div>
              </div>
            </div>
            <a class="panel-link" href="#">${d.viewAll || "View all"} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></a>
          </div>
          <div style="overflow-x:auto">
            <table class="releases-table">
              <thead>
                <tr>
                  <th>${d.thVersion || "Version"}</th>
                  <th>${d.thType || "Package Type"}</th>
                  <th>${d.thUpdated || "Updated"}</th>
                  <th>${d.thSize || "Size"}</th>
                  <th>${d.thChecksum || "Checksum"}</th>
                  <th style="text-align:${d.dir === 'rtl' ? 'left' : 'right'}">${d.thAction || "Action"}</th>
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

        <div class="panel">
          <div class="panel-head">
            <div class="panel-head-left">
              <div class="panel-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              </div>
              <div>
                <div class="panel-title">${d.quickAccess || "Quick Access"}</div>
                <div class="panel-sub">${d.quickSub || "Frequently used downloads."}</div>
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
    `;
  }

  /* ═══════════════════════════════════════════════
     SECTION: SEARCH RESULTS PANEL
     ═══════════════════════════════════════════════ */
  function renderSearchResultsPanel(d) {
    return `
      <section class="results-panel" id="resultsBox" style="display:none">
        <div class="results-bar">
          <div class="results-bar-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <span id="resultsTitle">${d.results || "Results"}</span>
          </div>
          <div class="results-bar-meta" id="progress"></div>
        </div>
        <div class="results-body" id="resultsList"></div>
      </section>
    `;
  }

  /* ═══════════════════════════════════════════════
     SECTION: STATUS BAR
     ═══════════════════════════════════════════════ */
  function renderStatusBar(d) {
    return `
      <div class="status-bar">
        <div class="status-item">
          <div class="status-item-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
          </div>
          <div class="status-item-text">
            <span class="status-item-label">${d.statusInfra || "Infrastructure Status"}</span>
            <span class="status-item-sub"><span class="status-dot"></span> ${d.statusOperational || "All systems operational"}</span>
          </div>
        </div>
        <div class="status-item">
          <div class="status-item-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m8 6 4 4 4-4"/><path d="M12 18v-8"/><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
          </div>
          <div class="status-item-text">
            <span class="status-item-label">${d.statusMalware || "Malware Scanning"}</span>
            <span class="status-item-sub"><span class="status-dot" style="background:#10b981"></span> 7 ${d.statusEngines || "engines active"}</span>
          </div>
        </div>
        <div class="status-item">
          <div class="status-item-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
          </div>
          <div class="status-item-text">
            <span class="status-item-label">${d.statusStorage || "Storage"}</span>
            <span class="status-item-sub"><span class="status-dot" style="background:#f59e0b"></span> 72% ${d.statusUsed || "used"} (1.4 TB / 2 TB)</span>
          </div>
        </div>
        <div class="status-item">
          <div class="status-item-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div class="status-item-text">
            <span class="status-item-label">${d.statusSync || "Last Sync"}</span>
            <span class="status-item-sub"><span class="status-dot" style="background:#0ea5e9"></span> <span id="lastSyncTime">—</span></span>
          </div>
        </div>
      </div>
    `;
  }

  /* ═══════════════════════════════════════════════
     RESOURCE CARDS — Skeleton & Real Rendering
     ═══════════════════════════════════════════════ */

  // Render skeleton placeholders while data is being fetched
  function renderSkeletonCards() {
    if (typeof ResourceService === 'undefined') {
      return '<div class="resources-error">ResourceService not loaded</div>';
    }
    return ResourceService.getRegistry().map(() => `
      <div class="resource-card resource-card-skeleton" aria-busy="true">
        <div class="resource-icon skeleton-box"></div>
        <div class="resource-meta">
          <h3 class="skeleton-line skeleton-line-title"></h3>
          <p class="skeleton-line skeleton-line-desc"></p>
          <p class="skeleton-line skeleton-line-desc-sm"></p>
          <div class="resource-bottom">
            <span class="skeleton-line skeleton-line-meta"></span>
          </div>
        </div>
      </div>
    `).join('');
  }

  // Render real resource cards after data arrives from the service
  function renderResourceCards(resources) {
    const d = getDict();
    const grid = document.getElementById("resourcesGrid");
    if (!grid) return;

    grid.innerHTML = resources.map(resource => {
      const title = d[resource.titleKey] || resource.defaultTitle;
      const desc = d[resource.descKey] || resource.defaultDesc;

      // Build stats badge based on availability
      let statsBadge;
      if (!resource.stats.available) {
        statsBadge = `<span class="badge badge-error">${d.unavailable || "Unavailable"}</span>`;
      } else if (resource.stats.total === 0) {
        statsBadge = `<span class="stat-empty">${d.emptyFolder || "Empty"}</span>`;
      } else {
        const count = resource.stats.total;
        const label = count === 1 ? (d.file || "file") : (d.files || "files");
        statsBadge = `${count} ${label}`;
      }

      // Build status indicator
      const statusHtml = resource.stats.available
        ? `<span class="status-live"><span class="dot"></span> ${d.updated || "Updated"}</span>`
        : `<span class="status-error"><span class="dot dot-error"></span> ${d.offline || "Offline"}</span>`;

      return resourceCard(resource.path, title, desc, statsBadge, resource.iconType, statusHtml);
    }).join('');

    // Update last sync time in status bar
    updateLastSyncTime();
  }

  // Card component template
  function resourceCard(href, title, desc, meta, iconType, statusHtml) {
    const iconSvg = getResourceIcon(iconType);
    return `
      <a class="resource-card" href="${href}">
        <div class="resource-icon">${iconSvg}</div>
        <div class="resource-meta">
          <h3>${title}</h3>
          <p>${desc}</p>
          <div class="resource-bottom">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span>${meta}</span>
            <span class="resource-status">${statusHtml}</span>
          </div>
        </div>
        <div class="resource-arrow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </div>
      </a>
    `;
  }

  // Icon library for resource cards
  function getResourceIcon(iconType) {
    const icons = {
      folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2z"/><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2z" fill="#FFB800" opacity="0.18" stroke="none"/><rect x="6" y="10" width="10" height="1.6" rx="0.8" fill="currentColor" opacity="0.15"/></svg>`,
      doc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`,
      box: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
      server: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>`,
      disc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>`,
      book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="12" y2="15"/></svg>`
    };
    return icons[iconType] || icons.folder;
  }

  /* ═══════════════════════════════════════════════
     DATA LOADING — Async fetch via ResourceService
     ═══════════════════════════════════════════════ */
  async function loadResources(options = {}) {
    if (typeof ResourceService === 'undefined') {
      console.error("[Home] ResourceService is not available");
      return;
    }

    try {
      const resources = await ResourceService.getResources(options);
      renderResourceCards(resources);
    } catch (err) {
      console.error("[Home] Failed to load resources:", err);
      const grid = document.getElementById("resourcesGrid");
      if (grid) {
        const d = getDict();
        grid.innerHTML = `
          <div class="resources-error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>${d.resourcesLoadError || "Unable to load resources. Please try again later."}</span>
          </div>
        `;
      }
    }
  }

  // Update the "Last Sync" timestamp in the status bar
  function updateLastSyncTime() {
    const el = document.getElementById("lastSyncTime");
    if (!el) return;
    const now = new Date();
    const lang = getLang();
    const locale = lang === "fa" ? "fa-IR" : "en-US";
    el.textContent = now.toLocaleDateString(locale) + " " +
      now.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  }

  /* ═══════════════════════════════════════════════
     RELEASE ROW COMPONENT
     ═══════════════════════════════════════════════ */
  function releaseRow(ver, isNew, type, date, size, checksum) {
    const d = getDict();
    const typeIcons = {
      "System Package": `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
      "Template": `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
      "ISO Image": `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>`,
      "Documentation": `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`
    };
    const typeIcon = typeIcons[type] || "";

    return `
      <tr>
        <td><div class="version-cell">${ver} ${isNew ? `<span class="badge badge-new">${d.badgeNew || "NEW"}</span>` : ``}</div></td>
        <td><div class="type-cell">${typeIcon} ${type}</div></td>
        <td class="mono">${date}</td>
        <td class="mono">${size}</td>
        <td><span class="mono" style="display:inline-flex; align-items:center; gap:6px;">${checksum} <button class="icon-btn" title="Copy checksum" style="width:16px;height:16px"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3"/></svg></button></span></td>
        <td style="text-align:${d.dir === 'rtl' ? 'left' : 'right'}">
          <div class="row-actions">
            <button class="download-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> ${d.btnDownload || "Download"}</button>
            <button class="icon-btn" aria-label="More"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg></button>
          </div>
        </td>
      </tr>
    `;
  }

  /* ═══════════════════════════════════════════════
     QUICK ACCESS ITEM COMPONENT
     ═══════════════════════════════════════════════ */
  function quickItem(title, sub, iconType) {
    const icons = {
      cube: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
      disc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>`,
      shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>`,
      doc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`
    };
    const icon = icons[iconType] || icons.doc;

    return `
      <div class="quick-item">
        <div class="quick-icon">${icon}</div>
        <div class="quick-meta">
          <div class="quick-meta-title">${title}</div>
          <div class="quick-meta-sub">${sub}</div>
        </div>
        <div class="quick-arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>
      </div>
    `;
  }

  /* ═══════════════════════════════════════════════
     EVENT BINDING
     ═══════════════════════════════════════════════ */
  function bindEvents() {
    bindSearchEvents();
    bindViewToggleEvents();
    bindRefreshEvent();
  }

  function bindSearchEvents() {
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
    stopBtn.addEventListener("click", () => { stopFlag = true; });
    qInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); doSearch(); }
      if (e.key === "Escape") clearResults();
    });

    // Global keyboard shortcut: Cmd/Ctrl + K
    window._homeKeyHandler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        qInput.focus();
      }
    };
    window.addEventListener("keydown", window._homeKeyHandler);
  }

  function bindViewToggleEvents() {
    const gridBtn = document.getElementById("viewGridBtn");
    const listBtn = document.getElementById("viewListBtn");
    const grid = document.querySelector(".resources-grid");
    if (!gridBtn || !listBtn || !grid) return;

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

  function bindRefreshEvent() {
    const refreshBtn = document.getElementById("refreshResourcesBtn");
    if (!refreshBtn) return;

    refreshBtn.addEventListener("click", async () => {
      refreshBtn.classList.add("spinning");
      const grid = document.getElementById("resourcesGrid");
      if (grid) grid.innerHTML = renderSkeletonCards();

      try {
        await loadResources({ forceRefresh: true });
      } finally {
        setTimeout(() => refreshBtn.classList.remove("spinning"), 500);
      }
    });
  }

  /* ═══════════════════════════════════════════════
     SEARCH ENGINE — Deep scan across all roots
     ═══════════════════════════════════════════════ */
  function isHidden(n) {
    return (n || "").toLowerCase() === "index.html" || (n || "").startsWith(".");
  }

  function clearResults() {
    const box = document.getElementById("resultsList");
    const panel = document.getElementById("resultsBox");
    if (box) box.innerHTML = "";
    if (panel) panel.style.display = "none";
  }

  function addResult(item) {
    const d = getDict();
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
          ${item.type === 'directory' ? (d.dirBadge || 'DIR') : (d.fileBadge || 'FILE')}
        </span>
      </div>`;
    list.appendChild(row);
  }

  async function scanAll(query) {
    const d = getDict();
    stopFlag = false;

    const resultsBox = document.getElementById("resultsBox");
    const resultsList = document.getElementById("resultsList");
    const progressEl = document.getElementById("progress");
    const searchBtn = document.getElementById("searchBtn");
    const stopBtn = document.getElementById("stopBtn");
    const qInput = document.getElementById("globalSearch");

    if (!resultsBox) return;

    // Prepare UI state
    resultsList.innerHTML = "";
    resultsBox.style.display = "block";
    resultsBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
    progressEl.textContent = d.scanning || "Scanning…";
    stopBtn.style.display = "inline-flex";
    searchBtn.disabled = true;
    qInput.disabled = true;

    const q = query.trim().toLowerCase();
    let found = 0;
    let scanned = 0;
    const queue = [...SEARCH_ROOTS];

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
            if (found >= SEARCH_MAX_RESULTS) { stopFlag = true; break; }
          }
        }
      } catch { }

      progressEl.textContent = `${d.scannedDirs || 'Scanned'} ${scanned} · ${found} ${d.foundText || 'found'}`;
    }

    // Finalize UI state
    progressEl.textContent = `${d.done || 'Done'} · ${found} ${d.foundText || 'found'}`;
    stopBtn.style.display = "none";
    searchBtn.disabled = false;
    qInput.disabled = false;

    if (!found) {
      resultsList.innerHTML = `<div class="ac-empty">${d.emptySearch || 'No results for'} "${query}"</div>`;
    }
  }

  /* ═══════════════════════════════════════════════
     PUBLIC API
     ═══════════════════════════════════════════════ */
  return {
    render,
    refreshResources: () => loadResources({ forceRefresh: true })
  };
})();