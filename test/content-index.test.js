/**
 * @file test/content-index.test.js
 * @brief The cached directory index: bounded freshness, LRU bound, coalesced
 *        reads, and access decisions that are never cached.
 */
'use strict';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createFixture, client } = require('./helpers/admin-fixture');
const contentIndex = require('../lib/content-index');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const setEnv = (vars) => Object.assign(process.env, vars);

/* ─── unit ─── */

test('entries are cached until the TTL passes', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-index-'));
    try {
        setEnv({ CONTENT_INDEX_TTL_MS: '200' });
        contentIndex.clear();
        fs.writeFileSync(path.join(dir, 'a.txt'), 'a');
        assert.deepStrictEqual((await contentIndex.readDir(dir)).map((e) => e.name), ['a.txt']);
        fs.writeFileSync(path.join(dir, 'b.txt'), 'bb');
        assert.strictEqual((await contentIndex.readDir(dir)).length, 1, 'still the cached copy');
        await sleep(250);
        const fresh = await contentIndex.readDir(dir);
        assert.deepStrictEqual(fresh.map((e) => e.name).sort(), ['a.txt', 'b.txt']);
        const b = fresh.find((e) => e.name === 'b.txt');
        assert.strictEqual(b.type, 'file');
        assert.strictEqual(b.size, 2);
        assert.strictEqual(typeof b.mtimeMs, 'number');

        setEnv({ CONTENT_INDEX_TTL_MS: '0' });
        fs.writeFileSync(path.join(dir, 'c.txt'), 'c');
        assert.strictEqual((await contentIndex.readDir(dir)).length, 3, 'TTL 0 reads the disk every time');
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('at most CONTENT_INDEX_MAX_DIRS directories are kept, least recently used out', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-index-lru-'));
    try {
        setEnv({ CONTENT_INDEX_TTL_MS: '60000', CONTENT_INDEX_MAX_DIRS: '100' });
        contentIndex.clear();
        const dirs = Array.from({ length: 101 }, (_, i) => path.join(root, `d${i}`));
        for (const d of dirs) fs.mkdirSync(d);
        for (const d of dirs.slice(0, 100)) await contentIndex.readDir(d);
        await contentIndex.readDir(dirs[0]); // d0 becomes most recently used
        await contentIndex.readDir(dirs[100]); // evicts d1, the least recently used
        assert.strictEqual(contentIndex.size(), 100);
        fs.writeFileSync(path.join(dirs[0], 'new.txt'), 'x');
        fs.writeFileSync(path.join(dirs[1], 'new.txt'), 'x');
        assert.strictEqual((await contentIndex.readDir(dirs[0])).length, 0, 'd0 still cached');
        assert.strictEqual((await contentIndex.readDir(dirs[1])).length, 1, 'd1 was evicted and re-read');
    } finally {
        delete process.env.CONTENT_INDEX_MAX_DIRS;
        fs.rmSync(root, { recursive: true, force: true });
    }
});

test('concurrent misses for one directory share a single read', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-index-co-'));
    try {
        setEnv({ CONTENT_INDEX_TTL_MS: '60000' });
        contentIndex.clear();
        const [a, b] = await Promise.all([contentIndex.readDir(dir), contentIndex.readDir(dir)]);
        assert.strictEqual(a, b, 'the same result object');
        await assert.rejects(contentIndex.readDir(path.join(dir, 'missing')), { code: 'ENOENT' });
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

/* ─── through the API ─── */

const fx = createFixture({ tree: { 'docs/readme.txt': 'hello', 'docs/guide.txt': 'g', 'tools/tool.bin': 't' } });
let base;
before(async () => { base = await fx.start({ ADMIN_SYNC_TTL_MS: '1000' }); });
after(async () => { await fx.stop(); fx.cleanup(); });
beforeEach(() => { contentIndex.clear(); require('../lib/admin-db').resetSnapshot(); });

const docsCard = async () => (await client(base).get('/api/categories')).json.find((c) => c.name === 'docs');
const search = async (q) => (await client(base).get('/api/search?q=' + q)).json.results.map((r) => r.path);

test('a new file shows in counts and search within the freshness bound', async () => {
    setEnv({ CONTENT_INDEX_TTL_MS: '300' });
    assert.strictEqual((await docsCard()).fileCount, 2);
    fs.writeFileSync(path.join(fx.filesRoot, 'docs', 'added.txt'), 'new');
    await sleep(350);
    assert.strictEqual((await docsCard()).fileCount, 3);
    assert.ok((await search('added')).includes('docs/added.txt'));
    fs.rmSync(path.join(fx.filesRoot, 'docs', 'added.txt'));
});

test('a folder locked after indexing is locked on the next response', async () => {
    setEnv({ CONTENT_INDEX_TTL_MS: '60000' });
    const before = await docsCard();
    assert.strictEqual(before.fileCount, 2);
    assert.ok((await search('readme')).includes('docs/readme.txt'));

    fx.setPolicy('/docs', { mode: 'authenticated', locked: 1, isDirectory: true });
    require('../lib/admin-db').resetSnapshot(); // the admin snapshot refresh
    const locked = await docsCard();
    assert.deepStrictEqual(locked, { name: 'docs', path: 'docs', type: 'directory', locked: true });
    assert.ok(!(await search('readme')).includes('docs/readme.txt'), 'nothing inside a locked folder is searched');
    fx.exec("DELETE FROM file_access_policies WHERE file_id IN (SELECT id FROM files WHERE client_path = '/docs')");
});

test('two callers reading the same index each see only what they may', async () => {
    setEnv({ CONTENT_INDEX_TTL_MS: '60000' });
    const userId = fx.addUser({ username: 'reader' });
    fx.setPolicy('/docs/guide.txt', { mode: 'restricted' });
    fx.setPermission('/docs/guide.txt', userId, 'grant');
    require('../lib/admin-db').resetSnapshot();
    try {
        const anon = (await client(base).get('/api/categories')).json.find((c) => c.name === 'docs');
        const signedIn = client(base);
        assert.strictEqual((await signedIn.login('reader', 'password123')).status, 200);
        const granted = (await signedIn.get('/api/categories')).json.find((c) => c.name === 'docs');
        assert.strictEqual(anon.fileCount, 1, 'anonymous: the restricted file is not counted');
        assert.strictEqual(granted.fileCount, 2, 'granted user: counted');
    } finally {
        fx.deletePolicy('/docs/guide.txt');
        fx.setPermission('/docs/guide.txt', userId, null);
    }
});

test('hidden files are neither counted nor found', async () => {
    setEnv({ CONTENT_INDEX_TTL_MS: '60000' });
    fs.writeFileSync(path.join(fx.filesRoot, 'docs', '.secret-notes'), 'x');
    try {
        assert.strictEqual((await docsCard()).fileCount, 2);
        assert.deepStrictEqual(await search('secret-notes'), []);
    } finally {
        fs.rmSync(path.join(fx.filesRoot, 'docs', '.secret-notes'));
    }
});

test('a file deleted while still indexed is not downloadable', async () => {
    setEnv({ CONTENT_INDEX_TTL_MS: '60000' });
    fs.writeFileSync(path.join(fx.filesRoot, 'docs', 'gone.txt'), 'x');
    assert.ok((await search('gone')).includes('docs/gone.txt'));
    fs.rmSync(path.join(fx.filesRoot, 'docs', 'gone.txt'));
    assert.strictEqual((await client(base).get('/api/download/docs/gone.txt')).status, 404);
});

test('category responses keep their shape and order', async () => {
    setEnv({ CONTENT_INDEX_TTL_MS: '60000' });
    const cats = (await client(base).get('/api/categories')).json;
    assert.deepStrictEqual(cats.map((c) => c.name), ['docs', 'tools']);
    for (const c of cats) {
        assert.deepStrictEqual(Object.keys(c).sort(), ['fileCount', 'folderCount', 'latestModified', 'mtime', 'name', 'path', 'type']);
    }
});
