/**
 * @file test/admin-db.test.js
 * @brief Admin data snapshot: path mapping, row validation, sync interval,
 *        fail-closed refresh, read-only access and startup validation.
 */
'use strict';

const { test, describe, after, beforeEach } = require('node:test');
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createFixture, applyEnv } = require('./helpers/admin-fixture');
const adminDb = require('../lib/admin-db');

const fixtures = [];
function fixture() {
    const fx = createFixture();
    fixtures.push(fx);
    return fx;
}
after(() => fixtures.forEach((fx) => fx.cleanup()));

/** Integration env pointed at a fixture; `extra` overrides. */
function useFixture(fx, extra = {}) {
    applyEnv({
        ADMIN_INTEGRATION_ENABLED: 'true',
        ADMIN_DB_PATH: fx.dbPath,
        FILES_ROOT: fx.filesRoot,
        AUTH_ENABLED: 'true',
        ADMIN_STORAGE_ROOT: undefined,
        ADMIN_SYNC_TTL_MS: '1000',
        ...extra,
    });
    adminDb.resetSnapshot();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fileHash = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

describe('path mapping (same storage root)', () => {
    test('portal relative path maps to /-rooted admin client path', () => {
        assert.strictEqual(adminDb.clientPathOf('a/b'), '/a/b');
        assert.strictEqual(adminDb.clientPathOf(''), '/');
        assert.strictEqual(adminDb.clientPathOf('a\\b\\'), '/a/b');
    });
    test('stored client paths normalize (duplicate and trailing slashes)', () => {
        const n = adminDb.normalizeClientPath('/x//y/');
        assert.strictEqual(n, process.platform === 'win32' ? '/x/y' : '/x/y');
        assert.strictEqual(adminDb.normalizeClientPath('/'), '/');
    });
    if (process.platform === 'win32') {
        test('normalization is case-insensitive on Windows', () => {
            assert.strictEqual(adminDb.normalizeClientPath('/Docs/A.TXT'), '/docs/a.txt');
        });
    }
});

describe('row validation', () => {
    const policy = (over = {}) => ({
        file_id: 1, client_path: '/a', is_directory: 0, access_mode: 'public',
        is_published: 1, is_locked: 0, available_from: null, available_until: null, ...over,
    });
    const validity = (over, permissions = []) =>
        adminDb.buildSnapshot({ users: [], policies: [policy(over)], permissions })
            .policyByPath.values().next().value[0].valid;

    test('a well-formed policy is valid', () => assert.strictEqual(validity({}), true));
    test('unknown access_mode is invalid', () => assert.strictEqual(validity({ access_mode: 'everyone' }), false));
    test('non 0/1 is_published is invalid', () => assert.strictEqual(validity({ is_published: 2 }), false));
    test('non 0/1 is_locked is invalid', () => assert.strictEqual(validity({ is_locked: null }), false));
    test('non-integer window bound is invalid', () => {
        assert.strictEqual(validity({ available_from: 1.5 }), false);
        assert.strictEqual(validity({ available_until: 'tomorrow' }), false);
    });
    test('unrooted client_path is invalid', () => assert.strictEqual(validity({ client_path: 'a' }), false));
    test('a malformed permission row invalidates its file policy', () => {
        assert.strictEqual(validity({}, [{ file_id: 1, user_id: 2, permission: 'maybe' }]), false);
        assert.strictEqual(validity({}, [{ file_id: 9, user_id: 2, permission: 'maybe' }]), true);
    });
    test('grants and denies are indexed by file then user', () => {
        const snap = adminDb.buildSnapshot({
            users: [], policies: [policy()],
            permissions: [{ file_id: 1, user_id: 2, permission: 'grant' }, { file_id: 1, user_id: 3, permission: 'deny' }],
        });
        assert.strictEqual(snap.grants.get(1).get(2), 'grant');
        assert.strictEqual(snap.grants.get(1).get(3), 'deny');
    });
    test('rows that fold to the same key are all kept', () => {
        const snap = adminDb.buildSnapshot({
            users: [],
            policies: [policy({ file_id: 1, client_path: '/a' }), policy({ file_id: 2, client_path: '/a/' })],
            permissions: [],
        });
        assert.strictEqual(snap.policyByPath.get('/a').length, 2);
    });
    test('user with unknown status or role is invalid', () => {
        const base = { id: 1, username: 'u', role: 'user', status: 'active', password_hash: 's:h', locked_until: null };
        const valid = (over) => adminDb.buildSnapshot({ users: [{ ...base, ...over }], policies: [], permissions: [] })
            .userById.get(1).valid;
        assert.strictEqual(valid({}), true);
        assert.strictEqual(valid({ status: 'suspended' }), false);
        assert.strictEqual(valid({ role: 'root' }), false);
        assert.strictEqual(valid({ locked_until: 'soon' }), false);
    });
    test('the latest "Revoke sessions" time is attached; a malformed one invalidates the user', () => {
        const base = { id: 1, username: 'u', role: 'user', status: 'active', password_hash: 's:h', locked_until: null };
        const user = (revocations) => adminDb.buildSnapshot({ users: [base], policies: [], permissions: [], revocations })
            .userById.get(1);
        assert.strictEqual(user([]).sessionsRevokedAt, null);
        assert.strictEqual(user([{ target_id: 1, at: 1234 }]).sessionsRevokedAt, 1234);
        assert.strictEqual(user([{ target_id: 2, at: 1234 }]).sessionsRevokedAt, null);
        assert.strictEqual(user([{ target_id: 1, at: 'later' }]).valid, false);
    });
});

describe('snapshot reads the admin database', () => {
    test('users, policies and grants are loaded; only active valid users are returned', () => {
        const fx = fixture();
        const erfan = fx.addUser({ username: 'Erfan' });
        const off = fx.addUser({ username: 'off', status: 'disabled' });
        fx.setPolicy('/docs', { mode: 'restricted', isDirectory: true });
        fx.setPermission('/docs', erfan, 'grant');
        useFixture(fx);

        const snap = adminDb.getSnapshot();
        assert.strictEqual(snap.policyByPath.get('/docs')[0].accessMode, 'restricted');
        assert.strictEqual(snap.grants.get(snap.policyByPath.get('/docs')[0].fileId).get(erfan), 'grant');
        assert.strictEqual(adminDb.findActiveUserByUsername('  erfan ').id, erfan);
        assert.strictEqual(adminDb.findActiveUserById(erfan).username, 'Erfan');
        assert.strictEqual(adminDb.findActiveUserByUsername('off'), null);
        assert.strictEqual(adminDb.findActiveUserById(off), null);
        assert.strictEqual(adminDb.findActiveUserById(999), null);
    });

    test('a password change alters the user fingerprint', async () => {
        const fx = fixture();
        const id = fx.addUser({ username: 'pw' });
        useFixture(fx);
        const before = adminDb.findActiveUserById(id).pwFingerprint;
        fx.updateUser(id, { password: 'another-password' });
        adminDb.resetSnapshot();
        assert.notStrictEqual(adminDb.findActiveUserById(id).pwFingerprint, before);
    });

    test('reads never modify the admin database file', () => {
        const fx = fixture();
        fx.addUser({ username: 'ro' });
        fx.setPolicy('/x', { mode: 'public' });
        const before = fileHash(fx.dbPath);
        useFixture(fx);
        for (let i = 0; i < 3; i++) { adminDb.resetSnapshot(); adminDb.getSnapshot(); }
        assert.strictEqual(fileHash(fx.dbPath), before);
    });
});

describe('sync interval', () => {
    test('ADMIN_SYNC_TTL_MS defaults to 5000 and is clamped to 1000..60000', () => {
        applyEnv({ ADMIN_SYNC_TTL_MS: undefined });
        assert.strictEqual(adminDb.syncTtlMs(), 5000);
        applyEnv({ ADMIN_SYNC_TTL_MS: 'abc' });
        assert.strictEqual(adminDb.syncTtlMs(), 5000);
        applyEnv({ ADMIN_SYNC_TTL_MS: '10' });
        assert.strictEqual(adminDb.syncTtlMs(), 1000);
        applyEnv({ ADMIN_SYNC_TTL_MS: '999999' });
        assert.strictEqual(adminDb.syncTtlMs(), 60000);
        applyEnv({ ADMIN_SYNC_TTL_MS: '2500' });
        assert.strictEqual(adminDb.syncTtlMs(), 2500);
    });

    test('an admin change is visible after the interval and not before', async () => {
        const fx = fixture();
        fx.setPolicy('/a.txt', { mode: 'public', published: 1 });
        useFixture(fx, { ADMIN_SYNC_TTL_MS: '1000' });
        assert.strictEqual(adminDb.getSnapshot().policyByPath.get('/a.txt')[0].isPublished, true);

        fx.setPolicy('/a.txt', { mode: 'public', published: 0 });
        assert.strictEqual(adminDb.getSnapshot().policyByPath.get('/a.txt')[0].isPublished, true, 'cached within interval');

        await sleep(1100);
        assert.strictEqual(adminDb.getSnapshot().policyByPath.get('/a.txt')[0].isPublished, false, 'refreshed after interval');
    });
});

describe('fail closed', () => {
    test('a database that disappears makes the snapshot unavailable, and it recovers', async () => {
        const fx = fixture();
        fx.setPolicy('/a.txt', { mode: 'public' });
        useFixture(fx, { ADMIN_SYNC_TTL_MS: '1000' });
        adminDb.getSnapshot();

        const moved = fx.dbPath + '.moved';
        fs.renameSync(fx.dbPath, moved);
        await sleep(1100);
        assert.throws(() => adminDb.getSnapshot());
        assert.throws(() => adminDb.getSnapshot(), 'no stale copy is served on the retry either');
        assert.throws(() => adminDb.findActiveUserById(1));

        fs.renameSync(moved, fx.dbPath);
        assert.ok(adminDb.getSnapshot().policyByPath.get('/a.txt'), 'recovers on the next call');
    });

    test('a schema upgraded past v2 at runtime makes the snapshot unavailable', () => {
        const fx = fixture();
        useFixture(fx);
        adminDb.getSnapshot();
        fx.exec('INSERT INTO schema_migrations (version, applied_at) VALUES (3, ?)', Date.now());
        adminDb.resetSnapshot();
        assert.throws(() => adminDb.getSnapshot(), /schema version 3/);
    });
});

describe('configuration', () => {
    beforeEach(() => adminDb.resetSnapshot());

    test('a relative ADMIN_DB_PATH resolves against the project root, not the cwd', () => {
        const fx = fixture();
        const projectRoot = path.resolve(__dirname, '..');
        const relative = path.relative(projectRoot, fx.dbPath);
        useFixture(fx, { ADMIN_DB_PATH: relative });
        const cwd = process.cwd();
        process.chdir(os.tmpdir());
        try {
            assert.strictEqual(adminDb.resolveConfig().dbPath, fx.dbPath);
            assert.ok(adminDb.getSnapshot());
            assert.deepStrictEqual(adminDb.validateStartup(), []);
        } finally {
            process.chdir(cwd);
        }
    });

    test('a valid fixture passes startup validation, ADMIN_STORAGE_ROOT is ignored', () => {
        const fx = fixture();
        useFixture(fx, { ADMIN_STORAGE_ROOT: path.join(os.tmpdir(), 'somewhere-else') });
        assert.deepStrictEqual(adminDb.validateStartup(), []);
    });

    test('startup refuses every unusable configuration', () => {
        const fx = fixture();
        const refused = (env) => {
            useFixture(fx, env);
            return adminDb.validateStartup().length > 0;
        };
        assert.ok(refused({ ADMIN_DB_PATH: undefined }), 'intent without DB');
        assert.ok(refused({ ADMIN_INTEGRATION_ENABLED: undefined }), 'DB without intent');
        assert.ok(refused({ ADMIN_INTEGRATION_ENABLED: 'false' }), 'explicit false with DB');
        assert.ok(refused({ ADMIN_DB_PATH: path.join(fx.dir, 'missing.sqlite') }), 'missing file');
        assert.ok(refused({ AUTH_ENABLED: 'false' }), 'auth disabled');

        const bogus = path.join(fx.dir, 'bogus.sqlite');
        const { DatabaseSync } = require('node:sqlite');
        const db = new DatabaseSync(bogus); db.exec('CREATE TABLE t (x)'); db.close();
        assert.ok(refused({ ADMIN_DB_PATH: bogus }), 'not the admin schema');

        fx.exec('INSERT INTO schema_migrations (version, applied_at) VALUES (3, ?)', Date.now());
        assert.ok(refused({}), 'schema newer than v2');
    });

    test('neither variable set is legacy mode with nothing to validate', () => {
        applyEnv({ ADMIN_INTEGRATION_ENABLED: undefined, ADMIN_DB_PATH: undefined });
        assert.strictEqual(adminDb.resolveConfig().mode, 'legacy');
        assert.deepStrictEqual(adminDb.validateStartup(), []);
    });
});
