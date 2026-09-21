/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @file        idle-timer.js
 * @module      IdleTimer
 * @brief       Ultra-lightweight, zero-overhead client-side session auto-lock.
 *
 * @description
 * Monitors user interaction (mouse, key, scroll, touch) and automatically
 * logs out the user after a configurable idle duration (default: 30 minutes).
 *
 * Performance Features:
 *   1. Throttled activity tracking (updates timestamps at most once every 5 sec)
 *   2. Passive event listeners ({ passive: true }) to prevent scroll jank
 *   3. Page Visibility API integration for instant check on tab return
 *   4. Zero memory leaks (full cleanup on stop)
 *
 * @author      ShaiyaAzizi
 * @version     1.0.0
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const IdleTimer = (function () {
    'use strict';

    /** @constant {number} Minimum interval (ms) between timestamp updates (5 seconds) */
    const THROTTLE_MS = 5000;

    /** @constant {number} How often (ms) the expiration checker runs (10 seconds) */
    const CHECK_INTERVAL_MS = 10000;

    /** @type {number} Idle timeout threshold in milliseconds */
    let timeoutMs = 30 * 60 * 1000;

    /** @type {number} Timestamp of the last detected user interaction */
    let lastActivity = Date.now();

    /** @type {number|null} Reference to the periodic check timer */
    let checkIntervalId = null;

    /** @type {boolean} State flag indicating if timer is currently running */
    let isActive = false;

    /** @type {Function|null} Callback executed when session expires */
    let onTimeoutCallback = null;

    /** @constant {string[]} Window events monitored for user activity */
    const MONITORED_EVENTS = ['mousemove', 'keydown', 'scroll', 'touchstart', 'pointerdown'];

    /**
     * @brief   Throttled event handler for user interaction.
     * @details Updates lastActivity timestamp at most once every THROTTLE_MS.
     */
    function handleActivity() {
        const now = Date.now();
        if (now - lastActivity > THROTTLE_MS) {
            lastActivity = now;
        }
    }

    /**
     * @brief   Checks if current idle duration exceeds the allowed threshold.
     */
    function checkExpiration() {
        if (!isActive) return;
        const now = Date.now();
        if (now - lastActivity >= timeoutMs) {
            triggerTimeout();
        }
    }

    /**
     * @brief   Page Visibility API handler.
     * @details Instantly checks expiration when the user returns to this browser tab.
     */
    function handleVisibilityChange() {
        if (!isActive) return;
        if (document.visibilityState === 'visible') {
            checkExpiration();
        }
    }

    /**
     * @brief   Triggers session expiration and executes the registered callback.
     */
    function triggerTimeout() {
        stop();
        if (typeof onTimeoutCallback === 'function') {
            onTimeoutCallback();
        }
    }

    /**
     * @brief   Starts the idle monitoring timer.
     * @param   {number} [minutes=30]     Idle timeout in minutes.
     * @param   {Function} [onTimeout]    Callback to execute when expired.
     */
    function start(minutes = 30, onTimeout = null) {
        stop(); // Ensure clean state before starting

        timeoutMs = Math.max(1, minutes) * 60 * 1000;
        lastActivity = Date.now();
        onTimeoutCallback = onTimeout;
        isActive = true;

        // Register passive listeners for zero impact on scrolling/UI
        MONITORED_EVENTS.forEach(evt => {
            window.addEventListener(evt, handleActivity, { passive: true });
        });

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Start periodic check
        checkIntervalId = setInterval(checkExpiration, CHECK_INTERVAL_MS);
    }

    /**
     * @brief   Stops the timer and cleans up all event listeners.
     */
    function stop() {
        if (!isActive) return;
        isActive = false;

        if (checkIntervalId) {
            clearInterval(checkIntervalId);
            checkIntervalId = null;
        }

        MONITORED_EVENTS.forEach(evt => {
            window.removeEventListener(evt, handleActivity, { passive: true });
        });

        document.removeEventListener('visibilitychange', handleVisibilityChange);
    }

    /* ── Public API ── */
    return {
        start,
        stop,
        reset: () => { lastActivity = Date.now(); },
        get isActive() { return isActive; }
    };
})();