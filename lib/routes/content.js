/**
 * @file lib/routes/content.js
 * @brief Directory listings, downloads, SHA-256 digests and ZIP archives.
 *
 * Every route here gates each target twice (as requested, then as resolved on
 * disk) before the filesystem is read; see lib/request-context.js gate().
 */
'use strict';

const logger = require("../logger");
const { sendJSON } = require("../http-utils");
const { streamDownload, streamArchive } = require("../static-handler");
const filesService = require("../files-service");
const archiveService = require("../archive-service");
const hashService = require("../hash-service");
const accessPolicy = require("../access-policy");

/** @type {import('./index').Route[]} */
module.exports = [
    {
        name: "files", pattern: "/api/files/*", gate: "policy",
        match: (p) => p.startsWith("/api/files"),
        async handler({ req, res, projectRoot, pathname, stripPrefix, releaseGateLegacy, gate, policySession }) {
            const rel = stripPrefix(pathname, "/api/files");
            if (releaseGateLegacy([rel])) return;
            if (await gate([rel], "Path not found.")) return;
            const listed = await filesService.listPath(projectRoot, rel);
            const entries = Array.isArray(listed) ? accessPolicy.filterVisible(listed, policySession()) : [];
            logger.logAccess("GET", 200, pathname, `${entries.length} items`);
            return sendJSON(res, req, 200, entries);
        },
    },
    {
        name: "download", pattern: "/api/download/*", gate: "policy",
        match: (p) => p.startsWith("/api/download") && p !== "/api/download-zip",
        async handler({ req, res, projectRoot, pathname, start, stripPrefix, releaseGateLegacy, gate }) {
            const rel = stripPrefix(pathname, "/api/download");
            if (releaseGateLegacy([rel])) return;
            if (await gate([rel], "File not found.", "download")) return;
            const fileInfo = await filesService.getDownloadTarget(projectRoot, rel);
            logger.logAccess("GET", 200, pathname, `download · ${Date.now() - start}ms`);
            return streamDownload(req, res, fileInfo);
        },
    },
    {
        // SHA-256 verification. Gated before the file is opened, so no digest is
        // ever computed for a path the caller may not read.
        name: "hash", pattern: "/api/hash/*", gate: "policy",
        match: (p) => p.startsWith("/api/hash"),
        async handler({ req, res, projectRoot, pathname, start, stripPrefix, releaseGateLegacy, gate }) {
            const rel = stripPrefix(pathname, "/api/hash");
            if (releaseGateLegacy([rel])) return;
            if (await gate([rel], "File not found.", "download")) return;
            const result = await hashService.hashFile(projectRoot, rel);
            logger.logAccess("GET", 200, pathname, `sha256 · ${Date.now() - start}ms`);
            return sendJSON(res, req, 200, result);
        },
    },
    {
        // ZIP archive of a selection of files and folders.
        // POST is not available outside /api/auth/ (see the method check in the
        // dispatcher), so the selection travels in the query string. Every entry is
        // re-resolved through files-service's own containment + hidden-file policy
        // by archive-selection. Named entries are gated here (one refusal refuses
        // the archive); folder descendants are screened one by one with
        // mayDownload and the ones the caller may not download are left out.
        name: "download-zip", pattern: "/api/download-zip", gate: "policy",
        match: (p) => p === "/api/download-zip",
        async handler({ req, res, projectRoot, url, pathname, start, releaseGateLegacy, gate, norm, mayDownload }) {
            const dirRel = (url.searchParams.get("dir") || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
            const itemsParam = url.searchParams.get("items") || "";
            // Each item was percent-encoded per segment by ResourceService, then the joined list
            // was encoded again as a query value — so `searchParams` has already undone one
            // layer. Decode the remainder to recover the original path (spaces, unicode).
            // Commas are safe as a separator because encodeURIComponent encodes them as %2C.
            const relPaths = itemsParam.split(",")
                .map(s => { try { return decodeURIComponent(s.trim()); } catch { return s.trim(); } })
                .filter(Boolean);

            // Path-scoped auth normally keys off the URL pathname, but this route carries
            // its target in the query string, so the pathname gate never sees it. Evaluate the
            // SAME helper against synthetic `/api/files/<rel>` pathnames — covering both
            // the browsed directory AND every requested entry, since a crafted request
            // could otherwise hide the gated path in `items` while leaving `dir` innocuous.
            if (releaseGateLegacy([dirRel, ...relPaths])) return;

            // Admin policy gate: the browsed directory and every selected entry must
            // be allowed before anything is zipped; one refusal refuses the archive.
            // The browsed folder needs only to be visible; every selected file is read.
            if (await gate([dirRel].map(norm), "File not found.")) return;
            if (await gate(relPaths.map(norm), "File not found.", "download")) return;

            const archive = await archiveService.createArchive(projectRoot, dirRel, relPaths, { allow: mayDownload });
            const fileName = archiveService.archiveName(dirRel, archive.archiveEntryCount, archive.archiveSoleFolder);
            logger.logAccess("GET", 200, pathname, `zip · ${archive.archiveEntryCount} entries · ${Date.now() - start}ms`);
            return streamArchive(req, res, archive, fileName);
        },
    },
];
