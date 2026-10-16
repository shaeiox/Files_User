/**
 * @file lib/api-router.js
 * @brief Request pipeline and route dispatch.
 *
 * Pipeline: request id → URL parse → operational routes (/livez, /readyz,
 * /metrics) → rate limit → CORS preflight → method check → sensitive paths →
 * sign-in routes → request context (sessions, gates) → legacy release gate →
 * first matching route in lib/routes (see lib/routes/index.js).
 */
'use strict';

const crypto = require("crypto");
const { URL } = require("url");
const logger = require("./logger");
const metrics = require("./metrics");
const rateLimiter = require("./rate-limiter");
const { sendJSON, sendText, sendServiceError, applyCors, securityHeaders, isIpTrusted } = require("./http-utils");
const authService = require("./auth-service");
const { createRequestContext } = require("./request-context");
const { OPS, PRE_SESSION, ROUTES } = require("./routes");

const firstMatch = (routes, pathname, req) => routes.find((route) => route.match(pathname, req));
const REQUEST_ID = /^[A-Za-z0-9._-]{1,128}$/;

/** A trusted proxy's well-formed X-Request-Id, else a new random one. */
function requestIdFor(req) {
    const given = req.headers["x-request-id"];
    if (typeof given === "string" && REQUEST_ID.test(given) && isIpTrusted(req.socket && req.socket.remoteAddress)) return given;
    return crypto.randomUUID();
}

/**
 * Entry point. Gives the request its id and its one access line (written when
 * the response closes, with the final status and duration), then dispatches.
 */
function handleRequest(req, res, projectRoot, port) {
    const record = { id: requestIdFor(req), method: req.method, url: String(req.url || ""), start: Date.now(), notes: [], route: null, done: false };
    res.setHeader("X-Request-Id", record.id);
    res.once("close", () => {
        const extra = res.writableFinished ? {} : { aborted: true };
        const durationMs = logger.finishRequest(record, res.statusCode, extra);
        metrics.observeRequest(record.route || "(unmatched)", res.statusCode, durationMs);
    });
    return logger.runRequest(record, () => dispatch(req, res, projectRoot, port, record));
}

async function dispatch(req, res, projectRoot, port, record) {
    const start = record.start;
    let pathname, url;

    try {
        url = new URL(req.url, `http://localhost:${port}`);
        pathname = decodeURIComponent(url.pathname);
    } catch {
        record.route = "(bad-request)";
        return sendText(res, req, 400, "Bad Request");
    }
    record.url = pathname;
    const base = { req, res, projectRoot, url, pathname, start };

    // 0. Operational endpoints: before the rate limiter and any session work.
    const ops = firstMatch(OPS, pathname, req);
    if (ops) {
        record.route = ops.pattern;
        return ops.handler(base).catch((err) => {
            if (res.headersSent) res.destroy();
            else sendServiceError(res, req, err);
        });
    }

    if (!rateLimiter.checkLimit(req)) {
        record.route = "(rate-limited)";
        return sendJSON(res, req, 429, { error: "Too many requests.", code: "RATE_LIMITED" });
    }

    // 1. CORS (origin-validated; see lib/http-utils.js applyCors)
    if (req.method === "OPTIONS") {
        record.route = "(preflight)";
        applyCors(res, req);
        securityHeaders(res, req);
        res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        res.setHeader("Access-Control-Max-Age", "86400");
        res.writeHead(204);
        return res.end();
    }

    // 2. Method Check
    const isAuthEndpoint = pathname.startsWith("/api/auth/");
    if (req.method !== "GET" && req.method !== "HEAD" && !(isAuthEndpoint && req.method === "POST")) {
        record.route = "(method-not-allowed)";
        return sendText(res, req, 405, "Method Not Allowed");
    }

    // 3. Block Sensitive Files
    if (pathname === "/.env" || pathname.match(/^\/(lib|data|node_modules)\//)) {
        record.route = "(forbidden)";
        logger.logAccess(req.method, 403, pathname);
        return sendText(res, req, 403, "Forbidden");
    }

    try {
        // 4. Sign-in routes (no session yet)
        const preSession = firstMatch(PRE_SESSION, pathname, req);
        if (preSession) {
            record.route = preSession.pattern;
            return await preSession.handler(base);
        }

        // The answering route: first match (the table ends with the static fallback).
        const route = firstMatch(ROUTES, pathname, req);
        record.route = route.pattern;

        // Sessions (cookie, CLI Basic) and the access gates, once per request.
        const ctx = await createRequestContext(base);
        if (!ctx) return; // answered (Basic credentials refused)

        // 5. Auth Gate for Release Routes (legacy mode; see pathRequiresAuth)
        if (authService.pathRequiresAuth(pathname, projectRoot) && ctx.requireSessionFor()) return;

        // 6. The route itself
        return await route.handler(ctx);
    } catch (err) {
        if (res.headersSent) res.destroy(); // a stream already started: cut it, never write a second response
        else sendServiceError(res, req, err);
        logger.logAccess(req.method, err.httpStatus || 500, pathname, err.code || err.message);
    }
}

module.exports = { handleRequest, requestIdFor };
