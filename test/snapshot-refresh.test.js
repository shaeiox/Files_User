/**
 * @file test/snapshot-refresh.test.js
 * @brief The admin snapshot is refreshed in the background, off the request
 *        path, and a failed refresh drops it (never serves stale data).
 */
'use strict';

const { test, before, after } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const { createFixture } = require('./helpers/admin-fixture');

const TTL_MS = 1000;
const fx = createFixture();
let base;
before(async () => { base = await fx.start({ ADMIN_SYNC_TTL_MS: String(TTL_MS) }); });
after(async () => { await fx.stop(); fx.cleanup(); });

const adminDb = () => require('../lib/admin-db');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('without any request, the snapshot is re-read before it expires', async () => {
    adminDb().resetSnapshot();
    assert.strictEqual((await fetch(base + '/readyz')).status, 200);
    await sleep(TTL_MS * 1.5);
    const age = adminDb().snapshotAgeSeconds();
    assert.ok(age !== null && age < TTL_MS / 1000, `snapshot age ${age}s stays under one interval`);
});

test('a database that breaks is dropped within one interval and requests fail closed', async () => {
    adminDb().resetSnapshot();
    assert.strictEqual((await fetch(base + '/readyz')).status, 200);
    const saved = fs.readFileSync(fx.dbPath);
    try {
        fs.writeFileSync(fx.dbPath, 'not a database');
        await sleep(TTL_MS);
        assert.strictEqual(adminDb().snapshotAgeSeconds(), null, 'the background refresh dropped the copy');
        const res = await fetch(base + '/api/files/docs');
        assert.strictEqual(res.status, 503);
        assert.strictEqual((await res.json()).code, 'POLICY_UNAVAILABLE');
        assert.strictEqual((await fetch(base + '/readyz')).status, 503);
    } finally {
        fs.writeFileSync(fx.dbPath, saved);
        adminDb().resetSnapshot();
    }
});
