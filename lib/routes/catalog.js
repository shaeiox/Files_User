/**
 * @file lib/routes/catalog.js
 * @brief Health, navbar folders, home-page categories and search.
 */
'use strict';

const logger = require("../logger");
const { sendJSON } = require("../http-utils");
const filesService = require("../files-service");
const accessPolicy = require("../access-policy");
const adminDb = require("../admin-db");

/** @type {import('./index').Route[]} */
module.exports = [
    {
        name: "health", pattern: "/api/health", gate: "none",
        match: (p) => p === "/__health" || p === "/api/health",
        async handler({ req, res }) {
            return sendJSON(res, req, 200, { status: "ok", uptime: process.uptime() });
        },
    },
    {
        // Admin navbar folders this caller may see: decided like a listing entry
        // (allowed, or self-locked -> name + locked), on the requested and the
        // on-disk path; missing folders are skipped. Never more than the caller
        // could reach by browsing.
        name: "nav", pattern: "/api/nav", gate: "policy-aggregate",
        match: (p) => p === "/api/nav",
        async handler({ req, res, projectRoot, policyUnavailable, worstOf }) {
            if (policyUnavailable()) return;
            const folders = [];
            for (const f of adminDb.navFolders()) {
                const real = await filesService.canonicalRel(projectRoot, f.relPath);
                if (real === null) continue;
                const decision = worstOf([f.relPath, real]);
                const shaped = accessPolicy.projectEntry({ name: f.label, path: f.relPath, type: "directory" }, decision);
                // hideFromHome lets the client spot a changed list and drop its cached home cards.
                if (shaped) folders.push({ ...shaped, hideFromHome: f.hideFromHome });
            }
            return sendJSON(res, req, 200, { folders });
        },
    },
    {
        name: "categories", pattern: "/api/categories", gate: "policy-aggregate",
        match: (p) => p === "/api/categories",
        async handler({ req, res, projectRoot, pathname, start, policyUnavailable, decideFor }) {
            if (policyUnavailable()) return;
            // "Hide from home" removes a navbar folder's card only; it stays
            // reachable through the navbar, browse and search.
            const offHome = new Set(adminDb.navFolders().filter((f) => f.hideFromHome)
                .map((f) => adminDb.normalizeClientPath("/" + f.relPath)));
            const cats = (await filesService.listCategories(projectRoot, decideFor))
                .filter((c) => !offHome.has(adminDb.normalizeClientPath("/" + c.path)));
            logger.logAccess("GET", 200, pathname, `${cats.length} cats · ${Date.now() - start}ms`);
            return sendJSON(res, req, 200, cats);
        },
    },
    {
        name: "search", pattern: "/api/search", gate: "policy",
        match: (p) => p === "/api/search",
        async handler({ req, res, projectRoot, url, policyUnavailable, releaseGateLegacy, gate, decideFor }) {
            if (policyUnavailable()) return;
            const scope = url.searchParams.get("path") || "";
            if (releaseGateLegacy([scope])) return;
            if (scope && await gate([scope], "Path not found.")) return;
            const data = await filesService.searchEntries(projectRoot, url.searchParams.get("q"), {
                limit: url.searchParams.get("limit"),
                path: scope,
                decideFor,
            });
            return sendJSON(res, req, 200, data);
        },
    },
];
