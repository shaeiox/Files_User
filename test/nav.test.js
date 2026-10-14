/**
 * @file test/nav.test.js
 * @brief Admin navbar folders (admin schema v3, portal_nav_folders):
 *        /api/nav only links folders the caller may see (allowed, or locked by
 *        their own policy -> name + locked), skips missing folders, follows
 *        sign-in; hideFromHome removes the card from /api/categories only.
 *        A v2 admin database (no nav table) still works and yields no links.
 */
'use strict';

const { test, before, after } = require('node:test');
const assert = require('assert');
const { createFixture, applyEnv, client } = require('./helpers/admin-fixture');

const TTL_MS = 1000;
const afterSync = () => new Promise((r) => setTimeout(r, TTL_MS + 150));

const fx = createFixture({
    tree: {
        'docs/a.txt': 'a',
        'tools/t.iso': 't',
        'vault/v.iso': 'v',
        'members/m.iso': 'm',
        'secret/s.iso': 's',
        'vault/inner/x.iso': 'x',
    },
});

let base;
const anon = () => client(base);
const asUser = async () => {
    const c = client(base);
    assert.strictEqual((await c.login('alice', 'password123')).status, 200);
    return c;
};
const navOf = async (c) => {
    const res = await c.get('/api/nav');
    assert.strictEqual(res.status, 200);
    return res.json.folders;
};
const cardNames = async (c) => (await c.get('/api/categories')).json.map((e) => e.name).sort();

before(async () => {
    fx.addUser({ username: 'alice' });
    fx.setPolicy('/vault', { mode: 'public', locked: 1, isDirectory: true });
    fx.setPolicy('/members', { mode: 'authenticated', isDirectory: true });
    fx.setPolicy('/secret', { mode: 'public', published: 0, isDirectory: true });
    base = await fx.start({ ADMIN_SYNC_TTL_MS: String(TTL_MS) });
});

after(async () => {
    await fx.stop();
    fx.cleanup();
    applyEnv({ ADMIN_INTEGRATION_ENABLED: undefined, ADMIN_DB_PATH: undefined, ADMIN_SYNC_TTL_MS: undefined });
});

test('schema v2 admin database: no nav table, no links, categories unchanged', async () => {
    assert.deepStrictEqual(await navOf(anon()), []);
    assert.deepStrictEqual(await cardNames(anon()), ['docs', 'tools', 'vault']);
});

test('anonymous: allowed + self-locked folders, in admin order; hidden, members-only, inside-locked and missing are omitted', async () => {
    fx.setNav([
        { path: '/vault', label: 'Vault' },
        { path: '/tools', hideFromHome: true },
        { path: '/members', label: 'Members' },
        { path: '/secret' },
        { path: '/vault/inner' },
        { path: '/gone' },
        { path: '/docs', label: 'Documents' },
    ]);
    await afterSync();
    assert.deepStrictEqual(await navOf(anon()), [
        { name: 'Vault', path: 'vault', type: 'directory', locked: true, hideFromHome: false },
        { name: 'tools', path: 'tools', type: 'directory', hideFromHome: true },
        { name: 'Documents', path: 'docs', type: 'directory', hideFromHome: false },
    ]);
});

test('signed in: locked and authenticated folders become plain links; unpublished stays hidden', async () => {
    const nav = await navOf(await asUser());
    assert.deepStrictEqual(nav.map((f) => [f.path, f.locked === true]), [
        ['vault', false], ['tools', false], ['members', false], ['vault/inner', false], ['docs', false],
    ]);
});

test('hideFromHome drops only the home card; the folder stays listable and in the navbar', async () => {
    assert.deepStrictEqual(await cardNames(anon()), ['docs', 'vault']);
    assert.strictEqual((await anon().get('/api/files/tools')).status, 200);
    assert.ok((await navOf(anon())).some((f) => f.path === 'tools'));
});

test('toggling only hideFromHome changes /api/nav, so the client drops its cached home cards', async () => {
    const before = JSON.stringify(await navOf(anon()));
    fx.setNav([
        { path: '/vault', label: 'Vault' },
        { path: '/tools', hideFromHome: false },
        { path: '/members', label: 'Members' },
        { path: '/secret' },
        { path: '/vault/inner' },
        { path: '/gone' },
        { path: '/docs', label: 'Documents' },
    ]);
    await afterSync();
    assert.notStrictEqual(JSON.stringify(await navOf(anon())), before);
    assert.deepStrictEqual(await cardNames(anon()), ['docs', 'tools', 'vault']);
});

test('admin changes apply within the sync interval, without a restart', async () => {
    fx.setNav([]);
    await afterSync();
    assert.deepStrictEqual(await navOf(anon()), []);
    assert.deepStrictEqual(await cardNames(anon()), ['docs', 'tools', 'vault']);
});

test('malformed nav rows are dropped, never linked', async () => {
    fx.setNav([{ path: '/docs' }]);
    fx.exec("INSERT INTO portal_nav_folders (client_path, label, position, hide_from_home, created_at, updated_at) VALUES ('relative', NULL, 5, 0, 0, 0)");
    fx.exec("INSERT INTO portal_nav_folders (client_path, label, position, hide_from_home, created_at, updated_at) VALUES ('/../docs', NULL, 6, 0, 0, 0)");
    await afterSync();
    assert.deepStrictEqual((await navOf(anon())).map((f) => f.path), ['docs']);
});
