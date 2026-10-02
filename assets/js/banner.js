/* ═══════════════════════════════════════════════
   banner.js — Self-Contained In-App Banner

   ✓ Works across page navigations (index → browse → ...)
   ✓ Tracks total session time via sessionStorage
   ✓ Includes its own CSS injection — zero external dependencies
   ✓ Single file — just load this and done
   ═══════════════════════════════════════════════ */

const CavBanner = (function () {
    'use strict';

    /* ═════════════════════════════════════════════
       ⚙️  CONFIGURATION
       Edit content, timing, and behavior here.
       ═════════════════════════════════════════════ */
    const CONFIG = {

        // Time before showing banner (ms) — counted across ALL pages
        delay: 10000, // 10 seconds total time on site

        // Auto-dismiss after showing (ms). 0 = manual close only.
        displayDuration: 9000,

        // Storage keys
        shownKey: "session_cav_banner_shown",   // localStorage — permanent "shown once" flag
        startKey: "cav_banner_session",     // sessionStorage — session start timestamp

        // Set to false in production to respect "show once" rule
        debugMode: false,

        // Content per language
        content: {
            en: {
                title: "Explore CloudAvid Docs",
                message: "Setup guides, SysAdmin Skills, and architecture documentation.",
                actionText: "Open Docs",
                actionUrl: "https://docs.cloudavid.com",
            },
            fa: {
                title: "مستندات کلود آوید",
                message: "راهنمای نصب، آموزش و ارتقای مهارت ادمین و مستندات معماری زیرساخت.",
                actionText: "مشاهده مستندات",
                actionUrl: "https://docs.cloudavid.com",
            },
        },

        // Icons (SVG)
        icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>`,
        arrowIcon: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,

        // Enable console logging
        debug: false,
    };

    /* ═════════════════════════════════════════════
       🎨 SELF-CONTAINED CSS
       Injected once into <head> automatically.
       No external CSS file needed.
       ═════════════════════════════════════════════ */
    const BANNER_CSS = `
    /* ═══════════════════════════════════════
    banner.css — In-App Banner Component
    Standalone DOM element — always works
    ═══════════════════════════════════════ */

    .cav-banner-host {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 9999;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
        max-width: calc(100% - 48px);
    }

    html[dir="rtl"] .cav-banner-host {
        right: auto;
        left: 24px;
        align-items: flex-start;
    }

    /* ── Banner card ── */
    .cav-banner {
        pointer-events: auto;
        position: relative;
        display: flex;
        align-items: flex-start;
        gap: 14px;
        width: 400px;
        max-width: 100%;
        padding: 16px 18px 16px 16px;
        border-radius: 10px;
        background: linear-gradient(180deg, #1a1a20, #131318);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow:
            0 10px 40px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.04);
        color: rgba(255, 255, 255, 0.92);
        font-family: var(--font);
        font-size: 0.88rem;
        line-height: 1.5;
        overflow: hidden;

        animation: cav-banner-in 380ms cubic-bezier(0.22, 1, 0.36, 1) both;
        will-change: transform, opacity;
    }

    /* Accent line on top */
    .cav-banner::before {
        content: "";
        position: absolute;
        top: 0;
        left: 20%;
        right: 20%;
        height: 1px;
        background: linear-gradient(90deg, transparent, #2dd4bf, transparent);
        opacity: 0.5;
    }

    .cav-banner.cav-out {
        animation: cav-banner-out 220ms cubic-bezier(0.4, 0, 1, 1) both;
    }

    @keyframes cav-banner-in {
        from {
            opacity: 0;
            transform: translateY(20px) scale(0.94);
        }

        to {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
    }

    @keyframes cav-banner-out {
        from {
            opacity: 1;
            transform: translateY(0) scale(1);
        }

        to {
            opacity: 0;
            transform: translateY(10px) scale(0.96);
        }
    }

    /* ── Icon ── */
    .cav-banner-icon {
        width: 40px;
        height: 40px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 7px;
        background: linear-gradient(180deg, rgba(20, 184, 166, 0.15), rgba(20, 184, 166, 0.05));
        border: 1px solid rgba(20, 184, 166, 0.20);
        color: #2dd4bf;
        position: relative;
    }

    /* subtle glow */
    .cav-banner-icon::after {
        content: "";
        position: absolute;
        inset: -1px;
        border-radius: 7px;
        background: radial-gradient(circle at 50% 0%, rgba(45, 212, 191, 0.25), transparent 70%);
        opacity: 0.6;
        pointer-events: none;
    }

    /* ── Body ── */
    .cav-banner-body {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding-top: 2px;
    }

    .cav-banner-title {
        font-weight: 700;
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.98);
        letter-spacing: -0.005em;
    }

    .cav-banner-msg {
        font-size: 0.82rem;
        color: rgba(255, 255, 255, 0.55);
        line-height: 1.5;
        margin-bottom: 10px;
    }

    /* ── Action button ── */
    .cav-banner-action {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 5px;
        background: rgba(20, 184, 166, 0.12);
        border: 1px solid rgba(20, 184, 166, 0.22);
        color: #5eead4;
        font-size: 0.78rem;
        font-weight: 600;
        text-decoration: none;
        width: fit-content;
        transition:
            background 150ms ease,
            border-color 150ms ease,
            transform 150ms ease;
    }

    .cav-banner-action:hover {
        background: rgba(20, 184, 166, 0.20);
        border-color: rgba(20, 184, 166, 0.35);
        color: #99f6e4;
    }

    .cav-banner-action:active {
        transform: scale(0.97);
    }

    .cav-banner-action svg {
        flex-shrink: 0;
        transition: transform 150ms ease;
    }

    .cav-banner-action:hover svg {
        transform: translateX(2px);
    }

    html[dir="rtl"] .cav-banner-action svg {
        transform: scaleX(-1);
    }

    html[dir="rtl"] .cav-banner-action:hover svg {
        transform: scaleX(-1) translateX(2px);
    }

    /* ── Close ── */
    .cav-banner-close {
        flex-shrink: 0;
        width: 26px;
        height: 26px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        border: none;
        background: transparent;
        color: rgba(255, 255, 255, 0.35);
        cursor: pointer;
        transition: background 120ms, color 120ms;
        padding: 0;
        margin: -3px -6px 0 0;
    }

    html[dir="rtl"] .cav-banner-close {
        margin: -3px 0 0 -6px;
    }

    .cav-banner-close:hover {
        background: rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.85);
    }

    .cav-banner-close:active {
        transform: scale(0.9);
    }

    /* ── Timer bar ── */
    .cav-banner-timer {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 2px;
        background: rgba(255, 255, 255, 0.04);
        overflow: hidden;
    }

    .cav-banner-timer-bar {
        height: 100%;
        background: linear-gradient(90deg, #14b8a6, #2dd4bf, #5eead4);
        transform-origin: left center;
        animation: cav-timer-shrink var(--cav-duration, 8s) linear both;
    }

    html[dir="rtl"] .cav-banner-timer-bar {
        transform-origin: right center;
    }

    @keyframes cav-timer-shrink {
        from {
            transform: scaleX(1);
        }

        to {
            transform: scaleX(0);
        }
    }

    .cav-banner:hover .cav-banner-timer-bar {
        animation-play-state: paused;
    }

    /* ── Responsive ── */
    @media (max-width: 480px) {
        .cav-banner-host {
            right: 12px;
            left: 12px;
            bottom: 12px;
            max-width: none;
            align-items: stretch;
        }

        html[dir="rtl"] .cav-banner-host {
            right: 12px;
            left: 12px;
        }

        .cav-banner {
            width: auto;
        }
    }

    /* ── Reduced motion ── */
    @media (prefers-reduced-motion: reduce) {

        .cav-banner,
        .cav-banner.cav-out,
        .cav-banner-timer-bar {
            animation-duration: 0.01ms !important;
        }
    }
  `;

    /* ═════════════════════════════════════════════
       🔒 INTERNAL
       ═════════════════════════════════════════════ */
    let host = null;
    let cssInjected = false;

    function log(...args) {
        if (CONFIG.debug) {
            console.log("%c🔔 [Banner]", "color:#2dd4bf;font-weight:bold", ...args);
        }
    }

    function getLang() {
        try { return localStorage.getItem("ui_lang") || "en"; }
        catch { return "en"; }
    }

    function getContent() {
        return CONFIG.content[getLang()] || CONFIG.content.en;
    }

    /* ── Storage helpers ── */
    function wasShownBefore() {
        try { return sessionStorage.getItem(CONFIG.shownKey) === "1"; }
        catch { return false; }
    }

    function markAsShown() {
        try { sessionStorage.setItem(CONFIG.shownKey, "1"); }
        catch { }
    }

    function getSessionStart() {
        try {
            const val = sessionStorage.getItem(CONFIG.startKey);
            if (val) return parseInt(val, 10);
            // First page in this session — record timestamp
            const now = Date.now();
            sessionStorage.setItem(CONFIG.startKey, String(now));
            return now;
        } catch {
            return Date.now();
        }
    }

    function getSessionTime() {
        return Date.now() - getSessionStart();
    }

    /* ── CSS injection ── */
    function injectCSS() {
        if (cssInjected) return;
        if (document.getElementById("cav-banner-styles")) { cssInjected = true; return; }
        const style = document.createElement("style");
        style.id = "cav-banner-styles";
        style.textContent = BANNER_CSS;
        document.head.appendChild(style);
        cssInjected = true;
        log("CSS injected into <head>");
    }

    /* ── DOM ── */
    function ensureHost() {
        if (host && document.body.contains(host)) return host;
        host = document.createElement("div");
        host.className = "cav-banner-host";
        host.setAttribute("role", "status");
        host.setAttribute("aria-live", "polite");
        document.body.appendChild(host);
        return host;
    }

    function dismiss(el) {
        if (!el || el.classList.contains("cav-out")) return;
        el.classList.add("cav-out");
        const cleanup = () => {
            el.remove();
            if (host && !host.children.length) {
                host.remove();
                host = null;
            }
        };
        el.addEventListener("animationend", cleanup, { once: true });
        setTimeout(cleanup, 400);
    }

    /* ═════════════════════════════════════════════
       🎬 DISPLAY
       ═════════════════════════════════════════════ */
    function show(overrides = {}) {
        injectCSS();

        const content = { ...getContent(), ...overrides };
        const duration = overrides.displayDuration != null
            ? overrides.displayDuration
            : CONFIG.displayDuration;
        const icon = overrides.icon || CONFIG.icon;

        const wrap = ensureHost();
        const el = document.createElement("div");
        el.className = "cav-banner";
        el.style.setProperty("--cav-dur", duration + "ms");

        el.innerHTML = `
      <div class="cav-banner-icon">${icon}</div>
      <div class="cav-banner-body">
        <div class="cav-banner-title">${content.title}</div>
        <div class="cav-banner-msg">${content.message}</div>
        <a class="cav-banner-action" href="${content.actionUrl}" target="_blank" rel="noopener noreferrer">
          <span>${content.actionText}</span>
          ${CONFIG.arrowIcon}
        </a>
      </div>
      <button class="cav-banner-close" aria-label="Close" type="button">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
      ${duration > 0 ? '<div class="cav-banner-timer"><div class="cav-banner-timer-bar"></div></div>' : ''}
    `;

        el.querySelector(".cav-banner-close").addEventListener("click", () => dismiss(el));

        if (duration > 0) {
            let timer = null;
            const startTimer = () => { timer = setTimeout(() => dismiss(el), duration); };
            const stopTimer = () => { if (timer) { clearTimeout(timer); timer = null; } };

            startTimer();
            el.addEventListener("mouseenter", stopTimer);
            el.addEventListener("mouseleave", () => {
                stopTimer();
                startTimer();
                const bar = el.querySelector(".cav-banner-timer-bar");
                if (bar) {
                    bar.style.animation = "none";
                    void bar.offsetHeight;
                    bar.style.animation = "";
                }
            });
        }

        wrap.appendChild(el);
        log("Banner displayed on", window.location.pathname);
        return el;
    }

    function showOnce(overrides) {
        if (!CONFIG.debugMode && wasShownBefore()) {
            log("Skipped — already shown in a previous session");
            return null;
        }
        markAsShown();
        return show(overrides);
    }

    function reset() {
        try {
            localStorage.removeItem(CONFIG.shownKey);
            sessionStorage.removeItem(CONFIG.startKey);
            log("All storage cleared — banner will re-trigger");
        } catch { }
    }

    /* ═════════════════════════════════════════════
       ⏱️ AUTO TRIGGER (time-based, cross-page)
       Uses sessionStorage to persist start time
       across page navigations.
       ═════════════════════════════════════════════ */
    let triggerTimer = null;
    let triggerFired = false;

    function startTrigger() {
        if (triggerFired) return;

        // Check if already shown before (production mode)
        if (!CONFIG.debugMode && wasShownBefore()) {
            log("Trigger skipped — banner was already shown");
            return;
        }

        const sessionStart = getSessionStart();
        const elapsed = Date.now() - sessionStart;
        const remaining = Math.max(0, CONFIG.delay - elapsed);

        if (remaining <= 0) {
            // Already past the delay threshold (user navigated between pages)
            fireTrigger();
        } else {
            log(`Trigger set — banner in ${(remaining / 1000).toFixed(1)}s (${(elapsed / 1000).toFixed(1)}s already elapsed)`);
            triggerTimer = setTimeout(fireTrigger, remaining);
        }
    }

    function fireTrigger() {
        if (triggerFired) return;
        triggerFired = true;

        if (triggerTimer) {
            clearTimeout(triggerTimer);
            triggerTimer = null;
        }

        const elapsed = (getSessionTime() / 1000).toFixed(1);
        log(`✨ Trigger fired after ${elapsed}s total session time`);

        showOnce();
    }

    /* ═════════════════════════════════════════════
       🔌 BOOT
       ═════════════════════════════════════════════ */
    function boot() {
        injectCSS();
        startTrigger();
        log("Booted on", window.location.pathname);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    }

    /* ═════════════════════════════════════════════
       🎬 PUBLIC API
       ═════════════════════════════════════════════ */
    return {
        show,
        showOnce,
        reset,
        config: CONFIG,
        getSessionTime: () => (getSessionTime() / 1000).toFixed(1) + "s",
    };
})();
