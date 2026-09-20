/**
 * @file lib/static-handler.js
 * @brief Handles serving HTML/CSS/JS, downloads, and 404 pages.
 */
'use strict';

const fs = require("fs");
const path = require("path");
const { sendText, securityHeaders } = require("./http-utils");

const MIMES = {
    ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
    ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml",
    ".txt": "text/plain; charset=utf-8", ".pdf": "application/pdf",
    ".zip": "application/zip", ".iso": "application/octet-stream"
};

function serveSPA(res, projectRoot) {
    fs.readFile(path.join(projectRoot, "index.html"), (err, data) => {
        if (err) return sendText(res, 500, "index.html missing");
        securityHeaders(res);
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(data);
    });
}

function serve404(res, projectRoot) {
    fs.readFile(path.join(projectRoot, "404.html"), (err, data) => {
        securityHeaders(res);
        if (err) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            return res.end("404 — Page Not Found");
        }
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
        res.end(data);
    });
}

function serveStatic(reqPath, res, projectRoot) {
    const safe = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, "");
    const fp = path.join(projectRoot, safe === "/" || safe === "" ? "index.html" : safe);
    const ext = path.extname(fp).toLowerCase();

    fs.readFile(fp, (err, data) => {
        if (err) return serve404(res, projectRoot);
        securityHeaders(res);
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

    securityHeaders(res);
    res.writeHead(200, {
        "Content-Type": MIMES[ext] || "application/octet-stream",
        "Content-Length": fileInfo.size,
        "Content-Disposition": `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodeURIComponent(fileInfo.fileName)}`,
        "Cache-Control": "private, max-age=0, must-revalidate",
        "Access-Control-Allow-Origin": "*",
    });

    if (req.method === "HEAD") return res.end();

    const stream = fs.createReadStream(fileInfo.absPath);
    stream.on("error", () => !res.headersSent ? sendText(res, 500, "Read failed") : res.destroy());
    req.on("close", () => stream.destroy());
    stream.pipe(res);
}

module.exports = { serveSPA, serve404, serveStatic, streamDownload };