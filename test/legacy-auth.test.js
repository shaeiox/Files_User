/**
 * @file test/legacy-auth.test.js
 * @brief Legacy mode (portal data/users.json, no admin integration): removing a
 *        user from users.json ends their existing session.
 */
'use strict';

const { test, before, after } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const { applyEnv, client } = require('./helpers/admin-fixture');
const authService = require('../lib/auth-service');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-legacy-'));
const usersFile = path.join(dir, 'users.json');
let server;
let base;

before(async () => {
    fs.mkdirSync(path.join(dir, 'storage', 'docs'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'storage', 'release', 'el9'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'storage', 'release', 'el9', 'pvm-release-1.0.0-el9.tgz'), 'r9');
    applyEnv({
        ADMIN_INTEGRATION_ENABLED: undefined,
        ADMIN_DB_PATH: undefined,
        RELEASE_PVM: undefined,
        FILES_ROOT: path.join(dir, 'storage'),
        AUTH_ENABLED: 'true',
        AUTH_JWT_SECRET: 'test-secret-'.padEnd(48, 'x'),
        AUTH_USERS_FILE: usersFile,
    });
    const passwordHash = await authService.hashPassword('password123');
    fs.writeFileSync(usersFile, JSON.stringify({ users: [{ id: 'u1', username: 'legacy1', passwordHash }] }));
    const apiRouter = require('../lib/api-router');
    server = http.createServer((req, res) => apiRouter.handleRequest(req, res, ROOT, 0));
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
});

test('legacy mode keeps the .env release gate', async () => {
    applyEnv({ RELEASE_PVM: path.join(dir, 'storage', 'release') });
    try {
        for (const url of ['/api/releases', '/release9/latest', '/api/download/release/el9/pvm-release-1.0.0-el9.tgz']) {
            assert.strictEqual((await client(base).get(url)).status, 401, url);
        }
        const c = client(base);
        assert.strictEqual((await c.login('legacy1', 'password123')).status, 200);
        assert.strictEqual((await c.get('/release9/latest')).body.toString(), 'r9');
    } finally {
        applyEnv({ RELEASE_PVM: undefined });
    }
});

test('legacy release gate is not bypassed via the query string or an extra separator', async () => {
    applyEnv({ RELEASE_PVM: path.join(dir, 'storage', 'release') });
    const file = 'release/el9/pvm-release-1.0.0-el9.tgz';
    try {
        const anon = client(base);
        for (const url of [
            `/api/files?path=${encodeURIComponent('release/el9')}`,
            `/api/download?path=${encodeURIComponent(file)}`,
            `/api/hash?path=${encodeURIComponent(file)}`,
            `/api/search?path=${encodeURIComponent('release/el9')}&q=x`,
            `/api/download//${file}`,
            // Segments are trimmed on resolution, so a padded name must still be gated.
            `/api/download/%20${file}`,
            `/api/hash/%09${file}`,
            `/api/files/%20release/el9`,
        ]) {
            assert.strictEqual((await anon.get(url)).status, 401, url);
        }
        const c = client(base);
        assert.strictEqual((await c.login('legacy1', 'password123')).status, 200);
        const ok = await c.get(`/api/download?path=${encodeURIComponent(file)}`);
        assert.strictEqual(ok.status, 200, JSON.stringify(ok.json));
        assert.strictEqual(ok.body.toString(), 'r9');
    } finally {
        applyEnv({ RELEASE_PVM: undefined });
    }
});

test('a user removed from users.json loses their session with USER_REVOKED', async () => {
    const c = client(base);
    const login = await c.login('legacy1', 'password123');
    assert.strictEqual(login.status, 200, JSON.stringify(login.json));
    assert.strictEqual((await c.get('/api/auth/status')).json.authenticated, true);

    fs.writeFileSync(usersFile, JSON.stringify({ users: [] }));
    const status = await c.get('/api/auth/status');
    assert.strictEqual(status.json.authenticated, false);
    assert.strictEqual(status.json.reason, 'USER_REVOKED');
});
