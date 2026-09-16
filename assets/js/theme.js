const Theme = (function () {
    'use strict';

    const STORAGE_KEY = 'cav_theme';
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const WIPE_MS = 700;

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
        if (meta) meta.content = theme === 'dark' ? '#303236' : '#f6f6f6';
    }

    /**
     * Trigger diagonal wipe on hero logo (if present).
     * Adds .wiping → CSS transitions clip-path + line animation.
     */
    function triggerLogoWipe() {
        const el = document.getElementById('logoSwap');
        if (!el) return;

        // restart animation cleanly
        el.classList.remove('wiping');
        void el.offsetWidth; // force reflow
        el.classList.add('wiping');

        clearTimeout(el._wipeTimer);
        el._wipeTimer = setTimeout(() => {
            el.classList.remove('wiping');
        }, WIPE_MS + 50);
    }

    function set(theme, { animate = true } = {}) {
        const current = document.documentElement.getAttribute('data-theme');
        if (theme === current) return theme;

        try { localStorage.setItem(STORAGE_KEY, theme); } catch { }

        if (animate) triggerLogoWipe();
        apply(theme);
        return theme;
    }

    function toggle() {
        const next = resolve() === 'dark' ? 'light' : 'dark';
        return set(next, { animate: true });
    }

    function reset() {
        try { localStorage.removeItem(STORAGE_KEY); } catch { }
        const sys = getSystemTheme();
        triggerLogoWipe();
        apply(sys);
    }

    function init() {
        // already applied by inline head script; just sync listeners
        apply(resolve());

        mq.addEventListener('change', () => {
            if (!getStored()) {
                triggerLogoWipe();
                apply(getSystemTheme());
            }
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
