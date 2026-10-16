/**
 * @file assets/js/smooth-scroll.js
 * @brief Super-smooth main-window scrolling via Lenis, gated by user and
 *        performance preferences. Falls back to native scrolling when Lenis
 *        is unavailable, reduced-motion is requested, or the device is in
 *        "potato" performance mode.
 */
(function () {
    'use strict';

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var lenis = null;
    var rafId = null;

    function perfBlocked() {
        var p = (document.documentElement.getAttribute('data-perf') || '').toLowerCase();
        return p === 'potato';
    }

    function start() {
        if (lenis || reduceMotion || perfBlocked() || typeof Lenis === 'undefined') return;
        lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
        var raf = function (time) {
            lenis.raf(time);
            rafId = requestAnimationFrame(raf);
        };
        rafId = requestAnimationFrame(raf);
    }

    function stop() {
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = null;
        if (lenis) { lenis.destroy(); lenis = null; }
    }

    function sync() {
        if (reduceMotion || perfBlocked()) stop();
        else start();
    }

    // Performance monitor may set/change data-perf after load.
    if (window.MutationObserver) {
        new MutationObserver(sync).observe(document.documentElement, {
            attributes: true, attributeFilter: ['data-perf']
        });
    }

    var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.addEventListener) mq.addEventListener('change', function (e) {
        reduceMotion = e.matches;
        sync();
    });

    sync();
})();
