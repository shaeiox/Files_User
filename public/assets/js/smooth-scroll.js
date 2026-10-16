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
    var CONDENSE_AT = 24; // px scrolled before the nav condenses

    // Nav condense (ui-craft-elevation 3.10) reads Lenis's own scroll
    // emitter. There is deliberately no window scroll listener anywhere.
    function condense(e) {
        var nav = document.querySelector('.nav');
        if (nav) nav.classList.toggle('is-condensed', e.scroll > CONDENSE_AT);
    }

    function perfBlocked() {
        var p = (document.documentElement.getAttribute('data-perf') || '').toLowerCase();
        return p === 'potato';
    }

    function start() {
        if (lenis || reduceMotion || perfBlocked() || typeof Lenis === 'undefined') return;
        lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
        lenis.on('scroll', condense);
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
        var nav = document.querySelector('.nav');
        if (nav) nav.classList.remove('is-condensed');
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
