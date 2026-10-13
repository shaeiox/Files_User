/**
 * @file scripts/check-releases.js
 * @brief Repeatable check for the Releases page backend (add-release-reels-page 1.1–1.3, 2.1).
 *
 * Seeds a throwaway FILES_ROOT/release/{el8,el9} tree and a temp users file,
 * starts server.js twice (auth off, auth on) and asserts:
 *   - /release9/latest streams the highest pvm-release version
 *   - /release8/latest on an empty folder → non-2xx, no file bytes
 *   - /download/release serves the SPA shell
 *   - with AUTH_ENABLED=true: no cookie → 401, valid session → file + renewed cookie
 *
 * Usage: npm run check:releases   (no test runner in this repo; this script is the test)
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { hashPassword } = require('../lib/auth-service');

const PORT = 4917;
const BASE = `http://127.0.0.1:${PORT}`;
const ROOT = path.join(__dirname, '..');

function seed() {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rel-check-'));
    const el9 = path.join(tmp, 'files', 'release', 'el9');
    fs.mkdirSync(el9, { recursive: true });
    fs.mkdirSync(path.join(tmp, 'files', 'release', 'el8'));
    fs.writeFileSync(path.join(el9, 'pvm-release-7.1.15-el9-20260817-163318.tgz'), 'old');
    fs.writeFileSync(path.join(el9, 'pvm-release-7.1.29-el9-20261003-084116.tgz'), 'newest');
    fs.writeFileSync(path.join(el9, 'pvm-release-7.1.9-el9-20260101-000000.tgz'), 'lexically-high');
    return tmp;
}

function start(env) {
    const child = spawn(process.execPath, ['server.js'], { cwd: ROOT, env: { ...process.env, ...env, PORT: String(PORT) }, stdio: 'ignore' });
    return new Promise((resolve, reject) => {
        const t0 = Date.now();
        (function poll() {
            fetch(BASE + '/api/health').then(() => resolve(child)).catch(() => {
                if (Date.now() - t0 > 5000) { child.kill(); reject(new Error('server did not start')); }
                else setTimeout(poll, 100);
            });
        })();
    });
}

async function main() {
    const tmp = seed();
    const usersFile = path.join(tmp, 'users.json');
    fs.writeFileSync(usersFile, JSON.stringify({ users: [{ id: 'u1', username: 'tester', passwordHash: await hashPassword('check-pass'), role: 'release-viewer' }] }));
    const env = {
        FILES_ROOT: path.join(tmp, 'files'),
        RELEASE_PVM: path.join(tmp, 'files', 'release'),
        AUTH_USERS_FILE: usersFile,
        AUTH_JWT_SECRET: 'check-releases-secret-0123456789abcdef',
    };

    let server = await start({ ...env, AUTH_ENABLED: 'false' });
    try {
        let r = await fetch(BASE + '/release9/latest');
        assert.strictEqual(r.status, 200);
        assert.match(r.headers.get('content-disposition'), /pvm-release-7\.1\.29-el9-20261003-084116\.tgz/);
        assert.strictEqual(await r.text(), 'newest');

        r = await fetch(BASE + '/release8/latest');
        assert.ok(r.status >= 400, 'empty el8 must be an error status');
        assert.ok(!r.headers.get('content-disposition'), 'no file bytes for empty folder');

        r = await fetch(BASE + '/download/release');
        assert.strictEqual(r.status, 200);
        assert.match(r.headers.get('content-type'), /text\/html/);
        console.log('ok  auth off: latest selection, empty folder, SPA route');
    } finally { server.kill(); }

    server = await start({ ...env, AUTH_ENABLED: 'true' });
    try {
        let r = await fetch(BASE + '/release9/latest');
        assert.strictEqual(r.status, 401);
        assert.strictEqual((await r.json()).code, 'AUTH_REQUIRED');

        r = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'tester', password: 'check-pass' }) });
        assert.strictEqual(r.status, 200);
        const cookie = r.headers.get('set-cookie').split(';')[0];

        r = await fetch(BASE + '/release9/latest', { headers: { cookie } });
        assert.strictEqual(r.status, 200);
        assert.ok(r.headers.get('set-cookie'), 'session cookie renewed');
        assert.strictEqual(await r.text(), 'newest');
        console.log('ok  auth on: 401 without session, streams + renews with session');
    } finally { server.kill(); }

    fs.rmSync(tmp, { recursive: true, force: true });
}

main().catch(err => { console.error('FAIL', err.message); process.exit(1); });
