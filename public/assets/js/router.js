/* ═══════════════════════════════════════════════
   router.js — Smart SPA Router (File Aware)
   Skill: Enterprise Architecture — Decoupled & State-managed

   ui-craft-elevation (routing):
   - Route modules are explicit handles. Home ships with the shell; Browse
     and Releases are ES modules fetched with native import() the first time
     their route is entered, together with their route stylesheet (5.1-5.3).
   - The outgoing view stays on screen while the destination is prepared, and
     the swap is a View Transition keyed to the DOM commit, not a timer. Where
     the API is missing, the new view renders at once and plays a short
     opacity/transform entrance that is removed when it ends (3.6/3.7).
   ═══════════════════════════════════════════════ */
const Router = (function () {
    'use strict';

    const app = document.getElementById("app");
    const fileExtensions = /\.(html|backhtml|zip|tar|gz|iso|qcow2|vmdk|pdf|txt|log|sql|docx|xlsx|pptx|png|jpg|exec|sh|yml|yaml|md|json|csv)$/i;

    // Internal State
    let currentPath = window.location.pathname;
    let navToken = 0;
    let currentRoute = null; // route of the view now in #app

    function resolveRoute(path) {
        if (path === "/" || path === "/index.html") return "home";
        if (path === "/browse" || path.startsWith("/browse/")) return "browse";
        if (path === "/download/release") return "release";
        return null;
    }

    /* ── Route table: one explicit handle per route (no bare globals) ── */
    const loadBrowse = async () => (await import("/assets/js/browse.js?v=4.4.2")).BrowsePage;
    const ROUTES = {
        // Home embeds the Browse explorer below its hero, so it needs the same
        // module and stylesheet (browse-split-explorer: home embed).
        home: {
            css: "/assets/css/browse.css?v=4.4.2",
            load: async () => { HomePage.useBrowse(await loadBrowse()); return HomePage; },
        },
        browse: {
            css: "/assets/css/browse.css?v=4.4.2",
            load: loadBrowse,
        },
        release: {
            css: "/assets/css/release.css?v=4.4.2",
            load: async () => (await import("/assets/js/releases.js?v=4.4.2")).ReleasePage,
        },
    };

    // Route stylesheets are inserted before performance-modes.css so the
    // documented link order (STYLEGUIDE §1) still holds, and are disabled while
    // another route is shown so their rules never leak onto it.
    const sheets = {};

    function loadStylesheet(href) {
        if (sheets[href]) return sheets[href].ready;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        const ready = new Promise((resolve) => {
            link.onload = resolve;
            link.onerror = resolve; // an unstyled route still beats a dead one
        });
        const anchor = document.getElementById("perfModesCss");
        document.head.insertBefore(link, anchor || null);
        sheets[href] = { link, ready };
        return ready;
    }

    function activateStylesheet(href) {
        Object.keys(sheets).forEach((k) => { sheets[k].link.disabled = k !== href; });
    }

    // Task 1.6 (a11y-ux-debt) - mark at most one nav tab as the current page,
    // derived from the active route. A tab matches when its declared
    // destination equals the route root, so nested browse paths still match
    // the Downloads tab. Routes with no tab (e.g. /browse) leave all unmarked,
    // which is truthful: the shell simply has no tab for them.
    function syncNavTab(path) {
        const tabs = document.querySelectorAll("[data-nav-tab]");
        if (!tabs.length) return;

        tabs.forEach(tab => {
            tab.classList.remove("active");
            tab.removeAttribute("aria-current");
        });

        // Deepest tab whose destination contains the path wins (an admin navbar
        // folder over /browse); otherwise the route root decides as before.
        const trim = (s) => String(s || "/").replace(/\/+$/, "") || "/";
        const p = trim(path);
        const routeRoot = "/" + p.split("/")[1];
        let best = null, bestLen = 0;
        tabs.forEach(tab => {
            const dest = trim(tab.getAttribute("data-nav-tab"));
            if (dest !== "/" && (p === dest || p.startsWith(dest + "/")) && dest.length > bestLen) {
                best = tab;
                bestLen = dest.length;
            }
        });
        if (!best) best = Array.from(tabs).find(tab => tab.getAttribute("data-nav-tab") === routeRoot);
        if (best) {
            best.classList.add("active");
            best.setAttribute("aria-current", "page");
        }
    }

    // Admin navbar folders (/api/nav, filtered per visitor by the server).
    // Rebuilt on sign-in/out because the visible set depends on who is asking.
    const FOLDER_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2z"/></svg>';
    const LOCK_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';

    async function loadNavFolders() {
        const group = document.getElementById("navTabs");
        if (!group || typeof ResourceService === "undefined") return;
        let folders = [];
        try { folders = await ResourceService.getNav(); } catch { return; /* keep what is shown */ }

        // The home cards are cached for minutes; an admin change to the navbar
        // (e.g. "hide from home") must not wait for that cache to expire.
        const sig = JSON.stringify(folders);
        let prev = null;
        try { prev = sessionStorage.getItem("cav_nav_sig"); sessionStorage.setItem("cav_nav_sig", sig); } catch { /* storage blocked */ }
        if (prev !== null && prev !== sig) ResourceService.clearCache();

        group.querySelectorAll("[data-nav-folder]").forEach(el => el.remove());
        if (!folders.length) return;

        const d = typeof window.getDict === "function" ? window.getDict() : {};
        const frag = document.createDocumentFragment();
        const sep = document.createElement("span");
        sep.className = "nav-sep";
        sep.setAttribute("data-nav-folder", "");
        sep.setAttribute("aria-hidden", "true");
        frag.appendChild(sep);
        for (const f of folders) {
            const a = document.createElement("a");
            const href = ResourceService.browseHref(f.path);
            a.className = "nav-tab nav-tab-folder";
            a.href = href;
            a.setAttribute("data-nav-tab", href);
            a.setAttribute("data-nav-folder", "");
            a.innerHTML = f.locked ? LOCK_ICON : FOLDER_ICON;
            const label = document.createElement("span");
            label.textContent = f.name;
            a.appendChild(label);
            if (f.locked) {
                a.classList.add("is-locked");
                a.title = d.signInToOpen || "Sign in to open";
            }
            frag.appendChild(a);
        }
        group.appendChild(frag);
        syncNavTab(currentPath);
    }

    // Task 6.1/6.5 (a11y-ux-debt) - mobile navigation disclosure. Below
    // 900px CSS hides .nav-tabs; this native button toggles .is-open and
    // reports the group's real state via aria-expanded in both directions.
    // No custom key handling: Enter/Space fire click on a native button,
    // and activation never moves focus, so focus stays on the control.
    function bindNavDisclosure() {
        const btn = document.getElementById("navDisclosure");
        const group = document.getElementById("navTabs");
        if (!btn || !group) return;

        btn.addEventListener("click", () => {
            const isOpen = group.classList.toggle("is-open");
            btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
        });
    }

    /** Commits the destination view. Runs inside the View Transition update. */
    function commit(page, route, path, sameShell) {
        if (typeof Motion !== "undefined") Motion.teardown(); // outgoing observers
        activateStylesheet(ROUTES[route].css);
        page.render(app, path);
        currentRoute = route;

        if (typeof applyLang === "function") applyLang(getLang());

        // Task 1.6 (a11y-ux-debt) - keep the navbar's current-page indicator
        // truthful: clear every tab, then mark only the one matching the route.
        syncNavTab(path);
        loadNavFolders(); // also catches admin navbar changes made since the last page

        // Folder to folder inside Browse keeps the page where it is, unless the
        // user has scrolled past the top of the panes (browse-split-explorer D4).
        if (!sameShell) window.scrollTo({ top: 0, behavior: "instant" });
        else {
            const top = Math.max(0, app.getBoundingClientRect().top + window.scrollY - app.offsetTop);
            if (window.scrollY > top) window.scrollTo({ top, behavior: "instant" });
        }
        if (typeof Motion !== "undefined") Motion.reveal(app);
    }

    async function navigate(path, pushState = true) {
        const route = resolveRoute(path);

        // Unknown client route → one-shot full navigation to the real 404 page.
        // replace() swaps the failing entry instead of pushing one, so Back
        // does not return to the same failing path (routing: no history trap).
        if (!route) {
            window.location.replace("/404.html");
            return;
        }

        // State before render, so code running during render reads the
        // destination route, not the previous one.
        currentPath = path;
        if (pushState) history.pushState({ path }, "", path);
        const token = ++navToken;

        // Prepare first, while the outgoing view stays on screen.
        const def = ROUTES[route];
        let page;
        try {
            [page] = await Promise.all([def.load(), def.css ? loadStylesheet(def.css) : null]);
        } catch (err) {
            console.error("[Router] Failed to load route module:", err);
            window.location.reload(); // a full load serves the same route afresh
            return;
        }
        if (token !== navToken) return; // a newer navigation superseded this one

        // Browse → Browse keeps its tree pane mounted; only the centre pane
        // changes and animates itself, so the whole-view swap is skipped.
        const sameShell = route === "browse" && currentRoute === "browse";

        // Nothing to transition from on the first render after a full load.
        const animate = !sameShell && app.childElementCount > 0 && typeof Motion !== "undefined" && Motion.allowsMotion();
        if (animate && typeof document.startViewTransition === "function") {
            // A skipped transition (hidden tab, a newer one) still runs the
            // update; only its promises reject, so they must not go unhandled.
            const vt = document.startViewTransition(() => commit(page, route, path, false));
            vt.ready.catch(() => { });
            vt.finished.catch(() => { });
            return;
        }

        commit(page, route, path, sameShell);
        if (animate) {
            app.classList.remove("route-enter");
            void app.offsetWidth; // restart the entrance on back-to-back navigations
            app.classList.add("route-enter");
            app.addEventListener("animationend", () => app.classList.remove("route-enter"), { once: true });
        }
    }

    // A clean method for other modules to request a page re-render (e.g. after language change)
    function refresh() {
        navigate(currentPath, false);
    }

    // Global Link Interceptor
    document.addEventListener("click", (e) => {
        const link = e.target.closest("a[href]");
        if (!link) return;

        const href = link.getAttribute("href");

        if (href.startsWith("http") && !href.startsWith(window.location.origin)) return;
        if (link.target === "_blank") return;
        if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

        if (fileExtensions.test(href) || link.hasAttribute("data-file")) {
            return;
        }

        e.preventDefault();
        navigate(href);
    });

    // Handle Browser Back/Forward Buttons
    window.addEventListener("popstate", (e) => {
        const path = e.state?.path || window.location.pathname;
        navigate(path, false);
    });

    // Boot
    function init() {
        history.replaceState({ path: currentPath }, "", currentPath + window.location.search + window.location.hash);
        bindNavDisclosure();
        navigate(currentPath, false);
        document.addEventListener("auth:changed", loadNavFolders);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    // Public API
    return {
        navigate,
        refresh,
        get currentPath() { return currentPath; }
    };
})();
