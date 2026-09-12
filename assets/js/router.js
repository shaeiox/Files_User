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
/* ═══════════════════════════════════════════════
   router.js — Smart SPA Router (File Aware)
   ═══════════════════════════════════════════════ */
const Router = (function () {
    'use strict';

    const app = document.getElementById("app");
    const fileExtensions = /\.(html|backhtml|zip|tar|gz|iso|qcow2|vmdk|pdf|txt|log|sql|docx|xlsx|pptx|png|jpg|exec|sh)$/i;

    function resolveRoute(path) {
        if (path === "/" || path === "/index.html") return "home";
        if (path.startsWith("/download/") || path.startsWith("/files/")) return "browse";
        return null;
    }

    function navigate(path, pushState = true) {
        const route = resolveRoute(path);

        if (!route) {
            window.location.href = path;
            return;
        }

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
            }

            applyLang(getLang());

            requestAnimationFrame(() => {
                app.style.transition = "opacity 250ms ease, transform 250ms ease";
                app.style.opacity = "1";
                app.style.transform = "translateY(0)";
            });

            window.scrollTo({ top: 0, behavior: "instant" });
        }, 150);
    }

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

    window.addEventListener("popstate", (e) => {
        const path = e.state?.path || window.location.pathname;
        navigate(path, false);
    });

    document.getElementById("langBtn").addEventListener("click", () => {
        const next = getLang() === "en" ? "fa" : "en";
        applyLang(next);

        const route = resolveRoute(window.location.pathname);
        if (route === "home") {
            HomePage.render(app);
            applyLang(next);
        } else if (route === "browse") {
            BrowsePage.render(app, window.location.pathname);
            applyLang(next);
        }
    });

    function init() {
        const path = window.location.pathname;
        history.replaceState({ path }, "", path);
        navigate(path, false);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

    return { navigate };
})();
