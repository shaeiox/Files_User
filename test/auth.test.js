/**
 * @file test/auth.test.js
 * @brief Portal login and session validity driven by the admin `users` table.
 *        Spec: openspec/changes/enforce-admin-file-policies/specs/admin-authentication.
 */
'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createFixture, applyEnv, client, adminHashPassword } = require('./helpers/admin-fixture');
const adminDb = require('../lib/admin-db');
const authService = require('../lib/auth-service');

const TTL_MS = 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const afterSync = () => sleep(TTL_MS + 150);
const fileHash = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

const fx = createFixture({ tree: { 'docs/readme.txt': 'hello', 'docs/members.txt': 'members only' } });
let base;

before(async () => {
    fx.setPolicy('/docs/members.txt', { mode: 'authenticated', locked: 1 });
    base = await fx.start({ ADMIN_SYNC_TTL_MS: String(TTL_MS), AUTH_MAX_FAILED_ATTEMPTS: '3', AUTH_LOCKOUT_MINUTES: '15' });
});
after(async () => { await fx.stop(); fx.cleanup(); });

/** Logs in on a fresh client and returns it; fails the test unless the login succeeds. */
async function signedIn(username, password = 'password123') {
    const c = client(base);
    const res = await c.login(username, password);
    assert.strictEqual(res.status, 200, `login for ${username}: ${JSON.stringify(res.json)}`);
    return c;
}

describe('password format', () => {
    test('a hash produced exactly like the admin hashPassword verifies', async () => {
        const stored = adminHashPassword('correct horse');
        assert.strictEqual(await authService.verifyAdminPassword('correct horse', stored), true);
        assert.strictEqual(await authService.verifyAdminPassword('wrong horse', stored), false);
    });
    test('a malformed stored hash never matches', async () => {
        for (const stored of ['', 'nocolon', 'abc:', ':' + 'a'.repeat(128), 'zz:' + 'a'.repeat(128), 'ab:' + 'a'.repeat(10)]) {
            assert.strictEqual(await authService.verifyAdminPassword('anything', stored), false, stored);
        }
    });
    test('login refuses a user whose stored hash is malformed', async () => {
        const id = fx.addUser({ username: 'badhash' });
        fx.exec("UPDATE users SET password_hash = 'not-a-hash' WHERE id = ?", id);
        adminDb.resetSnapshot();
        const res = await client(base).login('badhash', 'password123');
        assert.strictEqual(res.status, 401);
        assert.strictEqual(res.json.code, 'INVALID_CREDENTIALS');
    });
});

describe('usernames follow the admin rules', () => {
    before(() => {
        fx.addUser({ username: 'john.doe' });
        fx.addUser({ username: 'Erfan' });
        fx.addUser({ username: 'ab' });
        fx.addUser({ username: 'ali@example.com' });
        adminDb.resetSnapshot();
    });
    test('a username with a dot logs in', () => signedIn('john.doe'));
    test('surrounding spaces and case are ignored', () => signedIn(' erfan '));
    test('a two-character username logs in', () => signedIn('ab'));
    test('an email-shaped username logs in', () => signedIn('ali@example.com'));
    test('the session reports the admin user id and name', async () => {
        const c = await signedIn('ERFAN');
        const status = await c.get('/api/auth/status');
        assert.strictEqual(status.json.authenticated, true);
        assert.strictEqual(status.json.user.username, 'Erfan');
        assert.ok(!('pwf' in status.json.user), 'fingerprint is never exposed');
    });
    test('an unknown user and a wrong password get identical responses', async () => {
        fx.addUser({ username: 'known' });
        adminDb.resetSnapshot();
        const unknown = await client(base).login('nobody-here', 'password123');
        const wrong = await client(base).login('known', 'wrong-password');
        assert.strictEqual(unknown.status, 401);
        assert.strictEqual(wrong.status, unknown.status);
        assert.deepStrictEqual(wrong.json, unknown.json);
    });
});

describe('account status and locks', () => {
    test('a disabled user with the correct password gets the wrong-password response', async () => {
        fx.addUser({ username: 'disabled1', status: 'disabled' });
        fx.addUser({ username: 'enabled1' });
        adminDb.resetSnapshot();
        const disabled = await client(base).login('disabled1', 'password123');
        const wrong = await client(base).login('enabled1', 'nope-nope');
        assert.strictEqual(disabled.status, 401);
        assert.deepStrictEqual(disabled.json, wrong.json);
    });
    test('an active admin lock refuses login with LOCKED_OUT and a retry-after', async () => {
        fx.addUser({ username: 'locked1', lockedUntil: Date.now() + 10 * 60000 });
        adminDb.resetSnapshot();
        const res = await client(base).login('locked1', 'password123');
        assert.strictEqual(res.status, 429);
        assert.strictEqual(res.json.code, 'LOCKED_OUT');
        assert.ok(res.json.retryAfterMs > 0);
    });
    test('an expired admin lock does not block login', async () => {
        fx.addUser({ username: 'locked2', lockedUntil: Date.now() - 1000 });
        adminDb.resetSnapshot();
        await signedIn('locked2');
    });
    test('the portal throttle locks a username without writing to the admin database', async () => {
        fx.addUser({ username: 'throttled' });
        adminDb.resetSnapshot();
        const before = fileHash(fx.dbPath);
        for (let i = 0; i < 3; i++) assert.strictEqual((await client(base).login('throttled', 'bad')).status, 401);
        const locked = await client(base).login('THROTTLED', 'password123');
        assert.strictEqual(locked.status, 429, 'locked out even with the right password and another case');
        assert.strictEqual(locked.json.code, 'LOCKED_OUT');
        assert.strictEqual(fileHash(fx.dbPath), before, 'admin database untouched');
    });
    test('successful logins do not write to the admin database either', async () => {
        fx.addUser({ username: 'readonly' });
        adminDb.resetSnapshot();
        adminDb.getSnapshot();
        const before = fileHash(fx.dbPath);
        await signedIn('readonly');
        assert.strictEqual(fileHash(fx.dbPath), before);
    });
});

describe('sessions follow admin changes within the sync interval', () => {
    test('a sliding renewal keeps the session valid', async () => {
        fx.addUser({ username: 'renewer' });
        adminDb.resetSnapshot();
        const c = await signedIn('renewer');
        const first = c.cookie;
        assert.strictEqual((await c.get('/api/download/docs/members.txt')).status, 200);
        assert.notStrictEqual(c.cookie, first, 'renewed cookie issued');
        assert.strictEqual((await c.get('/api/download/docs/members.txt')).status, 200, 'renewed cookie works');
    });

    test('disabling the user ends the session', async () => {
        const id = fx.addUser({ username: 'tobedisabled' });
        adminDb.resetSnapshot();
        const c = await signedIn('tobedisabled');
        assert.strictEqual((await c.get('/api/download/docs/members.txt')).status, 200);

        fx.updateUser(id, { status: 'disabled' });
        await afterSync();
        const status = await c.get('/api/auth/status');
        assert.strictEqual(status.json.authenticated, false);
        assert.strictEqual(status.json.reason, 'USER_REVOKED');
        assert.strictEqual((await c.get('/api/download/docs/members.txt')).status, 401);
    });

    test('deleting the user ends the session', async () => {
        const id = fx.addUser({ username: 'tobedeleted' });
        adminDb.resetSnapshot();
        const c = await signedIn('tobedeleted');
        fx.deleteUser(id);
        await afterSync();
        assert.strictEqual((await c.get('/api/auth/status')).json.authenticated, false);
        assert.strictEqual((await c.get('/api/download/docs/members.txt')).status, 401);
    });

    test('a password reset ends the session and the new password works', async () => {
        const id = fx.addUser({ username: 'reset' });
        adminDb.resetSnapshot();
        const c = await signedIn('reset');
        fx.updateUser(id, { password: 'brand-new-password' });
        await afterSync();
        const status = await c.get('/api/auth/status');
        assert.strictEqual(status.json.authenticated, false);
        assert.strictEqual(status.json.reason, 'PASSWORD_CHANGED');
        assert.strictEqual((await c.get('/api/download/docs/members.txt')).status, 401);

        assert.strictEqual((await client(base).login('reset', 'password123')).status, 401);
        await signedIn('reset', 'brand-new-password');
    });

    test('admin "Revoke sessions" ends the session; logging in again works', async () => {
        const id = fx.addUser({ username: 'revoked' });
        adminDb.resetSnapshot();
        const c = await signedIn('revoked');
        assert.strictEqual((await c.get('/api/download/docs/members.txt')).status, 200);

        fx.revokeSessions(id);
        await afterSync();
        const status = await c.get('/api/auth/status');
        assert.strictEqual(status.json.authenticated, false);
        assert.strictEqual(status.json.reason, 'SESSION_REVOKED');
        assert.strictEqual((await c.get('/api/download/docs/members.txt')).status, 401);

        const again = await signedIn('revoked');
        assert.strictEqual((await again.get('/api/download/docs/members.txt')).status, 200);
    });

    test('a revoked session stays revoked after a sliding renewal', async () => {
        const id = fx.addUser({ username: 'renewed-then-revoked' });
        adminDb.resetSnapshot();
        const c = await signedIn('renewed-then-revoked');
        await sleep(20);
        assert.strictEqual((await c.get('/api/download/docs/members.txt')).status, 200, 'renews the cookie');
        fx.revokeSessions(id);
        await afterSync();
        assert.strictEqual((await c.get('/api/auth/status')).json.reason, 'SESSION_REVOKED');
    });

    test('revoking one user does not affect another; a failed revoke changes nothing', async () => {
        const a = fx.addUser({ username: 'revoke-a' });
        const b = fx.addUser({ username: 'revoke-b' });
        adminDb.resetSnapshot();
        const ca = await signedIn('revoke-a');
        const cb = await signedIn('revoke-b');
        fx.revokeSessions(a, { outcome: 'failure' });
        fx.revokeSessions(b);
        await afterSync();
        assert.strictEqual((await ca.get('/api/auth/status')).json.authenticated, true);
        assert.strictEqual((await cb.get('/api/auth/status')).json.authenticated, false);
    });

    test('a session without a login time is refused in integration mode', async () => {
        fx.addUser({ username: 'noauthtime' });
        adminDb.resetSnapshot();
        const c = await signedIn('noauthtime');
        const [name, token] = c.cookie.split('=');
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
        delete payload.auth_time;
        c.cookie = `${name}=${signWithoutFingerprint(payload)}`;
        assert.strictEqual((await c.get('/api/auth/status')).json.reason, 'SESSION_REVOKED');
    });

    test('changes are not visible before the interval elapses', async () => {
        const id = fx.addUser({ username: 'notyet' });
        adminDb.resetSnapshot();
        const c = await signedIn('notyet');
        adminDb.getSnapshot();
        fx.updateUser(id, { status: 'disabled' });
        assert.strictEqual((await c.get('/api/auth/status')).json.authenticated, true, 'cached within the interval');
    });

    test('a token signed without a fingerprint is refused in integration mode', async () => {
        fx.addUser({ username: 'nofp' });
        adminDb.resetSnapshot();
        const c = await signedIn('nofp');
        // Re-sign the same claims minus `pwf` with the real secret (a pre-change token).
        const [name, token] = c.cookie.split('=');
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
        assert.ok(payload.pwf, 'login tokens carry a fingerprint');
        delete payload.pwf;
        c.cookie = `${name}=${signWithoutFingerprint(payload)}`;
        const status = await c.get('/api/auth/status');
        assert.strictEqual(status.json.authenticated, false);
        assert.strictEqual(status.json.reason, 'PASSWORD_CHANGED');
    });
});

describe('fail closed when the admin database is unreadable', () => {
    test('logins answer 503 SERVER_ERROR and sessions stop authenticating', async () => {
        fx.addUser({ username: 'outage' });
        adminDb.resetSnapshot();
        const c = await signedIn('outage');
        const real = fx.dbPath;
        applyEnv({ ADMIN_DB_PATH: path.join(fx.dir, 'gone.sqlite') });
        adminDb.resetSnapshot();
        try {
            const login = await client(base).login('outage', 'password123');
            assert.strictEqual(login.status, 503);
            assert.strictEqual(login.json.code, 'SERVER_ERROR');
            assert.strictEqual((await c.get('/api/auth/status')).json.authenticated, false);
            assert.strictEqual((await c.get('/api/download/docs/members.txt')).status, 503);
            assert.strictEqual((await c.get('/api/download/docs/readme.txt')).status, 503, 'no ungoverned fallback');
        } finally {
            applyEnv({ ADMIN_DB_PATH: real });
            adminDb.resetSnapshot();
        }
    });
});

/** Signs a JWT the way auth-service does, for the forged-token test. */
function signWithoutFingerprint(payload) {
    const b64 = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');
    const head = b64({ alg: 'HS256', typ: 'JWT' });
    const body = b64(payload);
    const sig = crypto.createHmac('sha256', process.env.AUTH_JWT_SECRET).update(head + '.' + body).digest('base64url');
    return `${head}.${body}.${sig}`;
}
