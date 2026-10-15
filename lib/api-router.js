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
const adminDb = require("./admin-db");
const APP_VERSION = require("../package.json").version || "";

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
            if (!enabled) return sendJSON(res, 200, { enabled: false, authenticated: true, version: APP_VERSION });
            const session = authService.verifySession(req, projectRoot);
            logger.logAccess("GET", 200, pathname, `auth:${session.ok} · ${Date.now() - start}ms`);
            return sendJSON(res, 200, { enabled: true, authenticated: session.ok, user: session.user, reason: session.reason, version: APP_VERSION });
        }

        if (pathname === "/api/auth/login" && req.method === "POST") {
            if (!authService.isAuthEnabled()) return sendJSON(res, 403, { error: "Auth disabled", code: "AUTH_DISABLED" });
            const body = await readJsonBody(req).catch(() => ({}));
            if (!body.username || !body.password) return sendJSON(res, 400, { error: "Missing fields", code: "MISSING_FIELDS" });

            const result = await authService.login(projectRoot, body.username, body.password);
            if (!result.ok) {
                const status = result.reason === "LOCKED_OUT" ? 429 : result.reason === "SERVER_ERROR" ? 503 : 401;
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

        // 4b. Command-line credentials (HTTP Basic) on content routes only.
        // A terminal has no cookie jar: curl -u / Invoke-WebRequest -Credential send
        // Basic after a challenge. Verified through the same login() as the modal
        // (lockout, admin status), request-scoped, never turned into a cookie.
        const isContentRoute = pathname.startsWith("/api/download") || pathname.startsWith("/api/hash")
            || pathname === "/release9/latest" || pathname === "/release8/latest";
        // Browsers always send Sec-Fetch-Mode; only other clients get a Basic
        // challenge (a browser would show its native dialog instead of the modal).
        const isCliClient = isContentRoute && !req.headers["sec-fetch-mode"];
        const wantsText = isCliClient && !/application\/json/i.test(req.headers.accept || "");
        const sendCliError = (status, code, text, extra = {}) => {
            if (status === 401 && isCliClient) res.setHeader("WWW-Authenticate", 'Basic realm="CloudAvid Downloads", charset="UTF-8"');
            if (wantsText) return sendText(res, status, text + "\n");
            return sendJSON(res, status, { error: text, code, ...extra });
        };
        const sendAuthRequired = (reason) => sendCliError(401, "AUTH_REQUIRED",
            isCliClient ? "Authentication required. Re-run with: curl -u <username> ... (or PowerShell: -Credential (Get-Credential))." : "Auth required",
            { reason });

        let basicSession = null;
        const basic = isContentRoute && authService.isAuthEnabled() ? authService.parseBasic(req.headers.authorization) : null;
        if (basic && !authService.verifySession(req, projectRoot).ok) {
            const viaProxy = req.headers["x-forwarded-for"] !== undefined || req.headers["x-forwarded-proto"] !== undefined;
            const loopback = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress);
            // AUTH_BASIC_ALLOW_HTTP=true: plain-HTTP deployments (no TLS) where the
            // login modal already takes passwords over HTTP anyway.
            const allowHttp = process.env.AUTH_BASIC_ALLOW_HTTP === "true";
            if (!allowHttp && !isSecureRequest(req) && !(loopback && !viaProxy)) {
                logger.logAccess(req.method, 400, pathname, "basic over insecure transport");
                return sendCliError(400, "INSECURE_TRANSPORT", "Credentials are only accepted over HTTPS.");
            }
            const result = await authService.login(projectRoot, basic.username, basic.password);
            if (!result.ok) {
                logger.logAccess(req.method, result.reason === "LOCKED_OUT" ? 429 : 401, pathname, `basic fail:${basic.username}`);
                if (result.reason === "LOCKED_OUT") {
                    const minutes = Math.max(1, Math.ceil((result.retryAfterMs || 0) / 60000));
                    return sendCliError(429, "LOCKED_OUT", `Too many failed sign-in attempts. Try again in ${minutes} minute(s).`, { retryAfterMs: result.retryAfterMs });
                }
                if (result.reason === "SERVER_ERROR") return sendCliError(503, "SERVER_ERROR", "Sign-in is temporarily unavailable.");
                return sendCliError(401, "INVALID_CREDENTIALS", "Invalid username or password.");
            }
            basicSession = { ok: true, user: result.user };
        }

        // 5. Auth Gate for Release Routes (legacy mode; see pathRequiresAuth)
        if (authService.pathRequiresAuth(pathname, projectRoot)) {
            const session = basicSession || authService.verifySession(req, projectRoot);
            if (!session.ok) {
                logger.logAccess(req.method, 401, pathname, `blocked · ${session.reason}`);
                return sendAuthRequired(session.reason);
            }
            if (!basicSession) {
                const renewed = authService.renewSession(session.user);
                res.setHeader("Set-Cookie", authService.makeSessionCookieHeader(renewed.token, renewed.ttlSec, isSecureRequest(req)));
            }
        }

        // 5b. Admin file-access policy gate.
        // One definition of the rule, applied per resolved relative path
        // (lib/access-policy.js). In legacy mode decide() always allows, so
        // these calls are no-ops and behaviour is unchanged.
        let policySessionCache = basicSession || undefined;
        const policySession = () => {
            if (policySessionCache === undefined) {
                policySessionCache = authService.verifySession(req, projectRoot);
            }
            return policySessionCache;
        };

        // One access decider per request (lib/access-policy decide), shared by
        // every endpoint and by the files-service walks.
        const decideFor = (rel, need) => accessPolicy.decide(rel, policySession(), need);

        const renewPolicySession = () => {
            const session = policySession();
            if (!basicSession && session.ok && session.user && typeof session.user.id === "number") {
                const renewed = authService.renewSession(session.user);
                res.setHeader("Set-Cookie", authService.makeSessionCookieHeader(renewed.token, renewed.ttlSec, isSecureRequest(req)));
            }
        };

        // Answers a refusal. Hidden is indistinguishable from a missing path (same
        // status and body as the endpoint's own not-found); locked asks for
        // sign-in; unreadable admin data is 503.
        const answerPolicy = (decision, notFoundMessage) => {
            if (decision.result === "locked") {
                logger.logAccess(req.method, 401, pathname, `policy locked · ${decision.origin}`);
                return sendAuthRequired("AUTH_REQUIRED");
            }
            if (decision.result === "forbidden") {
                logger.logAccess(req.method, 403, pathname, "policy view-only");
                return sendJSON(res, 403, { error: "You can see this item but are not allowed to download it.", code: "VIEW_ONLY" });
            }
            if (decision.result === "unavailable") {
                logger.logAccess(req.method, 503, pathname, "policy unavailable");
                return sendJSON(res, 503, { error: "Access policy is temporarily unavailable.", code: "POLICY_UNAVAILABLE" });
            }
            logger.logAccess(req.method, 404, pathname, "policy hidden");
            return sendJSON(res, 404, { error: notFoundMessage, code: "NOT_FOUND" });
        };

        const SEVERITY = { allow: 0, forbidden: 1, locked: 2, hidden: 3, unavailable: 4 };
        const worstOf = (rels, need) => rels.reduce((worst, rel) => {
            const decision = decideFor(rel, need);
            return SEVERITY[decision.result] > SEVERITY[worst.result] ? decision : worst;
        }, { result: "allow" });

        // Gates content access to every path, first as requested (decided from the
        // path alone, before the filesystem is consulted), then as resolved on
        // disk, so a symlink or a Windows alias of a governed file cannot reach it.
        // The most severe refusal is answered. Returns true when answered.
        // `need` is the level asked for: "view" to list, "download" to read contents.
        const gate = async (rels, notFoundMessage, need = "view") => {
            let worst = worstOf(rels, need);
            if (worst.result === "allow") {
                const real = await Promise.all(rels.map((rel) => filesService.canonicalRel(projectRoot, rel)));
                worst = worstOf(real.filter((rel) => rel !== null), need);
            }
            if (worst.result === "allow") {
                renewPolicySession();
                return false;
            }
            answerPolicy(worst, notFoundMessage);
            return true;
        };

        // Aggregate endpoints have no single target: refuse them outright when
        // the admin data cannot be read, rather than serving an empty view.
        const policyUnavailable = () => {
            if (decideFor("").result !== "unavailable") return false;
            answerPolicy({ result: "unavailable" });
            return true;
        };

        // Release protection in integration mode is the admin lock on the RELEASE_PVM
        // folder (or its OS subfolder). The walks drop files inside a locked folder,
        // so the root is decided first: locked asks for sign-in, hidden looks empty.
        const releaseRootDecision = (os) => {
            const rel = filesService.releaseRel(projectRoot);
            if (!rel) return { result: "allow" };
            return decideFor(os && /^[\w.-]+$/.test(os) && os !== ".." ? `${rel}/${os}` : rel);
        };

        // 6. Data APIs
        if (pathname === "/__health" || pathname === "/api/health") {
            return sendJSON(res, 200, { status: "ok", uptime: process.uptime() });
        }

        // Admin navbar folders this caller may see: decided like a listing entry
        // (allowed, or self-locked -> name + locked), on the requested and the
        // on-disk path; missing folders are skipped. Never more than the caller
        // could reach by browsing.
        if (pathname === "/api/nav") {
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
            return sendJSON(res, 200, { folders });
        }

        if (pathname === "/api/categories") {
            if (policyUnavailable()) return;
            // "Hide from home" removes a navbar folder's card only; it stays
            // reachable through the navbar, browse and search.
            const offHome = new Set(adminDb.navFolders().filter((f) => f.hideFromHome)
                .map((f) => adminDb.normalizeClientPath("/" + f.relPath)));
            const cats = (await filesService.listCategories(projectRoot, decideFor))
                .filter((c) => !offHome.has(adminDb.normalizeClientPath("/" + c.path)));
            logger.logAccess("GET", 200, pathname, `${cats.length} cats · ${Date.now() - start}ms`);
            return sendJSON(res, 200, cats);
        }

        if (pathname === "/api/releases") {
            if (policyUnavailable()) return;
            const os = url.searchParams.get("os");
            const root = releaseRootDecision(os);
            if (root.result === "locked") return answerPolicy(root);
            if (root.result !== "allow") return sendJSON(res, 200, { browsePath: "", items: [] });
            const { lockedSkipped, ...result } = await filesService.listLatestReleases(projectRoot, url.searchParams.get("limit"), os, decideFor);
            // Nothing visible, but a locked folder was not walked: ask for sign-in
            // (as Browse does), never "no releases" for releases behind a lock.
            if (!result.items.length && lockedSkipped) return answerPolicy({ result: "locked", origin: "inherited" });
            logger.logAccess("GET", 200, pathname, `${result.items.length} items · ${Date.now() - start}ms`);
            return sendJSON(res, 200, result);
        }

        // Stable "latest release" CLI URLs. Version selection reuses listLatestReleases
        // (extractVersion + compareVersions), so there is one definition of "latest".
        const latestOs = { "/release9/latest": "el9", "/release8/latest": "el8" }[pathname];
        if (latestOs) {
            if (policyUnavailable()) return;
            if (releaseRootDecision(latestOs).result === "locked") return answerPolicy({ result: "locked", origin: "inherited" });
            // The walk already dropped what this caller may not see; serve the newest
            // fully allowed build, so a governed newest does not hide an older one.
            const { items, lockedSkipped } = await filesService.listLatestReleases(projectRoot, Infinity, latestOs, decideFor);
            const newest = items.find((item) => !item.locked && !item.viewOnly);
            if (!newest) {
                if (items.some((item) => item.viewOnly)) return answerPolicy({ result: "forbidden" });
                if (items.length) return answerPolicy({ result: "locked", origin: "self" });
                if (lockedSkipped) return answerPolicy({ result: "locked", origin: "inherited" });
                logger.logAccess(req.method, 404, pathname, "no releases");
                return sendJSON(res, 404, { error: "No release found.", code: "NO_RELEASE" });
            }
            if (await gate([newest.path], "File not found.", "download")) return;
            const fileInfo = await filesService.getDownloadTarget(projectRoot, newest.path);
            logger.logAccess(req.method, 200, pathname, `latest → ${fileInfo.fileName} · ${Date.now() - start}ms`);
            return streamDownload(req, res, fileInfo);
        }

        if (pathname === "/api/search") {
            if (policyUnavailable()) return;
            const scope = url.searchParams.get("path") || "";
            if (scope && await gate([scope], "Path not found.")) return;
            const data = await filesService.searchEntries(projectRoot, url.searchParams.get("q"), {
                limit: url.searchParams.get("limit"),
                path: scope,
                decideFor,
            });
            return sendJSON(res, 200, data);
        }

        const stripPrefix = (path, prefix) => path === prefix ? (url.searchParams.get("path") || "") : path.slice(prefix.length).replace(/^\/+/, "");

        if (pathname.startsWith("/api/files")) {
            const rel = stripPrefix(pathname, "/api/files");
            if (await gate([rel], "Path not found.")) return;
            const listed = await filesService.listPath(projectRoot, rel);
            const entries = Array.isArray(listed) ? accessPolicy.filterVisible(listed, policySession()) : [];
            logger.logAccess("GET", 200, pathname, `${entries.length} items`);
            return sendJSON(res, 200, entries);
        }

        if (pathname.startsWith("/api/download") && pathname !== "/api/download-zip") {
            const rel = stripPrefix(pathname, "/api/download");
            if (await gate([rel], "File not found.", "download")) return;
            const fileInfo = await filesService.getDownloadTarget(projectRoot, rel);
            logger.logAccess("GET", 200, pathname, `download · ${Date.now() - start}ms`);
            return streamDownload(req, res, fileInfo);
        }

        // SHA-256 verification. Gated before the file is opened, so no digest is
        // ever computed for a path the caller may not read.
        if (pathname.startsWith("/api/hash")) {
            const rel = stripPrefix(pathname, "/api/hash");
            if (await gate([rel], "File not found.", "download")) return;
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
                const session = basicSession || authService.verifySession(req, projectRoot);
                if (!session.ok) {
                    logger.logAccess("GET", 401, pathname, `blocked · ${session.reason}`);
                    return sendAuthRequired(session.reason);
                }
                if (!basicSession) {
                    const renewed = authService.renewSession(session.user);
                    res.setHeader("Set-Cookie", authService.makeSessionCookieHeader(renewed.token, renewed.ttlSec, isSecureRequest(req)));
                }
            }

            // Admin policy gate: the browsed directory and every selected entry must
            // be allowed before anything is zipped; one refusal refuses the archive.
            // The browsed folder needs only to be visible; every selected file is read.
            if (await gate([dirRel].map(norm), "File not found.")) return;
            if (await gate(relPaths.map(norm), "File not found.", "download")) return;

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