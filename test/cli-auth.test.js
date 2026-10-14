/**
 * @file test/cli-auth.test.js
 * @brief Command-line downloads: HTTP Basic on content routes, the challenge only
 *        non-browser clients get, transport rule, lockout, and no session cookie.
 *        Spec: openspec/changes/fix-auth-flows-and-cli-login/specs/cli-download-auth.
 */
'use strict';

const { test, before, after } = require('node:test');
const assert = require('assert');
const http = require('http');
const { createFixture, client } = require('./helpers/admin-fixture');

const fx = createFixture({
    tree: {
        'docs/readme.txt': 'readme',
        'docs/locked.txt': 'locked-content',
        'docs/denied.txt': 'denied-content',
        'release/el9/pvm-release-1.0.0-el9.tgz': 'r9',
    },
});

let base;
let ip = 0;
const basic = (user, pass) => 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');

/** A curl-like request: no Sec-Fetch-* headers, no cookie jar. */
function cli(urlPath, { auth, proxied = true, secure = true, accept = '*/*', extra = {} } = {}) {
    const headers = { accept, ...extra };
    if (proxied) {
        headers['x-forwarded-for'] = `10.9.${(ip >> 8) & 255}.${ip++ & 255}`;
        if (secure) headers['x-forwarded-proto'] = 'https';
    }
    if (auth) headers.authorization = auth;
    return new Promise((resolve, reject) => {
        http.get(base + urlPath, { headers }, (res) => {
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
        }).on('error', reject);
    });
}

before(async () => {
    const alice = fx.addUser({ username: 'alice' });
    fx.addUser({ username: 'mallory' });
    fx.setPolicy('/docs/locked.txt', { mode: 'public', locked: 1 });
    fx.setPolicy('/docs/denied.txt', { mode: 'public', locked: 1 });
    fx.setPermission('/docs/denied.txt', alice, 'deny');
    fx.setPolicy('/release', { mode: 'public', locked: 1, isDirectory: true });
    base = await fx.start({ AUTH_MAX_FAILED_ATTEMPTS: '3' });
});
after(async () => { await fx.stop(); fx.cleanup(); });

test('an anonymous CLI request is challenged with a plain-text message', async () => {
    const res = await cli('/api/download/docs/locked.txt');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.headers['www-authenticate'], 'Basic realm="CloudAvid Downloads", charset="UTF-8"');
    assert.match(res.headers['content-type'], /^text\/plain/);
    assert.match(res.body, /Authentication required.*-u <username>/);
});

test('a CLI client that asks for JSON is still challenged but gets JSON', async () => {
    const res = await cli('/api/download/docs/locked.txt', { accept: 'application/json' });
    assert.strictEqual(res.status, 401);
    assert.ok(res.headers['www-authenticate']);
    assert.strictEqual(JSON.parse(res.body).code, 'AUTH_REQUIRED');
});

test('browsers (Sec-Fetch-Mode) are never challenged', async () => {
    const res = await client(base).get('/api/download/docs/locked.txt');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.headers.get('www-authenticate'), null);
    assert.strictEqual(res.json.code, 'AUTH_REQUIRED');
});

test('correct Basic credentials download locked content, with no cookie', async () => {
    for (const [url, body] of [
        ['/api/download/docs/locked.txt', 'locked-content'],
        ['/release9/latest', 'r9'],
        ['/api/download/release/el9/pvm-release-1.0.0-el9.tgz', 'r9'],
    ]) {
        const res = await cli(url, { auth: basic('alice', 'password123') });
        assert.strictEqual(res.status, 200, url);
        assert.strictEqual(res.body, body, url);
        assert.strictEqual(res.headers['set-cookie'], undefined, url);
    }
    const hash = await cli('/api/hash/docs/locked.txt', { auth: basic('alice', 'password123') });
    assert.strictEqual(hash.status, 200);
    assert.match(JSON.parse(hash.body).sha256 || hash.body, /[0-9a-f]{64}/);
});

test('Basic credentials do not bypass a deny row', async () => {
    const res = await cli('/api/download/docs/denied.txt', { auth: basic('alice', 'password123') });
    assert.strictEqual(res.status, 404);
});

test('a wrong password is a clear 401', async () => {
    const res = await cli('/api/download/docs/locked.txt', { auth: basic('alice', 'nope') });
    assert.strictEqual(res.status, 401);
    assert.ok(res.headers['www-authenticate']);
    assert.strictEqual(res.body, 'Invalid username or password.\n');
});

test('Basic is ignored outside content routes', async () => {
    const files = await cli('/api/files/release', { auth: basic('alice', 'password123') });
    assert.strictEqual(files.status, 401);
    assert.strictEqual(files.headers['www-authenticate'], undefined);
    const status = await cli('/api/auth/status', { auth: basic('alice', 'password123') });
    assert.strictEqual(JSON.parse(status.body).authenticated, false);
});

test('Basic over plain HTTP through a proxy is refused before the password is checked', async () => {
    const res = await cli('/api/download/docs/locked.txt', { auth: basic('mallory', 'wrong'), secure: false });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body, 'Credentials are only accepted over HTTPS.\n');
    // No attempt was recorded: mallory can still log in normally afterwards.
    for (let i = 0; i < 3; i++) await cli('/api/download/docs/locked.txt', { auth: basic('mallory', 'wrong'), secure: false });
    assert.strictEqual((await cli('/api/download/docs/locked.txt', { auth: basic('mallory', 'password123') })).status, 200);
});

test('Basic from loopback without a proxy is accepted over HTTP', async () => {
    const res = await cli('/api/download/docs/locked.txt', { auth: basic('alice', 'password123'), proxied: false });
    assert.strictEqual(res.status, 200);
});

test('repeated wrong passwords lock the username out, even for a correct one', async () => {
    for (let i = 0; i < 3; i++) await cli('/api/download/docs/locked.txt', { auth: basic('mallory', 'wrong') });
    const res = await cli('/api/download/docs/locked.txt', { auth: basic('mallory', 'password123') });
    assert.strictEqual(res.status, 429);
    assert.match(res.body, /Too many failed sign-in attempts/);
});

test('neither the Authorization header nor the password is logged', async () => {
    const lines = [];
    const orig = { log: console.log, warn: console.warn, error: console.error };
    for (const k of Object.keys(orig)) console[k] = (...a) => lines.push(a.join(' '));
    try {
        await cli('/api/download/docs/locked.txt', { auth: basic('alice', 'S3cret-pw') });
        await cli('/api/download/docs/locked.txt', { auth: basic('alice', 'password123') });
    } finally {
        Object.assign(console, orig);
    }
    const all = lines.join('\n');
    assert.ok(lines.length > 0);
    for (const secret of ['S3cret-pw', 'password123', 'Basic ', Buffer.from('alice:S3cret-pw').toString('base64')]) {
        assert.ok(!all.includes(secret), secret);
    }
});
