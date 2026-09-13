/* ═══════════════════════════════════════════════
   router.js — Smart SPA Router (File Aware)
   Skill: Enterprise Architecture — Decoupled & State-managed
   ═══════════════════════════════════════════════ */
const Router = (function () {
    'use strict';

    const app = document.getElementById("app");
    const fileExtensions = /\.(html|backhtml|zip|tar|gz|iso|qcow2|vmdk|pdf|txt|log|sql|docx|xlsx|pptx|png|jpg|exec|sh)$/i;

    // Internal State
    let currentPath = window.location.pathname;

    function resolveRoute(path) {
        if (path === "/" || path === "/index.html") return "home";
        if (path.startsWith("/download/") || path.startsWith("/files/")) return "browse";
        return null;
    }

    function navigate(path, pushState = true) {
        const route = resolveRoute(path);

        // Fallback for external or unknown routes
        if (!route) {
            window.location.href = path;
            return;
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
            }

            // 3. Apply Language to newly rendered DOM safely
            if (typeof applyLang === 'function') {
                applyLang(getLang());
            }

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
        history.replaceState({ path: currentPath }, "", currentPath);
        navigate(currentPath, false);
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