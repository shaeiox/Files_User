/**
 * @file test/access-policy.test.js
 * @brief The access decision (allow / locked / hidden / unavailable) over a real
 *        admin-schema database: every policy field, folder inheritance, grants
 *        and denies, invalid data, and the listing projection.
 *        Spec: openspec/changes/enforce-admin-file-policies/specs/file-access-policy.
 */
'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createFixture, applyEnv, client } = require('./helpers/admin-fixture');
const adminDb = require('../lib/admin-db');
const accessPolicy = require('../lib/access-policy');
const authService = require('../lib/auth-service');
const filesService = require('../lib/files-service');

const ANON = { ok: false, reason: 'NO_SESSION' };
const AS = (id, role = 'user') => ({ ok: true, user: { id, username: 'u' + id, role } });

const fx = createFixture({ tree: { 'docs/readme.txt': 'hello', 'docs/locked.txt': 'secret', 'docs/hidden.txt': 'x' } });
let alice, bob, root;
const now = Date.now();
const HOUR = 3600000;

function useFixture() {
    applyEnv({
        ADMIN_INTEGRATION_ENABLED: 'true', ADMIN_DB_PATH: fx.dbPath, FILES_ROOT: fx.filesRoot,
        AUTH_ENABLED: 'true', ADMIN_SYNC_TTL_MS: '60000', RELEASE_PVM: undefined,
    });
    adminDb.resetSnapshot();
}
const decide = (rel, session) => accessPolicy.decide(rel, session).result;

before(() => {
    alice = fx.addUser({ username: 'alice' });
    bob = fx.addUser({ username: 'bob' });
    root = fx.addUser({ username: 'root', role: 'admin' });

    // Decision table: one file per (mode, locked) pair, published and in window.
    for (const mode of ['public', 'authenticated', 'restricted']) {
        for (const locked of [0, 1]) {
            const p = `/table/${mode}-${locked}`;
            fx.setPolicy(p, { mode, locked });
            fx.setPermission(p, bob, 'grant');
        }
    }

    fx.setPolicy('/unpub-locked', { mode: 'authenticated', locked: 1, published: 0 });
    fx.setPolicy('/unpub-granted', { mode: 'restricted', published: 0 });
    fx.setPermission('/unpub-granted', bob, 'grant');

    fx.setPolicy('/window/future', { mode: 'public', from: now + HOUR });
    fx.setPolicy('/window/expired', { mode: 'public', until: now - HOUR });
    fx.setPolicy('/window/open-ended', { mode: 'public', from: now - HOUR });
    fx.setPolicy('/window/granted-expired', { mode: 'restricted', until: now - HOUR });
    fx.setPermission('/window/granted-expired', bob, 'grant');

    fx.setPolicy('/deny/public', { mode: 'public' });
    fx.setPermission('/deny/public', alice, 'deny');
    fx.setPolicy('/deny/authed', { mode: 'authenticated' });
    fx.setPermission('/deny/authed', alice, 'deny');
    fx.setPolicy('/team', { mode: 'public', isDirectory: true });
    fx.setPermission('/team', alice, 'deny');

    fx.setPolicy('/private', { mode: 'public', published: 0, isDirectory: true });
    fx.setPolicy('/tools', { mode: 'public', isDirectory: true });
    fx.setPolicy('/tools/x.exe', { mode: 'authenticated' });
    fx.setPolicy('/beta', { mode: 'public', locked: 1, isDirectory: true });
    fx.setPolicy('/beta/c.iso', { mode: 'restricted' });
    fx.setPolicy('/beta/self-locked', { mode: 'public', locked: 1 });

    fx.setPolicy('/granted', { mode: 'restricted', isDirectory: true });
    fx.setPermission('/granted', bob, 'grant');
    fx.setPolicy('/granted/secret.pdf', { mode: 'restricted' });

    fx.setPolicy('/folder-as-file', { mode: 'authenticated', isDirectory: false });

    fx.setPolicy('/removed', { mode: 'restricted' });
    fx.setPermission('/removed', alice, 'deny');
    fx.deletePolicy('/removed');

    fx.setPolicy('/Docs/Mixed.TXT', { mode: 'authenticated' });

    fx.setPolicy('/docs/locked.txt', { mode: 'public', locked: 1 });
    fx.setPolicy('/docs/hidden.txt', { mode: 'public', published: 0 });
    fx.setPolicy('/invalid', { mode: 'public' });
    fx.execUnchecked("UPDATE file_access_policies SET access_mode = 'everyone' WHERE file_id = (SELECT id FROM files WHERE client_path = '/invalid')");
    useFixture();
});
after(async () => { await fx.stop(); fx.cleanup(); });

describe('decision table (published, in window)', () => {
    const expected = {
        'public-0': ['allow', 'allow', 'allow'],
        'public-1': ['locked', 'allow', 'allow'],
        'authenticated-0': ['hidden', 'allow', 'allow'],
        'authenticated-1': ['locked', 'allow', 'allow'],
        'restricted-0': ['hidden', 'hidden', 'allow'],
        'restricted-1': ['locked', 'hidden', 'allow'],
    };
    for (const [name, [anon, noRow, granted]] of Object.entries(expected)) {
        test(`${name}: anonymous=${anon}, logged in=${noRow}, granted=${granted}`, () => {
            assert.strictEqual(decide(`table/${name}`, ANON), anon);
            assert.strictEqual(decide(`table/${name}`, AS(alice)), noRow);
            assert.strictEqual(decide(`table/${name}`, AS(bob)), granted);
        });
    }
    test('an anonymous session object without a user id is anonymous', () => {
        assert.strictEqual(decide('table/authenticated-0', { ok: true, user: { anonymous: true } }), 'hidden');
    });
});

describe('publication', () => {
    test('unpublished beats locked: hidden from everyone', () => {
        for (const s of [ANON, AS(alice), AS(bob), AS(root, 'admin')]) assert.strictEqual(decide('unpub-locked', s), 'hidden');
    });
    test('a grant does not reveal an unpublished file', () => {
        assert.strictEqual(decide('unpub-granted', AS(bob)), 'hidden');
    });
});

describe('availability window', () => {
    test('not yet available is hidden', () => assert.strictEqual(decide('window/future', AS(alice)), 'hidden'));
    test('expired is hidden', () => assert.strictEqual(decide('window/expired', AS(alice)), 'hidden'));
    test('open-ended window does not hide', () => assert.strictEqual(decide('window/open-ended', ANON), 'allow'));
    test('a grant does not override the window', () => assert.strictEqual(decide('window/granted-expired', AS(bob)), 'hidden'));
    test('bounds are inclusive', () => {
        const policy = { valid: true, isPublished: true, isLocked: false, accessMode: 'public', fileId: 1, availableFrom: 100, availableUntil: 200 };
        const grants = new Map();
        assert.strictEqual(accessPolicy.evaluate(policy, grants, null, 100), 'allow');
        assert.strictEqual(accessPolicy.evaluate(policy, grants, null, 200), 'allow');
        assert.strictEqual(accessPolicy.evaluate(policy, grants, null, 99), 'hidden');
        assert.strictEqual(accessPolicy.evaluate(policy, grants, null, 201), 'hidden');
    });
});

describe('grants and denies', () => {
    test('deny on a public file hides it from that user only', () => {
        assert.strictEqual(decide('deny/public', AS(alice)), 'hidden');
        assert.strictEqual(decide('deny/public', AS(bob)), 'allow');
        assert.strictEqual(decide('deny/public', ANON), 'allow');
    });
    test('deny on an authenticated file hides it from that user', () => {
        assert.strictEqual(decide('deny/authed', AS(alice)), 'hidden');
        assert.strictEqual(decide('deny/authed', AS(bob)), 'allow');
    });
    test('deny on a folder hides everything inside from that user', () => {
        assert.strictEqual(decide('team', AS(alice)), 'hidden');
        assert.strictEqual(decide('team/notes/a.pdf', AS(alice)), 'hidden');
        assert.strictEqual(decide('team/notes/a.pdf', AS(bob)), 'allow');
    });
    test('a grant on a restricted folder covers ungoverned contents', () => {
        assert.strictEqual(decide('granted/a.pdf', AS(bob)), 'allow');
        assert.strictEqual(decide('granted/a.pdf', AS(alice)), 'hidden');
    });
    test('a restricted child with its own policy needs its own grant', () => {
        assert.strictEqual(decide('granted/secret.pdf', AS(bob)), 'hidden');
    });
    test('a deleted policy is ungoverned and its leftover deny is ignored', () => {
        assert.strictEqual(decide('removed', AS(alice)), 'allow');
    });
    test('admin role gets no bypass', () => {
        assert.strictEqual(decide('table/restricted-0', AS(root, 'admin')), 'hidden');
    });
});

describe('folder policies apply to everything inside', () => {
    test('a file inside an unpublished folder is hidden from everyone', () => {
        assert.strictEqual(decide('private/a.iso', ANON), 'hidden');
        assert.strictEqual(decide('private/deep/b.iso', AS(bob)), 'hidden');
    });
    test('a stricter child policy wins over a public folder', () => {
        assert.strictEqual(decide('tools/x.exe', ANON), 'hidden');
        assert.strictEqual(decide('tools/x.exe', AS(alice)), 'allow');
        assert.strictEqual(decide('tools/y.exe', ANON), 'allow');
    });
    test('a file inside a locked folder is locked (inherited) when anonymous', () => {
        assert.deepStrictEqual(accessPolicy.decide('beta/b.iso', ANON), { result: 'locked', origin: 'inherited' });
        assert.deepStrictEqual(accessPolicy.decide('beta', ANON), { result: 'locked', origin: 'self' });
        assert.strictEqual(decide('beta/b.iso', AS(alice)), 'allow');
    });
    test('a self-locked file inside a locked folder is still inherited', () => {
        assert.deepStrictEqual(accessPolicy.decide('beta/self-locked', ANON), { result: 'locked', origin: 'inherited' });
    });
    test('a restricted ungranted file inside a locked folder is hidden', () => {
        assert.strictEqual(decide('beta/c.iso', ANON), 'hidden');
        assert.strictEqual(decide('beta/c.iso', AS(alice)), 'hidden');
    });
    test('a folder recorded with is_directory = 0 still governs its contents', () => {
        assert.strictEqual(decide('folder-as-file/inside.txt', ANON), 'hidden');
        assert.strictEqual(decide('folder-as-file/inside.txt', AS(alice)), 'allow');
    });
    test('a policy on "/" governs the whole tree', () => {
        fx.setPolicy('/', { mode: 'authenticated', isDirectory: true });
        adminDb.resetSnapshot();
        try {
            assert.strictEqual(decide('anything/at/all.txt', ANON), 'hidden');
            assert.strictEqual(decide('', AS(alice)), 'allow');
        } finally {
            fx.exec("DELETE FROM files WHERE client_path = '/'");
            adminDb.resetSnapshot();
        }
    });
    test('ungoverned paths are allowed', () => {
        assert.strictEqual(decide('nothing/here.txt', ANON), 'allow');
    });
});

describe('matching and invalid data', () => {
    test('portal paths are matched with slashes normalized', () => {
        assert.strictEqual(decide('table//authenticated-0/', ANON), 'hidden');
        assert.strictEqual(decide('table\\authenticated-0', ANON), 'hidden');
    });
    if (process.platform === 'win32') {
        test('matching is case-insensitive on Windows', () => {
            assert.strictEqual(decide('docs/mixed.txt', ANON), 'hidden');
            assert.strictEqual(decide('DOCS/MIXED.TXT', AS(alice)), 'allow');
        });
    }
    test('an invalid access_mode hides the path and its contents from everyone', () => {
        assert.strictEqual(decide('invalid', AS(bob)), 'hidden');
        assert.strictEqual(decide('invalid/child', ANON), 'hidden');
    });
    test('unreadable admin data is "unavailable", never allow', () => {
        const real = fx.dbPath;
        applyEnv({ ADMIN_DB_PATH: path.join(fx.dir, 'gone.sqlite') });
        adminDb.resetSnapshot();
        try {
            assert.strictEqual(decide('nothing/here.txt', ANON), 'unavailable');
            assert.strictEqual(decide('docs/readme.txt', AS(bob)), 'unavailable');
        } finally {
            applyEnv({ ADMIN_DB_PATH: real });
            adminDb.resetSnapshot();
        }
    });
});

describe('listing projection', () => {
    const entries = () => [
        { name: 'readme.txt', path: 'docs/readme.txt', type: 'file', size: 5, mtime: 'm' },
        { name: 'locked.txt', path: 'docs/locked.txt', type: 'file', size: 6, mtime: 'm' },
        { name: 'hidden.txt', path: 'docs/hidden.txt', type: 'file', size: 1, mtime: 'm' },
        { name: 'b.iso', path: 'beta/b.iso', type: 'file', size: 1, mtime: 'm' },
        { name: 'no-path', type: 'file' },
    ];
    test('anonymous: allowed in full, self-locked reduced, everything else dropped', () => {
        assert.deepStrictEqual(accessPolicy.filterVisible(entries(), ANON), [
            { name: 'readme.txt', path: 'docs/readme.txt', type: 'file', size: 5, mtime: 'm' },
            { name: 'locked.txt', path: 'docs/locked.txt', type: 'file', locked: true },
        ]);
    });
    test('logged in: locked entries appear in full, hidden ones never', () => {
        const names = accessPolicy.filterVisible(entries(), AS(alice)).map((e) => e.name);
        assert.deepStrictEqual(names, ['readme.txt', 'locked.txt', 'b.iso']);
        assert.ok(accessPolicy.filterVisible(entries(), AS(alice)).every((e) => !e.locked));
    });
});

describe('router answers the decision', () => {
    let base;
    before(async () => { base = await fx.start({ ADMIN_SYNC_TTL_MS: '60000' }); });

    test('allowed file downloads; hidden is 404 NOT_FOUND; locked is 401 AUTH_REQUIRED', async () => {
        const c = client(base);
        assert.strictEqual((await c.get('/api/download/docs/readme.txt')).status, 200);
        const hidden = await c.get('/api/download/docs/hidden.txt');
        assert.strictEqual(hidden.status, 404);
        assert.strictEqual(hidden.json.code, 'NOT_FOUND');
        const locked = await c.get('/api/download/docs/locked.txt');
        assert.strictEqual(locked.status, 401);
        assert.strictEqual(locked.json.code, 'AUTH_REQUIRED');
    });
    test('locked opens after login', async () => {
        const c = client(base);
        assert.strictEqual((await c.login('alice', 'password123')).status, 200);
        const res = await c.get('/api/download/docs/locked.txt');
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.toString(), 'secret');
    });
    test('unreadable admin data answers 503 POLICY_UNAVAILABLE', async () => {
        const real = fx.dbPath;
        applyEnv({ ADMIN_DB_PATH: path.join(fx.dir, 'gone.sqlite') });
        adminDb.resetSnapshot();
        try {
            const res = await client(base).get('/api/download/docs/readme.txt');
            assert.strictEqual(res.status, 503);
            assert.strictEqual(res.json.code, 'POLICY_UNAVAILABLE');
        } finally {
            applyEnv({ ADMIN_DB_PATH: real });
            adminDb.resetSnapshot();
        }
    });
    test('RELEASE_PVM alone no longer requires login; admin policies still apply', async () => {
        fs.mkdirSync(path.join(fx.filesRoot, 'release', 'el9'), { recursive: true });
        fs.writeFileSync(path.join(fx.filesRoot, 'release', 'el9', 'pvm-release-1.0.0-el9.tgz'), 'r1');
        fs.writeFileSync(path.join(fx.filesRoot, 'release', 'el9', 'pvm-release-2.0.0-el9.tgz'), 'r2');
        fx.setPolicy('/release/el9/pvm-release-2.0.0-el9.tgz', { mode: 'public', published: 0 });
        applyEnv({ RELEASE_PVM: path.join(fx.filesRoot, 'release') });
        adminDb.resetSnapshot();
        try {
            // Release protection is the admin lock on the folder (test/release-access.test.js).
            const anon = client(base);
            assert.strictEqual((await anon.get('/api/download/release/el9/pvm-release-1.0.0-el9.tgz')).status, 200);
            assert.strictEqual((await anon.get('/release9/latest')).body.toString(), 'r1');

            const user = client(base);
            await user.login('alice', 'password123');
            assert.strictEqual((await user.get('/api/download/release/el9/pvm-release-2.0.0-el9.tgz')).status, 404);
            const latest = await user.get('/release9/latest');
            assert.strictEqual(latest.status, 200);
            assert.strictEqual(latest.body.toString(), 'r1', 'latest skips the unpublished newer build');
        } finally {
            applyEnv({ RELEASE_PVM: undefined });
        }
    });
});

describe('legacy mode', () => {
    test('integration off: everything allowed, entries untouched', () => {
        applyEnv({ ADMIN_INTEGRATION_ENABLED: undefined, ADMIN_DB_PATH: undefined });
        try {
            assert.strictEqual(decide('docs/hidden.txt', ANON), 'allow');
            const list = [{ name: 'a', path: 'a', type: 'file', size: 1 }];
            assert.strictEqual(accessPolicy.filterVisible(list, ANON), list);
        } finally {
            useFixture();
        }
    });
});

/* ── carried over from the previous suite (owned by later task groups) ── */

describe('admin password adapter', () => {
    const salt = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
    const stored = salt + ':' + require('crypto').scryptSync('hunter2', salt, 64).toString('hex');
    test('accepts the admin hash format', async () => {
        assert.strictEqual(await authService.verifyAdminPassword('hunter2', stored), true);
        assert.strictEqual(await authService.verifyAdminPassword('wrong', stored), false);
        assert.strictEqual(await authService.verifyPassword('hunter2', stored), true);
    });
});

describe('category counts with a predicate', () => {
    const treeRoot = path.join(fx.dir, 'tree');
    before(() => {
        for (const rel of ['alpha/a.txt', 'alpha/b.txt', 'alpha/secret.txt', 'alpha/sub/c.txt', 'beta/d.txt']) {
            fs.mkdirSync(path.dirname(path.join(treeRoot, rel)), { recursive: true });
            fs.writeFileSync(path.join(treeRoot, rel), 'x');
        }
    });
    after(() => useFixture());
    test('excluded files are not counted, excluded categories are omitted', async () => {
        process.env.FILES_ROOT = treeRoot;
        const except = (hidden) => (rel) => ({ result: rel === hidden ? 'hidden' : 'allow', origin: null });
        let cats = await filesService.listCategories(process.cwd(), except('alpha/secret.txt'));
        assert.strictEqual(cats.find((c) => c.name === 'alpha').fileCount, 3);
        cats = await filesService.listCategories(process.cwd(), except('beta'));
        assert.deepStrictEqual(cats.map((c) => c.name), ['alpha']);
        cats = await filesService.listCategories(process.cwd());
        assert.strictEqual(cats.find((c) => c.name === 'alpha').fileCount, 4);
    });
});
