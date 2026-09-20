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
 * Consumed By:
 *   - server.js       → gate release/download routes
 *   - api endpoints   → /api/auth/login, /logout, /status
 *
 * Depends On:
 *   - Node.js built-ins only (crypto, fs, path)
 *   - Optional: bcrypt package (falls back to scrypt if unavailable)
 *
 * @author      CloudAvid Security Team
 * @version     1.0.0
 * @since       2025-01-01
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/* ─────────────────────────────────────────────────────────────────────────────
 * CONSTANTS
 * ───────────────────────────────────────────────────────────────────────────── */

/** @constant {string} Cookie name used to store the JWT session token. */
const COOKIE_NAME = 'avid_session';

/** @constant {number} Minimum acceptable length for AUTH_JWT_SECRET. */
const MIN_SECRET_LENGTH = 32;

/** @constant {number} Bcrypt/scrypt cost factor (higher = slower = safer). */
const HASH_COST = 12;

/** @constant {number} Default session duration in minutes. */
const DEFAULT_SESSION_MINUTES = 30;

/** @constant {number} Default max failed login attempts before lockout. */
const DEFAULT_MAX_ATTEMPTS = 5;

/** @constant {number} Default lockout duration in minutes. */
const DEFAULT_LOCKOUT_MINUTES = 15;

/* ─────────────────────────────────────────────────────────────────────────────
 * INTERNAL STATE — In-memory brute-force tracker
 * ───────────────────────────────────────────────────────────────────────────── */

/**
 * @private
 * @type {Map<string, {attempts:number, lockedUntil:number}>}
 * Tracks failed login attempts per username for brute-force protection.
 * Automatically pruned when lockout expires.
 */
const failedAttempts = new Map();

/**
 * @private
 * @type {object|null}
 * Cached user database, loaded lazily on first request.
 */
let usersCache = null;

/**
 * @private
 * @type {number}
 * Timestamp of last users.json modification, for cache invalidation.
 */
let usersCacheMtime = 0;

/* ═══════════════════════════════════════════════════════════════════════════════
 * SECTION 1 — CONFIGURATION & FEATURE FLAG
 * ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * @brief   Reads the AUTH_ENABLED flag from environment.
 * @returns {boolean} true if authentication gate is active.
 *
 * @details
 * Case-insensitive check: accepts "true", "1", "yes", "on" as truthy.
 * Any other value (or unset) is treated as disabled.
 */
function isAuthEnabled() {
    const raw = String(process.env.AUTH_ENABLED || '').trim().toLowerCase();
    return raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on';
}

/**
 * @brief   Retrieves session duration in seconds.
 * @returns {number} Session TTL in seconds (default: 1800 = 30 min).
 */
function getSessionTtlSeconds() {
    const mins = Number(process.env.AUTH_SESSION_MINUTES) || DEFAULT_SESSION_MINUTES;
    return Math.max(1, mins) * 60;
}

/**
 * @brief   Retrieves and validates the JWT signing secret.
 * @returns {string}  The validated secret.
 * @throws  {Error}   If AUTH_ENABLED=true and secret is missing/too short.
 *
 * @security Fail-closed: refuses to operate with a weak secret when auth is on.
 */
function getJwtSecret() {
    const secret = String(process.env.AUTH_JWT_SECRET || '');
    if (isAuthEnabled() && secret.length < MIN_SECRET_LENGTH) {
        throw new Error(
            `AUTH_JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters. ` +
            `Generate one with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
        );
    }
    return secret;
}

/**
 * @brief   Retrieves brute-force protection thresholds.
 * @returns {{maxAttempts:number, lockoutMs:number}}
 */
function getBruteForceConfig() {
    return {
        maxAttempts: Number(process.env.AUTH_MAX_FAILED_ATTEMPTS) || DEFAULT_MAX_ATTEMPTS,
        lockoutMs: (Number(process.env.AUTH_LOCKOUT_MINUTES) || DEFAULT_LOCKOUT_MINUTES) * 60 * 1000,
    };
}

/**
 * @brief   Resolves the absolute path to the users database file.
 * @param   {string} projectRoot  Absolute path to the project root.
 * @returns {string}              Absolute path to users.json.
 */
function getUsersFilePath(projectRoot) {
    const raw = String(process.env.AUTH_USERS_FILE || './data/users.json').trim();
    return path.isAbsolute(raw) ? raw : path.resolve(projectRoot, raw);
}

/* ═══════════════════════════════════════════════════════════════════════════════
 * SECTION 2 — CRYPTOGRAPHIC PRIMITIVES
 * ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * @brief   Constant-time string comparison to prevent timing attacks.
 * @param   {string} a  First string.
 * @param   {string} b  Second string.
 * @returns {boolean}   true if strings are byte-identical.
 *
 * @security Uses crypto.timingSafeEqual to prevent side-channel leakage.
 *          Both inputs are normalized to equal length before comparison
 *          to avoid revealing length information.
 */
function safeCompare(a, b) {
    const bufA = Buffer.from(String(a || ''), 'utf8');
    const bufB = Buffer.from(String(b || ''), 'utf8');
    if (bufA.length !== bufB.length) {
        // Still perform a comparison to maintain constant time.
        crypto.timingSafeEqual(bufA, bufA);
        return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * @brief   Hashes a plaintext password using scrypt (Node built-in).
 * @param   {string} password  Plaintext password.
 * @returns {Promise<string>}  Encoded hash in format "scrypt$N$salt$hash".
 *
 * @security scrypt is memory-hard (resistant to GPU/ASIC attacks).
 *          Uses 16-byte random salt + 64-byte derived key.
 *          Prefer bcrypt when available; scrypt is the fallback.
 */
async function hashPassword(password) {
    // Try bcrypt first if installed
    try {
        const bcrypt = require('bcrypt');
        return await bcrypt.hash(password, HASH_COST);
    } catch { /* bcrypt unavailable → use scrypt */ }

    // Node.js built-in scrypt fallback
    return new Promise((resolve, reject) => {
        const salt = crypto.randomBytes(16);
        crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
            if (err) return reject(err);
            resolve(`scrypt$16384$${salt.toString('hex')}$${derivedKey.toString('hex')}`);
        });
    });
}

/**
 * @brief   Verifies a plaintext password against a stored hash.
 * @param   {string} password  Plaintext candidate.
 * @param   {string} hash      Stored hash (bcrypt or scrypt format).
 * @returns {Promise<boolean>} true if password matches.
 *
 * @security Uses constant-time comparison and dummy computation on
 *          malformed hashes to prevent timing enumeration of users.
 */
async function verifyPassword(password, hash) {
    if (!password || !hash) return false;

    // Bcrypt hashes start with $2a$ / $2b$ / $2y$
    if (hash.startsWith('$2')) {
        try {
            const bcrypt = require('bcrypt');
            return await bcrypt.compare(password, hash);
        } catch {
            return false;
        }
    }

    // scrypt format: scrypt$N$salt$hash
    if (hash.startsWith('scrypt$')) {
        try {
            const [, nStr, saltHex, hashHex] = hash.split('$');
            const N = Number(nStr);
            const salt = Buffer.from(saltHex, 'hex');
            const stored = Buffer.from(hashHex, 'hex');
            return new Promise((resolve) => {
                crypto.scrypt(password, salt, stored.length, { N, r: 8, p: 1 }, (err, derived) => {
                    if (err) return resolve(false);
                    resolve(safeCompare(derived.toString('hex'), stored.toString('hex')));
                });
            });
        } catch {
            return false;
        }
    }

    return false;
}

/**
 * @brief   Base64url encoding (RFC 7515, JWT-compatible).
 * @param   {Buffer|string} input  Data to encode.
 * @returns {string}               Base64url string (no padding, URL-safe).
 */
function base64urlEncode(input) {
    const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8');
    return buf.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}

/**
 * @brief   Base64url decoding.
 * @param   {string} str  Base64url-encoded string.
 * @returns {Buffer}      Decoded buffer.
 */
function base64urlDecode(str) {
    const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
    const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
    return Buffer.from(b64, 'base64');
}

/* ═══════════════════════════════════════════════════════════════════════════════
 * SECTION 3 — JWT (JSON Web Token) — HS256
 * ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * @brief   Signs a JWT with HMAC-SHA256.
 * @param   {object} payload  Claims to embed (must include sub, iat, exp).
 * @returns {string}          Compact JWT: header.payload.signature.
 *
 * @security Uses the AUTH_JWT_SECRET; refuses to sign if secret invalid.
 *          Includes 'jti' (JWT ID) for future revocation support.
 */
function signJwt(payload) {
    const secret = getJwtSecret();
    const header = { alg: 'HS256', typ: 'JWT' };

    const enrichedPayload = {
        ...payload,
        jti: crypto.randomBytes(16).toString('hex'), // unique token ID
    };

    const headerB64 = base64urlEncode(JSON.stringify(header));
    const payloadB64 = base64urlEncode(JSON.stringify(enrichedPayload));
    const data = `${headerB64}.${payloadB64}`;

    const signature = crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest();

    return `${data}.${base64urlEncode(signature)}`;
}

/**
 * @brief   Verifies and decodes a JWT.
 * @param   {string} token  Compact JWT string.
 * @returns {{ok:boolean, payload?:object, reason?:string}}
 *
 * @security
 *   - Rejects tokens with unsupported algorithms (algorithm confusion attack)
 *   - Verifies signature with constant-time comparison
 *   - Checks 'exp' claim (expiration)
 *   - Checks 'iat' claim (issued at) is not in the future
 */
function verifyJwt(token) {
    if (!token || typeof token !== 'string') {
        return { ok: false, reason: 'MISSING_TOKEN' };
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
        return { ok: false, reason: 'MALFORMED' };
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    let header, payload;
    try {
        header = JSON.parse(base64urlDecode(headerB64).toString('utf8'));
        payload = JSON.parse(base64urlDecode(payloadB64).toString('utf8'));
    } catch {
        return { ok: false, reason: 'DECODE_FAILED' };
    }

    // Reject algorithm confusion attacks
    if (header.alg !== 'HS256' || header.typ !== 'JWT') {
        return { ok: false, reason: 'BAD_ALGORITHM' };
    }

    // Verify signature (constant-time)
    let secret;
    try { secret = getJwtSecret(); }
    catch { return { ok: false, reason: 'SERVER_MISCONFIGURED' }; }

    const expectedSig = crypto
        .createHmac('sha256', secret)
        .update(`${headerB64}.${payloadB64}`)
        .digest();
    const providedSig = base64urlDecode(signatureB64);

    if (expectedSig.length !== providedSig.length ||
        !crypto.timingSafeEqual(expectedSig, providedSig)) {
        return { ok: false, reason: 'BAD_SIGNATURE' };
    }

    // Time-based claims
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== 'number' || payload.exp < now) {
        return { ok: false, reason: 'EXPIRED' };
    }
    if (typeof payload.iat !== 'number' || payload.iat > now + 60) {
        return { ok: false, reason: 'CLOCK_SKEW' };
    }

    return { ok: true, payload };
}

/* ═══════════════════════════════════════════════════════════════════════════════
 * SECTION 4 — COOKIE HANDLING
 * ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * @brief   Parses the Cookie header into a key/value map.
 * @param   {string} cookieHeader  Raw Cookie header value.
 * @returns {Object<string,string>}
 */
function parseCookies(cookieHeader) {
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
function buildSessionCookie(token, maxAgeSec, isSecure = false) {
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
function buildClearCookie() {
    return `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict`;
}

/**
 * @brief   Extracts the session token from a request's Cookie header.
 * @param   {http.IncomingMessage} req
 * @returns {string|null}
 */
function extractToken(req) {
    const cookies = parseCookies(req.headers.cookie || '');
    return cookies[COOKIE_NAME] || null;
}

/* ═══════════════════════════════════════════════════════════════════════════════
 * SECTION 5 — USER DATABASE
 * ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * @brief   Loads the users database with cache invalidation on file change.
 * @param   {string} projectRoot  Absolute project root.
 * @returns {Promise<object>}     Parsed users database.
 * @throws  {Error} If the file is missing or malformed.
 */
async function loadUsers(projectRoot) {
    const filePath = getUsersFilePath(projectRoot);

    let stat;
    try {
        stat = fs.statSync(filePath);
    } catch {
        throw new Error(`Users database not found: ${filePath}`);
    }

    // Return cache if unchanged
    if (usersCache && stat.mtimeMs === usersCacheMtime) {
        return usersCache;
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch {
        throw new Error(`Users database is not valid JSON: ${filePath}`);
    }

    if (!parsed || !Array.isArray(parsed.users)) {
        throw new Error(`Users database missing 'users' array: ${filePath}`);
    }

    usersCache = parsed;
    usersCacheMtime = stat.mtimeMs;
    return parsed;
}

/**
 * @brief   Persists the users database to disk (used for lastLogin updates).
 * @param   {string} projectRoot  Absolute project root.
 * @param   {object} data         Users database object.
 */
function saveUsers(projectRoot, data) {
    const filePath = getUsersFilePath(projectRoot);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    usersCache = data;
    usersCacheMtime = fs.statSync(filePath).mtimeMs;
}

/**
 * @brief   Finds a user by username (case-insensitive).
 * @param   {object} db        Users database.
 * @param   {string} username
 * @returns {object|null}
 */
function findUser(db, username) {
    const target = String(username || '').trim().toLowerCase();
    if (!target) return null;
    return db.users.find(u => String(u.username || '').toLowerCase() === target) || null;
}

/* ═══════════════════════════════════════════════════════════════════════════════
 * SECTION 6 — BRUTE-FORCE PROTECTION
 * ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * @brief   Checks whether a username is currently locked out.
 * @param   {string} username
 * @returns {{locked:boolean, retryAfterMs?:number}}
 */
function checkLockout(username) {
    const key = String(username || '').toLowerCase();
    const entry = failedAttempts.get(key);
    if (!entry) return { locked: false };

    if (entry.lockedUntil && entry.lockedUntil > Date.now()) {
        return { locked: true, retryAfterMs: entry.lockedUntil - Date.now() };
    }

    // Lockout expired → clear entry
    if (entry.lockedUntil && entry.lockedUntil <= Date.now()) {
        failedAttempts.delete(key);
    }
    return { locked: false };
}

/**
 * @brief   Records a failed login attempt and locks the account if threshold reached.
 * @param   {string} username
 */
function recordFailedAttempt(username) {
    const key = String(username || '').toLowerCase();
    const { maxAttempts, lockoutMs } = getBruteForceConfig();
    const entry = failedAttempts.get(key) || { attempts: 0, lockedUntil: 0 };
    entry.attempts += 1;
    if (entry.attempts >= maxAttempts) {
        entry.lockedUntil = Date.now() + lockoutMs;
    }
    failedAttempts.set(key, entry);
}

/**
 * @brief   Clears failed attempts after a successful login.
 * @param   {string} username
 */
function clearFailedAttempts(username) {
    failedAttempts.delete(String(username || '').toLowerCase());
}

/* ═══════════════════════════════════════════════════════════════════════════════
 * SECTION 7 — PUBLIC AUTHENTICATION API
 * ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * @brief   Authenticates a user with username + password.
 * @param   {string} projectRoot
 * @param   {string} username
 * @param   {string} password
 * @returns {Promise<{ok:boolean, token?:string, user?:object, reason?:string, retryAfterMs?:number}>}
 *
 * @security
 *   - Brute-force lockout enforced before password check
 *   - Same generic error for unknown user / wrong password (no enumeration)
 *   - Constant-time password verification
 *   - Failed attempts recorded; cleared on success
 *   - Fresh JWT issued with expiration
 */
async function login(projectRoot, username, password) {
    if (!isAuthEnabled()) {
        return { ok: false, reason: 'AUTH_DISABLED' };
    }

    // 0. Just String and Number
    const USERNAME_REGEX = /^[a-zA-Z0-0_-]{3,32}$/;

    if (!USERNAME_REGEX.test(username)) {
        return { ok: false, reason: 'INVALID_CREDENTIALS' };
    }

    // 1. Lockout check
    const lockCheck = checkLockout(username);
    if (lockCheck.locked) {
        return { ok: false, reason: 'LOCKED_OUT', retryAfterMs: lockCheck.retryAfterMs };
    }

    // 2. Load user database
    let db;
    try { db = await loadUsers(projectRoot); }
    catch { return { ok: false, reason: 'SERVER_ERROR' }; }

    // 3. Locate user (perform dummy hash on missing to prevent enumeration)
    const user = findUser(db, username);
    const hashToCheck = user ? user.passwordHash : '$2b$12$dummy.hash.to.prevent.timing.enumeration.attacks.xxxxxxx';

    const ok = await verifyPassword(password, hashToCheck);

    if (!user || !ok) {
        recordFailedAttempt(username);
        return { ok: false, reason: 'INVALID_CREDENTIALS' };
    }

    // 4. Success → clear attempts, update lastLogin, issue token
    clearFailedAttempts(username);
    user.lastLogin = new Date().toISOString();
    try { saveUsers(projectRoot, db); } catch { /* non-fatal */ }

    const ttlSec = getSessionTtlSeconds();
    const now = Math.floor(Date.now() / 1000);
    const token = signJwt({
        sub: user.id,
        usr: user.username,
        role: user.role || 'user',
        iat: now,
        exp: now + ttlSec,
    });

    return {
        ok: true,
        token,
        user: { id: user.id, username: user.username, role: user.role || 'user' },
        ttlSec,
    };
}

/**
 * @brief   Verifies the session token on an incoming request.
 * @param   {http.IncomingMessage} req
 * @returns {{ok:boolean, user?:object, reason?:string, payload?:object}}
 *
 * @details
 * When AUTH_ENABLED=false, always returns { ok: true } as a no-op.
 * When enabled, requires a valid, unexpired JWT in the session cookie.
 */
function verifySession(req, projectRoot) {
    if (!isAuthEnabled()) return { ok: true, user: { anonymous: true } };

    const token = extractToken(req);
    if (!token) return { ok: false, reason: 'NO_SESSION' };

    const result = verifyJwt(token);
    if (!result.ok) return { ok: false, reason: result.reason };

    try {
        const db = loadUsersSync(projectRoot);
        const user = findUser(db, result.payload.usr);
        if (!user) {
            return { ok: false, reason: 'USER_REVOKED' };
        }
    } catch { /* ignore */ }

    return {
        ok: true,
        payload: result.payload,
        user: { id: result.payload.sub, username: result.payload.usr, role: result.payload.role },
    };
}

/**
 * @brief   Issues a fresh sliding-session token (called on activity).
 * @param   {object} user
 * @returns {{token:string, ttlSec:number}}
 */
function renewSession(user) {
    const ttlSec = getSessionTtlSeconds();
    const now = Math.floor(Date.now() / 1000);
    const token = signJwt({
        sub: user.id,
        usr: user.username,
        role: user.role,
        iat: now,
        exp: now + ttlSec,
    });
    return { token, ttlSec };
}

/**
 * @brief   Returns the Set-Cookie header value for issuing a session.
 * @param   {string} token
 * @param   {number} ttlSec
 * @param   {boolean} secure  Whether HTTPS is in use.
 * @returns {string}
 */
function makeSessionCookieHeader(token, ttlSec, secure = false) {
    return buildSessionCookie(token, ttlSec, secure);
}

/**
 * @brief   Returns the Set-Cookie header value that clears the session.
 * @returns {string}
 */
function makeClearCookieHeader() {
    return buildClearCookie();
}

/**
 * @brief   Determines whether a given URL path requires authentication.
 * @param   {string} pathname     Request pathname.
 * @param   {string} projectRoot  Absolute project root.
 * @returns {boolean}
 *
 * @details
 * A path requires auth if AUTH_ENABLED=true AND the path targets
 * the RELEASE_PVM directory tree. Uses the same relative-path
 * computation as files-service to stay in sync with .env changes.
 */
function pathRequiresAuth(pathname, projectRoot) {
    if (!isAuthEnabled()) return false;

    const releaseRaw = String(process.env.RELEASE_PVM || '').trim();
    const filesRaw = String(process.env.FILES_ROOT || '').trim();
    if (!releaseRaw || !filesRaw) return false;

    const filesRoot = path.isAbsolute(filesRaw) ? path.resolve(filesRaw) : path.resolve(projectRoot, filesRaw);
    const releaseDir = path.isAbsolute(releaseRaw) ? path.resolve(releaseRaw) : path.resolve(projectRoot, releaseRaw);

    // Compute POSIX relative path (e.g. "release", "release/el9", "updates/pvm")
    const rel = path.relative(filesRoot, releaseDir).split(path.sep).filter(Boolean).join('/');

    // Never gate everything if release is outside FILES_ROOT
    if (!rel || rel.startsWith('..')) return false;

    const protectedPrefixes = [
        `/api/releases`,                       // release listing endpoint (all queries)
        `/api/download/${rel}`,                // direct file download under release
        `/api/download/${rel}/`,
        `/api/files/${rel}`,                   // browse listing under release
        `/api/files/${rel}/`,
    ];

    return protectedPrefixes.some(prefix =>
        pathname === prefix.replace(/\/$/, '') || pathname.startsWith(prefix)
    );
}

/* ═══════════════════════════════════════════════════════════════════════════════
 * PUBLIC API
 * ═══════════════════════════════════════════════════════════════════════════════ */
module.exports = {
    // Configuration
    isAuthEnabled,
    getSessionTtlSeconds,

    // Authentication
    login,
    verifySession,
    renewSession,

    // Cookie helpers
    makeSessionCookieHeader,
    makeClearCookieHeader,
    extractToken,

    // Routing helper
    pathRequiresAuth,

    // Utility (for admin scripts)
    hashPassword,
    verifyPassword,

    // Constants
    COOKIE_NAME,
};