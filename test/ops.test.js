/**
 * @file test/ops.test.js
 * @brief Liveness/readiness probes, request ids, the one access line per
 *        request, and the access-restricted metrics endpoint.
 */
'use strict';

const { test, before, after } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { createFixture, client } = require('./helpers/admin-fixture');

const fx = createFixture({ tree: { 'docs/readme.txt': 'hello', 'docs/secret-name.tgz': 'zip' } });
let base;
before(async () => { base = await fx.start({ ADMIN_SYNC_TTL_MS: '1000' }); });
after(async () => { await fx.stop(); fx.cleanup(); });

const adminDb = () => require('../lib/admin-db');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** fetch without the fixture client's X-Forwarded-For: a loopback caller. */
const direct = (urlPath, headers = {}) => fetch(base + urlPath, { headers });

/** Temporarily moves FILES_ROOT away. */
async function withoutFilesRoot(fn) {
    const moved = fx.filesRoot + '.away';
    fs.renameSync(fx.filesRoot, moved);
    try { return await fn(); } finally { fs.renameSync(moved, fx.filesRoot); }
}

/* ─── service-health ─── */

test('/livez answers ok without touching content, even when FILES_ROOT is gone', async () => {
    await withoutFilesRoot(async () => {
        const res = await direct('/livez');
        assert.strictEqual(res.status, 200);
        assert.deepStrictEqual(await res.json(), { status: 'ok' });
    });
});

test('/api/health keeps its body', async () => {
    const res = await client(base).get('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.json.status, 'ok');
    assert.strictEqual(typeof res.json.uptime, 'number');
});

test('/readyz is ready when FILES_ROOT is readable and the admin snapshot is valid', async () => {
    adminDb().resetSnapshot();
    const res = await direct('/readyz');
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(await res.json(), { status: 'ready', checks: { filesRoot: 'ok', adminPolicy: 'ok' } });
});

test('/readyz fails on a missing FILES_ROOT, naming only the check', async () => {
    await withoutFilesRoot(async () => {
        const res = await direct('/readyz');
        assert.strictEqual(res.status, 503);
        const text = await res.text();
        assert.deepStrictEqual(JSON.parse(text), { status: 'not_ready', checks: { filesRoot: 'fail', adminPolicy: 'ok' } });
        assert.ok(!text.includes(fx.filesRoot) && !text.includes('storage'), 'no path in the body');
    });
});

test('/readyz fails when the admin database cannot be read', async () => {
    const saved = fs.readFileSync(fx.dbPath);
    try {
        fs.writeFileSync(fx.dbPath, 'not a database');
        adminDb().resetSnapshot();
        const res = await direct('/readyz');
        assert.strictEqual(res.status, 503);
        assert.deepStrictEqual(await res.json(), { status: 'not_ready', checks: { filesRoot: 'ok', adminPolicy: 'fail' } });
    } finally {
        fs.writeFileSync(fx.dbPath, saved);
        adminDb().resetSnapshot();
    }
});

test('probes never ask for sign-in (auth is on in this fixture)', async () => {
    for (const p of ['/livez', '/readyz']) {
        const res = await direct(p);
        assert.ok(res.status === 200, `${p} -> ${res.status}`);
        assert.strictEqual(res.headers.get('www-authenticate'), null);
    }
});

/* ─── request ids ─── */

test('every response carries a generated X-Request-Id', async () => {
    for (const p of ['/api/health', '/api/files/docs', '/livez', '/no-such-file']) {
        const res = await direct(p);
        assert.match(res.headers.get('x-request-id') || '', UUID, p);
    }
});

test('a trusted proxy id is kept; an untrusted or malformed one is replaced', () => {
    const { requestIdFor } = require('../lib/api-router');
    const req = (remoteAddress, id) => ({ socket: { remoteAddress }, headers: { 'x-request-id': id } });
    assert.strictEqual(requestIdFor(req('127.0.0.1', 'abc-123')), 'abc-123');
    assert.match(requestIdFor(req('203.0.113.9', 'abc-123')), UUID);
    assert.match(requestIdFor(req('127.0.0.1', 'has space')), UUID);
    assert.match(requestIdFor(req('127.0.0.1', 'x'.repeat(129))), UUID);
});

/* ─── metrics ─── */

test('/metrics from loopback serves Prometheus text with route templates only', async () => {
    const dl = await direct('/api/download/docs/secret-name.tgz');
    await dl.arrayBuffer();
    const res = await direct('/metrics');
    assert.strictEqual(res.status, 200);
    assert.match(res.headers.get('content-type'), /^text\/plain; version=0\.0\.4/);
    const body = await res.text();
    for (const series of ['portal_http_requests_total', 'portal_http_request_duration_seconds_bucket',
        'portal_auth_login_failures_total', 'portal_auth_lockouts_total', 'portal_downloads_active',
        'portal_admin_snapshot_age_seconds']) {
        assert.ok(body.includes(series), series);
    }
    assert.ok(body.includes('route="/api/download/*"'));
    assert.ok(!body.includes('secret-name') && !body.includes('docs/'), 'no path segment in any label');
});

test('/metrics through a proxy is answered exactly like an unknown path', async () => {
    const xff = { 'x-forwarded-for': '198.51.100.7' };
    const metrics = await direct('/metrics', xff);
    const unknown = await direct('/no-such-endpoint', xff);
    assert.strictEqual(metrics.status, unknown.status);
    assert.strictEqual(metrics.headers.get('content-type'), unknown.headers.get('content-type'));
    assert.strictEqual(await metrics.text(), await unknown.text());
});

/* ─── trace lines (a real process, with the trace file on) ─── */

test('each response has exactly one trace line with its request id and duration', async () => {
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-trace-'));
    const filesRoot = path.join(dataDir, 'files');
    fs.mkdirSync(path.join(filesRoot, 'docs'), { recursive: true });
    fs.writeFileSync(path.join(filesRoot, 'docs', 'a.txt'), 'a');
    const logFile = path.join(dataDir, 'portal.log');
    const child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
        env: {
            PATH: process.env.PATH, SystemRoot: process.env.SystemRoot,
            PORT: String(46000 + Math.floor(Math.random() * 1000)),
            FILES_ROOT: filesRoot, PORTAL_DATA_DIR: dataDir, LOG_FILE: logFile,
            AUTH_ENABLED: 'false', AUTH_JWT_SECRET: '', ADMIN_INTEGRATION_ENABLED: 'false', ADMIN_DB_PATH: '',
            RELEASE_PVM: '', NODE_ENV: '', AUTH_USERS_FILE: '', AUTH_SESSION_MINUTES: '', AUTH_LOCKOUT_MINUTES: '', AUTH_MAX_FAILED_ATTEMPTS: '',
        },
    });
    try {
        const port = await new Promise((resolve, reject) => {
            let out = '';
            child.stdout.on('data', (d) => {
                out += d;
                const m = out.match(/Portal started on port (\d+)/);
                if (m) resolve(m[1]);
            });
            child.on('exit', (code) => reject(new Error('server exited ' + code + ': ' + out)));
        });
        const ok = await fetch(`http://127.0.0.1:${port}/api/files/docs`);
        await ok.text();
        const missing = await fetch(`http://127.0.0.1:${port}/api/download/docs/none.txt`);
        await missing.text();
        await new Promise((r) => setTimeout(r, 200)); // the line is written when the response closes

        const lines = fs.readFileSync(logFile, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
        for (const res of [ok, missing]) {
            const id = res.headers.get('x-request-id');
            const mine = lines.filter((l) => l.requestId === id);
            assert.strictEqual(mine.length, 1, `one line for ${id}`);
            assert.strictEqual(typeof mine[0].durationMs, 'number');
            assert.strictEqual(mine[0].status, res.status);
            for (const field of ['t', 'level', 'method', 'url', 'msg']) assert.ok(field in mine[0], field);
        }
        assert.strictEqual(lines.find((l) => l.requestId === missing.headers.get('x-request-id')).level, 'warn');
    } finally {
        child.kill();
        fs.rmSync(dataDir, { recursive: true, force: true });
    }
});
