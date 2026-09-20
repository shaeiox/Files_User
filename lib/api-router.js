/**
 * @file lib/api-router.js
 * @brief Main HTTP request router and middleware pipeline.
 */
'use strict';

const { URL } = require("url");
const path = require("path");
const logger = require("./logger");
const rateLimiter = require("./rate-limiter");
const { sendJSON, sendText, sendServiceError, readJsonBody, isSecureRequest } = require("./http-utils");
const { serveSPA, serve404, serveStatic, streamDownload } = require("./static-handler");
const filesService = require("./files-service");
const authService = require("./auth-service");

async function handleRequest(req, res, projectRoot, port) {
    const start = Date.now();
    let pathname, url;

    if (!rateLimiter.checkLimit(req)) {
        return sendJSON(res, 429, { error: "Too many requests.", code: "RATE_LIMITED" });
    }

    try {
        url = new URL(req.url, `http://localhost:${port}`);
        pathname = decodeURIComponent(url.pathname);
    } catch { return sendText(res, 400, "Bad Request"); }

    // 1. CORS
    if (req.method === "OPTIONS") {
        res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "86400",
        });
        return res.end();
    }

    // 2. Method Check
    const isAuthEndpoint = pathname.startsWith("/api/auth/");
    if (req.method !== "GET" && req.method !== "HEAD" && !(isAuthEndpoint && req.method === "POST")) {
        return sendText(res, 405, "Method Not Allowed");
    }

    // 3. Block Sensitive Files
    if (pathname === "/.env" || pathname.match(/^\/(lib|data|node_modules)\//)) {
        logger.logAccess(req.method, 403, pathname);
        return sendText(res, 403, "Forbidden");
    }

    try {
        // 4. Auth Controllers
        if (pathname === "/api/auth/status") {
            const enabled = authService.isAuthEnabled();
            if (!enabled) return sendJSON(res, 200, { enabled: false, authenticated: true });
            const session = authService.verifySession(req);
            logger.logAccess("GET", 200, pathname, `auth:${session.ok} · ${Date.now() - start}ms`);
            return sendJSON(res, 200, { enabled: true, authenticated: session.ok, user: session.user, reason: session.reason });
        }

        if (pathname === "/api/auth/login" && req.method === "POST") {
            if (!authService.isAuthEnabled()) return sendJSON(res, 403, { error: "Auth disabled", code: "AUTH_DISABLED" });
            const body = await readJsonBody(req).catch(() => ({}));
            if (!body.username || !body.password) return sendJSON(res, 400, { error: "Missing fields", code: "MISSING_FIELDS" });

            const result = await authService.login(projectRoot, body.username, body.password);
            if (!result.ok) {
                const status = result.reason === "LOCKED_OUT" ? 429 : 401;
                logger.logAccess("POST", status, pathname, `fail:${body.username}`);
                return sendJSON(res, status, { error: "Auth failed", code: result.reason, retryAfterMs: result.retryAfterMs });
            }
            res.setHeader("Set-Cookie", authService.makeSessionCookieHeader(result.token, result.ttlSec, isSecureRequest(req)));
            logger.logAccess("POST", 200, pathname, `login:${body.username}`);
            return sendJSON(res, 200, { ok: true, user: result.user, expiresIn: result.ttlSec });
        }

        if (pathname === "/api/auth/logout" && req.method === "POST") {
            res.setHeader("Set-Cookie", authService.makeClearCookieHeader());
            return sendJSON(res, 200, { ok: true });
        }

        // 5. Auth Gate for Release Routes
        if (authService.pathRequiresAuth(pathname, projectRoot)) {
            const session = authService.verifySession(req);
            if (!session.ok) {
                logger.logAccess(req.method, 401, pathname, `blocked · ${session.reason}`);
                return sendJSON(res, 401, { error: "Auth required", code: "AUTH_REQUIRED", reason: session.reason });
            }
            const renewed = authService.renewSession(session.user);
            res.setHeader("Set-Cookie", authService.makeSessionCookieHeader(renewed.token, renewed.ttlSec, isSecureRequest(req)));
        }

        // 6. Data APIs
        if (pathname === "/__health" || pathname === "/api/health") {
            return sendJSON(res, 200, { status: "ok", uptime: process.uptime() });
        }

        if (pathname === "/api/categories") {
            const cats = await filesService.listCategories(projectRoot);
            logger.logAccess("GET", 200, pathname, `${cats.length} cats · ${Date.now() - start}ms`);
            return sendJSON(res, 200, cats);
        }

        if (pathname === "/api/releases") {
            const result = await filesService.listLatestReleases(projectRoot, url.searchParams.get("limit"), url.searchParams.get("os"));
            logger.logAccess("GET", 200, pathname, `${result.items?.length || 0} items · ${Date.now() - start}ms`);
            return sendJSON(res, 200, result);
        }

        if (pathname === "/api/search") {
            const data = await filesService.searchEntries(projectRoot, url.searchParams.get("q"), { limit: url.searchParams.get("limit") });
            return sendJSON(res, 200, data);
        }

        const stripPrefix = (path, prefix) => path === prefix ? (url.searchParams.get("path") || "") : path.slice(prefix.length).replace(/^\/+/, "");

        if (pathname.startsWith("/api/files")) {
            const rel = stripPrefix(pathname, "/api/files");
            const entries = await filesService.listPath(projectRoot, rel);
            logger.logAccess("GET", 200, pathname, `${entries?.length || 0} items`);
            return sendJSON(res, 200, Array.isArray(entries) ? entries : []);
        }

        if (pathname.startsWith("/api/download")) {
            const fileInfo = await filesService.getDownloadTarget(projectRoot, stripPrefix(pathname, "/api/download"));
            logger.logAccess("GET", 200, pathname, `download · ${Date.now() - start}ms`);
            return streamDownload(req, res, fileInfo);
        }

        // 7. Static & SPA Routing
        if (pathname === "/404" || pathname === "/404.html") {
            logger.logAccess("GET", 404, pathname);
            return serve404(res, projectRoot);
        }

        if (pathname === "/" || pathname === "/index.html" || pathname.startsWith("/browse")) {
            const ext = path.extname(pathname).toLowerCase();
            if (ext && ext !== ".html") return serveStatic(pathname, res, projectRoot);
            logger.logAccess("GET", 200, pathname, "SPA");
            return serveSPA(res, projectRoot);
        }

        serveStatic(pathname, res, projectRoot);

    } catch (err) {
        sendServiceError(res, err);
        logger.logAccess(req.method, err.httpStatus || 500, pathname, err.code || err.message);
    }
}

module.exports = { handleRequest };