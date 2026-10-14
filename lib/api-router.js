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
const { serveSPA, serve404, serveStatic, streamDownload, streamArchive } = require("./static-handler");
const filesService = require("./files-service");
const archiveService = require("./archive-service");
const hashService = require("./hash-service");
const authService = require("./auth-service");
const accessPolicy = require("./access-policy");

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

        // 5b. Admin file-access policy gate.
        // One definition of the rule, applied per resolved relative path
        // (lib/access-policy.js). In legacy mode authorize() always allows, so
        // these calls are no-ops and behaviour is unchanged.
        let policySessionCache;
        const policySession = () => {
            if (policySessionCache === undefined) {
                policySessionCache = authService.verifySession(req, projectRoot);
            }
            return policySessionCache;
        };

        const answerPolicy = (decision) => {
            if (decision.challenge) {
                logger.logAccess(req.method, 401, pathname, `policy blocked · ${decision.reason || "AUTH_REQUIRED"}`);
                return sendJSON(res, 401, { error: "Auth required", code: "AUTH_REQUIRED", reason: "AUTH_REQUIRED" });
            }
            logger.logAccess(req.method, 403, pathname, `policy denied · ${decision.reason || "DENIED"}`);
            return sendJSON(res, 403, { error: "Access denied.", code: "ACCESS_DENIED" });
        };

        // Returns true when the request was answered (denied) and the caller must stop.
        const gateRel = (rel) => {
            const session = policySession();
            const decision = accessPolicy.authorize(rel, session);
            if (decision.allowed) {
                // Sliding renewal for policy-gated paths, as the legacy gate does.
                if (session.ok && session.user && typeof session.user.id === "number") {
                    const renewed = authService.renewSession(session.user);
                    res.setHeader("Set-Cookie", authService.makeSessionCookieHeader(renewed.token, renewed.ttlSec, isSecureRequest(req)));
                }
                return false;
            }
            answerPolicy(decision);
            return true;
        };

        // 6. Data APIs
        if (pathname === "/__health" || pathname === "/api/health") {
            return sendJSON(res, 200, { status: "ok", uptime: process.uptime() });
        }

        if (pathname === "/api/categories") {
            const cats = accessPolicy.filterVisible(await filesService.listCategories(projectRoot), policySession());
            logger.logAccess("GET", 200, pathname, `${cats.length} cats · ${Date.now() - start}ms`);
            return sendJSON(res, 200, cats);
        }

        if (pathname === "/api/releases") {
            const result = await filesService.listLatestReleases(projectRoot, url.searchParams.get("limit"), url.searchParams.get("os"));
            result.items = accessPolicy.filterVisible(result.items || [], policySession());
            logger.logAccess("GET", 200, pathname, `${result.items.length} items · ${Date.now() - start}ms`);
            return sendJSON(res, 200, result);
        }

        // Stable "latest release" CLI URLs. Version selection reuses listLatestReleases
        // (extractVersion + compareVersions), so there is one definition of "latest".
        const latestOs = { "/release9/latest": "el9", "/release8/latest": "el8" }[pathname];
        if (latestOs) {
            // Fetch a small window, drop anything this caller may not see, then
            // serve the newest remaining release (so a governed latest does not
            // hide an authorized older build).
            const { items } = await filesService.listLatestReleases(projectRoot, 10, latestOs);
            const visible = accessPolicy.filterVisible(items, policySession());
            if (!visible.length) {
                logger.logAccess(req.method, 404, pathname, "no releases");
                return sendJSON(res, 404, { error: "No release found.", code: "NO_RELEASE" });
            }
            const fileInfo = await filesService.getDownloadTarget(projectRoot, visible[0].path);
            logger.logAccess(req.method, 200, pathname, `latest → ${fileInfo.fileName} · ${Date.now() - start}ms`);
            return streamDownload(req, res, fileInfo);
        }

        if (pathname === "/api/search") {
            const data = await filesService.searchEntries(projectRoot, url.searchParams.get("q"), { limit: url.searchParams.get("limit") });
            data.results = accessPolicy.filterVisible(data.results || [], policySession());
            return sendJSON(res, 200, data);
        }

        const stripPrefix = (path, prefix) => path === prefix ? (url.searchParams.get("path") || "") : path.slice(prefix.length).replace(/^\/+/, "");

        if (pathname.startsWith("/api/files")) {
            const rel = stripPrefix(pathname, "/api/files");
            if (gateRel(rel)) return;
            const listed = await filesService.listPath(projectRoot, rel);
            const entries = Array.isArray(listed) ? accessPolicy.filterVisible(listed, policySession()) : [];
            logger.logAccess("GET", 200, pathname, `${entries.length} items`);
            return sendJSON(res, 200, entries);
        }

        if (pathname.startsWith("/api/download") && pathname !== "/api/download-zip") {
            const rel = stripPrefix(pathname, "/api/download");
            if (gateRel(rel)) return;
            const fileInfo = await filesService.getDownloadTarget(projectRoot, rel);
            logger.logAccess("GET", 200, pathname, `download · ${Date.now() - start}ms`);
            return streamDownload(req, res, fileInfo);
        }

        // SHA-256 verification. The target lives in the pathname, so the path-scoped auth
        // gate above already covers it (see protectedPrefixes in auth-service).
        if (pathname.startsWith("/api/hash")) {
            const rel = stripPrefix(pathname, "/api/hash");
            if (gateRel(rel)) return;
            const result = await hashService.hashFile(projectRoot, rel);
            logger.logAccess("GET", 200, pathname, `sha256 · ${Date.now() - start}ms`);
            return sendJSON(res, 200, result);
        }

        // ZIP archive of a multi-file selection.
        // POST is not available outside /api/auth/ (see the method check above), so the
        // selection travels in the query string. Every entry is re-resolved through
        // files-service's own containment + hidden-file policy by archive-service.
        if (pathname === "/api/download-zip") {
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
            // its target in the query string, so the gate above never sees it. Evaluate the
            // SAME helper against synthetic `/api/files/<rel>` pathnames — covering both
            // the browsed directory AND every requested entry, since a crafted request
            // could otherwise hide the gated path in `items` while leaving `dir` innocuous.
            const norm = s => String(s || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
            const gatedTarget = [dirRel, ...relPaths]
                .map(norm)
                .some(rel => rel && authService.pathRequiresAuth("/api/files/" + rel, projectRoot));
            if (gatedTarget) {
                const session = authService.verifySession(req);
                if (!session.ok) {
                    logger.logAccess("GET", 401, pathname, `blocked · ${session.reason}`);
                    return sendJSON(res, 401, { error: "Auth required", code: "AUTH_REQUIRED", reason: session.reason });
                }
                const renewed = authService.renewSession(session.user);
                res.setHeader("Set-Cookie", authService.makeSessionCookieHeader(renewed.token, renewed.ttlSec, isSecureRequest(req)));
            }

            // Admin policy gate: every selected entry (and the browsed directory)
            // must be authorized before anything is zipped.
            for (const target of [dirRel, ...relPaths].map(norm)) {
                if (target && gateRel(target)) return;
            }

            const archive = await archiveService.createArchive(projectRoot, dirRel, relPaths);
            const fileName = archiveService.archiveName(dirRel, archive.archiveEntryCount);
            logger.logAccess("GET", 200, pathname, `zip · ${archive.archiveEntryCount} entries · ${Date.now() - start}ms`);
            return streamArchive(req, res, archive, fileName);
        }

        // 7. Static & SPA Routing
        if (pathname === "/404" || pathname === "/404.html") {
            logger.logAccess("GET", 404, pathname);
            return serve404(res, projectRoot);
        }

        if (pathname === "/" || pathname === "/index.html" || pathname.startsWith("/browse") || pathname === "/download/release") {
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