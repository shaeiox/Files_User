/**
 * @file lib/auth/users-admin.js
 * @brief Integration-mode users, from the admin (its HTTP contract, or - deprecated - its database read-only).
 */
'use strict';

const adminDb = require('../admin-db');
const { verifyAdminPassword, DUMMY_ADMIN_HASH } = require('./passwords');
const lockout = require('./lockout');
const { issueToken, newSessionId } = require('./jwt');

/** @constant {number} Longest username accepted in integration mode (admin stores any trimmed text). */
const MAX_USERNAME_LENGTH = 255;

/**
 * @brief   Authenticates against the admin database (integration mode).
 *
 * @details
 * Looks up the active admin user, verifies the admin-format hash, honours the
 * admin's own `locked_until` read-only, and issues the same JWT shape as the
 * legacy path. It never writes to the admin database (the portal has it open
 * read-only and the admin owns it).
 *
 * Over the HTTP contract (isolate-app-roots) the portal holds no password
 * record: the admin checks the password (`credentials/verify`, sent with the
 * caller's address for its per-client throttle) and the session is bound to the
 * admin's credential stamp instead of a hash fingerprint.
 *
 * @param {string} username
 * @param {string} password
 * @param {string} [clientIp] The caller's address, after trusted-proxy resolution.
 * @returns {Promise<{ok:boolean, token?:string, user?:object, reason?:string, retryAfterMs?:number, ttlSec?:number}>}
 */
async function login(username, password, clientIp) {
    let user;
    try {
        user = adminDb.findActiveUserByUsername(username);
    } catch (err) {
        adminDb.logFault('login user lookup', err);
        return { ok: false, reason: 'SERVER_ERROR' };
    }

    // Honour an admin-set lock without spending a scrypt round.
    if (user && user.locked_until && user.locked_until > Date.now()) {
        return { ok: false, reason: 'LOCKED_OUT', retryAfterMs: user.locked_until - Date.now() };
    }

    let ok;
    let pwf = user ? user.pwFingerprint : undefined;
    if (adminDb.source() === 'http') {
        // Asked even for an unknown user: the admin spends the same scrypt work.
        let checked;
        try {
            checked = await adminDb.verifyCredentials(username, password, clientIp);
        } catch (err) {
            adminDb.logFault('login credential check', err);
            return { ok: false, reason: 'SERVER_ERROR' };
        }
        ok = Boolean(user && checked && checked.userId === user.id);
        if (ok) pwf = checked.credentialStamp;
    } else {
        // Unknown users cost the same scrypt work as real ones (no timing enumeration).
        ok = await verifyAdminPassword(password, user ? user.password_hash : DUMMY_ADMIN_HASH);
    }

    if (!user || !ok) {
        lockout.recordFailedAttempt(username);
        return { ok: false, reason: 'INVALID_CREDENTIALS' };
    }

    lockout.clearFailedAttempts(username);

    const { token, ttlSec } = issueToken({
        sub: user.id,
        usr: user.username,
        role: user.role || 'user',
        pwf,
        auth_time: Date.now(), // login time (ms), kept across renewals
        sid: newSessionId(),   // one id per login, kept across renewals (logout revokes it)
    });

    return {
        ok: true,
        token,
        user: { id: user.id, username: user.username, role: user.role || 'user' },
        ttlSec,
    };
}

/**
 * @brief   Confirms a verified token's subject is still an active admin user,
 *          with the same password, and was not revoked by the admin.
 * @returns {{ok:boolean, user?:object, payload?:object, reason?:string}}
 */
function verify(payload) {
    let user = null;
    try {
        user = adminDb.findActiveUserById(payload.sub);
    } catch (err) {
        adminDb.logFault('session user lookup', err);
        return { ok: false, reason: 'SERVER_ERROR' };
    }
    if (!user) return { ok: false, reason: 'USER_REVOKED' };
    // Bound to the password hash at login: an admin password reset ends it.
    if (payload.pwf !== user.pwFingerprint) return { ok: false, reason: 'PASSWORD_CHANGED' };
    // Admin "Revoke sessions" ends every session that logged in at or before it.
    const authTime = payload.auth_time;
    if (!Number.isSafeInteger(authTime)) return { ok: false, reason: 'SESSION_REVOKED' };
    if (user.sessionsRevokedAt != null && authTime <= user.sessionsRevokedAt) {
        return { ok: false, reason: 'SESSION_REVOKED' };
    }
    return {
        ok: true,
        payload,
        user: { id: user.id, username: user.username, role: user.role, authTime, sid: payload.sid },
    };
}

/**
 * Claims a renewed token carries in integration mode. The fingerprint is
 * re-read rather than exposed on session.user; if the user is gone or the data
 * is unreadable the token carries none and its next verification fails (fail closed).
 */
function renewalClaims(user) {
    let pwf;
    try { pwf = (adminDb.findActiveUserById(user.id) || {}).pwFingerprint; }
    catch { /* leave pwf unset */ }
    return { pwf, auth_time: user.authTime }; // the original login time, never extended
}

module.exports = { MAX_USERNAME_LENGTH, login, verify, renewalClaims };
