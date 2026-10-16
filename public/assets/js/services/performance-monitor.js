/* ═══════════════════════════════════════════════════════════════
   performance-monitor.js — Adaptive Performance Engine
   Skill: Enterprise Architecture — Real-time FPS + Hardware Probe

   Responsibilities:
   - Detect device capability (CPU, RAM, GPU, Connection, Battery)
   - Monitor real-time FPS via requestAnimationFrame
   - Classify device into tiers: HIGH / MEDIUM / LOW / POTATO
   - Apply data-perf attribute to <html> for CSS-driven overrides
   - Auto-downgrade on sustained FPS drops (adaptive)
   - Auto-upgrade on FPS recovery
   - Cache classification result in localStorage (7 days TTL)
   - Respect prefers-reduced-motion & Data Saver preferences
   - Provide developer debug panel (Ctrl+Shift+P)
   - Provide user-facing dropdown for manual tier selection
   ═══════════════════════════════════════════════════════════════ */

const PerformanceMonitor = (function () {
    'use strict';

    /* ═══════════════════════════════════════════════
       CONFIGURATION
       ═══════════════════════════════════════════════ */
    const CONFIG = {
        CACHE_KEY: "cav_perf_tier",
        CACHE_TTL: 7 * 24 * 60 * 60 * 1000, // 7 days in ms

        FPS_SAMPLE_SIZE: 60,          // Frames buffered per sample window
        FPS_CHECK_INTERVAL: 1000,     // ms between FPS evaluations
        DOWNGRADE_THRESHOLD: 3,       // Consecutive low-FPS checks before downgrade
        UPGRADE_THRESHOLD: 5,         // Consecutive high-FPS checks before upgrade

        FPS_THRESHOLDS: {
            HIGH: 50,
            MEDIUM: 35,
            LOW: 20
            // Anything below LOW is classified as POTATO
        },

        TOAST_DURATION: 4000,
        DEBUG_SHORTCUT: { ctrl: true, shift: true, key: "p" },
        debug: false
    };

    // Ordered tiers (index-based navigation for upgrade/downgrade logic)
    const TIERS = ["HIGH", "MEDIUM", "LOW", "POTATO"];
    const TIER_EMOJI = { HIGH: "🚀", MEDIUM: "⚡", LOW: "🐌", POTATO: "🥔" };

    /* ═══════════════════════════════════════════════
       INTERNAL STATE
       ═══════════════════════════════════════════════ */
    let currentTier = "HIGH";
    let isInitialized = false;
    let isManualOverride = false;

    // FPS tracking buffers
    let fpsBuffer = [];
    let lastFrameTime = 0;
    let fpsRafId = null;
    let checkIntervalId = null;
    let lowFpsCount = 0;
    let highFpsCount = 0;
    let currentFps = 60;

    // Hardware profile snapshot
    let hardwareReport = {};

    // Event system + UI references
    let listeners = {};
    let debugPanelEl = null;
    let debugVisible = false;

    /* ═══════════════════════════════════════════════
       UTILITY — Logging helper (only in debug mode)
       ═══════════════════════════════════════════════ */
    function log(...args) {
        if (CONFIG.debug) {
            console.log("%c⚡ [PerfMonitor]", "color:#ffb800;font-weight:bold", ...args);
        }
    }

    /* ═══════════════════════════════════════════════
       LAYER 1: DETECTION — Hardware capability probing
       ═══════════════════════════════════════════════ */
    function detectHardware() {
        const report = {
            cores: navigator.hardwareConcurrency || 2,
            ram: navigator.deviceMemory || 4, // GB (Chrome only, fallback to 4)
            gpu: "Unknown",
            gpuTier: "unknown",
            connection: "unknown",
            connectionSpeed: null,
            prefersReducedMotion: false,
            prefersDataSaver: false,
            batteryLow: false,
            touchDevice: false,
            pixelRatio: window.devicePixelRatio || 1,
            screenWidth: screen.width,
            screenHeight: screen.height
        };

        // GPU detection via WebGL renderer string
        try {
            const canvas = document.createElement("canvas");
            const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");

            if (gl) {
                const ext = gl.getExtension("WEBGL_debug_renderer_info");

                if (ext) {
                    report.gpu = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
                    const gpuLower = report.gpu.toLowerCase();

                    // Categorize GPU strength based on known vendor keywords
                    if (/intel|mesa|swiftshader|llvmpipe|microsoft basic/i.test(gpuLower)) {
                        report.gpuTier = "integrated";
                    } else if (/nvidia|amd|radeon|geforce|rtx|gtx|rx/i.test(gpuLower)) {
                        report.gpuTier = "dedicated";
                    } else {
                        report.gpuTier = "unknown";
                    }
                }

                // Release the WebGL context immediately to free GPU resources
                const loseCtx = gl.getExtension("WEBGL_lose_context");
                if (loseCtx) loseCtx.loseContext();
            }
        } catch {
            // WebGL not supported — GPU stays "Unknown"
        }

        // Network Information API (Chrome, Edge, Opera)
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (conn) {
            report.connection = conn.effectiveType || "unknown"; // '4g', '3g', '2g', 'slow-2g'
            report.connectionSpeed = conn.downlink || null;      // Mbps
            report.prefersDataSaver = conn.saveData === true;
        }

        // User accessibility preference
        report.prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        // Touch capability heuristic
        report.touchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;

        // Battery API is asynchronous — handle separately to avoid blocking
        if (navigator.getBattery) {
            navigator.getBattery().then(battery => {
                report.batteryLow = battery.level < 0.2 && !battery.charging;

                // Force downgrade if battery is critical and user hasn't manually overridden
                if (report.batteryLow && !isManualOverride) {
                    log("Battery low — forcing LOW tier");
                    applyTier("LOW", "battery");
                }

                // Keep watching battery level changes
                battery.addEventListener("levelchange", () => {
                    report.batteryLow = battery.level < 0.2 && !battery.charging;
                });
            }).catch(() => { /* Battery API not permitted */ });
        }

        return report;
    }

    /* ═══════════════════════════════════════════════
       LAYER 2: CLASSIFICATION — Tier decision logic
       ═══════════════════════════════════════════════ */
    function classifyDevice(report) {
        // Hard overrides — user or network preferences take priority
        if (report.prefersReducedMotion) return "LOW";
        if (report.prefersDataSaver) return "MEDIUM";
        if (report.connection === "slow-2g" || report.connection === "2g") return "POTATO";
        if (report.connection === "3g") return "LOW";

        // Weighted scoring system (max 8 points)
        let score = 0;

        // CPU cores (0–3 points)
        if (report.cores >= 8) score += 3;
        else if (report.cores >= 4) score += 2;
        else if (report.cores >= 2) score += 1;

        // RAM (0–3 points)
        if (report.ram >= 8) score += 3;
        else if (report.ram >= 4) score += 2;
        else if (report.ram >= 2) score += 1;

        // GPU (0–2 points)
        if (report.gpuTier === "dedicated") score += 2;
        else if (report.gpuTier === "integrated") score += 1;

        // High-DPI on weak devices = extra rendering load
        if (report.pixelRatio >= 2 && report.ram < 4) score -= 1;

        // Small touch device = likely low-end mobile = be conservative
        if (report.touchDevice && report.screenWidth < 768) score -= 1;

        // Final tier mapping
        if (score >= 6) return "HIGH";
        if (score >= 3) return "MEDIUM";
        if (score >= 1) return "LOW";
        return "POTATO";
    }

    // Map real-time FPS to a tier for comparison against currentTier
    function classifyByFps(fps) {
        if (fps >= CONFIG.FPS_THRESHOLDS.HIGH) return "HIGH";
        if (fps >= CONFIG.FPS_THRESHOLDS.MEDIUM) return "MEDIUM";
        if (fps >= CONFIG.FPS_THRESHOLDS.LOW) return "LOW";
        return "POTATO";
    }

    /* ═══════════════════════════════════════════════
       LAYER 3: APPLICATION — Apply tier to the DOM
       ═══════════════════════════════════════════════ */
    function applyTier(tier, reason = "auto") {
        const prevTier = currentTier;
        const tierIndex = TIERS.indexOf(tier);

        // Clamp tier to a valid value inside the TIERS array
        const clampedTier = TIERS[Math.max(0, Math.min(tierIndex, TIERS.length - 1))];

        // Skip re-application if tier hasn't actually changed after init
        if (clampedTier === prevTier && isInitialized) return;

        currentTier = clampedTier;
        document.documentElement.setAttribute("data-perf", clampedTier.toLowerCase());

        log(`${TIER_EMOJI[clampedTier]} Tier: ${clampedTier} (reason: ${reason}, FPS: ${currentFps})`);

        // Notify subscribers about the change
        emit("tierChange", {
            tier: clampedTier,
            prevTier,
            reason,
            fps: currentFps
        });

        // Show toast notification ONLY on automatic downgrades (not on init or manual)
        if (isInitialized && !isManualOverride && reason === "fps-drop") {
            showToast(`Performance mode: ${TIER_EMOJI[clampedTier]} ${clampedTier}`, "perf-downgrade");
        }

        // Sync UI components
        updateDebugPanel();
        updateUiActiveStates();
    }

    /* ═══════════════════════════════════════════════
       LAYER 4: FEEDBACK — Real-time FPS monitoring
       ═══════════════════════════════════════════════ */
    function startFpsMonitor() {
        // Reset buffer before starting to avoid stale data
        fpsBuffer = [];
        lastFrameTime = performance.now();

        // Per-frame sampler using requestAnimationFrame
        function frame(now) {
            const delta = now - lastFrameTime;
            lastFrameTime = now;

            // Ignore invalid deltas (e.g., tab-switch spikes > 1s)
            if (delta > 0 && delta < 1000) {
                fpsBuffer.push(1000 / delta);

                // Trim buffer to configured sample size
                if (fpsBuffer.length > CONFIG.FPS_SAMPLE_SIZE) {
                    fpsBuffer.shift();
                }
            }

            fpsRafId = requestAnimationFrame(frame);
        }

        fpsRafId = requestAnimationFrame(frame);

        // Periodic evaluation of averaged FPS
        checkIntervalId = setInterval(evaluateFps, CONFIG.FPS_CHECK_INTERVAL);
    }

    function evaluateFps() {
        // Manual override disables adaptive behavior
        if (isManualOverride) return;

        // Wait until enough samples are collected
        if (fpsBuffer.length < 10) return;

        // Calculate rolling average FPS
        const sum = fpsBuffer.reduce((a, b) => a + b, 0);
        currentFps = Math.round(sum / fpsBuffer.length);

        const fpsTier = classifyByFps(currentFps);
        const currentIdx = TIERS.indexOf(currentTier);
        const fpsIdx = TIERS.indexOf(fpsTier);

        // Downgrade — FPS is consistently worse than current tier
        if (fpsIdx > currentIdx) {
            lowFpsCount++;
            highFpsCount = 0;

            if (lowFpsCount >= CONFIG.DOWNGRADE_THRESHOLD) {
                const newTier = TIERS[Math.min(currentIdx + 1, TIERS.length - 1)];
                applyTier(newTier, "fps-drop");
                lowFpsCount = 0;
            }
        }
        // Upgrade — FPS is consistently better than current tier
        else if (fpsIdx < currentIdx) {
            highFpsCount++;
            lowFpsCount = 0;

            if (highFpsCount >= CONFIG.UPGRADE_THRESHOLD) {
                const newTier = TIERS[Math.max(currentIdx - 1, 0)];
                applyTier(newTier, "fps-recovery");
                highFpsCount = 0;
            }
        }
        // Stable — reset both counters
        else {
            lowFpsCount = 0;
            highFpsCount = 0;
        }

        updateDebugPanel();
    }

    function stopFpsMonitor() {
        if (fpsRafId) cancelAnimationFrame(fpsRafId);
        if (checkIntervalId) clearInterval(checkIntervalId);
        fpsRafId = null;
        checkIntervalId = null;
    }

    /* ═══════════════════════════════════════════════
       CACHE LAYER — localStorage persistence
       ═══════════════════════════════════════════════ */
    function getCachedTier() {
        try {
            const raw = localStorage.getItem(CONFIG.CACHE_KEY);
            if (!raw) return null;

            const data = JSON.parse(raw);

            // Invalidate expired cache
            if (Date.now() - data.timestamp > CONFIG.CACHE_TTL) return null;

            // Guard against malformed data
            if (!TIERS.includes(data.tier)) return null;

            return data.tier;
        } catch {
            return null;
        }
    }

    function setCachedTier(tier) {
        try {
            localStorage.setItem(CONFIG.CACHE_KEY, JSON.stringify({
                tier,
                timestamp: Date.now(),
                hw: {
                    cores: hardwareReport.cores,
                    ram: hardwareReport.ram,
                    gpu: hardwareReport.gpuTier
                }
            }));
        } catch {
            // Storage quota exceeded or disabled — ignore silently
        }
    }

    function clearCache() {
        try {
            localStorage.removeItem(CONFIG.CACHE_KEY);
        } catch { /* noop */ }
    }

    /* ═══════════════════════════════════════════════
       TOAST NOTIFICATION — Auto-downgrade alerts
       ═══════════════════════════════════════════════ */
    function showToast(message, type = "info") {
        // Remove any previous toast to prevent stacking
        const existing = document.querySelector(".perf-toast");
        if (existing) existing.remove();

        const toast = document.createElement("div");
        toast.className = "perf-toast";
        toast.setAttribute("role", "status");
        toast.setAttribute("aria-live", "polite");
        toast.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 8v4"/>
                <path d="M12 16h.01"/>
            </svg>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);

        // Defer .show class to next frame to trigger CSS transition
        requestAnimationFrame(() => toast.classList.add("show"));

        // Auto-dismiss after configured duration
        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 300);
        }, CONFIG.TOAST_DURATION);
    }

    /* ═══════════════════════════════════════════════
       DEBUG PANEL — Developer-only diagnostic UI
       ═══════════════════════════════════════════════ */
    function createDebugPanel() {
        if (debugPanelEl) return;

        debugPanelEl = document.createElement("div");
        debugPanelEl.className = "perf-debug-panel";
        debugPanelEl.innerHTML = `
            <div class="perf-debug-header">
                <span>⚙️ Performance</span>
                <button class="perf-debug-close" aria-label="Close">&times;</button>
            </div>
            <div class="perf-debug-body">
                <div class="perf-debug-row">
                    <span class="perf-debug-label">Tier</span>
                    <span class="perf-debug-value" id="perfDbgTier">—</span>
                </div>
                <div class="perf-debug-row">
                    <span class="perf-debug-label">FPS</span>
                    <span class="perf-debug-value" id="perfDbgFps">—</span>
                </div>
                <div class="perf-debug-row">
                    <span class="perf-debug-label">CPU Cores</span>
                    <span class="perf-debug-value" id="perfDbgCores">—</span>
                </div>
                <div class="perf-debug-row">
                    <span class="perf-debug-label">RAM</span>
                    <span class="perf-debug-value" id="perfDbgRam">—</span>
                </div>
                <div class="perf-debug-row">
                    <span class="perf-debug-label">GPU</span>
                    <span class="perf-debug-value" id="perfDbgGpu">—</span>
                </div>
                <div class="perf-debug-row">
                    <span class="perf-debug-label">Connection</span>
                    <span class="perf-debug-value" id="perfDbgConn">—</span>
                </div>
                <div class="perf-debug-row">
                    <span class="perf-debug-label">Pixel Ratio</span>
                    <span class="perf-debug-value" id="perfDbgDpr">—</span>
                </div>
                <div class="perf-debug-row">
                    <span class="perf-debug-label">Override</span>
                    <span class="perf-debug-value" id="perfDbgOverride">Auto</span>
                </div>
            </div>
            <div class="perf-debug-actions">
                <button class="perf-debug-btn" data-set-tier="HIGH">🚀 HIGH</button>
                <button class="perf-debug-btn" data-set-tier="MEDIUM">⚡ MED</button>
                <button class="perf-debug-btn" data-set-tier="LOW">🐌 LOW</button>
                <button class="perf-debug-btn" data-set-tier="POTATO">🥔 POT</button>
                <button class="perf-debug-btn perf-debug-btn-auto" data-set-tier="AUTO">↻ Auto</button>
            </div>
        `;

        document.body.appendChild(debugPanelEl);

        // Close button
        debugPanelEl.querySelector(".perf-debug-close").addEventListener("click", toggleDebugPanel);

        // Tier selection buttons
        debugPanelEl.querySelectorAll("[data-set-tier]").forEach(btn => {
            btn.addEventListener("click", () => {
                const tier = btn.getAttribute("data-set-tier");

                if (tier === "AUTO") {
                    // Return control back to the adaptive engine
                    isManualOverride = false;
                    clearCache();
                    const newTier = classifyDevice(hardwareReport);
                    applyTier(newTier, "manual-auto");
                    setCachedTier(newTier);
                } else {
                    // Lock tier manually
                    isManualOverride = true;
                    applyTier(tier, "manual");
                    setCachedTier(tier);
                }
            });
        });

        updateDebugPanel();
    }

    function updateDebugPanel() {
        if (!debugPanelEl || !debugVisible) return;

        const tierEl = document.getElementById("perfDbgTier");
        const fpsEl = document.getElementById("perfDbgFps");
        const coresEl = document.getElementById("perfDbgCores");
        const ramEl = document.getElementById("perfDbgRam");
        const gpuEl = document.getElementById("perfDbgGpu");
        const connEl = document.getElementById("perfDbgConn");
        const dprEl = document.getElementById("perfDbgDpr");
        const overrideEl = document.getElementById("perfDbgOverride");

        if (tierEl) tierEl.textContent = `${TIER_EMOJI[currentTier]} ${currentTier}`;

        if (fpsEl) {
            fpsEl.textContent = `${currentFps} fps`;
            // Color-code FPS: green (good) → amber (mid) → red (bad)
            fpsEl.style.color = currentFps >= 50 ? "#10b981"
                : currentFps >= 30 ? "#f59e0b"
                    : "#ef4444";
        }

        if (coresEl) coresEl.textContent = `${hardwareReport.cores} cores`;
        if (ramEl) ramEl.textContent = `${hardwareReport.ram} GB`;
        if (gpuEl) gpuEl.textContent = hardwareReport.gpuTier;
        if (connEl) connEl.textContent = hardwareReport.connection;
        if (dprEl) dprEl.textContent = `${hardwareReport.pixelRatio}x`;
        if (overrideEl) overrideEl.textContent = isManualOverride ? "Manual" : "Auto";
    }

    function toggleDebugPanel() {
        if (!debugPanelEl) createDebugPanel();
        debugVisible = !debugVisible;
        debugPanelEl.classList.toggle("show", debugVisible);
        if (debugVisible) updateDebugPanel();
    }

    /* ═══════════════════════════════════════════════
       USER INTERFACE BINDING — performance setting (footer)
       Same `.show`-on-wrapper mechanism as the language menu (ui-craft-
       elevation D9); aria-expanded is written from that state, never left
       at the markup's hardcoded "false".
       ═══════════════════════════════════════════════ */
    function bindUserInterface() {
        const wrap = document.querySelector(".perf-dropdown-wrap");
        if (!wrap) return;

        const pill = wrap.querySelector(".perf-pill");
        const options = wrap.querySelectorAll(".perf-option");
        const setOpen = (open) => {
            wrap.classList.toggle("show", open);
            pill.setAttribute("aria-expanded", open ? "true" : "false");
        };

        // 1. Toggle dropdown visibility on pill click
        pill.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(!wrap.classList.contains("show"));
        });

        wrap.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && wrap.classList.contains("show")) {
                setOpen(false);
                pill.focus();
            }
        });

        // 2. Handle option selection
        options.forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                const val = btn.getAttribute("data-perf-val");
                setOpen(false);

                if (val === "AUTO") {
                    // Restore adaptive behavior
                    isManualOverride = false;
                    clearCache();
                    const computed = classifyDevice(hardwareReport);
                    applyTier(computed, "manual-auto");
                    setCachedTier(computed);
                } else {
                    // Lock manual tier selection
                    isManualOverride = true;
                    applyTier(val, "manual");
                    setCachedTier(val);
                }

                updateUiActiveStates();
            });
        });

        // 3. Click-outside dismissal (mobile-friendly)
        document.addEventListener("click", (e) => {
            if (!wrap.contains(e.target)) setOpen(false);
        });

        // Initial sync of active-state indicator
        updateUiActiveStates();
    }

    // Reflect currently selected tier in the navbar dropdown UI
    function updateUiActiveStates() {
        const wrap = document.querySelector(".perf-dropdown-wrap");
        if (!wrap) return;

        const options = wrap.querySelectorAll(".perf-option");
        // If user hasn't overridden, "AUTO" is considered active
        const currentActive = isManualOverride ? currentTier : "AUTO";

        options.forEach(btn => {
            const val = btn.getAttribute("data-perf-val");
            btn.classList.toggle("active", val === currentActive);
        });
    }

    /* ═══════════════════════════════════════════════
       EVENT SYSTEM — Pub/Sub for external modules
       ═══════════════════════════════════════════════ */
    function emit(event, data) {
        if (!listeners[event]) return;

        listeners[event].forEach(cb => {
            try {
                cb(data);
            } catch (e) {
                console.error("[PerfMonitor] Listener error:", e);
            }
        });
    }

    function on(event, callback) {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(callback);
    }

    function off(event, callback) {
        if (!listeners[event]) return;
        listeners[event] = listeners[event].filter(cb => cb !== callback);
    }

    /* ═══════════════════════════════════════════════
       BOOT — Bootstrapping the engine
       ═══════════════════════════════════════════════ */
    function init(options = {}) {
        // Prevent double initialization
        if (isInitialized) return;
        isInitialized = true;

        if (options.debug) CONFIG.debug = true;

        log("Initializing...");

        // Step 1 — Detect hardware capabilities
        hardwareReport = detectHardware();
        log("Hardware:", hardwareReport);

        // Step 2 — Try cached tier first (avoids re-classification cost)
        const cached = getCachedTier();

        if (cached) {
            log(`Cache hit: ${cached}`);
            currentTier = cached;
        } else {
            // Step 3 — Classify fresh, then cache the result
            currentTier = classifyDevice(hardwareReport);
            setCachedTier(currentTier);
            log(`Classified as: ${currentTier}`);
        }

        // Step 4 — Apply tier attribute to <html> immediately
        document.documentElement.setAttribute("data-perf", currentTier.toLowerCase());

        // Step 5 — Defer FPS monitor startup to avoid blocking initial paint
        if ("requestIdleCallback" in window) {
            requestIdleCallback(() => startFpsMonitor());
        } else {
            setTimeout(startFpsMonitor, 500);
        }

        // Step 6 — Register debug panel keyboard shortcut
        document.addEventListener("keydown", (e) => {
            const s = CONFIG.DEBUG_SHORTCUT;

            if (
                (s.ctrl ? (e.ctrlKey || e.metaKey) : true) &&
                (s.shift ? e.shiftKey : true) &&
                e.key.toLowerCase() === s.key.toLowerCase()
            ) {
                e.preventDefault();
                toggleDebugPanel();
            }
        });

        // Step 7 — React to changes in prefers-reduced-motion at runtime
        const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
        motionMq.addEventListener("change", (e) => {
            if (!isManualOverride) {
                hardwareReport.prefersReducedMotion = e.matches;
                const newTier = classifyDevice(hardwareReport);
                applyTier(newTier, "preference-change");
                setCachedTier(newTier);
            }
        });

        // Step 8 — Pause FPS monitoring on hidden tabs to save battery
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) {
                stopFpsMonitor();
            } else {
                startFpsMonitor();
            }
        });

        // Step 9 — Wire up the navbar dropdown UI when DOM is ready
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", bindUserInterface);
        } else {
            bindUserInterface();
        }

        log(`✅ Ready — Tier: ${TIER_EMOJI[currentTier]} ${currentTier}`);
    }

    /* ═══════════════════════════════════════════════
       PUBLIC API — Exposed methods
       ═══════════════════════════════════════════════ */
    return {
        init,

        // Getters
        getTier: () => currentTier,
        getFPS: () => currentFps,
        getReport: () => ({
            tier: currentTier,
            fps: currentFps,
            isManualOverride,
            hardware: { ...hardwareReport }
        }),

        // Manual tier override
        setTier: (tier) => {
            if (!TIERS.includes(tier)) return;
            isManualOverride = true;
            applyTier(tier, "manual");
            setCachedTier(tier);
        },

        // Reset back to fully automatic behavior
        reset: () => {
            isManualOverride = false;
            clearCache();
            stopFpsMonitor();
            const newTier = classifyDevice(hardwareReport);
            applyTier(newTier, "reset");
            setCachedTier(newTier);
            startFpsMonitor();
        },

        // Event subscription API
        on,
        off,

        // Debug panel controls
        showDebugPanel: () => {
            if (!debugPanelEl) createDebugPanel();
            debugVisible = true;
            debugPanelEl.classList.add("show");
            updateDebugPanel();
        },
        hideDebugPanel: () => {
            debugVisible = false;
            if (debugPanelEl) debugPanelEl.classList.remove("show");
        }
    };
})();