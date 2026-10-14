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
 * Mode is decided by an explicit intent/resource handshake (docs/
 * integration-admin-files-manager.md §9):
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
 * The only way to reach legacy mode is to configure neither variable, so a
 * forgotten flag can never silently turn governed files public.
 *
 * @version     1.0.0
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const logger = require('./logger');

/** Highest admin schema version this release understands (src/db/schema.js). */
const KNOWN_SCHEMA_VERSION = 2;

/** Snapshot TTL for the tiny policy/permission tables (ms). */
const SNAPSHOT_TTL_MS = 5000;

/* ─────────────────────────────────────────────────────────────────────────────
 * CONFIGURATION
 * ───────────────────────────────────────────────────────────────────────────── */

/** Parses a boolean env value; returns undefined when the variable is unset. */
function parseBool(raw) {
    if (raw === undefined || raw === null || String(raw).trim() === '') return undefined;
    const v = String(raw).trim().toLowerCase();
    return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}

/** Reads the raw integration intent + resource from the environment. */
function readIntent() {
    const enabledRaw = process.env.ADMIN_INTEGRATION_ENABLED;
    const enabled = parseBool(enabledRaw);
    const dbPathRaw = String(process.env.ADMIN_DB_PATH || '').trim();
    return { enabledRaw, enabled, dbPath: dbPathRaw, dbSet: dbPathRaw !== '' };
}

/**
 * Resolves the integration mode from the environment.
 * @returns {{mode:'legacy'|'integration', dbPath?:string|null, problems:string[]}}
 */
function resolveConfig(projectRoot) {
    const { enabledRaw, enabled, dbPath, dbSet } = readIntent();
    const problems = [];

    // Both unset -> intentional legacy mode.
    if (enabledRaw === undefined && !dbSet) {
        return { mode: 'legacy', dbPath: null, problems: [] };
    }
    // Explicitly disabled and no resource -> legacy.
    if (enabled === false && !dbSet) {
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

    const resolvedDb = path.isAbsolute(dbPath) ? path.resolve(dbPath) : path.resolve(projectRoot, dbPath);
    return { mode: 'integration', dbPath: resolvedDb, problems: [] };
}

/** True when admin-driven integration is configured. */
function isIntegrationEnabled() {
    return resolveConfig(process.cwd()).mode === 'integration';
}

/* ─────────────────────────────────────────────────────────────────────────────
 * PATH MAPPING - portal relPath <-> admin client_path
 * ───────────────────────────────────────────────────────────────────────────── */

/**
 * Computes the POSIX relationship between the admin STORAGE_ROOT and this
 * portal's FILES_ROOT, i.e. how the portal root is addressed inside admin paths.
 * @returns {{prefix:string, storageRoot:string, filesRoot:string}|{error:string}}
 */
function resolveMapping() {
    const storageRootRaw = String(process.env.ADMIN_STORAGE_ROOT || '').trim();
    const filesRootRaw = String(process.env.FILES_ROOT || '').trim();
    if (!storageRootRaw) return { error: 'ADMIN_STORAGE_ROOT is not set.' };
    if (!filesRootRaw) return { error: 'FILES_ROOT is not set.' };

    const storageRoot = path.resolve(storageRootRaw);
    const filesRoot = path.resolve(filesRootRaw);

    const rel = path.relative(storageRoot, filesRoot);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
        return { error: 'FILES_ROOT (' + filesRoot + ') is not inside ADMIN_STORAGE_ROOT (' + storageRoot + ').' };
    }
    const prefix = rel.split(path.sep).filter(Boolean).join('/');
    return { prefix, storageRoot, filesRoot };
}

/** Normalizes a path for comparison (slash-normalized; case-insensitive on Windows). */
function normalizeClientPath(clientPath) {
    let p = String(clientPath || '').replace(/\\/g, '/').replace(/\/+/g, '/');
    if (p.length > 1) p = p.replace(/\/+$/, '');
    return process.platform === 'win32' ? p.toLowerCase() : p;
}

/**
 * Maps a portal relative path to the admin client path.
 * @returns {string|null} rooted admin path, or null when mapping is impossible.
 */
function toAdminClientPath(relPath) {
    const mapping = resolveMapping();
    if (mapping.error) return null;
    const parts = String(relPath || '')
        .replace(/\\/g, '/')
        .split('/')
        .map((p) => p.trim())
        .filter(Boolean);
    const all = [mapping.prefix, ...parts].filter(Boolean);
    return '/' + all.join('/');
}

/* ─────────────────────────────────────────────────────────────────────────────
 * STARTUP VALIDATION
 * ───────────────────────────────────────────────────────────────────────────── */

/** Returns true when the SQLite file exposes the expected admin tables. */
function hasExpectedTables(db) {
    try {
        const rows = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        const names = new Set(rows.map((r) => r.name));
        return names.has('users') && names.has('files') && names.has('file_access_policies') &&
            names.has('user_file_permissions') && names.has('schema_migrations');
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
function validateStartup(projectRoot) {
    const config = resolveConfig(projectRoot);
    const problems = [...config.problems];
    if (config.mode !== 'integration') return problems; // legacy: nothing to validate
    if (problems.length) return problems;               // partial config: already unusable

    // AUTH_ENABLED must be on, or governed files could never be opened.
    if (parseBool(process.env.AUTH_ENABLED) !== true) {
        problems.push('ADMIN_INTEGRATION_ENABLED requires AUTH_ENABLED=true ' +
            '(governed files are behind the login gate).');
    }

    // Admin storage root must exist and contain the portal root.
    const storageRootRaw = String(process.env.ADMIN_STORAGE_ROOT || '').trim();
    if (!storageRootRaw) {
        problems.push('ADMIN_STORAGE_ROOT is required when integration is enabled.');
    } else {
        const storageRoot = path.isAbsolute(storageRootRaw)
            ? path.resolve(storageRootRaw) : path.resolve(projectRoot, storageRootRaw);
        let ok = false;
        try { ok = fs.statSync(storageRoot).isDirectory(); } catch { /* missing */ }
        if (!ok) problems.push('ADMIN_STORAGE_ROOT does not exist or is not a directory: ' + storageRoot);
    }

    // DB file must exist, be a regular file, open read-only, and be the admin schema.
    if (!config.dbPath) {
        problems.push('ADMIN_DB_PATH could not be resolved.');
    } else if (!fs.existsSync(config.dbPath) || !fs.statSync(config.dbPath).isFile()) {
        problems.push('ADMIN_DB_PATH does not exist or is not a file: ' + config.dbPath);
    } else {
        try {
            const db = new DatabaseSync(config.dbPath, { readOnly: true, timeout: 2000 });
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
    }

    // Mapping must exist so portal paths can be matched to admin client paths.
    const mapping = resolveMapping();
    if (mapping.error) problems.push(mapping.error);

    return problems;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * READ-ONLY CLIENT
 * ───────────────────────────────────────────────────────────────────────────── */

let dbHandle = null;
let dbHandlePath = null;

/** Opens (or reuses) the read-only admin database handle. */
function getDb() {
    const config = resolveConfig(process.cwd());
    if (config.mode !== 'integration' || !config.dbPath) {
        throw new Error('Admin integration is not enabled.');
    }
    if (dbHandle && dbHandlePath === config.dbPath) return dbHandle;
    if (dbHandle) { try { dbHandle.close(); } catch { /* ignore */ } }
    dbHandle = new DatabaseSync(config.dbPath, { readOnly: true, timeout: 2000 });
    dbHandlePath = config.dbPath;
    return dbHandle;
}

/* -- Policy / permission snapshot (small, short TTL) ---------------------- */

let snapshot = null;
let snapshotAt = 0;

function loadSnapshot(db) {
    const policies = db.prepare(
        'SELECT f.id AS file_id, f.client_path, f.is_directory, ' +
        'p.access_mode, p.is_published, p.is_locked, p.available_from, p.available_until ' +
        'FROM files f JOIN file_access_policies p ON p.file_id = f.id'
    ).all();

    const grants = db.prepare(
        'SELECT file_id, user_id, permission FROM user_file_permissions'
    ).all();

    const policyByPath = new Map();
    for (const row of policies) {
        policyByPath.set(normalizeClientPath(row.client_path), {
            fileId: row.file_id,
            accessMode: row.access_mode,
            isPublished: row.is_published === 1,
            isLocked: row.is_locked === 1,
            availableFrom: row.available_from,
            availableUntil: row.available_until,
        });
    }

    const grantByPair = new Map();
    for (const row of grants) {
        grantByPair.set(row.file_id + ':' + row.user_id, row.permission);
    }

    return { policyByPath, grantByPair };
}

/**
 * Returns the cached policy/permission snapshot, refreshing after TTL.
 * Lets SQLite errors propagate - callers fail closed.
 */
function getSnapshot() {
    const now = Date.now();
    if (snapshot && now - snapshotAt < SNAPSHOT_TTL_MS) return snapshot;
    const fresh = loadSnapshot(getDb());
    snapshot = fresh;
    snapshotAt = now;
    return fresh;
}

/** Drops the cached snapshot (used by tests). */
function resetSnapshot() {
    snapshot = null;
    snapshotAt = 0;
}

/** Closes the handle and clears caches (tests only). */
function resetForTests() {
    resetSnapshot();
    if (dbHandle) { try { dbHandle.close(); } catch { /* ignore */ } }
    dbHandle = null;
    dbHandlePath = null;
}

/* -- User lookup ---------------------------------------------------------- */

/** Finds an active user by username (case-insensitive), or null. */
function findActiveUserByUsername(username) {
    const db = getDb();
    const row = db.prepare(
        'SELECT id, username, role, status, password_hash, locked_until FROM users ' +
        'WHERE username = ? COLLATE NOCASE'
    ).get(String(username || ''));
    if (!row || row.status !== 'active') return null;
    return row;
}

/** Finds an active user by id, or null. */
function findActiveUserById(id) {
    const db = getDb();
    const row = db.prepare(
        'SELECT id, username, role, status FROM users WHERE id = ?'
    ).get(Number(id));
    if (!row || row.status !== 'active') return null;
    return row;
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
    // mapping
    resolveMapping,
    toAdminClientPath,
    normalizeClientPath,
    // data
    getSnapshot,
    resetSnapshot,
    resetForTests,
    findActiveUserByUsername,
    findActiveUserById,
    // diagnostics
    logFault,
    KNOWN_SCHEMA_VERSION,
    SNAPSHOT_TTL_MS,
};
