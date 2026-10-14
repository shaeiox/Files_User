/**
 * @file test/levels.test.js
 * @brief Admin schema v4: access levels and user groups, end to end.
 *        A restricted folder is visible only to the users and group members
 *        granted on it; "view" lists without download; a deny carves one member
 *        out of a group; a public "view" folder is browsable but not downloadable
 *        by visitors; membership changes apply on the next snapshot.
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
        'team/build.iso': 'iso',
        'team/notes/plan.txt': 'plan',
        'showcase/demo.iso': 'demo',
    },
});

let base;
let ids;
let teamGroup;
const anon = () => client(base);
const as = async (username) => {
    const c = client(base);
    assert.strictEqual((await c.login(username, 'password123')).status, 200);
    return c;
};
const names = async (c, dir) => {
    const res = await c.get('/api/files/' + dir);
    return res.status === 200 ? res.json.map((e) => e.name + (e.viewOnly ? ':view' : '')).sort() : res.status;
};

before(async () => {
    ids = {
        lead: fx.addUser({ username: 'lead' }),
        dev: fx.addUser({ username: 'dev' }),
        intern: fx.addUser({ username: 'intern' }),
        outsider: fx.addUser({ username: 'outsider' }),
    };
    fx.useLevels();
    teamGroup = fx.addGroup('Team', [ids.dev, ids.intern]);

    // Only the team sees /team. The group may download; the lead is granted
    // individually; the intern is carved out of /team/notes.
    fx.setPolicy('/team', { mode: 'restricted', isDirectory: true });
    fx.setGroupPermission('/team', teamGroup, 'grant', 'download');
    fx.setPermission('/team', ids.lead, 'grant', 'download');
    fx.setPolicy('/team/notes', { mode: 'authenticated', isDirectory: true });
    fx.setPermission('/team/notes', ids.intern, 'deny', 'view');

    // Everyone, visitors included, may browse /showcase but not download.
    fx.setPolicy('/showcase', { mode: 'public', isDirectory: true });
    fx.setDefaultLevel('/showcase', 'view');

    fx.setNav([{ path: '/team', label: 'Team' }]);
    base = await fx.start({ ADMIN_SYNC_TTL_MS: String(TTL_MS) });
});

after(async () => {
    await fx.stop();
    fx.cleanup();
    applyEnv({ ADMIN_INTEGRATION_ENABLED: undefined, ADMIN_DB_PATH: undefined, ADMIN_SYNC_TTL_MS: undefined });
});

test('a restricted folder is visible only to its grantees, the navbar link included', async () => {
    assert.strictEqual(await names(anon(), 'team'), 404);
    assert.strictEqual(await names(await as('outsider'), 'team'), 404);
    assert.deepStrictEqual(await names(await as('dev'), 'team'), ['build.iso', 'notes']);
    assert.deepStrictEqual(await names(await as('lead'), 'team'), ['build.iso', 'notes']);

    assert.deepStrictEqual((await (await as('outsider')).get('/api/nav')).json.folders, []);
    assert.deepStrictEqual((await (await as('dev')).get('/api/nav')).json.folders.map((f) => f.name), ['Team']);
});

test('a group member can download at the group level', async () => {
    const dev = await as('dev');
    assert.strictEqual((await dev.get('/api/download/team/build.iso')).status, 200);
    assert.strictEqual((await (await as('outsider')).get('/api/download/team/build.iso')).status, 404);
});

test('a deny carves one member out of a group grant', async () => {
    const intern = await as('intern');
    assert.deepStrictEqual(await names(intern, 'team'), ['build.iso']);
    assert.strictEqual((await intern.get('/api/download/team/notes/plan.txt')).status, 404);
    assert.strictEqual((await (await as('dev')).get('/api/download/team/notes/plan.txt')).status, 200);
});

test('"view" lists the entry marked viewOnly and refuses its download with 403', async () => {
    assert.deepStrictEqual(await names(anon(), 'showcase'), ['demo.iso:view']);
    const res = await anon().get('/api/download/showcase/demo.iso');
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.json.code, 'VIEW_ONLY');
    assert.strictEqual((await anon().get('/api/hash/showcase/demo.iso')).status, 403);
    assert.strictEqual((await anon().get('/api/download-zip?dir=showcase&items=showcase%2Fdemo.iso')).status, 403);
});

test('membership changes apply on the next snapshot', async () => {
    fx.setGroupMembers(teamGroup, [ids.intern, ids.outsider]);
    await afterSync();
    assert.strictEqual(await names(await as('dev'), 'team'), 404);
    assert.deepStrictEqual(await names(await as('outsider'), 'team'), ['build.iso', 'notes']);
    fx.setGroupMembers(teamGroup, [ids.dev, ids.intern]);
    await afterSync();
});
