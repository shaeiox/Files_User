/**
 * @file test/shared-state.test.js
 * @brief Logout revocations, lockouts and rate limits across restarts and
 *        across two real portal processes sharing one PORTAL_DATA_DIR.
 */
'use strict';

const { test, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { DatabaseSync } = require('node:sqlite');

const SERVER = path.join(__dirname, '..', 'server.js');
const SECRET = 'shared-state-test-secret-'.padEnd(64, 'x');
const PASSWORD = 'password123';
const children = new Set();
const dirs = [];

after(async () => {
    await Promise.all([...children].map((child) => new Promise((r) => { child.once('exit', r); child.kill(); })));
    for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
});

async function makeDataDir() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-shared-'));
    dirs.push(dir);
    fs.mkdirSync(path.join(dir, 'files', 'docs'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'files', 'docs', 'a.txt'), 'a');
    const { hashPassword } = require('../lib/auth/passwords');
    const users = { users: [{ id: 'u1', username: 'alice', passwordHash: await hashPassword(PASSWORD), role: 'user' }] };
    fs.writeFileSync(path.join(dir, 'users.json'), JSON.stringify(users));
    return dir;
}

/** Starts server.js on a free port with `dir` as PORTAL_DATA_DIR; resolves to its base URL. */
function startPortal(dir, env = {}) {
    const child = spawn(process.execPath, [SERVER], {
        env: {
            PATH: process.env.PATH, SystemRoot: process.env.SystemRoot,
            PORT: String(47000 + Math.floor(Math.random() * 2000)),
            FILES_ROOT: path.join(dir, 'files'), PORTAL_DATA_DIR: dir, LOG_FILE: path.join(dir, 'portal.log'),
            // Every variable the checkout's own .env could supply is pinned here.
            AUTH_ENABLED: 'true', AUTH_JWT_SECRET: SECRET, AUTH_MAX_FAILED_ATTEMPTS: '5',
            AUTH_USERS_FILE: path.join(dir, 'users.json'), AUTH_SESSION_MINUTES: '30', AUTH_LOCKOUT_MINUTES: '15',
            ADMIN_INTEGRATION_ENABLED: 'false', ADMIN_DB_PATH: '', RELEASE_PVM: '', NODE_ENV: '',
            ...env,
        },
    });
    children.add(child);
    return new Promise((resolve, reject) => {
        let out = '';
        child.stdout.on('data', (d) => {
            out += d;
            const m = out.match(/Portal started on port (\d+)/);
            if (m) resolve({ base: `http://127.0.0.1:${m[1]}`, child });
        });
        child.on('exit', (code) => { children.delete(child); reject(new Error(`portal exited ${code}: ${out}`)); });
    });
}

async function stopPortal({ child }) {
    const exited = new Promise((r) => child.once('exit', r));
    child.kill();
    await exited;
}

async function login(base, password = PASSWORD) {
    const res = await fetch(base + '/api/auth/login', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: 'alice', password }),
    });
    const cookie = (res.headers.get('set-cookie') || '').split(';')[0];
    return { status: res.status, json: await res.json(), cookie };
}

async function status(base, cookie) {
    return (await fetch(base + '/api/auth/status', { headers: { cookie } })).json();
}

async function logout(base, cookie) {
    return fetch(base + '/api/auth/logout', { method: 'POST', headers: { cookie } });
}

test('a logout on one process is honoured by another, and after a restart', async () => {
    const dir = await makeDataDir();
    let a = await startPortal(dir);
    const b = await startPortal(dir);

    const { cookie, status: code } = await login(a.base);
    assert.strictEqual(code, 200);
    assert.strictEqual((await status(b.base, cookie)).authenticated, true, 'B accepts A\'s session');

    assert.strictEqual((await logout(a.base, cookie)).status, 200);
    await new Promise((r) => setTimeout(r, 1000));
    const onB = await status(b.base, cookie);
    assert.strictEqual(onB.authenticated, false);
    assert.strictEqual(onB.reason, 'SESSION_REVOKED');

    await stopPortal(a);
    a = await startPortal(dir);
    const afterRestart = await status(a.base, cookie);
    assert.strictEqual(afterRestart.authenticated, false);
    assert.strictEqual(afterRestart.reason, 'SESSION_REVOKED');

    // The store holds no token, hash, password or secret.
    const db = new DatabaseSync(path.join(dir, 'portal-state.sqlite'), { readOnly: true });
    const dump = JSON.stringify(['revoked_sessions', 'failed_logins', 'rate_buckets']
        .map((t) => db.prepare(`SELECT * FROM ${t}`).all()));
    db.close();
    const token = decodeURIComponent(cookie.split('=')[1]);
    const hash = JSON.parse(fs.readFileSync(path.join(dir, 'users.json'), 'utf8')).users[0].passwordHash;
    for (const secret of [token, token.split('.')[2], hash, PASSWORD, SECRET]) {
        assert.ok(!dump.includes(secret), 'no secret material in the state store');
    }
    await stopPortal(a);
    await stopPortal(b);
});

test('failed sign-ins are counted across processes and survive a restart', async () => {
    const dir = await makeDataDir();
    const a = await startPortal(dir);
    let b = await startPortal(dir);

    for (let i = 0; i < 3; i++) assert.strictEqual((await login(a.base, 'wrong')).status, 401);
    for (let i = 0; i < 2; i++) assert.strictEqual((await login(b.base, 'wrong')).status, 401);

    for (const p of [a, b]) {
        const locked = await login(p.base);
        assert.strictEqual(locked.status, 429, 'locked even with the right password');
        assert.strictEqual(locked.json.code, 'LOCKED_OUT');
    }

    await stopPortal(b);
    b = await startPortal(dir);
    const afterRestart = await login(b.base);
    assert.strictEqual(afterRestart.status, 429);
    assert.strictEqual(afterRestart.json.code, 'LOCKED_OUT');
    assert.ok(afterRestart.json.retryAfterMs > 0);
    await stopPortal(a);
    await stopPortal(b);
});

test('the rate limit counts requests sent to either process together', async () => {
    const dir = await makeDataDir();
    const env = { RATE_LIMIT_MAX_REQUESTS: '40', AUTH_ENABLED: 'false' };
    const a = await startPortal(dir, env);
    const b = await startPortal(dir, env);

    let ok = 0;
    let limited = 0;
    for (let i = 0; i < 50; i++) {
        for (const p of [a, b]) {
            const res = await fetch(p.base + '/api/health');
            await res.text();
            if (res.status === 200) ok += 1;
            else if (res.status === 429) limited += 1;
        }
    }
    // 100 requests against a shared limit of 40: at most 40 + 20 per process may pass.
    assert.ok(ok <= 80, `${ok} passed`);
    assert.strictEqual(ok + limited, 100);
    await stopPortal(a);
    await stopPortal(b);
});

test('an unusable store fails closed for sessions and sign-in; rate limiting continues per process', async () => {
    const dir = await makeDataDir();
    fs.mkdirSync(path.join(dir, 'portal-state.sqlite')); // a directory where the database should be
    const p = await startPortal(dir, { RATE_LIMIT_MAX_REQUESTS: '10' });

    // A token signed with the right secret: the portal cannot confirm it is unrevoked.
    process.env.AUTH_ENABLED = 'true';
    process.env.AUTH_JWT_SECRET = SECRET;
    const { issueToken } = require('../lib/auth/jwt');
    const { token } = issueToken({ sub: 'u1', usr: 'alice', role: 'user', sid: 'f'.repeat(32) });
    const cookie = `avid_session=${encodeURIComponent(token)}`;

    const st = await status(p.base, cookie);
    assert.strictEqual(st.authenticated, false);
    assert.strictEqual(st.reason, 'SERVER_ERROR');

    const signIn = await login(p.base);
    assert.strictEqual(signIn.status, 503);
    assert.strictEqual(signIn.json.code, 'SERVER_ERROR');
    assert.strictEqual(signIn.cookie, '', 'no session cookie issued');

    const out = await logout(p.base, cookie);
    assert.strictEqual(out.status, 503);
    assert.match(out.headers.get('set-cookie') || '', /Max-Age=0/, 'the cookie is still cleared');

    let limited = 0;
    for (let i = 0; i < 15; i++) {
        const res = await fetch(p.base + '/api/health');
        await res.text();
        if (res.status === 429) limited += 1;
    }
    assert.ok(limited > 0, 'still limited per process');
    await new Promise((r) => setTimeout(r, 1500)); // the fallback is noticed at the next 1 s flush
    const trace = fs.readFileSync(path.join(dir, 'portal.log'), 'utf8');
    assert.match(trace, /\[rate-limit\] shared counter unavailable/);
    await stopPortal(p);
});
