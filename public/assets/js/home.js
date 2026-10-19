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

     Rendered with WebGL: the grid is a static vertex buffer and the swell,
     lighting and projection run in the vertex shader, so a frame costs the
     CPU one uniform update (the Canvas 2D version spent ~6ms of main thread
     per frame on ~15k dots and halved the page's frame rate). Animates at
     ~30fps only while on screen and motion is allowed; reduced motion and
     the low/potato tiers get one still frame. Without WebGL, draw2D paints
     the same field as a still frame. */
  const HeroWave = (() => {
    const Z_NEAR = 0.85, Z_FAR = 6, STEP = 0.085, CAM_H = 1;
    // Key light from far right, high; view ≈ toward the camera. H = L+V.
    const HX = 0.33, HY = 0.93, HZ = -0.16;
    const LX = 0.45, LY = 0.62, LZ = 0.64;
    const TAU = Math.PI * 2;
    let cv, gl = null, ctx = null, prog, count = 0, u = {}, W = 0, H = 0;
    let raf = 0, last = 0, visible = false, io, ro, mo;
    let dot = [1, 1, 1], glint = [1, 1, 1], dotCss = "", glintCss = "";
    // The 2D fallback never animates: a still frame costs nothing after paint.
    const live = () => gl && !document.hidden && visible &&
      (window.Motion ? Motion.allowsMotion() && !/^(low|potato)$/.test(document.documentElement.getAttribute("data-perf") || "") : true);

    // Same terrain as draw2D, per vertex. Phases are wrapped on the CPU so
    // float32 sin() stays precise however long the page has been open.
    const VS = `
      attribute vec2 aP;
      uniform vec2 uView; uniform vec3 uPh; uniform float uDpr;
      uniform mediump float uPass;   // shared with FS: precisions must match to link
      varying float vA, vS;
      void main() {
        float x = aP.x, z = aP.y, W = uView.x, H = uView.y;
        float f = H * 0.8, k = H / 260.0;
        float fog = pow(1.0 - (z - ${Z_NEAR.toFixed(3)}) / ${(Z_FAR - Z_NEAR).toFixed(3)}, 1.5);
        float r = clamp(1.15 * k / z, 0.35, 1.7);
        float A = 0.9 * x + 0.55 * z + uPh.x, B = 1.6 * x - 0.85 * z + uPh.y, C = 2.8 * x + 1.5 * z + uPh.z;
        float h = 0.17 * sin(A) + 0.09 * sin(B) + 0.04 * sin(C);
        float hx = 0.153 * cos(A) + 0.144 * cos(B) + 0.112 * cos(C);
        float hz = 0.0935 * cos(A) - 0.0765 * cos(B) + 0.06 * cos(C);
        float sx = W * 0.5 + f * x / z, sy = H * 0.06 + f * (1.0 - h) / z;
        float n = inversesqrt(hx * hx + 1.0 + hz * hz);
        float a, d;
        if (uPass < 0.5) {
          a = fog * (0.16 + 0.5 * max(0.0, (-hx * ${LX.toFixed(2)} + ${LY.toFixed(2)} - hz * ${LZ.toFixed(2)}) * n));
          d = 2.0 * r * uDpr;
        } else {
          float g = pow(max(0.0, (-hx * ${HX.toFixed(2)} + ${HY.toFixed(2)} - hz * ${HZ.toFixed(2)}) * n), 40.0) * fog;
          a = g > 0.05 ? min(1.0, g * 1.4) : 0.0;
          d = 2.5 * r * uDpr;
        }
        vA = a; vS = d;
        gl_PointSize = d + 2.0;   // 1px margin each side for edge coverage
        gl_Position = (a <= 0.0 || sy > H + 2.0)
          ? vec4(2.0, 2.0, 0.0, 1.0)
          : vec4(sx / W * 2.0 - 1.0, 1.0 - sy / H * 2.0, 0.0, 1.0);
      }`;
    // Dots: exact box coverage of a d×d square (what a 2D canvas fillRect
    // antialiases to, sub-pixel dots included). Glints: an antialiased disc.
    const FS = `
      precision mediump float;
      uniform vec3 uCol; uniform float uPass;
      varying float vA, vS;
      void main() {
        vec2 p = (gl_PointCoord - 0.5) * (vS + 2.0);
        float a = vA;
        if (uPass < 0.5) {
          vec2 c = max(vec2(0.0), min(vec2(vS * 0.5), p + 0.5) - max(vec2(-vS * 0.5), p - 0.5));
          a *= c.x * c.y;
        } else {
          a *= clamp(vS * 0.5 - length(p) + 0.5, 0.0, 1.0);
        }
        if (a <= 0.0) discard;
        gl_FragColor = vec4(uCol * a, a);
      }`;

    function initGL() {
      gl = cv.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
      if (!gl) return false;
      const shader = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
      prog = gl.createProgram();
      gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { gl = null; return false; }
      gl.useProgram(prog);
      for (const n of ["uView", "uPh", "uDpr", "uPass", "uCol"]) u[n] = gl.getUniformLocation(prog, n);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      const loc = gl.getAttribLocation(prog, "aP");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);   // premultiplied "source-over"
      return true;
    }

    // The grid, far → near so nearer dots paint over farther ones.
    function grid(fn) {
      const f = H * 0.8, cx = W / 2;
      for (let z = Z_FAR; z >= Z_NEAR; z -= STEP) {
        const fog = Math.pow(1 - (z - Z_NEAR) / (Z_FAR - Z_NEAR), 1.5);
        if (fog < 0.02) continue;
        const n0 = Math.ceil((cx + 8) * z / f / STEP);
        // Far rows: columns closer than ~2px merge into fog anyway; skip half.
        const lod = f * STEP / z < 2 ? 1 : 0;
        for (let i = -n0; i <= n0; i++) if (!(i & lod)) fn(i, z, fog);
      }
    }

    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      if (!W || !H) return;
      if (gl) {
        const pts = [];
        grid((i, z) => pts.push(i * STEP, z));
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pts), gl.STATIC_DRAW);
        count = pts.length / 2;
        gl.viewport(0, 0, cv.width, cv.height);
      } else if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    }

    // CSS colour → [r,g,b] in 0..1, via the browser's own colour parser.
    function rgb(v) {
      cv.style.color = v;
      const m = getComputedStyle(cv).color.match(/[\d.]+/g) || ["255", "255", "255"];
      cv.style.color = "";
      return m.slice(0, 3).map((c) => c / 255);
    }
    function readColors() {
      const css = getComputedStyle(cv);
      dotCss = css.getPropertyValue("--wave-dot").trim() || "#f4f1ea";
      glintCss = css.getPropertyValue("--wave-glint").trim() || "#e6c87a";
      if (gl) { dot = rgb(dotCss); glint = rgb(glintCss); }
    }

    function draw(t) {
      if (!W || !H) return;
      if (!gl) return draw2D(t);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(u.uView, W, H);
      gl.uniform1f(u.uDpr, cv.width / W);
      gl.uniform3f(u.uPh, t % TAU, (0.7 * t + 1.3) % TAU, (-1.1 * t) % TAU);
      gl.uniform1f(u.uPass, 0); gl.uniform3fv(u.uCol, dot); gl.drawArrays(gl.POINTS, 0, count);
      gl.uniform1f(u.uPass, 1); gl.uniform3fv(u.uCol, glint); gl.drawArrays(gl.POINTS, 0, count);
    }

    // Fallback (no WebGL): the same field, one still frame on Canvas 2D.
    function draw2D(t) {
      if (!ctx) return;
      const f = H * 0.8, hy = H * 0.06, cx = W / 2, k = H / 260;
      const glints = [];
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = dotCss;
      grid((i, z, fog) => {
        const x = i * STEP, r = Math.min(1.7, Math.max(0.35, (1.15 * k) / z));
        const a = 0.9 * x + 0.55 * z + t, b = 1.6 * x - 0.85 * z + 0.7 * t + 1.3, c = 2.8 * x + 1.5 * z - 1.1 * t;
        const h = 0.17 * Math.sin(a) + 0.09 * Math.sin(b) + 0.04 * Math.sin(c);
        const hx = 0.153 * Math.cos(a) + 0.144 * Math.cos(b) + 0.112 * Math.cos(c);
        const hz = 0.0935 * Math.cos(a) - 0.0765 * Math.cos(b) + 0.06 * Math.cos(c);
        const sy = hy + f * (CAM_H - h) / z;
        if (sy > H + 2) return;
        const sx = cx + f * x / z;
        const n = 1 / Math.sqrt(hx * hx + 1 + hz * hz);
        ctx.globalAlpha = fog * (0.16 + 0.5 * Math.max(0, (-hx * LX + LY - hz * LZ) * n));
        ctx.fillRect(sx - r, sy - r, 2 * r, 2 * r);
        const g = Math.pow(Math.max(0, (-hx * HX + HY - hz * HZ) * n), 40) * fog;
        if (g > 0.05) glints.push(sx, sy, r * 1.25, Math.min(1, g * 1.4));
      });
      ctx.fillStyle = glintCss;
      for (let i = 0; i < glints.length; i += 4) {
        ctx.globalAlpha = glints[i + 3];
        ctx.beginPath(); ctx.arc(glints[i], glints[i + 1], glints[i + 2], 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    function tick(now) {
      raf = 0;
      if (!cv || !cv.isConnected) return unmount();
      if (!live()) return;
      if (now - last >= 33) { last = now; draw(now / 1000 * 0.22); }
      raf = requestAnimationFrame(tick);
    }
    // Still frame when parked, otherwise resume the loop.
    function wake() {
      if (!cv || !cv.isConnected) return unmount();
      readColors();
      if (live()) { if (!raf) raf = requestAnimationFrame(tick); }
      else draw(performance.now() / 1000 * 0.22);
    }

    function unmount() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      io && io.disconnect(); ro && ro.disconnect(); mo && mo.disconnect();
      document.removeEventListener("visibilitychange", wake);
      // Free the GPU context now; re-renders of home would otherwise pile up
      // contexts until GC (browsers cap live WebGL contexts).
      const lose = gl && gl.getExtension("WEBGL_lose_context");
      if (lose) lose.loseContext();
      cv = null; gl = null; ctx = null;
    }

    function mount(canvas) {
      if (cv) unmount();
      if (!canvas || !canvas.getContext) return;
      cv = canvas;
      if (!initGL()) {
        // A canvas that already handed out a WebGL context can't give a 2D
        // one, so the fallback draws on a fresh copy of the element.
        const fresh = cv.cloneNode(false);
        cv.replaceWith(fresh);
        cv = canvas = fresh;
        ctx = cv.getContext("2d");
      }
      cv.addEventListener("webglcontextlost", (e) => { e.preventDefault(); if (raf) cancelAnimationFrame(raf); raf = 0; });
      cv.addEventListener("webglcontextrestored", () => { if (cv === canvas && initGL()) { size(); wake(); } });
      size();
      readColors();
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

  /* Orbit satellites (ADR-014 Amendments 6 and 7). Each logo runs ONE CSS
     transform animation around the ring. Its place on the ring and the
     shared clock are both a negative animation-delay:
       delay_i = -((now mod P) + i * P / N)
     Taking `now` from ONE page-clock reading keeps the seven evenly spaced,
     and a re-render (language switch, returning to Home) resumes the angle
     the orbit had reached instead of snapping to the start. `--a` is the
     same placement, used by the still (reduced-motion) transform.
     ORBIT_PERIOD_MS must equal the CSS duration of .orbit-anchor (pinned
     by test/hero-orbit.test.js). */
  const ORBIT_PERIOD_MS = 64000;
  const ORBIT_LOGOS = [
    ["durkad-logo", "Durkad"], ["fylad", "Fylad"], ["fylad-kiosk", "Fylad Kiosk"],
    ["inad-logo", "Inad"], ["plaividlogo", "Plaivid"], ["pvmdesktop", "PVM Desktop"],
    ["rakaard-logo", "Rakaard"],
  ];

  function renderOrbit() {
    const now = performance.now() % ORBIT_PERIOD_MS;
    const n = ORBIT_LOGOS.length;
    return ORBIT_LOGOS.map(([file, name], i) => {
      const angle = (i * 360 / n).toFixed(3);
      const delay = (-((now + i * ORBIT_PERIOD_MS / n) % ORBIT_PERIOD_MS) / 1000).toFixed(3);
      return `<span class="orbit-anchor" style="--a:${angle}deg;--orbit-delay:${delay}s" tabindex="0" role="img" aria-label="${name}"><span class="orbit-logo"><img src="/assets/icon/orbit/${file}.webp" alt="" draggable="false" loading="lazy"></span><span class="orbit-name">${name}</span></span>`;
    }).join("");
  }

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
            <div class="hero-orbit">${renderOrbit()}</div>
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