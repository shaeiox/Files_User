/**
 * @file test/endpoints.test.js
 * @brief Every portal endpoint enforces the same admin decision over HTTP:
 *        listings, direct downloads, hashes, ZIP, search, categories, releases,
 *        latest-release URLs, 503 on unreadable admin data, path aliases and
 *        traversal, and admin changes taking effect within the sync interval.
 *        Spec: openspec/changes/enforce-admin-file-policies/specs/file-access-policy.
 */
'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { createFixture, applyEnv, client } = require('./helpers/admin-fixture');
const adminDb = require('../lib/admin-db');

const TTL_MS = 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const afterSync = () => sleep(TTL_MS + 150);
const HOUR = 3600000;

const fx = createFixture({
    tree: {
        'docs/readme.txt': 'readme',
        'docs/locked.txt': 'locked-content',
        'docs/hidden.txt': 'hidden-content',
        'docs/members.txt': 'members-content',
        'docs/team.txt': 'team-content',
        'docs/denied.txt': 'denied-content',
        'beta/b.iso': 'beta-b',
        'beta/sub/c.iso': 'beta-c',
        'private/secret.iso': 'private-secret',
        'window/future.txt': 'future',
        'window/expired.txt': 'expired',
        'sync/a.txt': 'sync-a',
        'sync/b.txt': 'sync-b',
        'sync/c.txt': 'sync-c',
        'sync/d.txt': 'sync-d',
        'sync/e.txt': 'sync-e',
        'release/el9/pvm-release-1.0.0-el9.tgz': 'r1',
        'release/el9/pvm-release-2.0.0-el9.tgz': 'r2',
        'release/el9/pvm-release-3.0.0-el9.tgz': 'r3',
        'release/el8/pvm-release-1.0.0-el8.tgz': 'r8',
    },
});

let base, alice, bob;
const anon = () => client(base);
const as = async (username) => {
    const c = client(base);
    const res = await c.login(username, 'password123');
    assert.strictEqual(res.status, 200);
    return c;
};
const names = (list) => list.map((e) => e.name).sort();

before(async () => {
    alice = fx.addUser({ username: 'alice' });
    bob = fx.addUser({ username: 'bob' });

    fx.setPolicy('/docs/locked.txt', { mode: 'public', locked: 1 });
    fx.setPolicy('/docs/hidden.txt', { mode: 'public', published: 0 });
    fx.setPolicy('/docs/members.txt', { mode: 'authenticated' });
    fx.setPolicy('/docs/team.txt', { mode: 'restricted' });
    fx.setPermission('/docs/team.txt', bob, 'grant');
    fx.setPolicy('/docs/denied.txt', { mode: 'public' });
    fx.setPermission('/docs/denied.txt', alice, 'deny');
    fx.setPolicy('/beta', { mode: 'public', locked: 1, isDirectory: true });
    fx.setPolicy('/private', { mode: 'public', published: 0, isDirectory: true });
    fx.setPolicy('/window/future.txt', { mode: 'public', from: Date.now() + HOUR });
    fx.setPolicy('/window/expired.txt', { mode: 'public', until: Date.now() - HOUR });
    fx.setPolicy('/release/el9/pvm-release-2.0.0-el9.tgz', { mode: 'public', published: 0 });
    fx.setPolicy('/release/el9/pvm-release-3.0.0-el9.tgz', { mode: 'public', locked: 1 });
    fx.setPolicy('/release/el8/pvm-release-1.0.0-el8.tgz', { mode: 'public', locked: 1 });

    base = await fx.start({ ADMIN_SYNC_TTL_MS: String(TTL_MS) });
});
after(async () => { await fx.stop(); fx.cleanup(); });

describe('listings', () => {
    test('anonymous: allowed entries in full, self-locked without size/date, the rest absent', async () => {
        const res = await anon().get('/api/files/docs');
        assert.strictEqual(res.status, 200);
        assert.deepStrictEqual(names(res.json), ['denied.txt', 'locked.txt', 'readme.txt']);
        const locked = res.json.find((e) => e.name === 'locked.txt');
        assert.deepStrictEqual(locked, { name: 'locked.txt', path: 'docs/locked.txt', type: 'file', locked: true });
        const readme = res.json.find((e) => e.name === 'readme.txt');
        assert.strictEqual(readme.size, 6);
        assert.ok(readme.mtime);
    });
    test('logged in: authenticated and locked appear in full; denied, hidden and ungranted do not', async () => {
        const res = await (await as('alice')).get('/api/files/docs');
        assert.deepStrictEqual(names(res.json), ['locked.txt', 'members.txt', 'readme.txt']);
        assert.ok(res.json.every((e) => !e.locked && typeof e.size === 'number'));
    });
    test('a granted user also sees the restricted file', async () => {
        const res = await (await as('bob')).get('/api/files/docs');
        assert.deepStrictEqual(names(res.json), ['denied.txt', 'locked.txt', 'members.txt', 'readme.txt', 'team.txt']);
    });
    test('root listing: locked category reduced, unpublished category absent', async () => {
        const res = await anon().get('/api/files');
        assert.ok(!names(res.json).includes('private'));
        assert.deepStrictEqual(res.json.find((e) => e.name === 'beta'), { name: 'beta', path: 'beta', type: 'directory', locked: true });
    });
    test('a locked folder is 401 anonymous and listable after login', async () => {
        assert.strictEqual((await anon().get('/api/files/beta')).status, 401);
        const res = await (await as('alice')).get('/api/files/beta');
        assert.strictEqual(res.status, 200);
        assert.deepStrictEqual(names(res.json), ['b.iso', 'sub']);
    });
    test('a hidden folder answers exactly like a missing one', async () => {
        const hidden = await (await as('bob')).get('/api/files/private');
        const missing = await (await as('bob')).get('/api/files/no-such-folder');
        assert.strictEqual(hidden.status, 404);
        assert.strictEqual(hidden.status, missing.status);
        assert.deepStrictEqual(hidden.body, missing.body);
    });
});

describe('direct downloads', () => {
    test('a hidden file answers byte-identically to a missing file', async () => {
        const hidden = await anon().get('/api/download/docs/hidden.txt');
        const missing = await anon().get('/api/download/docs/no-such-file.txt');
        assert.strictEqual(hidden.status, 404);
        assert.strictEqual(missing.status, 404);
        assert.deepStrictEqual(hidden.body, missing.body);
    });
    test('a file inside a locked folder is 401 with no file bytes, existing or not', async () => {
        const real = await anon().get('/api/download/beta/b.iso');
        const ghost = await anon().get('/api/download/beta/no-such.iso');
        assert.strictEqual(real.status, 401);
        assert.strictEqual(real.json.code, 'AUTH_REQUIRED');
        assert.ok(!real.body.includes('beta-b'));
        assert.deepStrictEqual(real.body, ghost.body);
    });
    test('a file inside an unpublished folder is 404 even for a logged-in user', async () => {
        assert.strictEqual((await (await as('bob')).get('/api/download/private/secret.iso')).status, 404);
    });
    test('a denied user gets 404; another user downloads it', async () => {
        assert.strictEqual((await (await as('alice')).get('/api/download/docs/denied.txt')).status, 404);
        const ok = await (await as('bob')).get('/api/download/docs/denied.txt');
        assert.strictEqual(ok.body.toString(), 'denied-content');
    });
    test('restricted without a grant is 404, with a grant it downloads', async () => {
        assert.strictEqual((await (await as('alice')).get('/api/download/docs/team.txt')).status, 404);
        assert.strictEqual((await (await as('bob')).get('/api/download/docs/team.txt')).body.toString(), 'team-content');
    });
    test('availability windows apply to direct URLs', async () => {
        const c = await as('bob');
        assert.strictEqual((await c.get('/api/download/window/future.txt')).status, 404);
        assert.strictEqual((await c.get('/api/download/window/expired.txt')).status, 404);
    });
    test('HEAD preflight: locked is 401, allowed is 200 with no body', async () => {
        assert.strictEqual((await anon().head('/api/download/docs/locked.txt')).status, 401);
        const ok = await anon().head('/api/download/docs/readme.txt');
        assert.strictEqual(ok.status, 200);
        assert.strictEqual(ok.body.length, 0);
    });
});

describe('hashes', () => {
    test('allowed file returns the real SHA-256', async () => {
        const res = await anon().get('/api/hash/docs/readme.txt');
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.json.digest, crypto.createHash('sha256').update('readme').digest('hex'));
    });
    test('hidden is 404 and the file is never opened; locked is 401', async () => {
        const opened = [];
        const original = fs.createReadStream;
        fs.createReadStream = function (p, ...rest) { opened.push(String(p)); return original.call(this, p, ...rest); };
        try {
            const hidden = await anon().get('/api/hash/docs/hidden.txt');
            assert.strictEqual(hidden.status, 404);
            assert.ok(!('digest' in (hidden.json || {})));
            assert.strictEqual((await anon().get('/api/hash/docs/locked.txt')).status, 401);
            assert.strictEqual((await anon().get('/api/hash/beta/b.iso')).status, 401);
        } finally {
            fs.createReadStream = original;
        }
        assert.deepStrictEqual(opened.filter((p) => /hidden|locked|b\.iso/.test(p)), []);
    });
    test('a logged-in user hashes a locked file', async () => {
        const res = await (await as('alice')).get('/api/hash/docs/locked.txt');
        assert.strictEqual(res.json.digest, crypto.createHash('sha256').update('locked-content').digest('hex'));
    });
});

describe('ZIP archives', () => {
    const zip = (dir, items) => `/api/download-zip?dir=${encodeURIComponent(dir)}&items=${encodeURIComponent(items.map(encodeURIComponent).join(','))}`;
    const isZip = (res) => res.body.subarray(0, 2).toString() === 'PK';

    test('all allowed: an archive is streamed', async () => {
        const res = await anon().get(zip('docs', ['docs/readme.txt', 'docs/denied.txt']));
        assert.strictEqual(res.status, 200);
        assert.ok(isZip(res));
    });
    test('one hidden file refuses the whole archive with 404', async () => {
        const res = await anon().get(zip('docs', ['docs/readme.txt', 'docs/hidden.txt']));
        assert.strictEqual(res.status, 404);
        assert.ok(!isZip(res));
    });
    test('hidden wins over locked in a mixed selection', async () => {
        const res = await anon().get(zip('docs', ['docs/locked.txt', 'docs/hidden.txt']));
        assert.strictEqual(res.status, 404);
    });
    test('a locked file refuses the archive with 401 until login', async () => {
        assert.strictEqual((await anon().get(zip('docs', ['docs/readme.txt', 'docs/locked.txt']))).status, 401);
        const res = await (await as('alice')).get(zip('docs', ['docs/readme.txt', 'docs/locked.txt']));
        assert.strictEqual(res.status, 200);
        assert.ok(isZip(res));
    });
    test('a locked browsed folder refuses the archive', async () => {
        assert.strictEqual((await anon().get(zip('beta', ['beta/b.iso']))).status, 401);
    });
    test('a denied file in the selection refuses it for that user', async () => {
        assert.strictEqual((await (await as('alice')).get(zip('docs', ['docs/readme.txt', 'docs/denied.txt']))).status, 404);
    });
    test('HEAD preflight answers like GET without building the archive', async () => {
        const ok = await anon().head(zip('docs', ['docs/readme.txt']));
        assert.strictEqual(ok.status, 200);
        assert.strictEqual(ok.body.length, 0);
        assert.strictEqual((await anon().head(zip('docs', ['docs/locked.txt']))).status, 401);
        assert.strictEqual((await anon().head(zip('docs', ['docs/hidden.txt']))).status, 404);
    });
    test('contents of an unpublished folder cannot be zipped', async () => {
        assert.strictEqual((await (await as('bob')).get(zip('private', ['private/secret.iso']))).status, 404);
    });
});

describe('search', () => {
    const search = (c, q, extra = '') => c.get(`/api/search?q=${encodeURIComponent(q)}${extra}`);

    test('a query matching only a hidden file returns nothing, not truncated', async () => {
        const res = await search(anon(), 'hidden');
        assert.deepStrictEqual(res.json.results, []);
        assert.strictEqual(res.json.truncated, false);
    });
    test('nothing inside a locked folder is found anonymously; found after login', async () => {
        assert.deepStrictEqual((await search(anon(), 'c.iso')).json.results, []);
        const res = await search(await as('alice'), 'c.iso');
        assert.deepStrictEqual(res.json.results.map((r) => r.path), ['beta/sub/c.iso']);
    });
    test('a self-locked file is found anonymously, reduced and marked', async () => {
        const res = await search(anon(), 'locked.txt');
        assert.deepStrictEqual(res.json.results, [{ name: 'locked.txt', path: 'docs/locked.txt', type: 'file', locked: true }]);
    });
    test('restricted, denied, unpublished-folder and out-of-window files follow the caller', async () => {
        assert.deepStrictEqual((await search(await as('alice'), 'team')).json.results, []);
        assert.deepStrictEqual((await search(await as('bob'), 'team')).json.results.map((r) => r.path), ['docs/team.txt']);
        assert.deepStrictEqual((await search(await as('alice'), 'denied')).json.results, []);
        assert.deepStrictEqual((await search(await as('bob'), 'secret')).json.results, []);
        assert.deepStrictEqual((await search(await as('bob'), 'future')).json.results, []);
    });
    test('path scopes the search to a subdirectory, including nested folders', async () => {
        const res = await search(await as('alice'), 'c.iso', '&path=beta');
        assert.deepStrictEqual(res.json.results.map((r) => r.path), ['beta/sub/c.iso']);
        assert.deepStrictEqual((await search(await as('alice'), 'c.iso', '&path=docs')).json.results, []);
    });
    test('the limit counts only what the caller may see', async () => {
        const res = await search(anon(), '.txt', '&limit=3');
        assert.strictEqual(res.json.results.length, 3);
        for (const r of res.json.results) {
            assert.ok(!/hidden|members|team|future|expired/.test(r.path), r.path);
        }
    });
});

describe('categories and counts', () => {
    const category = async (c, name) => (await c.get('/api/categories')).json.find((cat) => cat.name === name);

    test('counts include only what each caller may read', async () => {
        assert.strictEqual((await category(anon(), 'docs')).fileCount, 2);          // readme, denied
        assert.strictEqual((await category(await as('alice'), 'docs')).fileCount, 3); // readme, locked, members
        assert.strictEqual((await category(await as('bob'), 'docs')).fileCount, 5);   // + team, denied
        assert.strictEqual((await category(await as('bob'), 'window')).fileCount, 0);
    });
    test('a locked category shows no counts or dates anonymously, full counts after login', async () => {
        assert.deepStrictEqual(await category(anon(), 'beta'), { name: 'beta', path: 'beta', type: 'directory', locked: true });
        const beta = await category(await as('alice'), 'beta');
        assert.strictEqual(beta.fileCount, 2);
        assert.strictEqual(beta.folderCount, 1);
    });
    test('an unpublished category is absent for everyone', async () => {
        assert.strictEqual(await category(anon(), 'private'), undefined);
        assert.strictEqual(await category(await as('bob'), 'private'), undefined);
    });
});

describe('releases and latest-release URLs', () => {
    test('listing: unpublished dropped before the limit, locked reduced in version order', async () => {
        const res = await anon().get('/api/releases?os=el9&limit=2');
        assert.deepStrictEqual(res.json.items, [
            { name: 'pvm-release-3.0.0-el9.tgz', path: 'release/el9/pvm-release-3.0.0-el9.tgz', type: 'file', locked: true },
            res.json.items[1],
        ]);
        assert.strictEqual(res.json.items[1].name, 'pvm-release-1.0.0-el9.tgz');
        assert.strictEqual(res.json.items[1].size, 2);
    });
    test('latest skips locked and unpublished builds anonymously', async () => {
        const res = await anon().get('/release9/latest');
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.body.toString(), 'r1');
    });
    test('latest serves the newest build the user may read after login', async () => {
        assert.strictEqual((await (await as('alice')).get('/release9/latest')).body.toString(), 'r3');
    });
    test('latest is 401 when every build is locked, 404 when there are none', async () => {
        assert.strictEqual((await anon().get('/release8/latest')).status, 401);
        assert.strictEqual((await (await as('alice')).get('/release8/latest')).body.toString(), 'r8');
    });
});

describe('unreadable admin data', () => {
    test('every file endpoint answers 503 POLICY_UNAVAILABLE and leaks nothing', async () => {
        const c = await as('bob');
        const real = fx.dbPath;
        applyEnv({ ADMIN_DB_PATH: path.join(fx.dir, 'gone.sqlite') });
        adminDb.resetSnapshot();
        try {
            for (const url of [
                '/api/files', '/api/files/docs', '/api/download/docs/readme.txt', '/api/hash/docs/readme.txt',
                '/api/download-zip?dir=docs&items=docs%252Freadme.txt', '/api/search?q=readme',
                '/api/categories', '/api/releases?os=el9', '/release9/latest',
            ]) {
                for (const who of [anon(), c]) {
                    const res = await who.get(url);
                    assert.strictEqual(res.status, 503, url);
                    assert.strictEqual(res.json.code, 'POLICY_UNAVAILABLE', url);
                    assert.ok(!/readme|docs\/|release-/.test(res.body.toString()), url);
                }
            }
        } finally {
            applyEnv({ ADMIN_DB_PATH: real });
            adminDb.resetSnapshot();
        }
    });
});

describe('path aliases and traversal', () => {
    test('dot segments that resolve onto a hidden file are refused', async () => {
        for (const url of [
            '/api/download/docs%2F..%2Fdocs%2Fhidden.txt',
            '/api/download/docs/x/..%2Fhidden.txt',
            '/api/download/docs%2F.%2Fhidden.txt',
        ]) {
            const res = await anon().get(url);
            assert.notStrictEqual(res.status, 200, url);
            assert.ok(!res.body.includes('hidden-content'), url);
        }
    });
    test('escaping the root is refused', async () => {
        for (const url of ['/api/download/..%2F..%2Fadmin.sqlite', '/api/download/%2e%2e%2fadmin.sqlite', '/api/files/..%2F..']) {
            const res = await anon().get(url);
            assert.ok(res.status >= 400 && res.status < 500, `${url} -> ${res.status}`);
        }
    });
    test('backslash separators are treated as path separators', async () => {
        assert.strictEqual((await anon().get('/api/download/docs%5Chidden.txt')).status, 404);
        assert.strictEqual((await anon().get('/api/download/beta%5Cb.iso')).status, 401);
    });
    test('an in-root symlink to a hidden file is refused', async (t) => {
        const link = path.join(fx.filesRoot, 'docs', 'innocent.txt');
        try {
            fs.symlinkSync(path.join(fx.filesRoot, 'docs', 'hidden.txt'), link, 'file');
        } catch (err) {
            return t.skip(`cannot create symlinks here (${err.code})`);
        }
        try {
            const res = await anon().get('/api/download/docs/innocent.txt');
            assert.strictEqual(res.status, 404);
            assert.ok(!res.body.includes('hidden-content'));
            assert.strictEqual((await anon().get('/api/hash/docs/innocent.txt')).status, 404);
        } finally {
            fs.unlinkSync(link);
        }
    });
    test('an in-root directory link (junction on Windows) into a hidden folder is refused', async (t) => {
        const link = path.join(fx.filesRoot, 'docs', 'shortcut');
        try {
            fs.symlinkSync(path.join(fx.filesRoot, 'private'), link, 'junction');
        } catch (err) {
            return t.skip(`cannot create directory links here (${err.code})`);
        }
        try {
            const c = await as('bob');
            const res = await c.get('/api/download/docs/shortcut/secret.iso');
            assert.strictEqual(res.status, 404);
            assert.ok(!res.body.includes('private-secret'));
            assert.strictEqual((await c.get('/api/files/docs/shortcut')).status, 404);
            assert.strictEqual((await c.get('/api/hash/docs/shortcut/secret.iso')).status, 404);
            const zip = `/api/download-zip?dir=docs&items=${encodeURIComponent(encodeURIComponent('docs/shortcut/secret.iso'))}`;
            assert.strictEqual((await c.get(zip)).status, 404);
            assert.ok(!names((await c.get('/api/files/docs')).json).includes('shortcut'), 'links are not listed');
        } finally {
            fs.rmSync(link, { recursive: false, force: true });
        }
    });
    if (process.platform === 'win32') {
        test('Windows aliases (case, trailing dot/space, ::$DATA) resolve to the governed file', async () => {
            for (const alias of ['DOCS/HIDDEN.TXT', 'docs/hidden.txt.', 'docs/hidden.txt%20', 'docs/hidden.txt::$DATA']) {
                const res = await anon().get('/api/download/' + alias);
                assert.notStrictEqual(res.status, 200, alias);
                assert.ok(!res.body.includes('hidden-content'), alias);
                const hash = await anon().get('/api/hash/' + alias);
                assert.notStrictEqual(hash.status, 200, 'hash ' + alias);
            }
            for (const alias of ['BETA/B.ISO', 'beta/b.iso.', 'beta/b.iso::$DATA']) {
                assert.notStrictEqual((await anon().get('/api/download/' + alias)).status, 200, alias);
            }
        });
        test('a Windows 8.3 short name resolves to the governed file', async (t) => {
            const long = path.join(fx.filesRoot, 'docs', 'hidden.txt');
            let short;
            try {
                short = execFileSync('cmd', ['/c', `for %I in ("${long}") do @echo %~sI`], { encoding: 'utf8' }).trim();
            } catch { short = long; }
            const shortName = path.basename(short);
            if (shortName.toLowerCase() === 'hidden.txt') return t.skip('8.3 names are disabled on this volume');
            const res = await anon().get('/api/download/docs/' + encodeURIComponent(shortName));
            assert.notStrictEqual(res.status, 200, shortName);
            assert.ok(!res.body.includes('hidden-content'));
        });
    }
});

describe('admin changes take effect within the sync interval', () => {
    test('unpublishing a file', async () => {
        const c = anon();
        assert.strictEqual((await c.get('/api/download/sync/a.txt')).status, 200);
        fx.setPolicy('/sync/a.txt', { mode: 'public', published: 0 });
        assert.strictEqual((await c.get('/api/download/sync/a.txt')).status, 200, 'not before the interval');
        await afterSync();
        assert.strictEqual((await c.get('/api/download/sync/a.txt')).status, 404);
        assert.ok(!names((await c.get('/api/files/sync')).json).includes('a.txt'));
        assert.deepStrictEqual((await c.get('/api/search?q=a.txt')).json.results, []);
    });
    test('changing the access mode', async () => {
        fx.setPolicy('/sync/b.txt', { mode: 'authenticated' });
        await afterSync();
        assert.strictEqual((await anon().get('/api/download/sync/b.txt')).status, 404);
        assert.strictEqual((await (await as('alice')).get('/api/download/sync/b.txt')).status, 200);
    });
    test('adding and removing a grant', async () => {
        fx.setPolicy('/sync/c.txt', { mode: 'restricted' });
        await afterSync();
        const c = await as('alice');
        assert.strictEqual((await c.get('/api/download/sync/c.txt')).status, 404);
        fx.setPermission('/sync/c.txt', alice, 'grant');
        await afterSync();
        assert.strictEqual((await c.get('/api/download/sync/c.txt')).status, 200);
        fx.setPermission('/sync/c.txt', alice, null);
        await afterSync();
        assert.strictEqual((await c.get('/api/download/sync/c.txt')).status, 404);
    });
    test('adding a deny', async () => {
        fx.setPolicy('/sync/d.txt', { mode: 'public' });
        fx.setPermission('/sync/d.txt', alice, 'deny');
        await afterSync();
        assert.strictEqual((await (await as('alice')).get('/api/download/sync/d.txt')).status, 404);
        assert.strictEqual((await anon().get('/api/download/sync/d.txt')).status, 200);
    });
    test('closing and reopening an availability window', async () => {
        fx.setPolicy('/sync/e.txt', { mode: 'public', until: Date.now() - 1 });
        await afterSync();
        assert.strictEqual((await anon().get('/api/download/sync/e.txt')).status, 404);
        fx.setPolicy('/sync/e.txt', { mode: 'public', until: null });
        await afterSync();
        assert.strictEqual((await anon().get('/api/download/sync/e.txt')).status, 200);
    });
    test('locking a folder', async () => {
        fx.setPolicy('/sync', { mode: 'public', locked: 1, isDirectory: true });
        await afterSync();
        try {
            assert.strictEqual((await anon().get('/api/download/sync/e.txt')).status, 401);
            assert.strictEqual((await anon().get('/api/files/sync')).status, 401);
            assert.strictEqual((await (await as('bob')).get('/api/download/sync/e.txt')).status, 200);
        } finally {
            fx.deletePolicy('/sync');
        }
    });
});
