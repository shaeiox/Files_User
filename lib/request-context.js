/**
 * @file lib/request-context.js
 * @brief Per-request sessions and access gates, shared by every route handler.
 *
 * @description
 * Built once per request after the auth endpoints. Resolves the cookie session
 * and, on content routes, HTTP Basic credentials, then exposes the one access
 * decider (lib/access-policy decide) and the gates every content route uses.
 * Moved verbatim from lib/api-router.js; behaviour is unchanged.
 */
'use strict';

const logger = require("./logger");
const settings = require("./settings");
const { sendJSON, sendText, isSecureRequest, isIpTrusted } = require("./http-utils");
const filesService = require("./files-service");
const authService = require("./auth-service");
const accessPolicy = require("./access-policy");

const SEVERITY = { allow: 0, forbidden: 1, locked: 2, hidden: 3, unavailable: 4 };

/**
 * @param {{req:import('http').IncomingMessage, res:import('http').ServerResponse, projectRoot:string, url:URL, pathname:string, start:number}} base
 * @returns {Promise<object|null>} The context, or null when the request was already answered.
 */
async function createRequestContext({ req, res, projectRoot, url, pathname, start }) {
    // The cookie session, resolved once per request (async: the legacy users
    // file is read without blocking) and shared by every gate below. Only the
    // API and the CLI release URLs consult it; static and SPA routes do not.
    const needsSession = pathname.startsWith("/api/") || pathname === "/release9/latest" || pathname === "/release8/latest";
    const cookieSession = needsSession ? await authService.verifySession(req, projectRoot) : { ok: false, reason: "NO_SESSION" };

    // Command-line credentials (HTTP Basic) on content routes only.
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
        if (wantsText) return sendText(res, req, status, text + "\n");
        return sendJSON(res, req, status, { error: text, code, ...extra });
    };
    const sendAuthRequired = (reason) => sendCliError(401, "AUTH_REQUIRED",
        isCliClient ? "Authentication required. Re-run with: curl -u <username> ... (or PowerShell: -Credential (Get-Credential))." : "Auth required",
        { reason });

    let basicSession = null;
    const basic = isContentRoute && authService.isAuthEnabled() ? authService.parseBasic(req.headers.authorization) : null;
    if (basic && !cookieSession.ok) {
        const viaProxy = isIpTrusted(req.socket && req.socket.remoteAddress) && (req.headers["x-forwarded-for"] !== undefined || req.headers["x-forwarded-proto"] !== undefined);
        const loopback = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress);
        // AUTH_BASIC_ALLOW_HTTP=true: plain-HTTP deployments (no TLS) where the
        // login modal already takes passwords over HTTP anyway.
        const allowHttp = settings.get("AUTH_BASIC_ALLOW_HTTP");
        if (!allowHttp && !isSecureRequest(req) && !(loopback && !viaProxy)) {
            logger.logAccess(req.method, 400, pathname, "basic over insecure transport");
            sendCliError(400, "INSECURE_TRANSPORT", "Credentials are only accepted over HTTPS.");
            return null;
        }
        const result = await authService.login(projectRoot, basic.username, basic.password);
        if (!result.ok) {
            logger.logAccess(req.method, result.reason === "LOCKED_OUT" ? 429 : 401, pathname, `basic fail:${basic.username}`);
            if (result.reason === "LOCKED_OUT") {
                const minutes = Math.max(1, Math.ceil((result.retryAfterMs || 0) / 60000));
                sendCliError(429, "LOCKED_OUT", `Too many failed sign-in attempts. Try again in ${minutes} minute(s).`, { retryAfterMs: result.retryAfterMs });
            } else if (result.reason === "SERVER_ERROR") {
                sendCliError(503, "SERVER_ERROR", "Sign-in is temporarily unavailable.");
            } else {
                sendCliError(401, "INVALID_CREDENTIALS", "Invalid username or password.");
            }
            return null;
        }
        basicSession = { ok: true, user: result.user };
    }

    const renewCookie = (user) => {
        const renewed = authService.renewSession(user);
        res.setHeader("Set-Cookie", authService.makeSessionCookieHeader(renewed.token, renewed.ttlSec, isSecureRequest(req)));
    };

    // Same segment rules as the resolver (trimmed, empty dropped), so a gate never
    // sees a different path than the one that is served.
    const norm = (s) => filesService.splitRel(s).join("/");
    const policySession = () => basicSession || cookieSession;

    // One access decider per request (lib/access-policy decide), shared by
    // every endpoint and by the files-service walks.
    const decideFor = (rel, need) => accessPolicy.decide(rel, policySession(), need);

    const renewPolicySession = () => {
        const session = policySession();
        if (!basicSession && session.ok && session.user && typeof session.user.id === "number") renewCookie(session.user);
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
            return sendJSON(res, req, 403, { error: "You can see this item but are not allowed to download it.", code: "VIEW_ONLY" });
        }
        if (decision.result === "unavailable") {
            logger.logAccess(req.method, 503, pathname, "policy unavailable");
            return sendJSON(res, req, 503, { error: "Access policy is temporarily unavailable.", code: "POLICY_UNAVAILABLE" });
        }
        logger.logAccess(req.method, 404, pathname, "policy hidden");
        return sendJSON(res, req, 404, { error: notFoundMessage, code: "NOT_FOUND" });
    };

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

    // Legacy-mode release gate for a session-requiring path: answers 401 without
    // a session, otherwise renews the cookie. Returns true only when answered.
    const requireSessionFor = () => {
        const session = basicSession || cookieSession;
        if (!session.ok) {
            logger.logAccess(req.method, 401, pathname, `blocked · ${session.reason}`);
            sendAuthRequired(session.reason);
            return true;
        }
        if (!basicSession) renewCookie(session.user);
        return false;
    };

    // Legacy-mode release gate for routes that carry their target in the query
    // string or after a separator the pathname-based gate cannot see.
    // Re-evaluates pathRequiresAuth against a synthetic /api/files/<rel> for every
    // resolved target. Returns true only when the request was answered (blocked).
    const releaseGateLegacy = (rels) => {
        const gated = rels.map(norm).some((rel) => rel && authService.pathRequiresAuth("/api/files/" + rel, projectRoot));
        if (!gated) return false;
        return requireSessionFor();
    };

    // Non-answering per-path check for content that is walked, not named: a folder
    // ZIP's descendants. True only when the caller may download `rel` under the
    // admin policy AND the legacy release gate (if it applies to `rel`) is
    // satisfied by a session. Uses the same deciders as gate() and
    // releaseGateLegacy(), so a descendant is never judged by a second rule set.
    const mayDownload = (rel) => {
        const n = norm(rel);
        if (decideFor(n, "download").result !== "allow") return false;
        if (n && authService.pathRequiresAuth("/api/files/" + n, projectRoot)) return !!(basicSession || cookieSession).ok;
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

    const stripPrefix = (p, prefix) => p === prefix ? (url.searchParams.get("path") || "") : p.slice(prefix.length).replace(/^\/+/, "");

    return {
        req, res, projectRoot, url, pathname, start,
        cookieSession, basicSession, policySession,
        decideFor, worstOf, gate, answerPolicy, requireSessionFor, releaseGateLegacy, mayDownload,
        policyUnavailable, releaseRootDecision, norm, stripPrefix,
    };
}

module.exports = { createRequestContext };
