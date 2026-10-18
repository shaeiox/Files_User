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
  /** Browse module, handed over by the router (Home embeds its explorer). */
  let BrowsePage = null;

  /* ═══════════════════════════════════════════════
     MAIN RENDER
     ═══════════════════════════════════════════════ */
  function render(container) {
    const d = typeof window.getDict === 'function' ? window.getDict() : getDict();
    document.title = d.pageTitle || "AVID Download • File Portal";

    container.innerHTML = `
      <div class="home-layout">
        ${renderHeroSection(d)}
        ${renderSearchResultsPanel(d)}
        <section class="home-browse" id="homeBrowse" aria-label="${escapeHtml(d.infraTitle || "Infrastructure Resources")}"></section>
        ${renderTrustBand(d)}
      </div>
    `;

    bindEvents();
    HeroWave.mount(container.querySelector(".hero-wave canvas"));
    // The explorer below the hero: tree + folder table, browsed in place. It
    // reopens at the folder last shown, so "Exit full screen" lands where you were.
    if (BrowsePage) BrowsePage.render(document.getElementById("homeBrowse"), BrowsePage.currentPath, { embedded: true });
  }

  /* ═══════════════════════════════════════════════
     SECTION: HERO
     ═══════════════════════════════════════════════ */

  /* Digital ground: a lit 3D dot terrain on <canvas>. A world grid (x across,
     z into the screen) rides a slow swell and is pinhole-projected, so dot
     size, spacing and opacity all fall off with depth into a fogged horizon.
     Each dot is shaded from the surface normal: ivory by diffuse light, and a
     champagne glint where the crest catches the key light (Blinn specular).
     Colours come from --wave-dot / --wave-glint, so themes stay in CSS.
     Animates at ~30fps only while on screen and motion is allowed; reduced
     motion and the low/potato tiers get one still frame. */
  const HeroWave = (() => {
    const Z_NEAR = 0.85, Z_FAR = 6, STEP = 0.085, CAM_H = 1;
    // Key light from far right, high; view ≈ toward the camera. H = L+V.
    const HX = 0.33, HY = 0.93, HZ = -0.16;
    const LX = 0.45, LY = 0.62, LZ = 0.64;
    let cv, ctx, W = 0, H = 0, raf = 0, last = 0, visible = false, io, ro, mo;
    const live = () => !document.hidden && visible &&
      (window.Motion ? Motion.allowsMotion() && !/^(low|potato)$/.test(document.documentElement.getAttribute("data-perf") || "") : true);

    // Per-column sin/cos of the three x-frequencies: time-independent, so
    // built once per size; per dot only multiply-adds remain (angle sums).
    const FX = [0.9, 1.6, 2.8];
    let tab = null, iMax = 0;
    const BUCKETS = 12;

    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      iMax = Math.ceil(((W / 2 + 8) * Z_FAR) / (H * 0.8) / STEP);
      tab = new Float32Array((2 * iMax + 1) * 6);
      for (let i = -iMax, j = 0; i <= iMax; i++) {
        for (const q of FX) { tab[j++] = Math.sin(q * i * STEP); tab[j++] = Math.cos(q * i * STEP); }
      }
    }

    function draw(t) {
      if (!W || !H || !tab) return;
      const css = getComputedStyle(cv);
      const dot = css.getPropertyValue("--wave-dot").trim() || "#f4f1ea";
      const glint = css.getPropertyValue("--wave-glint").trim() || "#e6c87a";
      const f = H * 0.8, hy = H * 0.06, cx = W / 2, k = H / 260;
      // Dots are binned by alpha into a few paths: one fill per bin.
      const bins = Array.from({ length: BUCKETS }, () => new Path2D());
      const glints = [];
      for (let z = Z_FAR; z >= Z_NEAR; z -= STEP) {
        const fog = Math.pow(1 - (z - Z_NEAR) / (Z_FAR - Z_NEAR), 1.5);
        if (fog < 0.02) continue;
        const r = Math.min(1.7, Math.max(0.35, (1.15 * k) / z)), d = 2 * r;
        // z/t phase of each component: A = qx·x + B.
        const B0 = 0.55 * z + t, B1 = -0.85 * z + 0.7 * t + 1.3, B2 = 1.5 * z - 1.1 * t;
        const s0 = Math.sin(B0), c0 = Math.cos(B0), s1 = Math.sin(B1), c1 = Math.cos(B1), s2 = Math.sin(B2), c2 = Math.cos(B2);
        const n0 = Math.ceil((cx + 8) * z / f / STEP);
        // Far rows: columns closer than ~2px merge into fog anyway; skip half.
        const lod = f * STEP / z < 2 ? 1 : 0;
        for (let i = -n0; i <= n0; i++) {
          if (i & lod) continue;
          const j = (i + iMax) * 6;
          // sin(A+B) and cos(A+B) from the column table.
          const sa = tab[j] * c0 + tab[j + 1] * s0, ca = tab[j + 1] * c0 - tab[j] * s0;
          const sb = tab[j + 2] * c1 + tab[j + 3] * s1, cb = tab[j + 3] * c1 - tab[j + 2] * s1;
          const sc = tab[j + 4] * c2 + tab[j + 5] * s2, cc = tab[j + 5] * c2 - tab[j + 4] * s2;
          // Heightfield and its analytic slopes.
          const h = 0.17 * sa + 0.09 * sb + 0.04 * sc;
          const hx = 0.153 * ca + 0.144 * cb + 0.112 * cc;
          const hz = 0.0935 * ca - 0.0765 * cb + 0.06 * cc;
          const sy = hy + f * (CAM_H - h) / z;
          if (sy > H + 2) continue;
          const sx = cx + f * i * STEP / z;
          const n = 1 / Math.sqrt(hx * hx + 1 + hz * hz);
          const diffuse = Math.max(0, (-hx * LX + LY - hz * LZ) * n);
          const alpha = fog * (0.16 + 0.5 * diffuse);
          bins[Math.min(BUCKETS - 1, (alpha * BUCKETS / 0.66) | 0)].rect(sx - r, sy - r, d, d);
          // Specular ^40 by squaring: (s^8)^5.
          let s = Math.max(0, (-hx * HX + HY - hz * HZ) * n);
          const s8 = (s *= s, s *= s, s * s);
          const spec = s8 * s8 * s8 * s8 * s8;
          if (spec * fog > 0.05) glints.push(sx, sy, r * 1.25, Math.min(1, spec * fog * 1.4));
        }
      }
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = dot;
      for (let b = 0; b < BUCKETS; b++) {
        ctx.globalAlpha = ((b + 0.5) / BUCKETS) * 0.66;
        ctx.fill(bins[b]);
      }
      ctx.fillStyle = glint;
      for (let i = 0; i < glints.length; i += 4) {
        ctx.globalAlpha = glints[i + 3];
        ctx.beginPath(); ctx.arc(glints[i], glints[i + 1], glints[i + 2], 0, 6.2832); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function tick(now) {
      raf = 0;
      if (!cv.isConnected) return unmount();
      if (!live()) return;
      if (now - last >= 33) { last = now; draw(now / 1000 * 0.22); }
      raf = requestAnimationFrame(tick);
    }
    // Still frame when parked, otherwise resume the loop.
    function wake() {
      if (!cv || !cv.isConnected) return unmount();
      if (live()) { if (!raf) raf = requestAnimationFrame(tick); }
      else draw(performance.now() / 1000 * 0.22);
    }

    function unmount() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      io && io.disconnect(); ro && ro.disconnect(); mo && mo.disconnect();
      document.removeEventListener("visibilitychange", wake);
      cv = null;
    }

    function mount(canvas) {
      if (cv) unmount();
      if (!canvas || !canvas.getContext) return;
      cv = canvas; ctx = cv.getContext("2d");
      size();
      io = new IntersectionObserver((e) => { visible = e[0].isIntersecting; wake(); });
      io.observe(cv);
      ro = new ResizeObserver(() => { size(); draw(performance.now() / 1000 * 0.22); });
      ro.observe(cv);
      // Theme or perf tier changes: recolour / re-gate without a reload.
      mo = new MutationObserver(wake);
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-perf"] });
      document.addEventListener("visibilitychange", wake);
      draw(0);
    }
    return { mount };
  })();

  function renderHeroSection(d) {
    return `
      <section class="hero-max" id="heroMax">

        <!-- Background isolation layer: prism light fields, clipped here. -->
        <div class="hero-bg" aria-hidden="true">
          <div class="hero-aurora hero-aurora--champagne"></div>
          <div class="hero-aurora hero-aurora--iris"></div>
          <div class="hero-aurora hero-aurora--glacier"></div>

          <!-- Digital ground: lit 3D dot terrain (see HeroWave). Canvas,
               clipped by .hero-bg to the card radius; edges feathered by
               a CSS mask. Spec: docs/decisions/ADR-014. -->
          <div class="hero-wave"><canvas></canvas></div>
        </div>

        <div class="hero-content">
          <div class="hero-pill">
            <span class="hero-status-dot"></span>
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
          <ul class="hero-meta" aria-label="Portal guarantees">
            <li><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>${d.heroMetaVerified || 'SHA-256 verified'}</li>
            <li><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><polyline points="3 8 12 13 21 8"/><line x1="12" y1="13" x2="12" y2="21"/></svg>${d.heroMetaFormats || 'ISO · Packages · Templates'}</li>
            <li><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>${d.heroMetaAccess || 'Signed infrastructure delivery'}</li>
          </ul>
        </div>

        <div class="hero-visual">
          <div class="hero-emblem">
            <span class="hero-ring" aria-hidden="true"></span>
            <div class="hero-orbit">
              ${[
        ["durkad-logo", "Durkad"], ["fylad", "Fylad"], ["fylad-kiosk", "Fylad Kiosk"],
        ["inad-logo", "Inad"], ["plaividlogo", "Plaivid"], ["pvmdesktop", "PVM Desktop"],
        ["rakaard-logo", "Rakaard"],
      ].map(([f, n], i) => `<span class="orbit-item" style="--a:${(i * 360 / 7).toFixed(1)}deg"><span class="orbit-anchor" tabindex="0" role="img" aria-label="${n}"><span class="orbit-spin"><span class="orbit-logo"><img src="/assets/icon/orbit/${f}.webp" alt="" draggable="false" loading="lazy"></span></span><span class="orbit-name">${n}</span></span></span>`).join("")}
            </div>
            <div class="logo-swap" id="logoSwap">
              <img class="logo-layer logo-dark" src="/assets/icon/logo-2-dark.webp" alt="AVID Download" draggable="false">
              <img class="logo-layer logo-light" src="/assets/icon/logo-2-light.webp" alt="AVID Download" draggable="false">
            </div>
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
     UI COMPONENTS HELPERS
     ═══════════════════════════════════════════════ */

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
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
    useBrowse: (page) => { BrowsePage = page; },
    showLoginModal
  };
})();