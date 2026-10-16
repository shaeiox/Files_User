/**
 * @file lib/auth/jwt.js
 * @brief Session tokens: HS256 JWT signing and verification (no external
 *        dependencies; see ADR-003), session ids and the session lifetime.
 */
'use strict';

const crypto = require('crypto');
const settings = require('../settings');
const adminDb = require('../admin-db');

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

/**
 * @brief   Retrieves and validates the JWT signing secret.
 * @returns {string}  The validated secret.
 * @throws  {Error}   If AUTH_ENABLED=true and secret is missing/too short.
 *
 * @security Fail-closed: refuses to operate with a weak secret when auth is on.
 *           Startup refuses it too (lib/settings.js problems()).
 */
function getJwtSecret() {
    const secret = settings.raw('AUTH_JWT_SECRET');
    if (settings.get('AUTH_ENABLED') && secret.length < settings.MIN_SECRET_LENGTH) {
        throw new Error(
            `AUTH_JWT_SECRET must be at least ${settings.MIN_SECRET_LENGTH} characters. ` +
            `Generate one with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
        );
    }
    return secret;
}

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

/**
 * @brief   Retrieves session duration in seconds.
 * @returns {number} Session TTL in seconds (default: 1800 = 30 min).
 * @note    Admin value (integration mode) → AUTH_SESSION_MINUTES → default.
 */
function getSessionTtlSeconds() {
    const mins = adminDb.tunable('authSessionMinutes') || settings.get('AUTH_SESSION_MINUTES');
    return Math.max(1, mins) * 60;
}

/** One id per login, kept across renewals (logout revokes it). */
function newSessionId() {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * Signs a fresh session token for `claims` (sub, usr, role, sid, ...).
 * @returns {{token:string, ttlSec:number}}
 */
function issueToken(claims) {
    const ttlSec = getSessionTtlSeconds();
    const now = Math.floor(Date.now() / 1000);
    return { token: signJwt({ ...claims, iat: now, exp: now + ttlSec }), ttlSec };
}

module.exports = { signJwt, verifyJwt, getJwtSecret, getSessionTtlSeconds, newSessionId, issueToken, base64urlEncode, base64urlDecode };
