/**
 * @file test/release-access.test.js
 * @brief Integration mode: Release page protection comes from the admin lock on
 *        the RELEASE_PVM folder (or an OS subfolder), not from .env.
 *        Spec: openspec/changes/fix-auth-flows-and-cli-login/specs/release-access.
 */
'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('assert');
const path = require('path');
const { createFixture, client } = require('./helpers/admin-fixture');

const TTL_MS = 1000;
const afterSync = () => new Promise((r) => setTimeout(r, TTL_MS + 150));

const fx = createFixture({
    tree: {
        'release/el9/pvm-release-1.0.0-el9.tgz': 'r9',
        'release/el8/pvm-release-1.0.0-el8.tgz': 'r8',
    },
});

let base;
const anon = () => client(base);
const signedIn = async () => {
    const c = client(base);
    assert.strictEqual((await c.login('alice', 'password123')).status, 200);
    return c;
};

before(async () => {
    fx.addUser({ username: 'alice' });
    base = await fx.start({ ADMIN_SYNC_TTL_MS: String(TTL_MS), RELEASE_PVM: path.join(fx.filesRoot, 'release') });
});
after(async () => { await fx.stop(); fx.cleanup(); });

describe('release folder lock', () => {
    test('without a lock, releases are public', async () => {
        const res = await anon().get('/api/releases?os=el9');
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.json.items.length, 1);
        assert.strictEqual((await anon().get('/release9/latest')).body.toString(), 'r9');
    });

    test('locking the release folder requires sign-in; unlocking makes it public again', async () => {
        fx.setPolicy('/release', { mode: 'public', locked: 1, isDirectory: true });
        await afterSync();
        try {
            for (const url of ['/api/releases?os=el9', '/api/releases', '/release9/latest', '/release8/latest']) {
                const res = await anon().get(url);
                assert.strictEqual(res.status, 401, url);
                assert.strictEqual(res.json.code, 'AUTH_REQUIRED', url);
            }
            const user = await signedIn();
            assert.strictEqual((await user.get('/api/releases?os=el9')).json.items[0].name, 'pvm-release-1.0.0-el9.tgz');
            assert.strictEqual((await user.get('/release9/latest')).body.toString(), 'r9');
        } finally {
            fx.deletePolicy('/release');
        }
        await afterSync();
        assert.strictEqual((await anon().get('/api/releases?os=el9')).status, 200);
    });

    test('a lock on one OS folder protects only that OS', async () => {
        fx.setPolicy('/release/el8', { mode: 'public', locked: 1, isDirectory: true });
        await afterSync();
        try {
            assert.strictEqual((await anon().get('/api/releases?os=el8')).status, 401);
            assert.strictEqual((await anon().get('/release8/latest')).status, 401);
            assert.strictEqual((await anon().get('/api/releases?os=el9')).status, 200);
            assert.strictEqual((await anon().get('/release9/latest')).status, 200);
        } finally {
            fx.deletePolicy('/release/el8');
        }
    });

    test('a hidden release folder looks like having no releases', async () => {
        fx.setPolicy('/release/el9', { mode: 'public', published: 0, isDirectory: true });
        await afterSync();
        try {
            for (const who of [anon(), await signedIn()]) {
                const res = await who.get('/api/releases?os=el9');
                assert.strictEqual(res.status, 200);
                assert.deepStrictEqual(res.json.items, []);
            }
        } finally {
            fx.deletePolicy('/release/el9');
        }
    });
});
