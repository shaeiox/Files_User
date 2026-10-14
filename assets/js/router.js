/* ═══════════════════════════════════════════════
   router.js — Smart SPA Router (File Aware)
   Skill: Enterprise Architecture — Decoupled & State-managed
   ═══════════════════════════════════════════════ */
const Router = (function () {
    'use strict';

    const app = document.getElementById("app");
    const fileExtensions = /\.(html|backhtml|zip|tar|gz|iso|qcow2|vmdk|pdf|txt|log|sql|docx|xlsx|pptx|png|jpg|exec|sh|yml|yaml|md|json|csv)$/i;

    // Internal State
    let currentPath = window.location.pathname;

    function resolveRoute(path) {
        if (path === "/" || path === "/index.html") return "home";
        if (path === "/browse" || path.startsWith("/browse/")) return "browse";
        if (path === "/download/release") return "release";
        return null;
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
        if (prev !== null && prev !== sig) {
            ResourceService.clearCache();
            if (currentPath === "/" && typeof HomePage !== "undefined") HomePage.refreshResources();
        }

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

    function navigate(path, pushState = true) {
        const route = resolveRoute(path);

        function resolveRoute(path) {
            if (path === "/" || path === "/index.html") return "home";
            if (path === "/browse" || path.startsWith("/browse/")) return "browse";
            if (path === "/download/release") return "release";
            if (path === "/404" || path === "/404.html") return "notfound";
            return null;
        }

        function navigate(path, pushState = true) {
            const route = resolveRoute(path);

            // Unknown client route → one-shot full navigation to real 404 page (no loop)
            if (!route) {
                if (path !== "/404.html" && path !== "/404") {
                    window.location.replace("/404.html"); // replace = no back-button trap
                }
                return;
            }

            currentPath = path;
            if (pushState) {
                history.pushState({ path }, "", path);
            }

            app.style.opacity = "0";
            app.style.transform = "translateY(8px)";

            setTimeout(() => {
                if (route === "home") {
                    HomePage.render(app);
                } else if (route === "browse") {
                    BrowsePage.render(app, path);
                } else if (route === "release") {
                    ReleasePage.render(app, path);
                } else if (route === "notfound") {
                    // Hard page is preferred; if landed here via SPA, bounce once
                    window.location.replace("/404.html");
                    return;
                }

                if (typeof applyLang === "function") {
                    applyLang(getLang());
                }

                requestAnimationFrame(() => {
                    app.style.transition = "opacity 250ms ease, transform 250ms ease";
                    app.style.opacity = "1";
                    app.style.transform = "translateY(0)";
                });

                window.scrollTo({ top: 0, behavior: "instant" });
            }, 150);
        }

        // Update State & Browser History
        currentPath = path;
        if (pushState) {
            history.pushState({ path }, "", path);
        }

        // 1. Transition Out
        app.style.opacity = "0";
        app.style.transform = "translateY(8px)";

        setTimeout(() => {
            // 2. Render Component
            if (route === "home") {
                HomePage.render(app);
            } else if (route === "browse") {
                BrowsePage.render(app, path);
            } else if (route === "release") {
                ReleasePage.render(app, path);
            }

            // 3. Apply Language to newly rendered DOM safely
            if (typeof applyLang === 'function') {
                applyLang(getLang());
            }

            // 3b. Task 1.6 (a11y-ux-debt) - keep the navbar's current-page
            // indicator truthful. It used to be hardcoded to the Downloads tab
            // in the static markup, so it claimed Downloads was the current
            // page on /browse too. Clear every tab, then mark only a tab whose
            // destination matches the active route.
            syncNavTab(path);
            loadNavFolders(); // also catches admin navbar changes made since the last page

            // 4. Transition In
            requestAnimationFrame(() => {
                app.style.transition = "opacity 250ms ease, transform 250ms ease";
                app.style.opacity = "1";
                app.style.transform = "translateY(0)";
            });

            window.scrollTo({ top: 0, behavior: "instant" });
        }, 150);
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
        if (href.startsWith("#") || href.startsWith("mailto:")) return;

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