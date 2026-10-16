/**
 * @file lib/routes/static.js
 * @brief 404 page, SPA shell and static files. Registered last.
 */
'use strict';

const path = require("path");
const logger = require("../logger");
const { serveSPA, serve404, serveStatic } = require("../static-handler");

/** @type {import('./index').Route[]} */
module.exports = [
    {
        name: "not-found-page", pattern: "/404", gate: "none",
        match: (p) => p === "/404" || p === "/404.html",
        async handler({ req, res, projectRoot, pathname }) {
            logger.logAccess("GET", 404, pathname);
            return serve404(res, req, projectRoot);
        },
    },
    {
        name: "spa", pattern: "/browse/*", gate: "none",
        match: (p) => p === "/" || p === "/index.html" || p.startsWith("/browse") || p === "/download/release",
        async handler({ req, res, projectRoot, pathname }) {
            const ext = path.extname(pathname).toLowerCase();
            if (ext && ext !== ".html") return serveStatic(pathname, res, req, projectRoot);
            logger.logAccess("GET", 200, pathname, "SPA");
            return serveSPA(res, req, projectRoot);
        },
    },
    {
        name: "static", pattern: "/*", gate: "none",
        match: () => true,
        async handler({ req, res, projectRoot, pathname }) {
            return serveStatic(pathname, res, req, projectRoot);
        },
    },
];
