/**
 * @file lib/static-handler.js
 * @brief Handles serving HTML/CSS/JS, downloads, and 404 pages.
 */
'use strict';

const fs = require("fs");
const path = require("path");
const { sendText, securityHeaders, applyCors } = require("./http-utils");

const MIMES = {
    ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
    ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml",
    ".txt": "text/plain; charset=utf-8", ".pdf": "application/pdf",
    ".zip": "application/zip", ".iso": "application/octet-stream"
};

function serveSPA(res, req, projectRoot) {
    fs.readFile(path.join(projectRoot, "index.html"), (err, data) => {
        if (err) {
            applyCors(res, req);
            securityHeaders(res, req);
            return sendText(res, req, 500, "index.html missing");
        }
        applyCors(res, req);
        securityHeaders(res, req);
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(data);
    });
}

function serve404(res, req, projectRoot) {
    fs.readFile(path.join(projectRoot, "404.html"), (err, data) => {
        applyCors(res, req);
        securityHeaders(res, req);
        if (err) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            return res.end("404 — Page Not Found");
        }
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
        res.end(data);
    });
}

// Public static surface: the three HTML shells and anything under /assets/.
// Everything else in the project root (server.js, package.json, .env, lib/, …)
// is not a web asset and must 404 rather than leak source/config.
const STATIC_ALLOWLIST = new Set(["/index.html", "/browse.html", "/404.html"]);
function isAllowedStatic(safeRel) {
    if (STATIC_ALLOWLIST.has(safeRel)) return true;
    if (safeRel.startsWith("/assets/")) return true;
    return false;
}

function serveStatic(reqPath, res, req, projectRoot) {
    // Normalize separators and dot-segments BEFORE the allowlist: a percent-encoded
    // "%2e%2e" survives URL parsing (which strips only literal ".."), so the allowlist
    // and the filesystem must be shown the same normalized path or the check is bypassed.
    const normalized = path.posix.normalize("/" + String(reqPath || "/").replace(/\\/g, "/"));
    const safeRel = "/" + normalized.replace(/^\/+/, "");

    if (!isAllowedStatic(safeRel)) {
        return serve404(res, req, projectRoot);
    }

    const base = path.resolve(projectRoot);
    const target = path.resolve(base, safeRel.slice(1));
    const relTarget = path.relative(base, target);
    // Reject traversal and symlink escapes: the resolved real file must still be
    // inside the project root.
    if (relTarget.startsWith("..") || path.isAbsolute(relTarget)) {
        return serve404(res, req, projectRoot);
    }

    let realTarget;
    try {
        realTarget = fs.realpathSync(target);
        const realBase = fs.realpathSync(base);
        const realRel = path.relative(realBase, realTarget);
        if (realRel.startsWith("..") || path.isAbsolute(realRel)) {
            return serve404(res, req, projectRoot);
        }
    } catch {
        return serve404(res, req, projectRoot);
    }

    const ext = path.extname(target).toLowerCase();
    fs.readFile(realTarget, (err, data) => {
        if (err) return serve404(res, req, projectRoot);
        applyCors(res, req);
        securityHeaders(res, req);
        res.writeHead(200, {
            "Content-Type": MIMES[ext] || "application/octet-stream",
            "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600",
        });
        res.end(data);
    });
}

function streamDownload(req, res, fileInfo) {
    const ext = path.extname(fileInfo.fileName).toLowerCase();
    const fallbackName = String(fileInfo.fileName).replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");

    applyCors(res, req);
    securityHeaders(res, req);
    res.writeHead(200, {
        "Content-Type": MIMES[ext] || "application/octet-stream",
        "Content-Length": fileInfo.size,
        "Content-Disposition": `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(fileInfo.fileName)}`,
        "Cache-Control": "private, max-age=0, must-revalidate",
    });

    if (req.method === "HEAD") return res.end();

    const stream = fs.createReadStream(fileInfo.absPath);
    stream.on("error", () => (!res.headersSent ? sendText(res, req, 500, "Read failed") : res.destroy()));
    req.on("close", () => stream.destroy());
    stream.pipe(res);
}

/**
 * Streams a generated ZIP archive to the client.
 * No Content-Length is sent: the archive is produced on the fly, so its size is not
 * known up front and the response is chunked.
 */
function streamArchive(req, res, archive, fileName) {
    const fallbackName = String(fileName).replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");

    applyCors(res, req);
    securityHeaders(res, req);
    res.writeHead(200, {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "private, max-age=0, must-revalidate",
    });

    // HEAD is the client's preflight: the selection was already validated, so
    // answer the headers without building the archive.
    if (req.method === "HEAD") { archive.destroy(); return res.end(); }

    archive.on("error", () => res.destroy());
    req.on("close", () => archive.destroy());
    archive.pipe(res);
}

module.exports = { serveSPA, serve404, serveStatic, streamDownload, streamArchive };