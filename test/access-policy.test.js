/**
 * @file test/access-policy.test.js
 * @brief Fail-closed checks for the admin file-access integration.
 *
 * Run:  node test/access-policy.test.js
 *
 * No framework: a tiny assert-based runner. Covers legacy vs. misconfigured vs.
 * integration mode, the full decision table (unpublished / locked / access
 * modes / availability window / grants), the admin password adapter, and the
 * startup-validation matrix. Every case that could leak a governed file is
 * asserted to deny.
 */
'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const adminDb = require('../lib/admin-db');
const accessPolicy = require('../lib/access-policy');
const authService = require('../lib/auth-service');

const ANON = { ok: true, user: { anonymous: true } };
const USER = (id) => ({ ok: true, user: { id, username: 'u' + id, role: 'user' } });

const SCHEMA = `
CREATE TABLE schema_migrations (version INTEGER, applied_at INTEGER);
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, role TEXT, status TEXT,
  password_hash TEXT, failed_login_count INTEGER DEFAULT 0, locked_until INTEGER,
  created_at INTEGER, updated_at INTEGER);
CREATE TABLE files (
  id INTEGER PRIMARY KEY AUTOINCREMENT, client_path TEXT NOT NULL,
  is_directory INTEGER DEFAULT 0, created_at INTEGER, updated_at INTEGER);
CREATE TABLE file_access_policies (
  file_id INTEGER PRIMARY KEY, access_mode TEXT, is_published INTEGER,
  is_locked INTEGER, available_from INTEGER, available_until INTEGER,
  created_at INTEGER, updated_at INTEGER);
CREATE TABLE user_file_permissions (
  file_id INTEGER, user_id INTEGER, permission TEXT);
`;

/** Builds an admin-shaped SQLite file with one row per governed path. */
function buildFixture(schemaVersion = 2) {
    const dir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'afm-portal-'));
    const dbPath = path.join(dir, 'admin.sqlite');
    const now = Date.now();
    const db = new DatabaseSync(dbPath);
    db.exec(SCHEMA);
    db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?,?)').run(schemaVersion, now);
    db.prepare('INSERT INTO users (id,username,role,status,password_hash) VALUES (1,?,?,?,?)').run('admin', 'admin', 'active', 'x');
    db.prepare('INSERT INTO users (id,username,role,status,password_hash) VALUES (2,?,?,?,?)').run('erfan', 'user', 'active', 'x');

    const file = (id, clientPath) =>
        db.prepare('INSERT INTO files (id,client_path,is_directory,created_at,updated_at) VALUES (?,?,0,?,?)')
            .run(id, clientPath, now, now);
    const policy = (fileId, { mode = 'public', published = 1, locked = 0, from = null, until = null } = {}) =>
        db.prepare('INSERT INTO file_access_policies (file_id,access_mode,is_published,is_locked,available_from,available_until,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)')
            .run(fileId, mode, published, locked, from, until, now, now);

    file(1, '/Downloads/locked-public');   policy(1, { mode: 'public', locked: 1 });
    file(2, '/Downloads/authed');          policy(2, { mode: 'authenticated' });
    file(3, '/Downloads/restricted-deny'); policy(3, { mode: 'restricted' });
    file(4, '/Downloads/expired');         policy(4, { mode: 'authenticated', until: now - 1000 });
    file(5, '/Downloads/unpublished');     policy(5, { mode: 'public', published: 0 });
    file(6, '/Downloads/granted');         policy(6, { mode: 'restricted' });
    file(7, '/Downloads/future');          policy(7, { mode: 'public', from: now + 3600000 });

    db.prepare('INSERT INTO user_file_permissions (file_id,user_id,permission) VALUES (6,2,?)').run('grant');
    db.prepare('INSERT INTO user_file_permissions (file_id,user_id,permission) VALUES (3,2,?)').run('deny');
    db.close();
    return { dir, dbPath };
}

/** Sets/deletes the integration env vars without leaking between phases. */
function setEnv({ enabled, db, storage, filesRoot, auth }) {
    const put = (key, value) => {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    };
    put('ADMIN_INTEGRATION_ENABLED', enabled);
    put('ADMIN_DB_PATH', db);
    put('ADMIN_STORAGE_ROOT', storage);
    put('FILES_ROOT', filesRoot);
    put('AUTH_ENABLED', auth);
    adminDb.resetForTests();
}

/* ─────────────────────────────── tiny runner ────────────────────────────── */
let passed = 0, failed = 0;
async function test(name, fn) {
    try { await fn(); console.log('  ok   ' + name); passed++; }
    catch (err) { console.error('FAIL   ' + name + '\n       ' + (err && err.message)); failed++; }
}

(async function main() {
    console.log('\nadmin file-access policy — fail-closed checks\n');

    const { dir, dbPath } = buildFixture();
    const storage = path.join(dir, 'storage');
    const filesRoot = path.join(storage, 'Downloads');
    fs.mkdirSync(filesRoot, { recursive: true });

    /* ── 1. Legacy mode (backward compatible) ──────────────────────────────── */
    setEnv({});
    await test('legacy: neither variable set resolves to legacy mode', () => {
        const config = adminDb.resolveConfig(process.cwd());
        assert.strictEqual(config.mode, 'legacy');
        assert.deepStrictEqual(config.problems, []);
    });
    await test('legacy: authorize allows everything', () => {
        assert.strictEqual(accessPolicy.authorize('secret', ANON).allowed, true);
    });
    await test('legacy: validateStartup reports nothing', () => {
        assert.deepStrictEqual(adminDb.validateStartup(process.cwd()), []);
    });

    /* ── 2. Misconfiguration is refused, never legacy ──────────────────────── */
    await test('ADMIN_DB_PATH without intent is refused', () => {
        setEnv({ db: dbPath });
        assert.ok(adminDb.validateStartup(process.cwd()).length > 0);
    });
    await test('intent without ADMIN_DB_PATH is refused', () => {
        setEnv({ enabled: 'true' });
        assert.ok(adminDb.validateStartup(process.cwd()).length > 0);
    });
    await test('explicit false with ADMIN_DB_PATH is refused', () => {
        setEnv({ enabled: 'false', db: dbPath });
        assert.ok(adminDb.validateStartup(process.cwd()).length > 0);
    });
    await test('missing DB file is refused', () => {
        setEnv({ enabled: 'true', db: path.join(dir, 'nope.sqlite'), storage, filesRoot, auth: 'true' });
        assert.ok(adminDb.validateStartup(process.cwd()).length > 0);
    });
    await test('a non-admin SQLite file is refused', () => {
        const bogus = path.join(dir, 'bogus.sqlite');
        const db = new DatabaseSync(bogus); db.exec('CREATE TABLE t (x)'); db.close();
        setEnv({ enabled: 'true', db: bogus, storage, filesRoot, auth: 'true' });
        assert.ok(adminDb.validateStartup(process.cwd()).some(p => p.includes('admin database')));
    });
    await test('a newer schema version is refused', () => {
        const newer = buildFixture(3);
        setEnv({ enabled: 'true', db: newer.dbPath, storage: newer.dir, filesRoot: path.join(newer.dir, 'Downloads'), auth: 'true' });
        assert.ok(adminDb.validateStartup(process.cwd()).some(p => p.includes('newer')));
    });
    await test('AUTH_ENABLED=false with integration is refused', () => {
        setEnv({ enabled: 'true', db: dbPath, storage, filesRoot, auth: 'false' });
        assert.ok(adminDb.validateStartup(process.cwd()).length > 0);
    });
    await test('FILES_ROOT outside ADMIN_STORAGE_ROOT is refused', () => {
        setEnv({ enabled: 'true', db: dbPath, storage: path.join(dir, 'elsewhere'), filesRoot, auth: 'true' });
        assert.ok(adminDb.validateStartup(process.cwd()).length > 0);
    });

    /* ── 2. Integration mode: the decision table ───────────────────────────── */
    setEnv({ enabled: 'true', db: dbPath, storage, filesRoot, auth: 'true' });

    await test('valid integration config passes startup validation', () => {
        assert.deepStrictEqual(adminDb.validateStartup(process.cwd()), []);
    });
    await test('path mapping builds the admin client path', () => {
        assert.strictEqual(adminDb.toAdminClientPath('a/b'), '/Downloads/a/b');
    });
    await test('ungoverned path is public', () => {
        assert.strictEqual(accessPolicy.authorize('unknown', ANON).allowed, true);
    });
    await test('locked public: anonymous challenged, user allowed', () => {
        assert.strictEqual(accessPolicy.authorize('locked-public', ANON).challenge, true);
        assert.strictEqual(accessPolicy.authorize('locked-public', USER(2)).allowed, true);
    });
    await test('authenticated: anonymous challenged, user allowed', () => {
        assert.strictEqual(accessPolicy.authorize('authed', ANON).challenge, true);
        assert.strictEqual(accessPolicy.authorize('authed', USER(2)).allowed, true);
    });
    await test('restricted without a grant is denied (no challenge)', () => {
        const d = accessPolicy.authorize('granted', USER(1));
        assert.strictEqual(d.allowed, false);
        assert.strictEqual(d.challenge, undefined);
    });
    await test('restricted with a grant is allowed', () => {
        assert.strictEqual(accessPolicy.authorize('granted', USER(2)).allowed, true);
    });
    await test('an explicit deny overrides nothing extra but denies', () => {
        assert.strictEqual(accessPolicy.authorize('restricted-deny', USER(2)).allowed, false);
    });
    await test('unpublished is denied to everyone', () => {
        assert.strictEqual(accessPolicy.authorize('unpublished', ANON).allowed, false);
        assert.strictEqual(accessPolicy.authorize('unpublished', USER(2)).allowed, false);
    });
    await test('an expired window denies', () => {
        assert.strictEqual(accessPolicy.authorize('expired', USER(2)).allowed, false);
    });
    await test('a not-yet-open window denies', () => {
        assert.strictEqual(accessPolicy.authorize('future', ANON).allowed, false);
    });
    await test('filterVisible hides governed entries from anonymous', () => {
        const entries = [{ path: 'locked-public' }, { path: 'unknown' }, { path: 'granted' }, { path: 'unpublished' }];
        assert.deepStrictEqual(accessPolicy.filterVisible(entries, ANON).map(e => e.path), ['unknown']);
    });
    await test('filterVisible keeps a granted entry for its user', () => {
        const entries = [{ path: 'granted' }, { path: 'restricted-deny' }];
        assert.deepStrictEqual(accessPolicy.filterVisible(entries, USER(2)).map(e => e.path), ['granted']);
    });

    if (process.platform === 'win32') {
        await test('policy lookup is case-insensitive on Windows', () => {
            assert.strictEqual(accessPolicy.authorize('LOCKED-PUBLIC', USER(2)).allowed, true);
        });
    }

    /* ── 3. Admin password adapter ─────────────────────────────────────────── */
    await test('admin password adapter accepts the admin hash format', () => {
        const salt = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
        const stored = salt + ':' + require('crypto').scryptSync('hunter2', salt, 64).toString('hex');
        assert.strictEqual(authService.verifyAdminPassword('hunter2', stored), true);
        assert.strictEqual(authService.verifyAdminPassword('wrong', stored), false);
    });
    await test('verifyPassword dispatches the admin hash format', async () => {
        const salt = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
        const stored = salt + ':' + require('crypto').scryptSync('hunter2', salt, 64).toString('hex');
        assert.strictEqual(await authService.verifyPassword('hunter2', stored), true);
        assert.strictEqual(await authService.verifyPassword('nope', stored), false);
    });

    /* ── restore a neutral environment ─────────────────────────────────────── */
    setEnv({});

    console.log('\n' + passed + ' passed, ' + failed + ' failed\n');
    if (failed) process.exitCode = 1;
})();
