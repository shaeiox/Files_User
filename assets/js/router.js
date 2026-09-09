/* ═══════════════════════════════════════════════
   router.js — Lightweight SPA Router

   Intercepts internal link clicks and replaces
   only the #app container content instead of
   doing a full page reload.

   ✓ Keeps nav, footer, and banner alive
   ✓ Updates browser URL and history
   ✓ Supports back/forward buttons
   ✓ Falls through to normal navigation for external links
   ═══════════════════════════════════════════════ */

const Router = (function () {
    'use strict';

    const app = document.getElementById("app");

    /**
     * Determine which page module should handle the given path.
     * Returns "home" for root, "browse" for /download/ paths.
     */
    function resolveRoute(path) {
        if (path === "/" || path === "/index.html") return "home";
        if (path.startsWith("/download/")) return "browse";
        return null;
    }

    /**
     * Navigate to a path without full page reload.
     * Renders the appropriate module into #app.
     */
    function navigate(path, pushState = true) {
        const route = resolveRoute(path);

        if (!route) {
            // Unknown route — let the browser handle it normally
            window.location.href = path;
            return;
        }

        // Update URL in address bar
        if (pushState) {
            history.pushState({ path }, "", path);
        }

        // Clear current content with fade
        app.style.opacity = "0";
        app.style.transform = "translateY(8px)";

        setTimeout(() => {
            // Render the correct page
            if (route === "home") {
                HomePage.render(app);
            } else if (route === "browse") {
                BrowsePage.render(app, path);
            }

            // Apply language to new content
            applyLang(getLang());

            // Fade in
            requestAnimationFrame(() => {
                app.style.transition = "opacity 250ms ease, transform 250ms ease";
                app.style.opacity = "1";
                app.style.transform = "translateY(0)";
            });

            // Scroll to top
            window.scrollTo({ top: 0, behavior: "instant" });
        }, 150);
    }

    /**
     * Intercept all internal link clicks.
     * Links with data-link attribute or internal hrefs are caught.
     * External links (https://other-domain.com) pass through normally.
     */
    document.addEventListener("click", (e) => {
        const link = e.target.closest("a[href]");
        if (!link) return;

        const href = link.getAttribute("href");

        // Skip external links
        if (href.startsWith("http") && !href.startsWith(window.location.origin)) return;
        // Skip links that open in new tab
        if (link.target === "_blank") return;
        // Skip non-navigational links
        if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

        e.preventDefault();
        navigate(href);
    });

    /**
     * Handle browser back/forward buttons.
     */
    window.addEventListener("popstate", (e) => {
        const path = e.state?.path || window.location.pathname;
        navigate(path, false);
    });

    /**
     * Language toggle handler.
     */
    document.getElementById("langBtn").addEventListener("click", () => {
        const next = getLang() === "en" ? "fa" : "en";
        applyLang(next);

        // Re-render current page with new language
        const route = resolveRoute(window.location.pathname);
        if (route === "home") {
            HomePage.render(app);
            applyLang(next);
        } else if (route === "browse") {
            BrowsePage.render(app, window.location.pathname);
            applyLang(next);
        }
    });

    /**
     * Initial page load — render based on current URL.
     */
    function init() {
        const path = window.location.pathname;
        history.replaceState({ path }, "", path);
        navigate(path, false);
    }

    // Boot
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    return { navigate };
})();