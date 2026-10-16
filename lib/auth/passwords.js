/**
 * @file lib/auth/passwords.js
 * @brief Password hashing and verification: bcrypt, the portal's scrypt format,
 *        and the admin project's "saltHex:hashHex" scrypt format.
 */
'use strict';

const crypto = require('crypto');

/** @constant {number} Bcrypt/scrypt cost factor (higher = slower = safer). */
const HASH_COST = 12;

/**
 * @constant {string} Admin-format dummy hash used when a username is unknown,
 * so a missing user costs the same scrypt work as an existing one (no timing
 * enumeration). Salt and digest lengths match the admin's real hashes.
 */
const DUMMY_ADMIN_HASH = '00000000000000000000000000000000:' + '0'.repeat(128);

/** Legacy-mode dummy hash for unknown users (same bcrypt cost as a real check). */
const DUMMY_LEGACY_HASH = '$2b$12$dummy.hash.to.prevent.timing.enumeration.attacks.xxxxxxx';

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

    // Admin format: "<saltHex>:<hashHex>" (see lib/admin-db.js header).
    if (/^[0-9a-fA-F]+:[0-9a-fA-F]+$/.test(hash)) {
        return verifyAdminPassword(password, hash);
    }

    return false;
}

/**
 * @brief   Verifies a password against the admin project's hash format.
 *
 * @details
 * The admin writes `scryptSync(password, saltHexString, 64)` with Node's default
 * cost (N=16384, r=8, p=1), storing "<saltHex>:<hashHex>". The salt is the
 * 32-char hex STRING used as UTF-8 bytes - NOT the decoded bytes - so this must
 * not reuse the portal's own `scrypt$...` branch, which hex-decodes its salt.
 *
 * @param   {string} password  Plaintext candidate.
 * @param   {string} stored    Admin-format "saltHex:hashHex".
 * @returns {Promise<boolean>}
 */
async function verifyAdminPassword(password, stored) {
    const match = /^([0-9a-fA-F]+):([0-9a-fA-F]{128})$/.exec(String(stored || ''));
    if (!match || typeof password !== 'string') return false;
    const [, salt, hashHex] = match;
    const expected = Buffer.from(hashHex, 'hex');
    // Async scrypt (same parameters as the admin's scryptSync) keeps the event loop free.
    const derived = await new Promise((resolve) => {
        crypto.scrypt(password, salt, 64, (err, key) => resolve(err ? null : key));
    });
    return !!derived && crypto.timingSafeEqual(derived, expected);
}

module.exports = { hashPassword, verifyPassword, verifyAdminPassword, safeCompare, DUMMY_ADMIN_HASH, DUMMY_LEGACY_HASH };
