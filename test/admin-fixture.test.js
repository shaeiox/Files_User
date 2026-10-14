/**
 * @file test/admin-fixture.test.js
 * @brief Smoke test for the integration harness: real admin schema, portal boots in integration mode.
 */
'use strict';

const { test, after } = require('node:test');
const assert = require('assert');
const { createFixture, client } = require('./helpers/admin-fixture');

const fx = createFixture();
after(async () => { await fx.stop(); fx.cleanup(); });

test('fixture database passes the portal startup validation', () => {
    process.env.ADMIN_INTEGRATION_ENABLED = 'true';
    process.env.ADMIN_DB_PATH = fx.dbPath;
    process.env.FILES_ROOT = fx.filesRoot;
    process.env.AUTH_ENABLED = 'true';
    assert.deepStrictEqual(require('../lib/admin-db').validateStartup(process.cwd()), []);
});

test('portal starts in integration mode and answers /api/health', async () => {
    const base = await fx.start();
    const res = await client(base).get('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.status, 'ok');
    assert.strictEqual(require('../lib/admin-db').isIntegrationEnabled(), true);
});

test('fixture writes are admin-shaped and enforced by the admin CHECKs', () => {
    const id = fx.addUser({ username: 'erfan' });
    assert.ok(id > 0);
    fx.setPolicy('/docs', { mode: 'restricted', isDirectory: true });
    assert.throws(() => fx.exec("UPDATE file_access_policies SET access_mode = 'bogus'"), /CHECK constraint failed/);
});
