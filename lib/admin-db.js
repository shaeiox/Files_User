/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @file        lib/admin-db.js
 * @brief       Read-only client for the admin (Dimension Files Manager) database.
 *
 * @description
 * Bridges this portal to the admin application's SQLite store so the two act as
 * one system, without writing to it. The admin application remains the sole
 * writer of admin.sqlite.
 *
 * Mode is decided by an explicit intent/resource handshake:
 *
 *   ADMIN_INTEGRATION_ENABLED   ADMIN_DB_PATH   ->  mode
 *   ---------------------------------------------------------
 *   unset                       unset           ->  legacy (backward compatible)
 *   unset                       set             ->  startup failure
 *   false                       set             ->  startup failure
 *   false                       unset           ->  legacy
 *   true                        unset           ->  startup failure
 *   true                        invalid path    ->  startup failure
 *   true                        valid path      ->  integration
 *
 * Both applications serve the same storage root, so portal path `a/b` is admin
 * client path `/a/b`.
 *
 * All admin data the portal needs (users, policies, grants, and the latest
 * "Revoke sessions" time per user from audit_logs) is read as ONE
 * snapshot, in one read transaction, at most once per ADMIN_SYNC_TTL_MS. A
 * failed refresh drops the snapshot (never serves stale data) and throws, so
 * every caller fails closed; the next call retries.
 *
 * @version     2.0.0
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const logger = require('./logger');

/** Highest admin schema version this release understands (admin src/db/schema.js). */
const KNOWN_SCHEMA_VERSION = 4;

/** First admin schema version with portal_nav_folders (navbar links). */
const NAV_SCHEMA_VERSION = 3;

/** First admin schema version with access levels and user groups. */
const LEVELS_SCHEMA_VERSION = 4;

/** Sync interval bounds for ADMIN_SYNC_TTL_MS (ms). */
const DEFAULT_SYNC_TTL_MS = 5000;
const MIN_SYNC_TTL_MS = 1000;
const MAX_SYNC_TTL_MS = 60000;

/** How long a read waits on the admin's write lock before failing (ms). */
const BUSY_TIMEOUT_MS = 2000;

/** Relative ADMIN_DB_PATH values resolve against the project root, never the cwd. */
const PROJECT_ROOT = path.resolve(__dirname, '..');

const ACCESS_MODES = new Set(['public', 'authenticated', 'restricted']);
const PERMISSIONS = new Set(['grant', 'deny']);
/** Admin access levels, ordered (admin FileAccessPolicyService.LEVELS). */
const LEVELS = ['view', 'download'];
/** 'view' -> 1, 'download' -> 2; anything else -> 0. */
const levelRank = (level) => LEVELS.indexOf(level) + 1;
/** A deny, kept in the grants map: it beats every grant. */
const DENY = -1;
const USER_STATUSES = new Set(['active', 'disabled']);
const USER_ROLES = new Set(['admin', 'user']);

/* ─────────────────────────────────────────────────────────────────────────────
 * CONFIGURATION
 * ───────────────────────────────────────────────────────────────────────────── */

/** Parses a boolean env value; returns undefined when the variable is unset. */
function parseBool(raw) {
    if (raw === undefined || raw === null || String(raw).trim() === '') return undefined;
    const v = String(raw).trim().toLowerCase();
    return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

/**
 * Resolves the integration mode from the environment.
 * @param {string} [projectRoot] Base for a relative ADMIN_DB_PATH (defaults to this project).
 * @returns {{mode:'legacy'|'integration', dbPath?:string|null, problems:string[]}}
 */
function resolveConfig(projectRoot = PROJECT_ROOT) {
    const enabledRaw = process.env.ADMIN_INTEGRATION_ENABLED;
    const enabled = parseBool(enabledRaw);
    const dbPath = String(process.env.ADMIN_DB_PATH || '').trim();
    const dbSet = dbPath !== '';
    const problems = [];

    // Both unset, or explicitly disabled with no resource -> intentional legacy mode.
    if ((enabledRaw === undefined || enabled === false) && !dbSet) {
        return { mode: 'legacy', dbPath: null, problems: [] };
    }
    // Any partial/inconsistent combination must not run as legacy.
    if (!dbSet) {
        problems.push('ADMIN_INTEGRATION_ENABLED is true but ADMIN_DB_PATH is not set.');
    }
    if (dbSet && enabled === undefined) {
        problems.push('ADMIN_DB_PATH is set but ADMIN_INTEGRATION_ENABLED is not declared ' +
            '(set ADMIN_INTEGRATION_ENABLED=true, or remove ADMIN_DB_PATH to run without integration).');
    }
    if (dbSet && enabled === false) {
        problems.push('ADMIN_INTEGRATION_ENABLED is false but ADMIN_DB_PATH is set (inconsistent configuration).');
    }
    if (problems.length) {
        return { mode: 'integration', dbPath: null, problems };
    }
    return { mode: 'integration', dbPath: path.resolve(projectRoot, dbPath), problems: [] };
}

/** True when admin-driven integration is configured. */
function isIntegrationEnabled() {
    return resolveConfig().mode === 'integration';
}

/** The configured sync interval, clamped to [MIN_SYNC_TTL_MS, MAX_SYNC_TTL_MS]. */
function syncTtlMs() {
    const n = Number.parseInt(process.env.ADMIN_SYNC_TTL_MS, 10);
    if (!Number.isFinite(n)) return DEFAULT_SYNC_TTL_MS;
    return Math.min(MAX_SYNC_TTL_MS, Math.max(MIN_SYNC_TTL_MS, n));
}

/* ─────────────────────────────────────────────────────────────────────────────
 * PATHS - portal relPath <-> admin client_path (same storage root)
 * ───────────────────────────────────────────────────────────────────────────── */

/** Normalizes a client path for comparison (slashes collapsed; case-insensitive on Windows). */
function normalizeClientPath(clientPath) {
    let p = String(clientPath || '').replace(/\\/g, '/').replace(/\/+/g, '/');
    if (p.length > 1) p = p.replace(/\/+$/, '');
    return process.platform === 'win32' ? p.toLowerCase() : p;
}

/** Maps a portal-relative path ("a/b", "" for the root) to the admin client path ("/a/b", "/"). */
function clientPathOf(relPath) {
    const parts = String(relPath || '')
        .replace(/\\/g, '/')
        .split('/')
        .map((p) => p.trim())
        .filter(Boolean);
    return '/' + parts.join('/');
}

/* ─────────────────────────────────────────────────────────────────────────────
 * STARTUP VALIDATION
 * ───────────────────────────────────────────────────────────────────────────── */

/** Opens the admin database read-only; throws when it cannot be opened. */
function openReadOnly(dbPath) {
    return new DatabaseSync(dbPath, { readOnly: true, timeout: BUSY_TIMEOUT_MS });
}

/** Returns true when the SQLite file exposes the expected admin tables. */
function hasExpectedTables(db) {
    try {
        const names = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name));
        return ['users', 'files', 'file_access_policies', 'user_file_permissions', 'schema_migrations', 'audit_logs']
            .every((t) => names.has(t));
    } catch {
        return false;
    }
}

/** Reads the stored admin schema version, or null when unavailable. */
function readSchemaVersion(db) {
    try {
        const row = db.prepare('SELECT MAX(version) AS v FROM schema_migrations').get();
        return row && row.v != null ? Number(row.v) : null;
    } catch {
        return null;
    }
}

/**
 * Validates the full integration configuration before the server listens.
 * @returns {string[]} Problems; empty means the configuration is usable.
 */
function validateStartup(projectRoot = PROJECT_ROOT) {
    const config = resolveConfig(projectRoot);
    const problems = [...config.problems];
    if (config.mode !== 'integration') return problems; // legacy: nothing to validate
    if (problems.length) return problems;               // partial config: already unusable

    // AUTH_ENABLED must be on, or governed files could never be opened.
    if (parseBool(process.env.AUTH_ENABLED) !== true) {
        problems.push('ADMIN_INTEGRATION_ENABLED requires AUTH_ENABLED=true ' +
            '(governed files are behind the login gate).');
    }

    if (String(process.env.ADMIN_STORAGE_ROOT || '').trim()) {
        logger.warn('[admin-integration] ADMIN_STORAGE_ROOT is no longer used and is ignored ' +
            '(portal path a/b maps to admin client path /a/b).');
    }

    // DB file must exist, be a regular file, open read-only, and be the admin schema.
    if (!fs.existsSync(config.dbPath) || !fs.statSync(config.dbPath).isFile()) {
        problems.push('ADMIN_DB_PATH does not exist or is not a file: ' + config.dbPath);
        return problems;
    }
    try {
        const db = openReadOnly(config.dbPath);
        try {
            if (!hasExpectedTables(db)) {
                problems.push('ADMIN_DB_PATH does not look like the admin database (expected tables missing).');
            } else {
                const version = readSchemaVersion(db);
                if (version == null) {
                    problems.push('ADMIN_DB_PATH has no readable schema_migrations version.');
                } else if (version > KNOWN_SCHEMA_VERSION) {
                    problems.push('ADMIN_DB_PATH schema v' + version + ' is newer than this portal understands ' +
                        '(v' + KNOWN_SCHEMA_VERSION + '); refusing to run.');
                }
            }
        } finally {
            db.close();
        }
    } catch (err) {
        problems.push('ADMIN_DB_PATH could not be opened read-only: ' + err.message);
    }
    return problems;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * SNAPSHOT
 * ───────────────────────────────────────────────────────────────────────────── */

const isNullableInt = (v) => v === null || Number.isSafeInteger(v);
const isFlag = (v) => v === 0 || v === 1;

/** Short, non-reversible fingerprint of a stored password hash (binds sessions to it). */
function passwordFingerprint(passwordHash) {
    return crypto.createHash('sha256').update(String(passwordHash)).digest('hex').slice(0, 16);
}

/**
 * Builds the in-memory snapshot from raw rows. Pure, so tests can feed it rows.
 * A row outside its documented domain is kept but marked `valid: false`; the
 * policy layer treats an invalid policy as hidden and an invalid user as inactive.
 */
function buildSnapshot({ users, policies, permissions, revocations = [], navFolders = [], groupMembers = [], groupPermissions = [] }) {
    // Admin "Revoke sessions" leaves only an audit row; its time ends every portal
    // session that logged in at or before it. A malformed time makes the user
    // invalid (cannot authenticate) rather than ignoring the revocation.
    const revokedAt = new Map();
    for (const row of revocations) {
        revokedAt.set(row.target_id, Number.isSafeInteger(row.at) ? row.at : NaN);
    }

    const userById = new Map();
    const userIdByName = new Map();
    for (const row of users) {
        const sessionsRevokedAt = revokedAt.has(row.id) ? revokedAt.get(row.id) : null;
        const valid = Number.isSafeInteger(row.id) && typeof row.username === 'string' &&
            typeof row.password_hash === 'string' && USER_STATUSES.has(row.status) &&
            USER_ROLES.has(row.role) && isNullableInt(row.locked_until) &&
            !Number.isNaN(sessionsRevokedAt);
        const user = {
            id: row.id,
            username: row.username,
            role: row.role,
            status: row.status,
            lockedUntil: row.locked_until,
            passwordHash: row.password_hash,
            pwFingerprint: passwordFingerprint(row.password_hash),
            sessionsRevokedAt,
            valid,
        };
        userById.set(row.id, user);
        if (typeof row.username === 'string') userIdByName.set(row.username.trim().toLowerCase(), row.id);
    }

    // grants: fileId -> userId -> DENY or the highest granted level rank. Group
    // grants are folded in per member, so the policy layer sees one number per
    // (file, user). A row without `level` (schema < 4) meant full access.
    // A malformed permission row poisons its file's policy (fail closed for everyone).
    const grants = new Map();
    const poisonedFiles = new Set();
    const addGrant = (fileId, userId, permission, level) => {
        if (!grants.has(fileId)) grants.set(fileId, new Map());
        const byUser = grants.get(fileId);
        const prev = byUser.get(userId);
        if (prev === DENY) return;
        byUser.set(userId, permission === 'deny' ? DENY : Math.max(prev || 0, levelRank(level)));
    };
    const validGrant = (row, idField) => PERMISSIONS.has(row.permission) && Number.isSafeInteger(row[idField]) &&
        (row.level === undefined || levelRank(row.level) > 0);
    for (const row of permissions) {
        if (!validGrant(row, 'user_id')) {
            poisonedFiles.add(row.file_id);
            continue;
        }
        addGrant(row.file_id, row.user_id, row.permission, row.level ?? 'download');
    }
    const membersByGroup = new Map();
    for (const row of groupMembers) {
        if (!membersByGroup.has(row.group_id)) membersByGroup.set(row.group_id, []);
        membersByGroup.get(row.group_id).push(row.user_id);
    }
    for (const row of groupPermissions) {
        if (!validGrant(row, 'group_id')) {
            poisonedFiles.add(row.file_id);
            continue;
        }
        for (const userId of membersByGroup.get(row.group_id) || []) {
            addGrant(row.file_id, userId, row.permission, row.level);
        }
    }

    // Several rows can normalize to one key (case-folding on Windows): keep them all.
    const policyByPath = new Map();
    for (const row of policies) {
        const valid = typeof row.client_path === 'string' && row.client_path.startsWith('/') &&
            ACCESS_MODES.has(row.access_mode) && isFlag(row.is_published) && isFlag(row.is_locked) &&
            isNullableInt(row.available_from) && isNullableInt(row.available_until) &&
            (row.default_level === undefined || levelRank(row.default_level) > 0) &&
            !poisonedFiles.has(row.file_id);
        const key = normalizeClientPath(row.client_path);
        if (!policyByPath.has(key)) policyByPath.set(key, []);
        policyByPath.get(key).push({
            fileId: row.file_id,
            clientPath: row.client_path,
            isDirectory: row.is_directory === 1,
            accessMode: row.access_mode,
            isPublished: row.is_published === 1,
            isLocked: row.is_locked === 1,
            availableFrom: row.available_from,
            availableUntil: row.available_until,
            // What every signed-in caller (and, for public, every visitor) gets.
            defaultLevel: levelRank(row.default_level ?? 'download'),
            valid,
        });
    }

    // Navbar folders (admin "File portal > Navbar folders"), already in order.
    // Only links; access to each is still decided by the policies above. A
    // malformed row is dropped (a missing link, never a wrong one).
    const nav = [];
    for (const row of navFolders) {
        if (typeof row.client_path !== 'string' || !row.client_path.startsWith('/') || !isFlag(row.hide_from_home)) continue;
        const relPath = row.client_path.split('/').filter(Boolean).join('/');
        if (!relPath || relPath.split('/').some((p) => p === '.' || p === '..')) continue;
        nav.push({
            relPath,
            label: typeof row.label === 'string' && row.label.trim() ? row.label.trim() : relPath.split('/').pop(),
            hideFromHome: row.hide_from_home === 1,
        });
    }

    return { userById, userIdByName, policyByPath, grants, nav };
}

/** Reads every table the portal needs in one read transaction (consistent snapshot). */
function readSnapshot(dbPath) {
    const db = openReadOnly(dbPath);
    try {
        db.exec('BEGIN');
        try {
            const version = readSchemaVersion(db);
            if (version == null || version > KNOWN_SCHEMA_VERSION) {
                throw new Error('admin schema version ' + version + ' is not supported (expected <= ' + KNOWN_SCHEMA_VERSION + ')');
            }
            const levels = version >= LEVELS_SCHEMA_VERSION;
            const rows = {
                users: db.prepare(
                    'SELECT id, username, role, status, password_hash, locked_until FROM users'
                ).all(),
                policies: db.prepare(
                    'SELECT f.id AS file_id, f.client_path, f.is_directory, ' +
                    'p.access_mode, p.is_published, p.is_locked, p.available_from, p.available_until' +
                    (levels ? ', p.default_level ' : ' ') +
                    'FROM files f JOIN file_access_policies p ON p.file_id = f.id'
                ).all(),
                permissions: db.prepare(
                    'SELECT file_id, user_id, permission' + (levels ? ', level' : '') + ' FROM user_file_permissions'
                ).all(),
                // Schema < 4 admins have no levels or groups: every grant is full access.
                groupMembers: levels ? db.prepare('SELECT group_id, user_id FROM user_group_members').all() : [],
                groupPermissions: levels ? db.prepare(
                    'SELECT file_id, group_id, permission, level FROM group_file_permissions'
                ).all() : [],
                // The admin writes this row on "Revoke sessions" (users.controller.js).
                revocations: db.prepare(
                    "SELECT target_id, MAX(created_at) AS at FROM audit_logs " +
                    "WHERE action = 'user.revoke_sessions' AND outcome = 'success' AND target_type = 'user' " +
                    'GROUP BY target_id'
                ).all(),
                // Schema v2 admins have no navbar table: no links.
                navFolders: version >= NAV_SCHEMA_VERSION ? db.prepare(
                    'SELECT client_path, label, hide_from_home FROM portal_nav_folders ORDER BY position ASC, id ASC'
                ).all() : [],
            };
            return buildSnapshot(rows);
        } finally {
            db.exec('COMMIT');
        }
    } finally {
        db.close();
    }
}

let snapshot = null;
let snapshotAt = 0;

/**
 * Returns the current snapshot, refreshing it once the sync interval has passed.
 * Throws (after dropping any cached copy) when the database cannot be read or
 * validated - callers fail closed.
 */
function getSnapshot() {
    const now = Date.now();
    if (snapshot && now - snapshotAt < syncTtlMs()) return snapshot;
    snapshot = null; // never serve a stale copy past its interval
    const config = resolveConfig();
    if (config.mode !== 'integration' || !config.dbPath) {
        throw new Error('Admin integration is not enabled.');
    }
    const fresh = readSnapshot(config.dbPath);
    snapshot = fresh;
    snapshotAt = now;
    return fresh;
}

/** Drops the cached snapshot (tests; forces the next call to re-read). */
function resetSnapshot() {
    snapshot = null;
    snapshotAt = 0;
}

/* -- User lookup (reads the snapshot) ------------------------------------- */

/** Admin-shaped user row, or null when absent, invalid or not active. */
function activeUserRow(user) {
    if (!user || !user.valid || user.status !== 'active') return null;
    return {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status,
        password_hash: user.passwordHash,
        locked_until: user.lockedUntil,
        pwFingerprint: user.pwFingerprint,
        sessionsRevokedAt: user.sessionsRevokedAt,
    };
}

/** Finds an active user by username (trimmed, case-insensitive), or null. Throws when unavailable. */
function findActiveUserByUsername(username) {
    const snap = getSnapshot();
    const id = snap.userIdByName.get(String(username || '').trim().toLowerCase());
    return activeUserRow(id === undefined ? null : snap.userById.get(id));
}

/** Finds an active user by id, or null. Throws when unavailable. */
function findActiveUserById(id) {
    return activeUserRow(getSnapshot().userById.get(Number(id)));
}

/** Navbar folders in order ([] in legacy mode). Unfiltered: callers decide access per entry. Throws when unavailable. */
function navFolders() {
    return isIntegrationEnabled() ? getSnapshot().nav : [];
}

/** Logs an integration fault server-side without leaking details to clients. */
function logFault(context, err) {
    logger.error('[admin-integration] ' + context + ': ' + (err && err.message ? err.message : err));
}

module.exports = {
    // configuration
    resolveConfig,
    isIntegrationEnabled,
    validateStartup,
    syncTtlMs,
    // paths
    clientPathOf,
    normalizeClientPath,
    // data
    buildSnapshot,
    getSnapshot,
    resetSnapshot,
    resetForTests: resetSnapshot,
    findActiveUserByUsername,
    findActiveUserById,
    navFolders,
    passwordFingerprint,
    // levels
    LEVELS,
    levelRank,
    DENY,
    // diagnostics
    logFault,
    KNOWN_SCHEMA_VERSION,
    DEFAULT_SYNC_TTL_MS,
};
