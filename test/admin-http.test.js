/**
 * @file test/admin-http.test.js
 * @brief Integration over the admin's HTTP contract v1 (isolate-app-roots):
 *        source selection, startup, polling and fail-closed behaviour, sign-in
 *        delegation, the ops endpoints the admin calls, and parity with the
 *        SQLite source on the fixtures shared with the admin repository.
 */
'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { createFixture, client, applyEnv } = require('./helpers/admin-fixture');

const FIXTURES = path.join(__dirname, 'contract', 'portal-v1');
const SNAPSHOT = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'snapshot.json'), 'utf8'));
const CASES = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'cases.json'), 'utf8')).cases;
const TOKEN = 's'.repeat(40);
const PASSWORDS = { alice: 'alice-password', bob: 'bob-password', carol: 'carol-password', dave: 'dave-password' };

const adminDb = () => require('../lib/admin-db');

/** A stand-in for the Admin Files Manager's integration routes. */
function fakeAdmin() {
    const state = { doc: structuredClone(SNAPSHOT), snapshotCalls: 0, conditional: 0, verifyCalls: [], status: 200 };
    const server = http.createServer((req, res) => {
        let raw = '';
        req.on('data', (c) => { raw += c; });
        req.on('end', () => {
            if (req.headers.authorization !== `Bearer ${TOKEN}`) { res.writeHead(401); return res.end(); }
            if (req.url === '/api/v1/integration/portal/snapshot') {
                state.snapshotCalls++;
                if (state.status !== 200) { res.writeHead(state.status); return res.end(); }
                const body = JSON.stringify(state.doc);
                const etag = '"' + crypto.createHash('sha256').update(body).digest('base64url') + '"';
                if (req.headers['if-none-match'] === etag) { state.conditional++; res.writeHead(304, { ETag: etag }); return res.end(); }
                res.writeHead(200, { 'Content-Type': 'application/json', ETag: etag });
                return res.end(body);
            }
            if (req.url === '/api/v1/integration/portal/credentials/verify') {
                const { username, password } = JSON.parse(raw || '{}');
                state.verifyCalls.push({ username, clientIp: req.headers['x-portal-client-ip'] });
                const user = state.doc.users.find((u) => u.username === username);
                if (!user || PASSWORDS[username] !== password || user.status !== 'active') { res.writeHead(401); return res.end(); }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ userId: user.id, credentialStamp: user.credentialStamp }));
            }
            res.writeHead(404); res.end();
        });
    });
    return {
        state,
        async listen() { await new Promise((r) => server.listen(0, '127.0.0.1', r)); return `http://127.0.0.1:${server.address().port}`; },
        close: () => new Promise((r) => { server.closeAllConnections(); server.close(r); }),
    };
}

/** Writes snapshot.json's data into the SQLite fixture, as the admin stores it. */
function seedSqlite(fx, doc) {
    fx.useVolume({ volumeId: doc.volumeId });
    for (const u of doc.users) {
        fx.exec('INSERT INTO users (id, username, password_hash, role, status, locked_until, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, 1)',
            u.id, u.username, `fixture-hash-${u.username}`, u.role, u.status, u.lockedUntil);
        if (u.sessionsRevokedAt !== null) fx.revokeSessions(u.id, { at: u.sessionsRevokedAt });
    }
    for (const p of doc.policies) {
        fx.exec('INSERT INTO files (id, client_path, is_directory, created_at, updated_at) VALUES (?, ?, ?, 1, 1)', p.fileId, p.clientPath, p.isDirectory ? 1 : 0);
        fx.exec('INSERT INTO file_access_policies (file_id, access_mode, is_published, is_locked, available_from, available_until, default_level, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)',
            p.fileId, p.accessMode, p.isPublished ? 1 : 0, p.isLocked ? 1 : 0, p.availableFrom, p.availableUntil, p.defaultLevel);
    }
    for (const g of doc.userGrants) {
        fx.exec('INSERT INTO user_file_permissions (file_id, user_id, permission, level, created_at) VALUES (?, ?, ?, ?, 1)', g.fileId, g.userId, g.permission, g.level);
    }
    for (const id of new Set(doc.groupMembers.map((m) => m.groupId))) fx.exec('INSERT INTO user_groups (id, name, created_at, updated_at) VALUES (?, ?, 1, 1)', id, `group-${id}`);
    for (const m of doc.groupMembers) fx.exec('INSERT INTO user_group_members (group_id, user_id, created_at) VALUES (?, ?, 1)', m.groupId, m.userId);
    for (const g of doc.groupGrants) {
        fx.exec('INSERT INTO group_file_permissions (file_id, group_id, permission, level, created_at) VALUES (?, ?, ?, ?, 1)', g.fileId, g.groupId, g.permission, g.level);
    }
    fx.setNav(doc.nav.map((n) => ({ path: n.clientPath, label: n.label, hideFromHome: n.hideFromHome })));
    fx.setSetting('release_client_path', doc.releaseClientPath);
    fx.setSetting('portal.auth_session_minutes', doc.auth.sessionMinutes);
    fx.setSetting('portal.max_failed_attempts', doc.auth.maxFailedAttempts);
    fx.setSetting('portal.lockout_minutes', doc.auth.lockoutMinutes);
}

/** A snapshot as plain data, without what legitimately differs by source (password record forms). */
function comparable(snap) {
    const users = [...snap.userById.values()].map(({ passwordHash, pwFingerprint, ...rest }) => rest);
    const grants = [...snap.grants].map(([fileId, byUser]) => [fileId, [...byUser]]);
    return { users, userIdByName: [...snap.userIdByName], policyByPath: [...snap.policyByPath], grants, nav: snap.nav, settings: snap.settings, position: snap.position };
}

const fx = createFixture({ tree: { 'pub/a.iso': 'A', 'team/x.iso': 'X', 'team/view-only.txt': 'V', 'rel/el9/a.rpm': 'R' } });
const admin = fakeAdmin();
let adminUrl;
let base;

before(async () => {
    seedSqlite(fx, SNAPSHOT);
    adminUrl = await admin.listen();
    base = await fx.start({
        ADMIN_DB_PATH: undefined, ADMIN_API_URL: adminUrl, ADMIN_SERVICE_TOKEN: TOKEN, ADMIN_SYNC_TTL_MS: '1000',
    });
    assert.deepStrictEqual(await adminDb().start(), []);
});
after(async () => {
    adminDb().resetForTests();
    await fx.stop();
    await admin.close();
    applyEnv({ ADMIN_API_URL: undefined, ADMIN_SERVICE_TOKEN: undefined });
    fx.cleanup();
});

describe('source selection (design P2)', () => {
    const withEnv = (vars, fn) => {
        const saved = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
        applyEnv(vars);
        try { return fn(); } finally { applyEnv(saved); }
    };

    test('URL + token: HTTP source', () => {
        assert.strictEqual(adminDb().resolveConfig().source, 'http');
    });

    test('both ADMIN_API_URL and ADMIN_DB_PATH: refused as ambiguous', () => {
        const cfg = withEnv({ ADMIN_DB_PATH: fx.dbPath }, () => adminDb().resolveConfig());
        assert.ok(cfg.problems.some((p) => p.includes('both set')), cfg.problems.join('\n'));
    });

    test('a short token, a remote plain-http URL, or a URL with a path: refused, never quoting the token', () => {
        for (const [vars, needle] of [
            [{ ADMIN_SERVICE_TOKEN: 'short' }, 'at least 32'],
            [{ ADMIN_API_URL: 'http://admin.example.com' }, 'https'],
            [{ ADMIN_API_URL: adminUrl + '/api' }, 'origin only'],
        ]) {
            const cfg = withEnv(vars, () => adminDb().resolveConfig());
            assert.ok(cfg.problems.some((p) => p.includes(needle)), cfg.problems.join('\n'));
            assert.ok(!cfg.problems.join('').includes('short'));
        }
    });

    test('ADMIN_API_URL without ADMIN_INTEGRATION_ENABLED=true: refused, never legacy', () => {
        const cfg = withEnv({ ADMIN_INTEGRATION_ENABLED: undefined }, () => adminDb().resolveConfig());
        assert.strictEqual(cfg.mode, 'integration');
        assert.ok(cfg.problems.length);
    });
});

describe('parity with the SQLite source (shared fixtures)', () => {
    test('both sources build the same snapshot from the same admin data', () => {
        const sqlite = adminDb().snapshotFromRows(require('../lib/admin/policy-source-sqlite').readRows(fx.dbPath, adminDb().KNOWN_SCHEMA_VERSION).rows);
        const viaHttp = adminDb().snapshotFromRows(require('../lib/admin/policy-source-http').toRows(SNAPSHOT));
        assert.deepStrictEqual(comparable(viaHttp), comparable(sqlite));
    });

    test('every shared decision case, decided from the HTTP snapshot', () => {
        const accessPolicy = require('../lib/access-policy');
        for (const c of CASES) {
            assert.deepStrictEqual(accessPolicy.explain(c.clientPath, c.userId, c.now),
                { outcome: c.outcome, policies: c.policies }, `${c.clientPath} as ${c.userId} at ${c.now}`);
        }
    });
});

describe('polling', () => {
    test('an unchanged admin answers 304 and the snapshot stays in use', async () => {
        const before = admin.state.conditional;
        await new Promise((r) => setTimeout(r, 900));
        assert.ok(admin.state.conditional > before, 'a conditional poll was answered 304');
        assert.ok(adminDb().getSnapshot());
    });

    test('a newer contract is refused and governed content fails closed', async () => {
        admin.state.doc.contract = 2;
        try {
            await assert.rejects(() => require('../lib/admin-db').start().then((p) => { if (p.length) throw new Error(p[0]); }), /newer than this portal understands/);
            const res = await client(base).get('/api/files/team');
            assert.strictEqual(res.status, 503);
        } finally {
            admin.state.doc.contract = 1;
            assert.deepStrictEqual(await adminDb().start(), []);
        }
    });

    test('an admin outage fails closed (503) until a refresh succeeds again', async () => {
        admin.state.status = 500;
        try {
            await new Promise((r) => setTimeout(r, 1200));
            assert.throws(() => adminDb().getSnapshot(), /unavailable/);
            assert.strictEqual((await client(base).get('/api/files/team')).status, 503);
        } finally {
            admin.state.status = 200;
        }
        assert.deepStrictEqual(await adminDb().start(), []);
        assert.ok(adminDb().getSnapshot());
    });
});

describe('sign-in is verified by the admin', () => {
    test('right password: signed in, with the caller address forwarded', async () => {
        const browser = client(base);
        const res = await browser.login('alice', PASSWORDS.alice);
        assert.strictEqual(res.status, 200, JSON.stringify(res.json));
        const call = admin.state.verifyCalls.at(-1);
        assert.strictEqual(call.username, 'alice');
        assert.match(call.clientIp, /^10\.0\./);
        assert.strictEqual((await browser.get('/api/files/team')).status, 200);
    });

    test('wrong password and disabled user: 401', async () => {
        assert.strictEqual((await client(base).login('alice', 'nope')).status, 401);
        assert.strictEqual((await client(base).login('carol', PASSWORDS.carol)).status, 401);
    });

    test('a password change in the admin ends the session at the next snapshot', async () => {
        const browser = client(base);
        assert.strictEqual((await browser.login('bob', PASSWORDS.bob)).status, 200);
        assert.strictEqual((await browser.get('/api/auth/status')).json.authenticated, true);
        const bob = admin.state.doc.users.find((u) => u.username === 'bob');
        const saved = bob.credentialStamp;
        bob.credentialStamp = 'f'.repeat(32);
        try {
            await new Promise((r) => setTimeout(r, 1100));
            assert.strictEqual((await browser.get('/api/auth/status')).json.authenticated, false);
        } finally {
            bob.credentialStamp = saved;
        }
    });

    test('a username locked by the portal is refused without asking the admin', async () => {
        const limit = SNAPSHOT.auth.maxFailedAttempts;
        for (let i = 0; i < limit; i++) await client(base).login('dave', 'wrong');
        const calls = admin.state.verifyCalls.length;
        const res = await client(base).login('dave', PASSWORDS.dave);
        assert.strictEqual(res.status, 429);
        assert.strictEqual(admin.state.verifyCalls.length, calls);
    });
});

describe('ops endpoints for the admin', () => {
    const ops = (urlPath, { token = TOKEN, body } = {}) => fetch(base + urlPath, {
        method: body ? 'POST' : 'GET',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    });

    test('GET /api/ops/log: newest first from LOG_FILE', async () => {
        const logFile = path.join(fx.dir, 'portal.log');
        fs.writeFileSync(logFile, '{"msg":"one"}\nnot json\n{"msg":"two"}\n');
        applyEnv({ LOG_FILE: logFile });
        try {
            const res = await ops('/api/ops/log?limit=5');
            assert.strictEqual(res.status, 200);
            assert.deepStrictEqual(await res.json(), { available: true, entries: [{ msg: 'two' }, { msg: 'one' }] });
            applyEnv({ LOG_FILE: 'off' });
            assert.deepStrictEqual(await (await ops('/api/ops/log')).json(), { available: false, entries: [] });
        } finally {
            applyEnv({ LOG_FILE: undefined });
        }
    });

    test('POST /api/ops/access-check: the portal decision in the admin shape', async () => {
        const res = await ops('/api/ops/access-check', { body: { clientPath: '/team/x.iso', userId: 2 } });
        assert.strictEqual(res.status, 200);
        assert.deepStrictEqual(await res.json(), { outcome: 'view', policies: [{ path: '/team', outcome: 'view' }] });
        assert.strictEqual((await ops('/api/ops/access-check', { body: { clientPath: '/x', userId: 999 } })).status, 404);
        assert.strictEqual((await ops('/api/ops/access-check', { body: { clientPath: 'no-slash', userId: null } })).status, 400);
    });

    test('a wrong or missing token is 401; no token configured: the routes do not exist', async () => {
        assert.strictEqual((await ops('/api/ops/log', { token: 'x'.repeat(40) })).status, 401);
        assert.strictEqual((await ops('/api/ops/log', { token: null })).status, 401);
        applyEnv({ ADMIN_SERVICE_TOKEN: undefined });
        try {
            assert.strictEqual((await ops('/api/ops/log')).status, 404);
        } finally {
            applyEnv({ ADMIN_SERVICE_TOKEN: TOKEN });
        }
    });
});
