/**
 * @file test/helpers/admin-fixture.js
 * @brief Temp admin.sqlite + FILES_ROOT + in-process portal for integration tests.
 *
 * The schema SQL and password hashing below are copied verbatim from the
 * Admin Files Manager (D:\Projects\Admin-Files-Manager-fixed @ 856a64c:
 * src/db/schema.js MIGRATIONS v1+v2, src/utils/crypto.js hashPassword), so the
 * portal is tested against the real admin shape, not a look-alike. Mutations
 * open, write and close the DB each time, like the admin's own single writer.
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const ADMIN_SCHEMA_SQL = `
CREATE TABLE schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at INTEGER NOT NULL
);

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    email TEXT UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin','user')) DEFAULT 'user',
    status TEXT NOT NULL CHECK (status IN ('active','disabled')) DEFAULT 'active',
    failed_login_count INTEGER NOT NULL DEFAULT 0,
    locked_until INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_hash TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    csrf_secret TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    revoked_at INTEGER,
    ip TEXT,
    user_agent TEXT
);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    outcome TEXT NOT NULL CHECK (outcome IN ('success','failure')),
    target_type TEXT,
    target_id INTEGER,
    detail TEXT,
    ip TEXT,
    user_agent TEXT,
    created_at INTEGER NOT NULL
);
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

CREATE TABLE files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_path TEXT NOT NULL UNIQUE,
    is_directory INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE file_access_policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL UNIQUE REFERENCES files(id) ON DELETE CASCADE,
    access_mode TEXT NOT NULL CHECK (access_mode IN ('public','authenticated','restricted')) DEFAULT 'restricted',
    is_published INTEGER NOT NULL DEFAULT 0,
    is_locked INTEGER NOT NULL DEFAULT 0,
    available_from INTEGER,
    available_until INTEGER,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE user_file_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission TEXT NOT NULL CHECK (permission IN ('grant','deny')),
    granted_by INTEGER REFERENCES users(id),
    created_at INTEGER NOT NULL,
    UNIQUE (file_id, user_id)
);
CREATE INDEX idx_ufp_user_id ON user_file_permissions(user_id);
`;

/** Admin's hashPassword (src/utils/crypto.js): "saltHex:hashHex", salt used as a string. */
function adminHashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

/**
 * Creates a fixture. `tree` maps portal-relative file paths to contents;
 * folders are created as needed (FILES_ROOT needs at least one category folder).
 */
function createFixture({ tree = { 'docs/readme.txt': 'hello' } } = {}) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-admin-'));
    const filesRoot = path.join(dir, 'storage');
    const dbPath = path.join(dir, 'admin.sqlite');

    for (const [rel, content] of Object.entries(tree)) {
        const abs = path.join(filesRoot, ...rel.split('/'));
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, content);
    }
    fs.mkdirSync(filesRoot, { recursive: true });

    const write = (fn) => {
        const db = new DatabaseSync(dbPath);
        try { db.exec('PRAGMA foreign_keys = ON;'); return fn(db); } finally { db.close(); }
    };

    write((db) => {
        db.exec(ADMIN_SCHEMA_SQL);
        const now = Date.now();
        db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (1, ?), (2, ?)').run(now, now);
    });

    const fileId = (db, clientPath, isDirectory) => {
        const row = db.prepare('SELECT id FROM files WHERE client_path = ?').get(clientPath);
        if (row) return row.id;
        const now = Date.now();
        return Number(db.prepare('INSERT INTO files (client_path, is_directory, created_at, updated_at) VALUES (?, ?, ?, ?)')
            .run(clientPath, isDirectory ? 1 : 0, now, now).lastInsertRowid);
    };

    const fixture = {
        dir, filesRoot, dbPath,

        /** Inserts a user the way the admin does; returns its id. */
        addUser({ username, password = 'password123', role = 'user', status = 'active', lockedUntil = null }) {
            return write((db) => {
                const now = Date.now();
                return Number(db.prepare(
                    'INSERT INTO users (username, password_hash, role, status, locked_until, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
                ).run(username, adminHashPassword(password), role, status, lockedUntil, now, now).lastInsertRowid);
            });
        },

        /** Updates user columns (status, password, locked_until) like the admin's repository. */
        updateUser(id, { status, password, lockedUntil }) {
            write((db) => {
                const now = Date.now();
                if (status !== undefined) db.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);
                if (password !== undefined) db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(adminHashPassword(password), now, id);
                if (lockedUntil !== undefined) db.prepare('UPDATE users SET locked_until = ?, updated_at = ? WHERE id = ?').run(lockedUntil, now, id);
            });
        },

        /** What the admin's "Revoke sessions" does (users.controller.js revokeSessions). */
        revokeSessions(id, { at = Date.now(), outcome = 'success' } = {}) {
            write((db) => {
                db.prepare('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL').run(at, id);
                db.prepare(
                    "INSERT INTO audit_logs (actor_id, action, outcome, target_type, target_id, created_at) VALUES (NULL, 'user.revoke_sessions', ?, 'user', ?, ?)"
                ).run(outcome, id, at);
            });
        },

        deleteUser(id) {
            write((db) => db.prepare('DELETE FROM users WHERE id = ?').run(id));
        },

        /** Upserts a policy on an admin client path ("/a/b"); returns the files.id. */
        setPolicy(clientPath, { mode = 'public', published = 1, locked = 0, from = null, until = null, isDirectory = false } = {}) {
            return write((db) => {
                const id = fileId(db, clientPath, isDirectory);
                const now = Date.now();
                db.prepare(
                    `INSERT INTO file_access_policies (file_id, access_mode, is_published, is_locked, available_from, available_until, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                     ON CONFLICT(file_id) DO UPDATE SET access_mode = excluded.access_mode, is_published = excluded.is_published,
                       is_locked = excluded.is_locked, available_from = excluded.available_from,
                       available_until = excluded.available_until, updated_at = excluded.updated_at`
                ).run(id, mode, published, locked, from, until, now, now);
                return id;
            });
        },

        /** Deletes only the policy row, leaving files + permission rows (admin deletePolicy). */
        deletePolicy(clientPath) {
            write((db) => db.prepare(
                'DELETE FROM file_access_policies WHERE file_id = (SELECT id FROM files WHERE client_path = ?)'
            ).run(clientPath));
        },

        /** Sets a grant/deny for a user on a governed path (null revokes). */
        setPermission(clientPath, userId, permission) {
            write((db) => {
                const id = fileId(db, clientPath, false);
                db.prepare('DELETE FROM user_file_permissions WHERE file_id = ? AND user_id = ?').run(id, userId);
                if (permission) {
                    db.prepare('INSERT INTO user_file_permissions (file_id, user_id, permission, created_at) VALUES (?, ?, ?, ?)')
                        .run(id, userId, permission, Date.now());
                }
            });
        },

        /**
         * Replaces the admin navbar folders (admin PortalNavService.set). The
         * first call applies admin migration 3 (portal_nav_folders) verbatim.
         * `folders`: [{ path: '/a', label?, hideFromHome? }] in order.
         */
        setNav(folders) {
            write((db) => {
                if (!db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'portal_nav_folders'").get()) {
                    db.exec(`CREATE TABLE portal_nav_folders (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        client_path TEXT NOT NULL UNIQUE,
                        label TEXT,
                        position INTEGER NOT NULL,
                        hide_from_home INTEGER NOT NULL DEFAULT 0 CHECK (hide_from_home IN (0,1)),
                        created_at INTEGER NOT NULL,
                        updated_at INTEGER NOT NULL
                    );`);
                    db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (3, ?)').run(Date.now());
                }
                db.exec('DELETE FROM portal_nav_folders');
                const now = Date.now();
                folders.forEach((f, i) => db.prepare(
                    'INSERT INTO portal_nav_folders (client_path, label, position, hide_from_home, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
                ).run(f.path, f.label || null, i, f.hideFromHome ? 1 : 0, now, now));
            });
        },

        /** Raw write access. */
        exec(sql, ...params) {
            return write((db) => db.prepare(sql).run(...params));
        },

        /** Raw write with the admin's CHECK constraints off, to plant invalid rows. */
        execUnchecked(sql, ...params) {
            return write((db) => {
                db.exec('PRAGMA ignore_check_constraints = ON;');
                return db.prepare(sql).run(...params);
            });
        },

        /**
         * Points the portal at this fixture and starts it in-process on an
         * ephemeral port. `env` overrides/extends the integration variables.
         */
        async start(env = {}) {
            applyEnv({
                ADMIN_INTEGRATION_ENABLED: 'true',
                ADMIN_DB_PATH: dbPath,
                FILES_ROOT: filesRoot,
                RELEASE_PVM: undefined,
                AUTH_ENABLED: 'true',
                AUTH_JWT_SECRET: 'test-secret-'.padEnd(48, 'x'),
                AUTH_SESSION_MINUTES: '30',
                ...env,
            });
            require('../../lib/admin-db').resetForTests();
            const apiRouter = require('../../lib/api-router');
            const projectRoot = path.resolve(__dirname, '..', '..');
            const server = http.createServer((req, res) => apiRouter.handleRequest(req, res, projectRoot, 0));
            await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
            const base = `http://127.0.0.1:${server.address().port}`;
            fixture.server = server;
            fixture.base = base;
            return base;
        },

        async stop() {
            if (fixture.server) await new Promise((resolve) => fixture.server.close(resolve));
            fixture.server = null;
        },

        /** Removes the temp directory (call after stop). */
        cleanup() {
            fs.rmSync(dir, { recursive: true, force: true });
        },
    };
    return fixture;
}

/** Sets or deletes env vars; `undefined` deletes. */
function applyEnv(vars) {
    for (const [key, value] of Object.entries(vars)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
}

let ipCounter = 0;

/**
 * Minimal HTTP client with a cookie jar per "browser". Each request gets its own
 * X-Forwarded-For so the portal's per-IP rate limiter never trips in a suite.
 */
function client(base) {
    let cookie = '';
    async function request(method, urlPath, body) {
        const headers = { 'x-forwarded-for': `10.0.${(ipCounter >> 8) & 255}.${ipCounter++ & 255}` };
        if (cookie) headers.cookie = cookie;
        if (body !== undefined) headers['content-type'] = 'application/json';
        const res = await fetch(base + urlPath, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
        const setCookie = res.headers.get('set-cookie');
        if (setCookie) cookie = setCookie.split(';')[0];
        const buf = Buffer.from(await res.arrayBuffer());
        let json;
        try { json = JSON.parse(buf.toString('utf8')); } catch { json = undefined; }
        return { status: res.status, headers: res.headers, body: buf, json };
    }
    return {
        get: (p) => request('GET', p),
        head: (p) => request('HEAD', p),
        post: (p, body) => request('POST', p, body),
        login: (username, password) => request('POST', '/api/auth/login', { username, password }),
        get cookie() { return cookie; },
        set cookie(v) { cookie = v; },
    };
}

module.exports = { createFixture, client, adminHashPassword, applyEnv, ADMIN_SCHEMA_SQL };
