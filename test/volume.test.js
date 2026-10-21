/**
 * @file test/volume.test.js
 * @brief Admin schema v5: FILES_ROOT is proven to be the admin STORAGE_ROOT by
 *        the .dimension-volume marker; the release folder and auth tunables
 *        come from integration_settings; production paths must be absolute.
 *        Spec: openspec/changes/decouple-storage-and-release-paths/specs/admin-integration-paths.
 */
'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('assert');
const path = require('path');
const { createFixture, client, applyEnv } = require('./helpers/admin-fixture');
const adminDb = require('../lib/admin-db');
const { productionPathProblems } = require('../lib/load-env');

const TTL_MS = 1000;
const afterSync = () => new Promise((r) => setTimeout(r, TTL_MS + 150));

const fx = createFixture({
    tree: {
        'docs/readme.txt': 'hello',
        'builds/el9/pvm-release-2.0.0-el9.tgz': 'b9',
        'release/el9/pvm-release-1.0.0-el9.tgz': 'r9',
    },
});

let base;
let volumeId;
const anon = () => client(base);

before(async () => {
    fx.addUser({ username: 'alice' });
    volumeId = fx.useVolume();
    base = await fx.start({ ADMIN_SYNC_TTL_MS: String(TTL_MS), RELEASE_PVM: path.join(fx.filesRoot, 'release') });
});
after(async () => { await fx.stop(); fx.cleanup(); });

describe('storage volume check', () => {
    test('a matching marker starts integration mode', () => {
        assert.deepStrictEqual(adminDb.validateStartup(), []);
    });

    test('a missing, foreign or unreadable marker still starts: FILES_ROOT is mapped to "/" (isolate-app-roots)', () => {
        const other = '00000000-0000-4000-8000-000000000000';
        try {
            for (const marker of [() => fx.writeMarker(other), () => fx.writeMarker(null, '/', 'not json')]) {
                marker();
                assert.deepStrictEqual(adminDb.validateStartup(), []);
                assert.deepStrictEqual(adminDb.locate(volumeId, null), { position: '/', verified: false });
            }
            fx.setSetting('volume_id', null);
            assert.deepStrictEqual(adminDb.validateStartup(), []);
        } finally {
            fx.setSetting('volume_id', volumeId);
            fx.writeMarker(volumeId);
        }
    });

    test('a marker that changes while running keeps serving under the mapped position', async () => {
        assert.strictEqual((await anon().get('/api/files/docs')).status, 200);
        fx.writeMarker('00000000-0000-4000-8000-000000000000');
        await afterSync();
        try {
            assert.strictEqual((await anon().get('/api/files/docs')).status, 200);
            assert.strictEqual(adminDb.position(), '/');
        } finally {
            fx.writeMarker(volumeId);
        }
        await afterSync();
        assert.strictEqual((await anon().get('/api/files/docs')).status, 200);
    });

    test('the marker is never listed or served', async () => {
        const root = await anon().get('/api/files/');
        assert.strictEqual(root.status, 200);
        assert.ok(!JSON.stringify(root.json).includes('.dimension-volume'));
        for (const url of ['/api/download/.dimension-volume', '/api/hash/.dimension-volume']) {
            assert.strictEqual((await anon().get(url)).status, 404, url);
        }
        const search = await anon().get('/api/search?q=dimension');
        assert.ok(!JSON.stringify(search.json).includes('.dimension-volume'));
    });
});

describe('release folder from the admin database', () => {
    test('release_client_path wins over RELEASE_PVM', async () => {
        fx.setSetting('release_client_path', '/builds');
        await afterSync();
        try {
            const res = await anon().get('/api/releases?os=el9');
            assert.strictEqual(res.status, 200);
            assert.deepStrictEqual(res.json.items.map((i) => i.name), ['pvm-release-2.0.0-el9.tgz']);
            assert.strictEqual(res.json.browsePath, 'builds/el9');
            assert.strictEqual((await anon().get('/release9/latest')).body.toString(), 'b9');
        } finally {
            fx.setSetting('release_client_path', null);
        }
    });

    test('the admin lock on that folder protects releases', async () => {
        fx.setSetting('release_client_path', '/builds');
        fx.setPolicy('/builds', { mode: 'public', locked: 1, isDirectory: true });
        await afterSync();
        try {
            assert.strictEqual((await anon().get('/api/releases?os=el9')).status, 401);
            assert.strictEqual((await anon().get('/release9/latest')).status, 401);
        } finally {
            fx.deletePolicy('/builds');
            fx.setSetting('release_client_path', null);
        }
    });

    test('no release folder: RELEASE_PVM is ignored and the whole root is scanned', async () => {
        await afterSync();
        const res = await anon().get('/api/releases');
        assert.strictEqual(res.status, 200);
        const names = res.json.items.map((i) => i.name);
        // builds/ is outside RELEASE_PVM (release/): found only because the root is scanned.
        assert.ok(names.includes('pvm-release-2.0.0-el9.tgz'), names.join());
        assert.ok(names.includes('pvm-release-1.0.0-el9.tgz'), names.join());
    });

    test('an invalid stored value is ignored, never followed', async () => {
        fx.setSetting('release_client_path', '/../outside');
        await afterSync();
        try {
            assert.strictEqual(adminDb.releaseClientPath(), null);
        } finally {
            fx.setSetting('release_client_path', null);
        }
    });
});

describe('releases behind a lock, with no release folder set (the whole root is scanned)', () => {
    test('a locked folder holding the only releases asks for sign-in instead of "no releases"', async () => {
        fx.setPolicy('/release', { mode: 'authenticated', locked: 1, isDirectory: true });
        fx.setPolicy('/builds', { mode: 'authenticated', locked: 1, isDirectory: true });
        await afterSync();
        try {
            // The Release page asks per OS tab (?os=); the unfiltered root scan
            // also lists other visible files, so it is not empty here.
            for (const url of ['/api/releases?os=el9', '/release9/latest']) {
                const res = await anon().get(url);
                assert.strictEqual(res.status, 401, url);
                assert.strictEqual(res.json.code, 'AUTH_REQUIRED', url);
            }
            const user = client(base);
            assert.strictEqual((await user.login('alice', 'password123')).status, 200);
            const names = (await user.get('/api/releases')).json.items.map((i) => i.name);
            assert.ok(names.includes('pvm-release-1.0.0-el9.tgz'), names.join());
        } finally {
            fx.deletePolicy('/release');
            fx.deletePolicy('/builds');
        }
    });

    test('releases a visitor may see are still listed when another folder is locked', async () => {
        fx.setPolicy('/release', { mode: 'authenticated', locked: 1, isDirectory: true });
        await afterSync();
        try {
            const res = await anon().get('/api/releases');
            assert.strictEqual(res.status, 200);
            const names = res.json.items.map((i) => i.name);
            assert.ok(names.includes('pvm-release-2.0.0-el9.tgz'), names.join());
            assert.ok(!names.includes('pvm-release-1.0.0-el9.tgz'), 'nothing inside the locked folder is listed');
            assert.ok(!('lockedSkipped' in res.json), 'internal flag never leaves the server');
        } finally {
            fx.deletePolicy('/release');
        }
    });
});

describe('auth tunables from the admin database', () => {
    test('session length follows the admin value, then env', async () => {
        const login = async () => (await client(base).login('alice', 'password123')).json.expiresIn;
        assert.strictEqual(await login(), 30 * 60); // AUTH_SESSION_MINUTES from fx.start
        fx.setSetting('portal.auth_session_minutes', '90');
        await afterSync();
        try {
            assert.strictEqual(await login(), 90 * 60);
            fx.setSetting('portal.auth_session_minutes', '0'); // out of range
            await afterSync();
            assert.strictEqual(await login(), 30 * 60);
        } finally {
            fx.setSetting('portal.auth_session_minutes', null);
        }
    });

    test('failed-attempt limit follows the admin value', async () => {
        fx.setSetting('portal.max_failed_attempts', '2');
        await afterSync();
        try {
            assert.strictEqual(adminDb.tunable('maxFailedAttempts'), 2);
            const c = client(base);
            await c.login('alice', 'wrong-1');
            await c.login('alice', 'wrong-2');
            assert.strictEqual((await c.login('alice', 'password123')).status, 429);
        } finally {
            fx.setSetting('portal.max_failed_attempts', null);
        }
    });
});

describe('admin schema v4 during rollout', () => {
    test('no volume check and RELEASE_PVM still applies', async () => {
        const v4 = createFixture({ tree: { 'release/el9/pvm-release-1.0.0-el9.tgz': 'r9', 'docs/a.txt': 'a' } });
        v4.useLevels();
        await fx.stop();
        try {
            const v4Base = await v4.start({ RELEASE_PVM: path.join(v4.filesRoot, 'release') });
            assert.deepStrictEqual(adminDb.validateStartup(), []);
            assert.strictEqual(adminDb.releaseClientPath(), undefined);
            const res = await client(v4Base).get('/api/releases?os=el9');
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.json.browsePath, 'release/el9');
        } finally {
            await v4.stop();
            v4.cleanup();
            base = await fx.start({ ADMIN_SYNC_TTL_MS: String(TTL_MS), RELEASE_PVM: path.join(fx.filesRoot, 'release') });
        }
    });
});

describe('production paths', () => {
    test('relative paths and a missing PORTAL_DATA_DIR refuse startup in production', () => {
        const problems = productionPathProblems({
            NODE_ENV: 'production', ADMIN_DB_PATH: './admin.sqlite', FILES_ROOT: path.resolve('/srv/files'), LOG_FILE: 'off',
        });
        assert.strictEqual(problems.length, 2, problems.join('\n'));
        assert.match(problems[0], /PORTAL_DATA_DIR is required/);
        assert.match(problems[1], /ADMIN_DB_PATH must be an absolute path/);
    });

    test('AUTH_USERS_FILE is not checked in integration mode, where users.json is never read', () => {
        const base = { NODE_ENV: 'production', PORTAL_DATA_DIR: path.resolve('/srv/data'), AUTH_USERS_FILE: './data/users.json' };
        assert.deepStrictEqual(productionPathProblems({ ...base, ADMIN_INTEGRATION_ENABLED: 'true' }), []);
        assert.match(productionPathProblems(base)[0], /AUTH_USERS_FILE must be an absolute path/);
    });

    test('absolute paths pass; development keeps relative values', () => {
        const abs = (p) => path.resolve('/srv', p);
        assert.deepStrictEqual(productionPathProblems({
            NODE_ENV: 'production', PORTAL_DATA_DIR: abs('data'), FILES_ROOT: abs('files'), ADMIN_DB_PATH: abs('admin.sqlite'),
        }), []);
        assert.deepStrictEqual(productionPathProblems({ ADMIN_DB_PATH: './admin.sqlite' }), []);
    });

    test('default data files live under PORTAL_DATA_DIR', () => {
        const dir = path.resolve('/srv/portal-data');
        applyEnv({ PORTAL_DATA_DIR: dir, AUTH_USERS_FILE: undefined });
        try {
            assert.strictEqual(require('../lib/auth-service').getUsersFilePath('/ignored'), path.join(dir, 'users.json'));
        } finally {
            applyEnv({ PORTAL_DATA_DIR: undefined });
        }
    });
});

describe('FILES_ROOT anywhere in the admin storage (admin <tmp>/, portal <tmp>/storage)', () => {
    // The fixture's parent folder plays the admin STORAGE_ROOT: its root marker
    // sits one level above FILES_ROOT, so the portal is the admin folder /storage.
    const fsMod = require('fs');
    const sub = createFixture({
        tree: {
            'docs/readme.txt': 'hello',
            'docs/team/a.txt': 'a',
            'secret/plan.txt': 'p',
            'pvm/el9/pvm-release-3.0.0-el9.tgz': 'p9',
        },
    });
    const ROOT_MARKER = path.join(path.dirname(sub.filesRoot), '.dimension-volume');
    const OWN_MARKER = path.join(sub.filesRoot, '.dimension-volume');
    let subBase;
    let subId;
    const anonSub = () => client(subBase);
    const writeRootMarker = () => fsMod.writeFileSync(ROOT_MARKER, JSON.stringify({ volumeId: subId, clientPath: '/' }));
    const located = () => adminDb.locate(subId, null);

    before(async () => {
        await fx.stop();
        sub.addUser({ username: 'bob' });
        subId = sub.useVolume({ marker: false }); // nothing published, no marker in FILES_ROOT
        writeRootMarker();
        subBase = await sub.start({ ADMIN_SYNC_TTL_MS: String(TTL_MS) });
    });
    after(async () => {
        await sub.stop();
        sub.cleanup();
        base = await fx.start({ ADMIN_SYNC_TTL_MS: String(TTL_MS), RELEASE_PVM: path.join(fx.filesRoot, 'release') });
    });

    test('with nothing configured in the admin, FILES_ROOT locates itself as /storage', () => {
        assert.deepStrictEqual(adminDb.validateStartup(), []);
        assert.strictEqual(adminDb.position(), '/storage');
        assert.strictEqual(adminDb.clientPathOf('docs/readme.txt', '/storage'), '/storage/docs/readme.txt');
    });

    test('a deeper FILES_ROOT locates itself too', () => {
        const saved = process.env.FILES_ROOT;
        process.env.FILES_ROOT = path.join(sub.filesRoot, 'docs', 'team');
        try {
            assert.deepStrictEqual(located(), { position: '/storage/docs/team', verified: true });
        } finally {
            process.env.FILES_ROOT = saved;
        }
    });

    test('policies on the path, on FILES_ROOT\'s folder and on an ancestor all govern; same-named paths elsewhere do not', async () => {
        sub.setPolicy('/storage/secret', { mode: 'public', published: 0, isDirectory: true });
        await afterSync();
        try {
            assert.strictEqual((await anonSub().get('/api/files/secret')).status, 404);
            assert.strictEqual((await anonSub().get('/api/download/docs/readme.txt')).status, 200);
            sub.setPolicy('/', { mode: 'public', locked: 1, isDirectory: true });
            await afterSync();
            assert.strictEqual((await anonSub().get('/api/download/docs/readme.txt')).status, 401);
        } finally {
            sub.deletePolicy('/storage/secret');
            sub.deletePolicy('/');
        }
        sub.setPolicy('/docs', { mode: 'public', published: 0, isDirectory: true });
        await afterSync();
        try {
            assert.strictEqual((await anonSub().get('/api/download/docs/readme.txt')).status, 200);
        } finally {
            sub.deletePolicy('/docs');
        }
    });

    test('the outermost storage-root marker wins over a stale copy inside the tree', () => {
        for (const stale of [{ clientPath: '/' }, { clientPath: '/old' }]) {
            fsMod.writeFileSync(OWN_MARKER, JSON.stringify({ volumeId: subId, ...stale }));
            try {
                assert.deepStrictEqual(located(), { position: '/storage', verified: true }, JSON.stringify(stale));
            } finally {
                fsMod.rmSync(OWN_MARKER);
            }
        }
    });

    test('a host that cannot see the storage root: the published folder marker verifies, otherwise it is mapped', () => {
        fsMod.rmSync(ROOT_MARKER);
        fsMod.writeFileSync(OWN_MARKER, JSON.stringify({ volumeId: subId, clientPath: '/storage' }));
        try {
            assert.deepStrictEqual(adminDb.locate(subId, null), { position: '/', verified: false });
            assert.deepStrictEqual(adminDb.locate(subId, '/storage'), { position: '/storage', verified: true });
            assert.deepStrictEqual(adminDb.locate(subId, '/other'), { position: '/other', verified: false });
        } finally {
            fsMod.rmSync(OWN_MARKER);
            writeRootMarker();
        }
    });

    test('losing every trusted marker while running maps FILES_ROOT to "/" instead of refusing', async () => {
        assert.strictEqual((await anonSub().get('/api/files/docs')).status, 200);
        fsMod.rmSync(ROOT_MARKER);
        await afterSync();
        try {
            assert.strictEqual((await anonSub().get('/api/files/docs')).status, 200);
            assert.strictEqual(adminDb.position(), '/');
        } finally {
            writeRootMarker();
        }
        await afterSync();
        assert.strictEqual((await anonSub().get('/api/files/docs')).status, 200);
    });

    test('the release folder is a full admin path; it is used only inside this portal', async () => {
        sub.setSetting('release_client_path', '/storage/pvm');
        await afterSync();
        try {
            const res = await anonSub().get('/api/releases?os=el9');
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.json.browsePath, 'pvm/el9');
            assert.strictEqual((await anonSub().get('/release9/latest')).body.toString(), 'p9');
            sub.setSetting('release_client_path', '/pvm');
            await afterSync();
            assert.strictEqual(adminDb.releaseRelPath(), null);
        } finally {
            sub.setSetting('release_client_path', null);
        }
    });

    test('navbar folders outside this portal are dropped, inside ones are portal-relative', async () => {
        sub.setNav([{ path: '/storage/docs', label: 'Docs' }, { path: '/elsewhere' }, { path: '/storage' }]);
        await afterSync();
        try {
            assert.deepStrictEqual(adminDb.navFolders().map((f) => f.relPath), ['docs']);
        } finally {
            sub.setNav([]);
        }
    });
});

describe('FILES_ROOT at any path (isolate-app-roots)', () => {
    const fsMod = require('fs');
    const os = require('os');
    const elsewhere = fsMod.mkdtempSync(path.join(os.tmpdir(), 'portal-anywhere-'));
    fsMod.mkdirSync(path.join(elsewhere, 'docs'));
    fsMod.writeFileSync(path.join(elsewhere, 'docs', 'readme.txt'), 'hi');
    const withEnv = async (vars, fn) => {
        const saved = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
        applyEnv(vars);
        adminDb.resetSnapshot();
        try { return await fn(); } finally { applyEnv(saved); adminDb.resetSnapshot(); }
    };
    after(() => fsMod.rmSync(elsewhere, { recursive: true, force: true }));

    test('a folder unrelated to the admin storage starts and is served', () => withEnv({ FILES_ROOT: elsewhere }, async () => {
        assert.deepStrictEqual(adminDb.validateStartup(), []);
        assert.strictEqual(adminDb.position(), '/');
        assert.strictEqual((await anon().get('/api/files/docs')).status, 200);
    }));

    test('admin policies apply by path under the mapped folder', () => withEnv({ FILES_ROOT: elsewhere }, async () => {
        fx.setPolicy('/docs', { mode: 'public', published: 0, isDirectory: true });
        adminDb.resetSnapshot();
        try {
            assert.strictEqual((await anon().get('/api/files/docs')).status, 404);
        } finally {
            fx.deletePolicy('/docs');
        }
    }));

    test('FILES_ROOT_ADMIN_PATH names the admin folder explicitly, even over a marker', () => withEnv({ FILES_ROOT: elsewhere, FILES_ROOT_ADMIN_PATH: '/Downloads/' }, () => {
        assert.deepStrictEqual(adminDb.validateStartup(), []);
        assert.deepStrictEqual(adminDb.locate(volumeId, null), { position: '/Downloads', verified: false });
        assert.strictEqual(adminDb.position(), '/Downloads');
    }));

    test('an invalid FILES_ROOT_ADMIN_PATH refuses startup', () => withEnv({ FILES_ROOT: elsewhere, FILES_ROOT_ADMIN_PATH: 'Downloads/../x' }, () => {
        assert.match(adminDb.validateStartup().join('\n'), /FILES_ROOT_ADMIN_PATH must be an absolute admin client path/);
    }));
});

