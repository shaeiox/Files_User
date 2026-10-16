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
        ${renderTrustBand(d)}
      </div>
    `;

    bindEvents();
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
              <input id="globalSearch" type="text" autocomplete="off" placeholder="${d.searchPh || 'Search for files, packages, templates...'}" aria-label="${d.searchAria || 'Search files'}" role="combobox" aria-expanded="false" aria-controls="acDropdown" />
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
      <section class="resources-section" data-reveal>
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
                <button class="filter-option" data-val="name-asc" type="button">${d.sortByName || "Sort by: Name (A-Z)"}</button>
                <button class="filter-option" data-val="count-desc" type="button">${d.sortByCount || "Sort by: File Count"}</button>
              </div>
            </div>

            <!-- Refresh Button -->
            <button class="icon-btn" id="refreshResourcesBtn" title="${d.refresh || 'Refresh'}" aria-label="${d.refreshResources || 'Refresh resources'}" type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            </button>

            <!-- Grid/List View Toggle -->
            <div class="view-toggle" role="group" aria-label="${d.viewMode || 'View mode'}">
              <button class="vt-btn active" id="viewGridBtn" aria-label="${d.viewGrid || 'Grid view'}" aria-pressed="true" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              </button>
              <button class="vt-btn" id="viewListBtn" aria-label="${d.viewList || 'List view'}" aria-pressed="false" type="button">
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
     SECTION: CLOSING TRUST BAND (ui-craft-elevation 4.5)
     A real, checkable signal: every file can be verified against its SHA-256
     checksum from the Browse page's metadata card.
     ═══════════════════════════════════════════════ */
  function renderTrustBand(d) {
    return `
      <section class="trust-band" data-reveal>
        <div class="trust-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
        </div>
        <div class="trust-copy">
          <h2 class="trust-title">${d.trustTitle || "Verify what you download"}</h2>
          <p class="trust-desc">${d.trustDesc || "Every file in this portal can be checked against its SHA-256 checksum before you install it. Open a file's details on the Browse page and choose Verify SHA-256."}</p>
        </div>
        <a class="btn trust-link" href="/browse">${d.trustLink || "Open Browse"}</a>
      </section>
    `;
  }

  /* ═══════════════════════════════════════════════
     RESOURCE CARDS RENDERING & FILTERING
     ═══════════════════════════════════════════════ */
  function renderSkeletonCards() {
    if (typeof ResourceService === 'undefined') {
      const d = typeof window.getDict === 'function' ? window.getDict() : {};
      return `<div class="resources-error">${escapeHtml(d.resourcesLoadError || "Unable to load resources.")}</div>`;
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

    // ui-craft-elevation 4.3: the featured resource is chosen from the data
    // (the most recently updated open category), not a fixed index, and only
    // when there are enough cards for a hierarchy to mean something.
    let featuredId = null;
    if (filtered.length > 3) {
      const open = filtered.filter(r => !r.locked && r.stats && r.stats.available && r.stats.latestModified);
      if (open.length) {
        const top = open.reduce((a, b) => (b.stats.latestModified > a.stats.latestModified ? b : a));
        featuredId = top.id;
        filtered = [top, ...filtered.filter(r => r !== top)];
      }
    }

    renderResourceCards(filtered, featuredId);
  }

  /**
   * Keyed render: a card whose markup is unchanged is the SAME element after a
   * filter or sort, so Motion.flip can move it from its old position to its new
   * one; excluded cards animate out, new ones animate in (3.4).
   */
  function renderResourceCards(resources, featuredId) {
    const d = typeof window.getDict === 'function' ? window.getDict() : getDict();
    const grid = document.getElementById("resourcesGrid");
    if (!grid) return;

    if (resources.length === 0) {
      grid.innerHTML = `<div class="ac-empty" style="grid-column:1/-1; padding:32px; text-align:center;">${d.empty || "No resources found."}</div>`;
      return;
    }

    const cards = resources.map(resource => {
      // Per-card description (1.1): resolved inside the callback from the
      // dictionary, keyed by this category's id. None → no <p> at all.
      const desc = (d.categoryDescs && d.categoryDescs[resource.id]) || "";

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

      const featured = resource.id === featuredId ? (d.featuredTag || "Recently updated") : "";
      return {
        key: String(resource.id),
        html: resourceCard(resource.path, resource.name, desc, statsBadge, resource.iconType, statusHtml, featured)
      };
    });

    const mutate = () => {
      const existing = new Map();
      Array.from(grid.children).forEach(el => {
        if (el.dataset.key) existing.set(el.dataset.key, el);
        else el.remove(); // skeletons, empty and error states are not cards
      });
      const kept = new Set();
      for (const { key, html } of cards) {
        let el = existing.get(key);
        if (!el || el.dataset.sig !== html) {
          if (el) el.remove();
          const tpl = document.createElement("template");
          tpl.innerHTML = html.trim();
          el = tpl.content.firstElementChild;
          el.dataset.key = key;
          el.dataset.sig = html;
        }
        kept.add(el);
        grid.appendChild(el);
      }
      return Array.from(existing.values()).filter(el => el.isConnected && !kept.has(el));
    };

    if (typeof Motion !== "undefined") Motion.flip(grid, mutate);
    else mutate().forEach(el => el.remove());
  }

  function resourceCard(href, title, desc, meta, iconType, statusHtml, featuredTag) {
    const iconSvg = getResourceIcon(iconType);
    return `
      <a class="resource-card${featuredTag ? " is-featured" : ""}" href="${href}">
        <div class="resource-icon">${iconSvg}</div>
        <div class="resource-meta">
          ${featuredTag ? `<span class="resource-featured-tag">${escapeHtml(featuredTag)}</span>` : ""}
          <h3>${escapeHtml(title)}</h3>
          ${desc ? `<p>${escapeHtml(desc)}</p>` : ""}
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
  // Downloads started from this route (search results, autocomplete) go
  // through the app-wide guard in file-actions.js, which reports progress on
  // the control and failure in place (ui-craft-elevation 1.2 / 6.7). The
  // [data-url] interceptor that used to live here matched no element and
  // raised a hardcoded Persian alert(); it is removed.
  function bindEvents() {
    bindSearchEvents();
    bindViewToggleEvents();
    bindRefreshEvent();
    bindFilterEvents();
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

    // ui-craft-elevation 3.5: the buttons report the new mode at once; the
    // cards fade and shrink out, the layout class flips, and they fade back
    // in. The swap reads the latest choice, so rapid toggling settles right.
    let wantList = grid.classList.contains("is-list");
    const setMode = (list) => {
      wantList = list;
      listBtn.classList.toggle("active", list);
      gridBtn.classList.toggle("active", !list);
      listBtn.setAttribute("aria-pressed", list ? "true" : "false");
      gridBtn.setAttribute("aria-pressed", list ? "false" : "true");
      if (grid.classList.contains("is-list") === list) return;
      const swap = () => grid.classList.toggle("is-list", wantList);
      if (typeof Motion !== "undefined") Motion.crossfade(Array.from(grid.children), swap);
      else swap();
    };

    listBtn.addEventListener("click", () => setMode(true));
    gridBtn.addEventListener("click", () => setMode(false));
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

  function addResult(item, index) {
    const d = typeof window.getDict === 'function' ? window.getDict() : getDict();
    const list = document.getElementById("resultsList");
    if (!list) return;

    const row = document.createElement("div");
    row.className = "res-row";
    // A locked file opens sign-in (FileActions download guard); a locked folder
    // navigates to its page, which shows the sign-in state.
    const linkAttr = item.locked && item.type === "file" ? 'href="#" data-locked="true"'
      : item.viewOnly && item.type === "file" ? 'aria-disabled="true"'
      : `href="${escapeHtml(item.href)}"${item.type === "file" ? ' data-file="true"' : ""}`;
    row.innerHTML = `
      <div class="res-info">
        <a ${linkAttr}>${escapeHtml(item.name)}</a>${item.locked ? ` <span class="badge badge-locked">${escapeHtml(d.lockedBadge || "Locked")}</span>`
          : item.viewOnly && item.type === "file" ? ` <span class="badge badge-locked">${escapeHtml(d.viewOnlyBadge || "View only")}</span>` : ""}
        <div class="res-path">${escapeHtml(item.path || item.href)}</div>
      </div>
      <div>
        <span class="badge ${item.type === 'directory' ? 'badge-dir' : 'badge-file'}">
          ${item.type === 'directory' ? (d.dirBadge || 'DIR') : (d.fileBadge || 'FILE')}
        </span>
      </div>`;
    list.appendChild(row);
    // Staged reveal, capped at ten steps inside Motion.enter (3.9).
    if (typeof Motion !== "undefined") Motion.enter(row, index);
  }

  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
  const RESULT_BATCH = 10;

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

    // UI Reset. The panel replays its entrance on EVERY search, not only the
    // first time it is un-hidden; nothing depends on the previous run (3.9).
    resultsList.innerHTML = "";
    resultsBox.style.display = "block";
    if (typeof Motion !== "undefined") Motion.pop(resultsBox);
    resultsBox.scrollIntoView({ behavior: "smooth", block: "nearest" });

    if (progressEl) progressEl.textContent = d.scanning || "Scanning…";
    if (stopBtn) stopBtn.style.display = "inline-flex";
    if (searchBtn) searchBtn.disabled = true;

    let found = 0;
    let failed = false;

    try {
      const data = await ResourceService.search(q, { limit: SEARCH_MAX_RESULTS });
      const entries = data.results || [];

      for (const e of entries) {
        if (stopFlag) break;
        if (!e || !e.name) continue;

        const type = e.type === "directory" ? "directory" : "file";
        const href = type === "directory"
          ? ResourceService.browseHref(e.path)
          : ResourceService.downloadHref(e.path);

        addResult({ name: e.name, href, path: e.path, type, locked: e.locked === true, viewOnly: e.viewOnly === true }, found);
        found++;

        // Rows land in batches, one per frame, and the count follows them, so
        // a large result set visibly progresses (bounded: 200 max = 20 frames).
        if (found % RESULT_BATCH === 0) {
          if (progressEl) progressEl.textContent = `${found} ${d.foundText || 'found'}…`;
          await nextFrame();
        }
      }

      if (progressEl) {
        progressEl.textContent = `${d.done || 'Done'} · ${found} ${d.foundText || 'found'}`;
      }
    } catch (err) {
      failed = true;
      console.error("[Search Error]:", err);
      if (progressEl) progressEl.textContent = d.resourcesLoadError || "Search failed";
      resultsList.innerHTML = `<div class="resources-error" style="padding:20px;">${escapeHtml(err.message || "Failed to perform search.")}</div>`;
    } finally {
      if (stopBtn) stopBtn.style.display = "none";
      if (searchBtn) searchBtn.disabled = false;
    }

    if (!found && !stopFlag && !failed) renderEmptySearch(resultsList, q, d);
  }

  /** Composed empty state: names the query and offers a way out. */
  function renderEmptySearch(list, q, d) {
    const msg = escapeHtml(d.emptySearchFor || "Nothing matches “%q”.")
      .replace("%q", `<strong>${escapeHtml(q)}</strong>`);
    list.innerHTML = `
      <div class="results-empty">
        <p>${msg}</p>
        <p>${escapeHtml(d.emptySearchHint || "Check the spelling, or search for a shorter part of the name.")}</p>
        <button class="btn btn-sm" type="button" data-clear-search>${escapeHtml(d.clearSearch || "Clear search")}</button>
      </div>`;
    list.querySelector("[data-clear-search]").addEventListener("click", () => {
      const input = document.getElementById("globalSearch");
      clearResults();
      if (input) { input.value = ""; input.focus(); }
    });
  }

  /* ═══════════════════════════════════════════════
     AUTHENTICATION MODAL
     ui-craft-elevation 6.4/6.5: a real dialog — role="dialog", aria-modal and
     an accessible name, focus moved to the first field once the overlay is
     interactive, Tab trapped inside, Escape to close, and focus returned to
     the control that opened it. The existing 250ms open/close timing is kept
     (design D10), so this is not yet a native <dialog>.
     ═══════════════════════════════════════════════ */
  const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

  function showLoginModal(onSuccessCallback) {
    const d = typeof window.getDict === 'function' ? window.getDict() : getDict();
    if (document.getElementById('authOverlay')) return;

    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overlay = document.createElement('div');
    overlay.className = 'auth-overlay';
    overlay.id = 'authOverlay';

    const formDir = d.dir === 'rtl' ? 'text-align: right;' : 'text-align: left;';
    const closeLabel = escapeHtml(d["aria.closeDialog"] || "Close sign-in");

    overlay.innerHTML = `
      <div class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="authTitle" style="${formDir}">
        <button class="btn-close-modal" id="closeAuthBtn" type="button" aria-label="${closeLabel}" title="${closeLabel}" style="${d.dir === 'rtl' ? 'left: 16px; right: auto;' : ''}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div class="auth-header" style="text-align: center;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          <h2 id="authTitle">${d.clearanceReq || "Clearance Required"}</h2>
        </div>
        <form class="auth-form" id="authForm">
          <div class="auth-input-group">
            <label for="authUsername">${d.lblUsername || "Username"}</label>
            <input type="text" id="authUsername" autocomplete="username" style="${formDir}" required />
          </div>
          <div class="auth-input-group">
            <label for="authPassword">${d.lblPassword || "Password"}</label>
            <input type="password" id="authPassword" autocomplete="current-password" style="${formDir}" required />
          </div>
          <div class="auth-error" id="authError" role="alert"></div>
          <button type="submit" class="btn-login" id="authSubmitBtn">${d.btnSignIn || "Sign In"}</button>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);
    const modal = overlay.querySelector('.auth-modal');

    // Focus only once the overlay is interactive (.show enables pointer
    // events), so focus never sits in an element that cannot be typed into.
    requestAnimationFrame(() => {
      overlay.classList.add('show');
      const first = modal.querySelector('#authUsername:not([disabled])') || modal.querySelector(FOCUSABLE);
      if (first) first.focus();
    });

    let closed = false;
    const closeModal = () => {
      if (closed) return;
      closed = true;
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 250);
      // Back to the opener; if it has since left the DOM (a re-render), fall
      // back to the navbar sign-in control so focus is never on a dead node.
      const target = trigger && trigger.isConnected ? trigger : document.getElementById('authBtn');
      if (target && typeof target.focus === 'function') target.focus();
    };

    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = Array.from(modal.querySelectorAll(FOCUSABLE));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    });

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
  }

  // Global entry point for pages that load before (or without) HomePage.render.
  window.triggerAuthModal = showLoginModal;

  /* ═══════════════════════════════════════════════
     PUBLIC API
     ═══════════════════════════════════════════════ */
  return {
    render,
    refreshResources: () => loadResources({ forceRefresh: true }),
    showLoginModal
  };
})();
