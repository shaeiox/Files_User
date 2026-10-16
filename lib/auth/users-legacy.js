/**
 * @file lib/auth/users-legacy.js
 * @brief Legacy-mode user database (users.json in PORTAL_DATA_DIR).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { dataDir } = require('../load-env');
const settings = require('../settings');
const { verifyPassword, DUMMY_LEGACY_HASH } = require('./passwords');
const lockout = require('./lockout');
const { issueToken, newSessionId } = require('./jwt');

/**
 * @private
 * @type {object|null}
 * Cached user database, loaded lazily on first request.
 */
let usersCache = null;

/**
 * @private
 * @type {string}
 * users.json mtime + size at the last load, for cache invalidation. Size is part
 * of the key because two writes within one filesystem timestamp tick share an mtime.
 */
let usersCacheKey = '';
const usersFileKey = (stat) => `${stat.mtimeMs}:${stat.size}`;

/**
 * @brief   Resolves the absolute path to the users database file.
 * @param   {string} projectRoot  Absolute path to the project root.
 * @returns {string}              Absolute path to users.json.
 */
function getUsersFilePath(projectRoot) {
    const raw = settings.raw('AUTH_USERS_FILE');
    if (!raw) return path.join(dataDir(), 'users.json');
    return path.isAbsolute(raw) ? raw : path.resolve(projectRoot, raw);
}

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
        stat = await fs.promises.stat(filePath);
    } catch {
        throw new Error(`Users database not found: ${filePath}`);
    }

    // Return cache if unchanged
    if (usersCache && usersFileKey(stat) === usersCacheKey) {
        return usersCache;
    }

    const raw = await fs.promises.readFile(filePath, 'utf8');
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
    usersCacheKey = usersFileKey(stat);
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
    usersCacheKey = usersFileKey(fs.statSync(filePath));
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

/** Legacy username shape. */
const USERNAME = /^[a-zA-Z0-9_-]{3,32}$/;

/**
 * @brief   Signs in against users.json (lockout already checked by the caller).
 * @returns {Promise<{ok:boolean, token?:string, ttlSec?:number, user?:object, reason?:string}>}
 */
async function login(projectRoot, username, password) {
    // 2. Load user database
    let db;
    try { db = await loadUsers(projectRoot); }
    catch { return { ok: false, reason: 'SERVER_ERROR' }; }

    // 3. Locate user (perform dummy hash on missing to prevent enumeration)
    const user = findUser(db, username);
    const hashToCheck = user ? user.passwordHash : DUMMY_LEGACY_HASH;

    const ok = await verifyPassword(password, hashToCheck);

    if (!user || !ok) {
        lockout.recordFailedAttempt(username);
        return { ok: false, reason: 'INVALID_CREDENTIALS' };
    }

    // 4. Success → clear attempts, update lastLogin, issue token
    lockout.clearFailedAttempts(username);
    user.lastLogin = new Date().toISOString();
    try { saveUsers(projectRoot, db); } catch { /* non-fatal */ }

    const { token, ttlSec } = issueToken({
        sub: user.id,
        usr: user.username,
        role: user.role || 'user',
        sid: newSessionId(),
    });

    return {
        ok: true,
        token,
        user: { id: user.id, username: user.username, role: user.role || 'user' },
        ttlSec,
    };
}

/**
 * @brief   Confirms a verified token's user is still listed in users.json.
 *          An unreadable database fails closed rather than trusting the token alone.
 * @returns {Promise<{ok:boolean, user?:object, payload?:object, reason?:string}>}
 */
async function verify(projectRoot, payload) {
    let db;
    try { db = await loadUsers(projectRoot); }
    catch { return { ok: false, reason: 'SERVER_ERROR' }; }
    if (!findUser(db, payload.usr)) return { ok: false, reason: 'USER_REVOKED' };

    return {
        ok: true,
        payload,
        user: { id: payload.sub, username: payload.usr, role: payload.role, sid: payload.sid },
    };
}

module.exports = { USERNAME, getUsersFilePath, loadUsers, saveUsers, findUser, login, verify };
