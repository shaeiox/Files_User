/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @file        auth-service.js
 * @module      lib/auth-service
 * @brief       Enterprise-grade authentication service with Bcrypt + JWT + Cookie.
 *
 * @description
 * Provides a hardened authentication layer for protecting sensitive routes
 * (specifically RELEASE_PVM paths). Follows OWASP best practices:
 *
 *   Security Features:
 *   ─────────────────
 *   1. Bcrypt password hashing (cost factor 12)          — no plaintext storage
 *   2. HMAC-SHA256 signed JWT tokens                     — no external deps
 *   3. HttpOnly + Secure + SameSite=Strict cookies       — XSS/CSRF resistant
 *   4. Constant-time comparison for tokens/passwords     — timing attack resistant
 *   5. Sliding session (auto-renew on activity)          — 30-min idle timeout
 *   6. In-memory brute-force lockout per username        — rate limiting
 *   7. Cryptographically secure token IDs (crypto.random)— unpredictable
 *   8. Fail-closed on misconfiguration                   — safe defaults
 *
 *   Feature Flag:
 *   ─────────────
 *   Toggle via AUTH_ENABLED=true|false in .env
 *   When disabled, all verify() calls return { ok: true } as no-op
 *
 * Environment Variables:
 *   @env {string}  AUTH_ENABLED             "true" to enable auth gate
 *   @env {number}  AUTH_SESSION_MINUTES     Session idle timeout (default: 30)
 *   @env {string}  AUTH_JWT_SECRET          HMAC secret (min 32 chars required)
 *   @env {string}  AUTH_USERS_FILE          Path to users.json database
 *   @env {number}  AUTH_MAX_FAILED_ATTEMPTS Brute-force threshold (default: 5)
 *   @env {number}  AUTH_LOCKOUT_MINUTES     Lockout duration (default: 15)
 *
 * Facade over lib/auth/:
 *   - jwt.js           HS256 tokens, session ids, session lifetime
 *   - passwords.js     bcrypt / scrypt / admin-format hashes
 *   - lockout.js       failed sign-in counting and lockout
 *   - users-legacy.js  users.json (legacy mode)
 *   - users-admin.js   admin database users (integration mode, read-only)
 *   - session.js       sign-in, verification, renewal, logout, cookies, Basic
 *
 * Consumed By:
 *   - lib/request-context.js, lib/routes/auth.js, lib/api-router.js
 *   - lib/hash-password.js (hashPassword)
 *
 * @author      CloudAvid Security Team
 * @version     1.0.0
 * @since       2025-01-01
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use strict';

const adminDb = require('./admin-db');
const filesService = require('./files-service');
const passwords = require('./auth/passwords');
const { getSessionTtlSeconds } = require('./auth/jwt');
const { getUsersFilePath } = require('./auth/users-legacy');
const session = require('./auth/session');

const { isAuthEnabled } = session;

/**
 * @brief   Determines whether a given URL path requires authentication.
 * @param   {string} pathname     Request pathname.
 * @param   {string} projectRoot  Absolute project root.
 * @returns {boolean}
 *
 * @details
 * Legacy mode only: a path requires auth if AUTH_ENABLED=true AND the path
 * targets the RELEASE_PVM directory tree. In admin integration mode release
 * protection comes from the admin lock on that folder instead.
 */
function pathRequiresAuth(pathname, projectRoot) {
    if (!isAuthEnabled()) return false;
    // Integration mode: the admin lock on the release folder decides (api-router).
    if (adminDb.isIntegrationEnabled()) return false;

    // Never gate everything if release is unset or outside FILES_ROOT
    const rel = filesService.releaseRel(projectRoot);
    if (!rel) return false;

    const protectedPrefixes = [
        `/api/releases`,                       // release listing endpoint (all queries)
        `/release9/latest`,                    // stable latest-release downloads (stream release bytes)
        `/release8/latest`,
        `/api/download/${rel}`,                // direct file download under release
        `/api/download/${rel}/`,
        `/api/files/${rel}`,                   // browse listing under release
        `/api/files/${rel}/`,
        `/api/hash/${rel}`,                    // checksum verification under release
        `/api/hash/${rel}/`,
    ];

    return protectedPrefixes.some(prefix =>
        pathname === prefix.replace(/\/$/, '') || pathname.startsWith(prefix)
    );
}

module.exports = {
    // Configuration
    isAuthEnabled,
    getSessionTtlSeconds,
    getUsersFilePath,

    // Authentication
    login: session.login,
    verifySession: session.verifySession,
    renewSession: session.renewSession,
    revokeSession: session.revokeSession,

    // Cookie helpers
    makeSessionCookieHeader: session.makeSessionCookieHeader,
    makeClearCookieHeader: session.makeClearCookieHeader,
    extractToken: session.extractToken,
    parseBasic: session.parseBasic,

    // Routing helper
    pathRequiresAuth,

    // Utility (for admin scripts)
    hashPassword: passwords.hashPassword,
    verifyPassword: passwords.verifyPassword,
    verifyAdminPassword: passwords.verifyAdminPassword,

    // Constants
    COOKIE_NAME: session.COOKIE_NAME,
};
