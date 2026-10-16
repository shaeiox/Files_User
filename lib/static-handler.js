/**
 * @file lib/static-handler.js
 * @brief Handles serving HTML/CSS/JS, downloads, and 404 pages.
 */
'use strict';

const fs = require("fs");
const path = require("path");
const { sendText, securityHeaders, applyCors } = require("./http-utils");
const metrics = require("./metrics");

const MIMES = {
    ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
    ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml",
    ".txt": "text/plain; charset=utf-8", ".pdf": "application/pdf",
    ".zip": "application/zip", ".iso": "application/octet-stream",
    ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2",
};

// The web root. Only what is under public/ is ever served as a static file:
// server.js, lib/, package.json, data/ and the docs live outside it, so they
// cannot leak through this handler (or through an nginx `root` pointed here).
const publicDir = (projectRoot) => path.join(projectRoot, "public");

function serveSPA(res, req, projectRoot) {
    fs.readFile(path.join(publicDir(projectRoot), "index.html"), (err, data) => {
        applyCors(res, req);
        securityHeaders(res, req);
        if (err) return sendText(res, req, 500, "index.html missing");
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(data);
    });
}

function serve404(res, req, projectRoot) {
    fs.readFile(path.join(publicDir(projectRoot), "404.html"), (err, data) => {
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

const outside = (base, target) => {
    const rel = path.relative(base, target);
    return rel.startsWith("..") || path.isAbsolute(rel);
};

async function serveStatic(reqPath, res, req, projectRoot) {
    // Normalize separators and dot-segments first: a percent-encoded "%2e%2e"
    // survives URL parsing (which strips only literal ".."), so containment must
    // be checked on the same normalized path the filesystem sees.
    const normalized = path.posix.normalize("/" + String(reqPath || "/").replace(/\\/g, "/"));
    const base = path.resolve(publicDir(projectRoot));
    const target = path.resolve(base, normalized.replace(/^\/+/, ""));
    if (outside(base, target)) return serve404(res, req, projectRoot);

    // The resolved real file must still be inside public/ (no symlink escapes).
    let realTarget;
    try {
        realTarget = await fs.promises.realpath(target);
        if (outside(await fs.promises.realpath(base), realTarget)) return serve404(res, req, projectRoot);
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

    metrics.trackDownload(res);
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

    metrics.trackDownload(res);
    archive.on("error", () => res.destroy());
    req.on("close", () => archive.destroy());
    archive.pipe(res);
}

module.exports = { serveSPA, serve404, serveStatic, streamDownload, streamArchive };