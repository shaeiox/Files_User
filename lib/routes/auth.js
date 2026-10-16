/**
 * @file lib/routes/auth.js
 * @brief Sign-in endpoints. They run before the request context (no session yet).
 */
'use strict';

const logger = require("../logger");
const { sendJSON, readJsonBody, isSecureRequest } = require("../http-utils");
const authService = require("../auth-service");
const APP_VERSION = require("../../package.json").version || "";

/** @type {import('./index').Route[]} */
module.exports = [
    {
        name: "auth-status", pattern: "/api/auth/status", gate: "none",
        match: (p) => p === "/api/auth/status",
        async handler({ req, res, projectRoot, pathname, start }) {
            const enabled = authService.isAuthEnabled();
            if (!enabled) return sendJSON(res, req, 200, { enabled: false, authenticated: true, version: APP_VERSION });
            const session = await authService.verifySession(req, projectRoot);
            logger.logAccess("GET", 200, pathname, `auth:${session.ok} · ${Date.now() - start}ms`);
            return sendJSON(res, req, 200, { enabled: true, authenticated: session.ok, user: session.user, reason: session.reason, version: APP_VERSION });
        },
    },
    {
        name: "auth-login", pattern: "/api/auth/login", gate: "none",
        match: (p, req) => p === "/api/auth/login" && req.method === "POST",
        async handler({ req, res, projectRoot, pathname }) {
            if (!authService.isAuthEnabled()) return sendJSON(res, req, 403, { error: "Auth disabled", code: "AUTH_DISABLED" });
            const body = await readJsonBody(req).catch(() => ({}));
            if (!body.username || !body.password) return sendJSON(res, req, 400, { error: "Missing fields", code: "MISSING_FIELDS" });

            const result = await authService.login(projectRoot, body.username, body.password);
            if (!result.ok) {
                const status = result.reason === "LOCKED_OUT" ? 429 : result.reason === "SERVER_ERROR" ? 503 : 401;
                logger.logAccess("POST", status, pathname, `fail:${body.username}`);
                return sendJSON(res, req, status, { error: "Auth failed", code: result.reason, retryAfterMs: result.retryAfterMs });
            }
            res.setHeader("Set-Cookie", authService.makeSessionCookieHeader(result.token, result.ttlSec, isSecureRequest(req)));
            logger.logAccess("POST", 200, pathname, `login:${body.username}`);
            return sendJSON(res, req, 200, { ok: true, user: result.user, expiresIn: result.ttlSec });
        },
    },
    {
        name: "auth-logout", pattern: "/api/auth/logout", gate: "none",
        match: (p, req) => p === "/api/auth/logout" && req.method === "POST",
        async handler({ req, res }) {
            const revoked = authService.revokeSession(req);
            res.setHeader("Set-Cookie", authService.makeClearCookieHeader());
            // The cookie is cleared either way; say so when the session could not be ended server-side.
            if (!revoked) return sendJSON(res, req, 503, { error: "Sign-out could not be recorded.", code: "SERVER_ERROR" });
            return sendJSON(res, req, 200, { ok: true });
        },
    },
];
