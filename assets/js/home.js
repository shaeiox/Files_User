/* ═══════════════════════════════════════════════════════════════
   home.js — AVID Download Infrastructure
   Skill: UI UX Pro Max — Flat Design + Enterprise Gateway + i18n
   Architecture: Component-based + Service Layer + Progressive Loading

   Dependencies:
   - i18n.js         (window.getDict, window.getLang)
   - resource-service.js (ResourceService)
   - autocomplete.js (Autocomplete) [optional]
   ═══════════════════════════════════════════════════════════════ */

const HomePage = (function () {
  'use strict';

  /* ── Configuration ── */
  const SEARCH_MAX_RESULTS = 200;

  /* ── Internal State ── */
  let stopFlag = false;
  let rawResources = [];      // Cached raw data from API
  let activeCategory = "all"; // Current active category filter
  let activeSort = "latest";  // Current active sort filter

  /* ═══════════════════════════════════════════════
     MAIN RENDER
     ═══════════════════════════════════════════════ */
  function render(container) {
    const d = typeof window.getDict === 'function' ? window.getDict() : getDict();
    document.title = d.pageTitle || "AVID Download • File Portal";

    container.innerHTML = `
      <div class="home-layout">
        ${renderHeroSection(d)}
        ${renderResourcesSection(d)}
        ${renderSearchResultsPanel(d)}
      </div>
    `;

    bindEvents(container);
    loadResources(); // Async fetch infrastructure resources
  }

  /* ═══════════════════════════════════════════════
     SECTION: HERO
     ═══════════════════════════════════════════════ */
  function renderHeroSection(d) {
    return `
      <section class="hero-max">
        
        <!-- [NEW] Background Isolation Layer (overflow: hidden applied here via CSS) -->
        <div class="hero-bg">
          <!-- هاله نوری لوگو حالا اینجا حبس می‌شود -->
          <div class="logo-shader" aria-hidden="true"></div>
        </div>

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
              <input id="globalSearch" type="text" autocomplete="off" placeholder="${d.searchPh || 'Search for files, packages, templates...'}" aria-label="Search files" role="combobox" aria-expanded="false" aria-controls="acDropdown" />
              <div class="search-keys"><kbd>⌘</kbd><kbd>K</kbd></div>
            </div>
            <button class="btn btn-primary" id="searchBtn" type="button">${d.searchBtn || 'Search'}</button>
            <button class="btn" id="stopBtn" type="button" style="display:none">${d.stopBtn || 'Stop'}</button>
          </div>
        </div>

        <div class="hero-visual">
          <!-- لوگوی شفاف اینجا می‌ماند، اما نورش به لایه بک‌گراند رفت -->
          <div class="logo-swap" id="logoSwap">
            <img class="logo-layer logo-dark" src="/assets/icon/logo-2-dark.webp" alt="AVID Download" draggable="false">
            <img class="logo-layer logo-light" src="/assets/icon/logo-2-light.webp" alt="AVID Download" draggable="false">
          </div>
        </div>
      </section>
    `;
  }

  /* ═══════════════════════════════════════════════
     SECTION: INFRASTRUCTURE RESOURCES
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
              <h2 class="section-title">${d.infraTitle || "Infrastructure Resources"}</h2>
              <div class="section-sub">${d.infraSub || "Browse and download all available infrastructure resources and packages."}</div>
            </div>
          </div>
          
          <div class="section-controls">
            
            <!-- 1. Custom Category Filter -->
            <div class="filter-dropdown-wrap" id="catFilterWrap">
              <button class="filter-pill" type="button" aria-haspopup="true">
                <span class="filter-value" data-val="all">${d.allCategories || "All categories"}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="filter-dropdown-menu">
                <button class="filter-option active" data-val="all" type="button">${d.allCategories || "All categories"}</button>
              </div>
            </div>

            <!-- 2. Custom Sort Filter -->
            <div class="filter-dropdown-wrap" id="sortFilterWrap">
              <button class="filter-pill" type="button" aria-haspopup="true">
                <span class="filter-value" data-val="latest">${d.sortLatest || "Sort by: Latest"}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="filter-dropdown-menu">
                <button class="filter-option active" data-val="latest" type="button">${d.sortLatest || "Sort by: Latest"}</button>
                <button class="filter-option" data-val="name-asc" type="button">Sort by: Name (A-Z)</button>
                <button class="filter-option" data-val="count-desc" type="button">Sort by: File Count</button>
              </div>
            </div>

            <!-- Refresh Button -->
            <button class="icon-btn" id="refreshResourcesBtn" title="${d.refresh || 'Refresh'}" aria-label="Refresh resources" type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            </button>

            <!-- Grid/List View Toggle -->
            <div class="view-toggle" role="group" aria-label="View mode">
              <button class="vt-btn active" id="viewGridBtn" aria-label="Grid view" aria-pressed="true" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              </button>
              <button class="vt-btn" id="viewListBtn" aria-label="List view" aria-pressed="false" type="button">
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
     SECTION: BOTTOM PANELS (Latest Releases + Quick Access)
     ═══════════════════════════════════════════════ */
  /**
 * @brief   Renders the bottom layout including Latest Releases (with OS tabs) and Quick Access.
 * @param   {object} d  Dictionary object for i18n.
 * @returns {string}    HTML template string.
 */
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
     RESOURCE CARDS RENDERING & FILTERING
     ═══════════════════════════════════════════════ */
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

  // Triggered on Dropdown selections
  function applyFiltersAndRender() {
    let filtered = [...rawResources];

    // 1. Apply Category Filter
    if (activeCategory !== "all") {
      filtered = filtered.filter(item => item.id === activeCategory);
    }

    // 2. Apply Sorting Filter
    filtered.sort((a, b) => {
      if (activeSort === "name-asc") {
        const titleA = a.name || "";
        const titleB = b.name || "";
        return titleA.localeCompare(titleB);
      } else if (activeSort === "count-desc") {
        const countA = a.stats?.total || 0;
        const countB = b.stats?.total || 0;
        return countB - countA;
      } else { // "latest"
        const timeA = a.stats?.latestModified || 0;
        const timeB = b.stats?.latestModified || 0;
        return timeB - timeA;
      }
    });

    renderResourceCards(filtered);
  }

  function renderResourceCards(resources) {
    const d = typeof window.getDict === 'function' ? window.getDict() : getDict();
    const grid = document.getElementById("resourcesGrid");
    if (!grid) return;

    if (resources.length === 0) {
      grid.innerHTML = `<div class="ac-empty" style="grid-column:1/-1; padding:32px; text-align:center;">${d.empty || "No resources found."}</div>`;
      return;
    }

    grid.innerHTML = resources.map(resource => {
      const title = resource.name;
      const desc = d.categoryDesc || "Browse and download files in this category.";

      let statsBadge;
      if (resource.locked) {
        statsBadge = `<span class="badge badge-locked">${escapeHtml(d.lockedBadge || "Locked")}</span>`;
      } else if (!resource.stats || !resource.stats.available) {
        statsBadge = `<span class="badge badge-error">${d.unavailable || "Unavailable"}</span>`;
      } else if (resource.stats.total === 0) {
        statsBadge = `<span class="stat-empty">${d.emptyFolder || "Empty"}</span>`;
      } else {
        const fileCount = resource.stats.files || 0;
        const folderCount = resource.stats.folders || 0;
        const parts = [];
        if (fileCount) parts.push(fileCount + " " + (fileCount === 1 ? (d.file || "file") : (d.files || "files")));
        if (folderCount) parts.push(folderCount + " " + (folderCount === 1 ? (d.folder || "folder") : (d.folders || "folders")));
        statsBadge = parts.join(" · ") || (d.emptyFolder || "Empty");
      }

      let updatedLabel = resource.locked ? (d.signInToOpen || "Sign in to open") : (d.updated || "Updated");
      if (resource.stats && resource.stats.latestModified) {
        const lang = typeof window.getLang === 'function' ? window.getLang() : getLang();
        updatedLabel = formatDate(resource.stats.latestModified, lang);
      }

      const statusHtml = (resource.stats && resource.stats.available)
        ? `<span class="status-live"><span class="dot"></span> ${updatedLabel}</span>`
        : `<span class="status-error"><span class="dot dot-error"></span> ${d.offline || "Offline"}</span>`;

      return resourceCard(resource.path, title, desc, statsBadge, resource.iconType, statusHtml);
    }).join('');
  }

  function resourceCard(href, title, desc, meta, iconType, statusHtml) {
    const iconSvg = getResourceIcon(iconType);
    return `
      <a class="resource-card" href="${href}">
        <div class="resource-icon">${iconSvg}</div>
        <div class="resource-meta">
          <h3>${escapeHtml(title)}</h3>
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

  function getResourceIcon(iconType) {
    const icons = {
      folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2z"/></svg>`,
      doc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
      box: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
      server: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>`,
      disc: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>`,
      book: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="12" y2="15"/></svg>`,
      shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>`
    };
    return icons[iconType] || icons.folder;
  }

  /* ═══════════════════════════════════════════════
     DATA FETCHING & SYNC
     ═══════════════════════════════════════════════ */
  async function loadResources(options = {}) {
    if (typeof ResourceService === 'undefined') {
      console.error("[Home] ResourceService is not available");
      return;
    }

    try {
      rawResources = await ResourceService.getResources(options);
      populateCategoryFilter(rawResources);
      applyFiltersAndRender();
    } catch (err) {
      console.error("[Home] Failed to load resources:", err);
      const grid = document.getElementById("resourcesGrid");
      if (grid) {
        const d = typeof window.getDict === 'function' ? window.getDict() : getDict();
        grid.innerHTML = `
          <div class="resources-error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>${err && err.message ? err.message : (d.resourcesLoadError || "Unable to load resources. Please try again later.")}</span>
          </div>
        `;
      }
    }
  }

  /* ═══════════════════════════════════════════════
     UI COMPONENTS HELPERS
     ═══════════════════════════════════════════════ */
  function formatDate(ts, lang) {
    try {
      const d = new Date(ts);
      const l = lang === "fa" ? "fa-IR" : "en-US";
      return d.toLocaleDateString(l) + " " + d.toLocaleTimeString(l, { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "—";
    }
  }

  function humanSize(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0) return "—";
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + " " + units[i];
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function populateCategoryFilter(resources) {
    const menu = document.querySelector("#catFilterWrap .filter-dropdown-menu");
    if (!menu) return;
    const d = typeof window.getDict === 'function' ? window.getDict() : getDict();
    menu.innerHTML = "";

    const addOption = (val, label, active) => {
      const btn = document.createElement("button");
      btn.className = "filter-option" + (active ? " active" : "");
      btn.type = "button";
      btn.setAttribute("data-val", val);
      btn.textContent = label;
      menu.appendChild(btn);
    };

    addOption("all", d.allCategories || "All categories", activeCategory === "all");
    resources.forEach((resource) => {
      addOption(resource.id, resource.name, activeCategory === resource.id);
    });
  }

  /* ═══════════════════════════════════════════════
     DOM BINDINGS
     ═══════════════════════════════════════════════ */
  function bindEvents(container) {
    bindSearchEvents();
    bindViewToggleEvents();
    bindRefreshEvent();
    bindFilterEvents();

    bindDownloadInterception(container || document);
  }

  function bindDownloadInterception(container) {
    const root = container || document;

    root.addEventListener("click", async (e) => {
      const link = e.target.closest('[data-url]');
      if (!link) return;

      const downloadUrl = link.getAttribute("data-url");
      if (!downloadUrl) return;

      e.preventDefault();
      e.stopPropagation();

      const originalContent = link.innerHTML;
      link.style.pointerEvents = "none";
      link.innerHTML = "Checking...";

      try {
        const res = await fetch(downloadUrl, {
          method: "HEAD",
          credentials: "same-origin"
        });

        if (res.status === 401 || res.status === 403) {
          if (typeof window.triggerAuthModal === "function") window.triggerAuthModal();
          else if (typeof showLoginModal === "function") showLoginModal();
          return;
        }

        if (res.ok) {
          const a = document.createElement("a");
          a.href = downloadUrl;
          a.download = "";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else {
          alert("خطا در برقراری ارتباط با سرور: " + res.status);
        }

      } catch (err) {
        console.error("Download Interception Error:", err);
      } finally {
        link.style.pointerEvents = "auto";
        link.innerHTML = originalContent;
      }
    });
  }

  function bindFilterEvents() {
    const filterWraps = document.querySelectorAll(".filter-dropdown-wrap");

    filterWraps.forEach(wrap => {
      const pill = wrap.querySelector(".filter-pill");
      const valueSpan = pill.querySelector(".filter-value");

      pill.addEventListener("click", (e) => {
        e.stopPropagation();
        filterWraps.forEach(w => { if (w !== wrap) w.classList.remove("show"); });
        wrap.classList.toggle("show");
      });

      wrap.addEventListener("click", (e) => {
        const opt = e.target.closest(".filter-option");
        if (!opt || !wrap.contains(opt)) return;
        e.stopPropagation();
        const val = opt.getAttribute("data-val");
        const text = opt.textContent;
        valueSpan.textContent = text;
        wrap.querySelectorAll(".filter-option").forEach(o => o.classList.remove("active"));
        opt.classList.add("active");
        if (wrap.id === "catFilterWrap") activeCategory = val;
        if (wrap.id === "sortFilterWrap") activeSort = val;
        wrap.classList.remove("show");
        applyFiltersAndRender();
      });
    });

    document.addEventListener("click", () => {
      filterWraps.forEach(w => w.classList.remove("show"));
    });
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
      const query = qInput.value ? qInput.value.trim() : "";
      if (!query) {
        qInput.focus();
        return;
      }
      if (typeof Autocomplete !== "undefined" && typeof Autocomplete.hide === "function") {
        Autocomplete.hide();
      }
      scanAll(query);
    };

    searchBtn.addEventListener("click", doSearch);

    if (stopBtn) {
      stopBtn.addEventListener("click", () => {
        stopFlag = true;
      });
    }

    qInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        doSearch();
      }
      if (e.key === "Escape") {
        clearResults();
      }
    });

    // Global keyboard shortcut: Cmd/Ctrl + K
    window._homeKeyHandler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        qInput.focus();
        qInput.select();
      }
    };

    window.removeEventListener("keydown", window._homeKeyHandler);
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
      listBtn.setAttribute("aria-pressed", "true");
      gridBtn.setAttribute("aria-pressed", "false");
    });

    gridBtn.addEventListener("click", () => {
      grid.style.gridTemplateColumns = "";
      gridBtn.classList.add("active");
      listBtn.classList.remove("active");
      gridBtn.setAttribute("aria-pressed", "true");
      listBtn.setAttribute("aria-pressed", "false");
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
     SEARCH ENGINE
     ═══════════════════════════════════════════════ */
  function clearResults() {
    const box = document.getElementById("resultsList");
    const panel = document.getElementById("resultsBox");
    if (box) box.innerHTML = "";
    if (panel) panel.style.display = "none";
  }

  function addResult(item) {
    const d = typeof window.getDict === 'function' ? window.getDict() : getDict();
    const list = document.getElementById("resultsList");
    if (!list) return;

    const row = document.createElement("div");
    row.className = "res-row";
    // A locked file opens sign-in (FileActions download guard); a locked folder
    // navigates to its page, which shows the sign-in state.
    const linkAttr = item.locked && item.type === "file" ? 'href="#" data-locked="true"'
      : `href="${escapeHtml(item.href)}"${item.type === "file" ? ' data-file="true"' : ""}`;
    row.innerHTML = `
      <div class="res-info">
        <a ${linkAttr}>${escapeHtml(item.name)}</a>${item.locked ? ` <span class="badge badge-locked">${escapeHtml(d.lockedBadge || "Locked")}</span>` : ""}
        <div class="res-path">${escapeHtml(item.path || item.href)}</div>
      </div>
      <div>
        <span class="badge ${item.type === 'directory' ? 'badge-dir' : 'badge-file'}">
          ${item.type === 'directory' ? (d.dirBadge || 'DIR') : (d.fileBadge || 'FILE')}
        </span>
      </div>`;
    list.appendChild(row);
  }


  async function scanAll(query) {
    const d = typeof window.getDict === 'function' ? window.getDict() : getDict();
    stopFlag = false;

    const resultsBox = document.getElementById("resultsBox");
    const resultsList = document.getElementById("resultsList");
    const progressEl = document.getElementById("progress");
    const searchBtn = document.getElementById("searchBtn");
    const stopBtn = document.getElementById("stopBtn");

    if (!resultsBox || !resultsList) return;

    const q = String(query || "").trim();
    if (!q) {
      clearResults();
      return;
    }

    // UI Reset
    resultsList.innerHTML = "";
    resultsBox.style.display = "block";
    resultsBox.scrollIntoView({ behavior: "smooth", block: "nearest" });

    if (progressEl) progressEl.textContent = d.scanning || "Scanning…";
    if (stopBtn) stopBtn.style.display = "inline-flex";
    if (searchBtn) searchBtn.disabled = true;

    let found = 0;
    let scanned = 0;

    try {
      const data = await ResourceService.search(q, { limit: SEARCH_MAX_RESULTS });
      scanned = data.scanned || 0;
      const entries = data.results || [];

      for (const e of entries) {
        if (stopFlag) break;
        if (!e || !e.name) continue;

        const type = e.type === "directory" ? "directory" : "file";
        const href = type === "directory"
          ? ResourceService.browseHref(e.path)
          : ResourceService.downloadHref(e.path);

        addResult({ name: e.name, href, path: e.path, type, locked: e.locked === true });
        found++;
      }

      if (progressEl) {
        progressEl.textContent = `${d.done || 'Done'} · ${found} ${d.foundText || 'found'}`;
      }
    } catch (err) {
      console.error("[Search Error]:", err);
      if (progressEl) progressEl.textContent = d.resourcesLoadError || "Search failed";
      resultsList.innerHTML = `<div class="resources-error" style="padding:20px;">${escapeHtml(err.message || "Failed to perform search.")}</div>`;
    } finally {
      if (stopBtn) stopBtn.style.display = "none";
      if (searchBtn) searchBtn.disabled = false;
    }

    if (!found && !stopFlag && resultsList.children.length === 0) {
      resultsList.innerHTML = `<div class="ac-empty" style="padding:24px; text-align:center;">${d.emptySearch || 'No results for'} "${escapeHtml(q)}"</div>`;
    }
  }

  /* ═══════════════════════════════════════════════
     AUTHENTICATION MODAL
     ═══════════════════════════════════════════════ */
  function showLoginModal(onSuccessCallback) {
    const d = typeof window.getDict === 'function' ? window.getDict() : getDict();
    if (document.getElementById('authOverlay')) return;

    const overlay = document.createElement('div');
    overlay.className = 'auth-overlay';
    overlay.id = 'authOverlay';

    const formDir = d.dir === 'rtl' ? 'text-align: right;' : 'text-align: left;';

    overlay.innerHTML = `
      <div class="auth-modal" style="${formDir}">
        <button class="btn-close-modal" id="closeAuthBtn" style="${d.dir === 'rtl' ? 'left: 16px; right: auto;' : ''}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div class="auth-header" style="text-align: center;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <h2>${d.clearanceReq || "Clearance Required"}</h2>
        </div>
        <form class="auth-form" id="authForm">
          <div class="auth-input-group">
            <label>${d.lblUsername || "Username"}</label>
            <input type="text" id="authUsername" autocomplete="username" style="${formDir}" required autofocus />
          </div>
          <div class="auth-input-group">
            <label>${d.lblPassword || "Password"}</label>
            <input type="password" id="authPassword" autocomplete="current-password" style="${formDir}" required />
          </div>
          <div class="auth-error" id="authError"></div>
          <button type="submit" class="btn-login" id="authSubmitBtn">${d.btnSignIn || "Sign In"}</button>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));

    const closeModal = () => {
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 250);
    };
    document.getElementById('closeAuthBtn').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    document.getElementById('authForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = document.getElementById('authUsername').value.trim();
      const pass = document.getElementById('authPassword').value;
      const errDiv = document.getElementById('authError');
      const submitBtn = document.getElementById('authSubmitBtn');

      errDiv.textContent = "";
      submitBtn.disabled = true;
      submitBtn.innerHTML = d.btnAuthenticating || "Authenticating...";

      try {
        await ResourceService.login(user, pass);
        closeModal();
        if (typeof onSuccessCallback === "function") {
          onSuccessCallback();
        }
      } catch (err) {
        errDiv.textContent = err.message;
        submitBtn.disabled = false;
        submitBtn.innerHTML = d.btnSignIn || "Sign In";

        if (err.message.includes("Too many")) {
          document.getElementById('authUsername').disabled = true;
          document.getElementById('authPassword').disabled = true;
        }
      }

    });
    window.triggerAuthModal = showLoginModal;
  }

  /* ═══════════════════════════════════════════════
     PUBLIC API
     ═══════════════════════════════════════════════ */
  return {
    render,
    refreshResources: () => loadResources({ forceRefresh: true }),
    showLoginModal
  };
})();
