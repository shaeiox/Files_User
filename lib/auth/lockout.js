/**
 * @file lib/auth/lockout.js
 * @brief Per-username failed sign-in counting and lockout, shared by every
 *        process using one PORTAL_DATA_DIR (lib/state-store.js).
 *
 * Every function throws when the state store cannot be used; lib/auth/session.js
 * login() turns that into SERVER_ERROR, so a sign-in that cannot be counted is
 * never accepted.
 */
'use strict';

const adminDb = require('../admin-db');
const settings = require('../settings');
const metrics = require('../metrics');
const store = require('../state-store');

const keyOf = (username) => String(username || '').toLowerCase();

/**
 * @brief   Retrieves brute-force protection thresholds.
 * @returns {{maxAttempts:number, lockoutMs:number}}
 */
function getBruteForceConfig() {
    return {
        maxAttempts: adminDb.tunable('maxFailedAttempts') || settings.get('AUTH_MAX_FAILED_ATTEMPTS'),
        lockoutMs: (adminDb.tunable('lockoutMinutes') || settings.get('AUTH_LOCKOUT_MINUTES')) * 60 * 1000,
    };
}

/**
 * @brief   Checks whether a username is currently locked out.
 * @param   {string} username
 * @returns {{locked:boolean, retryAfterMs?:number}}
 */
function checkLockout(username) {
    const key = keyOf(username);
    const entry = store.getFailedLogin(key);
    if (!entry) return { locked: false };

    const now = Date.now();
    if (entry.lockedUntil && entry.lockedUntil > now) {
        return { locked: true, retryAfterMs: entry.lockedUntil - now };
    }

    // Lockout expired → clear entry
    if (entry.lockedUntil && entry.lockedUntil <= now) store.clearFailedLogin(key);
    return { locked: false };
}

/**
 * @brief   Records a failed login attempt and locks the account if threshold reached.
 * @param   {string} username
 */
function recordFailedAttempt(username) {
    const { maxAttempts, lockoutMs } = getBruteForceConfig();
    const { newlyLocked } = store.recordFailedLogin(keyOf(username), maxAttempts, lockoutMs);
    metrics.loginFailed();
    if (newlyLocked) metrics.lockedOut();
}

/**
 * @brief   Clears failed attempts after a successful login.
 * @param   {string} username
 */
function clearFailedAttempts(username) {
    store.clearFailedLogin(keyOf(username));
}

module.exports = { checkLockout, recordFailedAttempt, clearFailedAttempts, getBruteForceConfig };
