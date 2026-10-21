/**
 * @file lib/auth/session.js
 * @brief Sign-in, session verification, sliding renewal, logout revocation,
 *        session cookies and CLI Basic credentials.
 */
'use strict';

const adminDb = require('../admin-db');
const settings = require('../settings');
const { verifyJwt, getSessionTtlSeconds, issueToken } = require('./jwt');
const lockout = require('./lockout');
const usersLegacy = require('./users-legacy');
const usersAdmin = require('./users-admin');
const store = require('../state-store');
const logger = require('../logger');

/** @constant {string} Cookie name used to store the JWT session token. */
const COOKIE_NAME = 'avid_session';

/** Logs a security-state failure once per message, so a broken store is visible without flooding. */
let lastStoreFault = '';
function storeFault(context, err) {
    const msg = `[state-store] ${context} failed: ${err && err.message}`;
    if (msg !== lastStoreFault) logger.error(msg);
    lastStoreFault = msg;
}

/**
 * @brief   Reads the AUTH_ENABLED flag (true/1/yes/on; startup refuses other values).
 * @returns {boolean} true if authentication gate is active.
 */
function isAuthEnabled() {
    return settings.get('AUTH_ENABLED');
}

/* ─── Cookies and Basic credentials ─── */

/**
 * @brief   Parses the Cookie header into a key/value map.
 * @param   {string} cookieHeader  Raw Cookie header value.
 * @returns {Object<string,string>}
 */
function parseCookies(cookieHeader) {
    /** @type {Object<string,string>} */
    const out = {};
    if (!cookieHeader) return out;
    for (const part of cookieHeader.split(';')) {
        const idx = part.indexOf('=');
        if (idx < 0) continue;
        const key = part.slice(0, idx).trim();
        const val = part.slice(idx + 1).trim();
        if (key) out[key] = decodeURIComponent(val);
    }
    return out;
}

/**
 * @brief   Builds a Set-Cookie header value for the session token.
 * @param   {string} token     JWT token.
 * @param   {number} maxAgeSec Cookie lifetime in seconds.
 * @param   {boolean} isSecure Whether to add Secure flag (HTTPS only).
 * @returns {string}           Formatted Set-Cookie value.
 *
 * @security
 *   - HttpOnly:  inaccessible from JavaScript (XSS defense)
 *   - Secure:    only sent over HTTPS (when enabled)
 *   - SameSite=Strict: prevents CSRF from cross-site requests
 *   - Path=/:    scoped to entire origin
 */
function makeSessionCookieHeader(token, maxAgeSec, isSecure = false) {
    const parts = [
        `${COOKIE_NAME}=${encodeURIComponent(token)}`,
        `Max-Age=${maxAgeSec}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Strict',
    ];
    if (isSecure) parts.push('Secure');
    return parts.join('; ');
}

/**
 * @brief   Builds a Set-Cookie header that clears the session cookie.
 * @returns {string}
 */
function makeClearCookieHeader() {
    return `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict`;
}

/**
 * @brief   Extracts the session token from a request's Cookie header.
 * @param   {import('http').IncomingMessage} req
 * @returns {string|null}
 */
function extractToken(req) {
    const cookies = parseCookies(req.headers.cookie || '');
    return cookies[COOKIE_NAME] || null;
}

/** @constant {number} Upper bound on a Basic credential header (username + password). */
const MAX_BASIC_LENGTH = 1024;

/**
 * @brief   Parses an HTTP Basic `Authorization` header (RFC 7617, UTF-8).
 * @param   {string|undefined} header  The raw Authorization header.
 * @returns {{username:string, password:string}|null}  null when absent or malformed.
 *
 * @details The password is everything after the FIRST colon, so it may contain colons.
 */
function parseBasic(header) {
    const m = /^Basic\s+([A-Za-z0-9+/=]+)\s*$/i.exec(String(header || ''));
    if (!m || m[1].length > MAX_BASIC_LENGTH) return null;
    const decoded = Buffer.from(m[1], 'base64').toString('utf8');
    const colon = decoded.indexOf(':');
    if (colon <= 0) return null;
    return { username: decoded.slice(0, colon), password: decoded.slice(colon + 1) };
}

/* ─── Sessions ─── */

/**
 * @brief   Authenticates a user with username + password.
 * @param   {string} projectRoot
 * @param   {string} username
 * @param   {string} password
 * @param   {string} [clientIp]  Caller address (trusted-proxy resolved), for the admin's throttle.
 * @returns {Promise<{ok:boolean, token?:string, ttlSec?:number, user?:object, reason?:string, retryAfterMs?:number}>}
 *
 * @security
 *   - Brute-force lockout enforced before password check
 *   - Same generic error for unknown user / wrong password (no enumeration)
 *   - Constant-time password verification
 *   - Failed attempts recorded; cleared on success
 *   - Fresh JWT issued with expiration
 */
async function login(projectRoot, username, password, clientIp) {
    if (!isAuthEnabled()) {
        return { ok: false, reason: 'AUTH_DISABLED' };
    }

    // 0. Username shape. Integration mode accepts whatever the admin can store
    //    (matched trimmed + case-insensitively); legacy keeps its own pattern.
    const integration = adminDb.isIntegrationEnabled();
    if (integration) {
        username = typeof username === 'string' ? username.trim() : '';
        if (!username || username.length > usersAdmin.MAX_USERNAME_LENGTH) {
            return { ok: false, reason: 'INVALID_CREDENTIALS' };
        }
    } else if (!usersLegacy.USERNAME.test(username)) {
        return { ok: false, reason: 'INVALID_CREDENTIALS' };
    }

    // A sign-in the security state cannot count is never accepted (fail closed).
    try {
        // 1. Lockout check (shared throttle; keyed case-insensitively)
        const lockCheck = lockout.checkLockout(username);
        if (lockCheck.locked) {
            return { ok: false, reason: 'LOCKED_OUT', retryAfterMs: lockCheck.retryAfterMs };
        }

        // Integration mode: credentials live in the admin database (read-only).
        if (integration) return await usersAdmin.login(username, password, clientIp);
        return await usersLegacy.login(projectRoot, username, password);
    } catch (err) {
        storeFault('sign-in', err);
        return { ok: false, reason: 'SERVER_ERROR' };
    }
}

/**
 * @brief   Verifies the session token on an incoming request.
 * @param   {import('http').IncomingMessage} req
 * @returns {Promise<{ok:boolean, user?:object, reason?:string, payload?:object}>}
 *
 * @details
 * When AUTH_ENABLED=false, always returns { ok: true } as a no-op.
 * When enabled, requires a valid, unexpired JWT in the session cookie.
 */
async function verifySession(req, projectRoot) {
    if (!isAuthEnabled()) return { ok: true, user: { anonymous: true } };

    const token = extractToken(req);
    if (!token) return { ok: false, reason: 'NO_SESSION' };

    const result = verifyJwt(token);
    if (!result.ok) return { ok: false, reason: result.reason };
    const sid = result.payload.sid;
    if (sid) {
        // Unconfirmed is not valid: an unreadable revocation list fails closed.
        let revoked;
        try { revoked = store.isSessionRevoked(sid); }
        catch (err) {
            storeFault('revocation check', err);
            return { ok: false, reason: 'SERVER_ERROR' };
        }
        if (revoked) return { ok: false, reason: 'SESSION_REVOKED' };
    }

    // Integration mode: the session subject is an admin user id; confirm the
    // account still exists and is active so revocation takes effect.
    if (adminDb.isIntegrationEnabled()) return usersAdmin.verify(result.payload);
    // Legacy mode: the user must still be listed in users.json.
    return usersLegacy.verify(projectRoot, result.payload);
}

/**
 * @brief   Issues a fresh sliding-session token (called on activity).
 * @param   {object} user
 * @returns {{token:string, ttlSec:number}}
 */
function renewSession(user) {
    const claims = { sub: user.id, usr: user.username, role: user.role, sid: user.sid };
    if (adminDb.isIntegrationEnabled()) Object.assign(claims, usersAdmin.renewalClaims(user));
    return issueToken(claims);
}

/**
 * @brief   Ends the request's session server-side (logout).
 * @details Revokes the session id, so every token of that login stops working,
 *          including older ones handed out by sliding renewal. A request without
 *          a valid session is a no-op. Shared by every process using the same
 *          PORTAL_DATA_DIR and kept across restarts (lib/state-store.js).
 * @param   {import('http').IncomingMessage} req
 * @returns {boolean} false when the revocation could not be stored.
 */
function revokeSession(req) {
    const result = verifyJwt(extractToken(req));
    if (!result.ok || !result.payload.sid) return true;
    try {
        // The newest token of this session expires within one TTL of now.
        store.revokeSession(result.payload.sid, Math.floor(Date.now() / 1000) + getSessionTtlSeconds());
        return true;
    } catch (err) {
        storeFault('logout revocation', err);
        return false;
    }
}

module.exports = {
    COOKIE_NAME,
    isAuthEnabled,
    login,
    verifySession,
    renewSession,
    revokeSession,
    makeSessionCookieHeader,
    makeClearCookieHeader,
    extractToken,
    parseBasic,
};
