/**
 * @file test/levels-releases.test.js
 * @brief Admin schema v4: a view-only release is listed (marked viewOnly) but
 *        never served, and /release{8,9}/latest falls back to the newest build
 *        the caller may download.
 */
'use strict';

const { test, before, after } = require('node:test');
const assert = require('assert');
const path = require('path');
const { createFixture, applyEnv, client } = require('./helpers/admin-fixture');

const fx = createFixture({
    tree: {
        'release/el9/pvm-release-1.0.0-el9.tgz': 'old',
        'release/el9/pvm-release-2.0.0-el9.tgz': 'new',
    },
});
let base;

before(async () => {
    fx.useLevels();
    fx.setPolicy('/release/el9/pvm-release-2.0.0-el9.tgz', { mode: 'public' });
    fx.setDefaultLevel('/release/el9/pvm-release-2.0.0-el9.tgz', 'view');
    base = await fx.start({ ADMIN_SYNC_TTL_MS: '1000', RELEASE_PVM: path.join(fx.filesRoot, 'release') });
});

after(async () => {
    await fx.stop();
    fx.cleanup();
    applyEnv({ ADMIN_INTEGRATION_ENABLED: undefined, ADMIN_DB_PATH: undefined, ADMIN_SYNC_TTL_MS: undefined, RELEASE_PVM: undefined });
});

test('the list marks the view-only build and "latest" serves the newest downloadable one', async () => {
    const list = await client(base).get('/api/releases?os=el9');
    assert.deepStrictEqual(list.json.items.map((i) => [i.name, i.viewOnly === true]),
        [['pvm-release-2.0.0-el9.tgz', true], ['pvm-release-1.0.0-el9.tgz', false]]);
    assert.strictEqual((await client(base).get('/release9/latest')).body.toString(), 'old');
    assert.strictEqual((await client(base).get('/api/download/release/el9/pvm-release-2.0.0-el9.tgz')).status, 403);
});
