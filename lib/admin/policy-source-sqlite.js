/**
 * @file lib/admin/policy-source-sqlite.js
 * @brief Deprecated policy source: reads the admin database file directly.
 *
 * Kept for one release while hosts move to the HTTP contract
 * (lib/admin/policy-source-http.js, isolate-app-roots). It ties the portal to
 * the admin's host, filesystem and schema, which is why it is going away.
 * Returns raw rows only; lib/admin-db.js validates them and builds the snapshot,
 * so both sources feed the same builder.
 */
'use strict';

const { DatabaseSync } = require('node:sqlite');

/** How long a read waits on the admin's write lock before failing (ms). */
const BUSY_TIMEOUT_MS = 2000;

/** First admin schema version with portal_nav_folders (navbar links). */
const NAV_SCHEMA_VERSION = 3;
/** First admin schema version with access levels and user groups. */
const LEVELS_SCHEMA_VERSION = 4;
/** First admin schema version with integration_settings (volume id, release folder, tunables). */
const INTEGRATION_SCHEMA_VERSION = 5;

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

/** integration_settings as a Map (schema >= 5). */
function readSettings(db) {
    return new Map(db.prepare('SELECT key, value FROM integration_settings').all().map((r) => [r.key, r.value]));
}

/**
 * Reads every table the portal needs in one read transaction (consistent snapshot).
 * @param {string} dbPath
 * @param {number} knownVersion Highest schema version this portal understands.
 * @returns {{version:number, rows:object}} rows in the shape admin-db buildSnapshot takes;
 *   `rows.settings` is the raw integration_settings Map, or null below schema v5.
 */
function readRows(dbPath, knownVersion) {
    const db = openReadOnly(dbPath);
    try {
        db.exec('BEGIN');
        try {
            const version = readSchemaVersion(db);
            if (version == null || version > knownVersion) {
                throw new Error('admin schema version ' + version + ' is not supported (expected <= ' + knownVersion + ')');
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
                // Schema < 5 admins have no integration settings: env values apply.
                settings: version >= INTEGRATION_SCHEMA_VERSION ? readSettings(db) : null,
            };
            return { version, rows };
        } finally {
            db.exec('COMMIT');
        }
    } finally {
        db.close();
    }
}

module.exports = {
    readRows, openReadOnly, hasExpectedTables, readSchemaVersion, readSettings,
    NAV_SCHEMA_VERSION, LEVELS_SCHEMA_VERSION, INTEGRATION_SCHEMA_VERSION, BUSY_TIMEOUT_MS,
};
