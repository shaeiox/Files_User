/* ═══════════════════════════════════════════════════════════════
   motion.js — the script half of the motion contract
   (ui-craft-elevation Phase 2, design D4/D5)

   Four native primitives, no animation library:
     reveal()     IntersectionObserver, once per section
     flip()       measure → reorder → invert transform → play
     crossfade()  fade/scale the outgoing state, swap, fade the new one in
     enter()      a staged entrance capped at 10 steps

   Every effect animates transform and opacity only (Web Animations API, so
   nothing is left behind in inline styles), and every one reads the two
   gates live: prefers-reduced-motion and the data-perf tier.
     effect       reduced motion        potato               low
     reveal       not registered        not registered       full
     flip         instant               instant              instant
     crossfade    opacity only          shortened            full
     enter        opacity only          shortened            full
   A preference or tier change mid-session releases pending reveals and
   finishes running script animations, without a reload.
   ═══════════════════════════════════════════════════════════════ */
const Motion = (function () {
    'use strict';

    const root = document.documentElement;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
    const ENTER_CAP = 10;

    const tier = () => (root.getAttribute('data-perf') || 'high').toLowerCase();
    const reduced = () => mq.matches;

    /** Reveal, route and hero motion: off for reduced motion and potato. */
    const allowsMotion = () => !reduced() && tier() !== 'potato';
    /** FLIP reads layout on every change, so it is kept to the upper tiers. */
    const allowsFlip = () => !reduced() && (tier() === 'high' || tier() === 'medium');
    const duration = (ms) => (tier() === 'potato' ? Math.min(ms, 60) : ms);

    /* ── Reveal ─────────────────────────────────────────────────────────── */
    let observer = null;
    const pending = new Set();

    function settle(el) {
        pending.delete(el);
        el.classList.remove('reveal-pending', 'is-revealed');
    }

    function onIntersect(entries) {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const el = entry.target;
            observer.unobserve(el); // once: never re-animates on return
            el.classList.add('is-revealed');
            el.addEventListener('transitionend', () => settle(el), { once: true });
            setTimeout(() => settle(el), 800); // fallback if no transition ran
        }
    }

    /** Registers every [data-reveal] element under `scope`. */
    function reveal(scope) {
        if (!allowsMotion() || typeof IntersectionObserver === 'undefined') return;
        if (!observer) observer = new IntersectionObserver(onIntersect, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
        (scope || document).querySelectorAll('[data-reveal]').forEach((el) => {
            if (pending.has(el)) return;
            pending.add(el);
            el.classList.add('reveal-pending');
            observer.observe(el);
        });
    }

    /** Route teardown: disconnect the observer, leave nothing hidden. */
    function teardown() {
        if (observer) observer.disconnect();
        observer = null;
        pending.forEach(settle);
    }

    /* ── FLIP ───────────────────────────────────────────────────────────── */
    /**
     * @param {HTMLElement} container  positioned grid/list parent
     * @param {() => HTMLElement[]} mutate  reorders/inserts children and returns
     *        the elements that are leaving. They must still be in the DOM;
     *        flip() removes them (after an exit animation when allowed).
     */
    function flip(container, mutate) {
        const animate = allowsFlip();
        const before = new Map();
        const box = container.getBoundingClientRect();
        if (animate) for (const el of container.children) before.set(el, el.getBoundingClientRect());

        const leaving = mutate() || [];

        if (!animate) {
            leaving.forEach((el) => el.remove());
            return;
        }

        // Take leaving cards out of flow at their old position, so the grid
        // reflows around them while they fade.
        for (const el of leaving) {
            const r = before.get(el);
            if (!r) { el.remove(); continue; }
            Object.assign(el.style, {
                position: 'absolute', margin: '0', pointerEvents: 'none',
                top: (r.top - box.top) + 'px', left: (r.left - box.left) + 'px',
                width: r.width + 'px', height: r.height + 'px'
            });
            el.setAttribute('aria-hidden', 'true');
            el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(0.96)' }],
                { duration: 200, easing: 'ease-in', fill: 'forwards' })
                .finished.then(() => el.remove(), () => el.remove());
            setTimeout(() => el.remove(), 320); // same guarantee if the timeline is frozen
        }

        const now = container.getBoundingClientRect();
        for (const el of container.children) {
            if (leaving.includes(el)) continue;
            const r = before.get(el);
            if (!r) {
                el.animate([{ opacity: 0, transform: 'scale(0.96)' }, { opacity: 1, transform: 'none' }],
                    { duration: 260, easing: EASE });
                continue;
            }
            const n = el.getBoundingClientRect();
            const dx = (r.left - box.left) - (n.left - now.left);
            const dy = (r.top - box.top) - (n.top - now.top);
            if (!dx && !dy) continue;
            el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
                { duration: 320, easing: EASE });
        }
    }

    /* ── Cross-fade ─────────────────────────────────────────────────────── */
    /** Fades `els` out (scaling down unless reduced), runs `swap`, fades the
     *  current children back in. Controls stay operable throughout. */
    async function crossfade(els, swap) {
        if (!els.length) { swap(); return; }
        const r = reduced();
        const ms = duration(160);
        const out = r ? [{ opacity: 1 }, { opacity: 0 }]
            : [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(0.97)' }];
        // The swap must happen even if the animation never finishes (a frozen
        // background tab), so the state change is never held by the effect.
        await Promise.race([
            Promise.all(els.map((el) =>
                el.animate(out, { duration: ms, easing: 'ease-in', fill: 'forwards' }).finished.catch(() => { }))),
            new Promise((resolve) => setTimeout(resolve, ms + 80)),
        ]);
        swap();
        const inFrames = r ? [{ opacity: 0 }, { opacity: 1 }]
            : [{ opacity: 0, transform: 'scale(0.98)' }, { opacity: 1, transform: 'none' }];
        els.forEach((el) => {
            el.getAnimations().forEach((a) => a.cancel());
            el.animate(inFrames, { duration: ms, easing: 'ease-out' });
        });
    }

    /* ── Staged entrance ────────────────────────────────────────────────── */
    /** Entrance for the `index`-th item of a list; the delay stops growing at
     *  ENTER_CAP so a long list never takes longer than ten steps. */
    function enter(el, index) {
        const r = reduced();
        const frames = r ? [{ opacity: 0 }, { opacity: 1 }]
            : [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }];
        el.animate(frames, {
            duration: duration(220),
            delay: duration(Math.min(index, ENTER_CAP - 1) * 28),
            easing: 'ease-out',
            fill: 'backwards'
        });
    }

    /** Animates one element in (used to replay a panel's entrance each time). */
    function pop(el) {
        const r = reduced();
        el.animate(r ? [{ opacity: 0 }, { opacity: 1 }]
            : [{ opacity: 0, transform: 'scale(0.98)' }, { opacity: 1, transform: 'none' }],
            { duration: duration(200), easing: EASE });
    }

    /* ── Live gate changes ──────────────────────────────────────────────── */
    function onGateChange() {
        if (allowsMotion()) return;
        pending.forEach(settle);
        if (typeof document.getAnimations === 'function') {
            document.getAnimations().forEach((a) => {
                const css = (typeof CSSAnimation !== 'undefined' && a instanceof CSSAnimation) ||
                    (typeof CSSTransition !== 'undefined' && a instanceof CSSTransition);
                if (!css) a.finish();
            });
        }
    }

    if (mq.addEventListener) mq.addEventListener('change', onGateChange);
    if (window.MutationObserver) {
        new MutationObserver(onGateChange).observe(root, { attributes: true, attributeFilter: ['data-perf'] });
    }

    return { reveal, teardown, flip, crossfade, enter, pop, allowsMotion, reduced };
})();
