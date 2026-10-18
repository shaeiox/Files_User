const Theme = (function () {
    'use strict';

    const STORAGE_KEY = 'cav_theme';
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    function getSystemTheme() {
        return mq.matches ? 'dark' : 'light';
    }

    function getStored() {
        try {
            const v = localStorage.getItem(STORAGE_KEY);
            if (v === 'light' || v === 'dark') return v;
        } catch { }
        return null;
    }

    function resolve() {
        return getStored() || getSystemTheme();
    }

    function apply(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.content = theme === 'dark' ? '#101110' : '#f5f5f0';
    }

    /**
     * Applies a theme as a legible change rather than a hard cut
     * (ui-craft-elevation 3.11): a ~280ms View Transitions cross-fade of the
     * whole page (opacity only, timing in base.css). Reduced motion and the
     * potato tier get the instant switch; browsers without the API fall back
     * to the body background/colour transition in base.css.
     */
    function applyAnimated(theme) {
        const animate = typeof Motion !== 'undefined' && Motion.allowsMotion();
        if (animate && typeof document.startViewTransition === 'function') {
            // Apply whatever is current when the callback runs: overlapping
            // transitions can run a skipped one's callback last.
            const vt = document.startViewTransition(() => apply(resolve()));
            vt.ready.catch(() => { });
            vt.finished.catch(() => { });
        } else {
            apply(theme);
        }
    }

    function set(theme, { animate = true } = {}) {
        // Compare with the stored/resolved theme, not the DOM attribute: a
        // pending View Transition has not applied the previous toggle yet.
        const current = resolve();
        if (theme === current) return theme;

        try { localStorage.setItem(STORAGE_KEY, theme); } catch { }

        if (animate) applyAnimated(theme);
        else apply(theme);
        return theme;
    }

    function toggle() {
        const next = resolve() === 'dark' ? 'light' : 'dark';
        return set(next, { animate: true });
    }

    function reset() {
        try { localStorage.removeItem(STORAGE_KEY); } catch { }
        applyAnimated(getSystemTheme());
    }

    function init() {
        // already applied by inline head script; just sync listeners
        apply(resolve());

        mq.addEventListener('change', () => {
            if (!getStored()) applyAnimated(getSystemTheme());
        });

        document.addEventListener('click', (e) => {
            if (e.target.closest('#themeBtn')) toggle();
        });
    }

    // prevent FOUC — applied before paint via head script,
    // but ensure attribute exists if script order differs
    if (!document.documentElement.getAttribute('data-theme')) {
        apply(resolve());
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { toggle, set, reset, resolve, getSystemTheme };
})();
