/**
 * @file test/relocation.test.js
 * @brief Root isolation guard (isolate-app-roots).
 *
 * "Relocatable" is defined by this test: the code is copied to a fresh temp path
 * with a space in its name, made read-only, and started in production with no
 * .env, state and content in other temp folders. It must answer /livez and
 * /readyz and leave the copy unchanged (checked by listing, so it also holds when
 * the suite runs as root). A lint keeps machine-specific paths and paths into
 * the Admin Files Manager's folder out of the code and docs.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const { spawn } = require('child_process');

const REPO = path.join(__dirname, '..');
/** Not part of a release: dependencies are linked, state and tooling are not code. */
const NOT_CODE = new Set(['.git', 'node_modules', 'data', 'graphify-out', '.env', '.openclaude', '.opencode',
    '.claude', '.agents', '.freebuff', 'openspec', 'coverage']);

function copyCode(from, to) {
    fs.mkdirSync(to, { recursive: true });
    for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
        if (NOT_CODE.has(entry.name) || entry.name.endsWith('.log')) continue;
        const src = path.join(from, entry.name);
        const dst = path.join(to, entry.name);
        if (entry.isDirectory()) copyCode(src, dst);
        else if (entry.isFile()) fs.copyFileSync(src, dst);
    }
}

function listing(dir, base = dir, out = new Map()) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        const st = fs.lstatSync(full);
        out.set(path.relative(base, full), `${st.size}:${st.mtimeMs}`);
        if (entry.isDirectory()) listing(full, base, out);
    }
    return out;
}

function setMode(dir, writable) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isSymbolicLink()) continue;
        if (entry.isDirectory()) setMode(full, writable);
        fs.chmodSync(full, entry.isDirectory() ? (writable ? 0o755 : 0o555) : (writable ? 0o644 : 0o444));
    }
    fs.chmodSync(dir, writable ? 0o755 : 0o555);
}

const freePort = () => new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => { const { port } = srv.address(); srv.close(() => resolve(port)); });
    srv.on('error', reject);
});

test('a read-only copy under a fresh path starts in production and writes nothing into itself', async (t) => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-relocated-'));
    const code = path.join(base, 'relocated portal');
    const state = path.join(base, 'state');
    const files = path.join(base, 'files');
    fs.mkdirSync(state);
    fs.mkdirSync(path.join(files, 'docs'), { recursive: true });
    copyCode(REPO, code);
    fs.symlinkSync(path.join(REPO, 'node_modules'), path.join(code, 'node_modules'), 'dir');
    setMode(code, false);
    const before = listing(code);

    const port = await freePort();
    const child = spawn(process.execPath, ['server.js'], {
        cwd: code,
        env: { PATH: process.env.PATH, NODE_ENV: 'production', PORT: String(port), FILES_ROOT: files, PORTAL_DATA_DIR: state },
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (c) => { output += c; });
    child.stderr.on('data', (c) => { output += c; });
    t.after(() => {
        child.kill('SIGKILL');
        setMode(code, true);
        fs.rmSync(base, { recursive: true, force: true });
    });

    let live = 0;
    for (let i = 0; i < 100 && live !== 200 && child.exitCode === null; i++) {
        await new Promise((r) => setTimeout(r, 100));
        live = await fetch(`http://127.0.0.1:${port}/livez`).then((r) => r.status, () => 0);
    }
    assert.strictEqual(live, 200, `relocated portal did not start:\n${output}`);
    assert.strictEqual((await fetch(`http://127.0.0.1:${port}/readyz`)).status, 200);
    child.kill('SIGTERM');
    await new Promise((r) => (child.exitCode !== null ? r() : child.once('exit', r)));

    assert.deepStrictEqual([...listing(code)].filter(([k, v]) => before.get(k) !== v), [], 'the code folder was written to');
    assert.ok(fs.readdirSync(state).includes('portal.log'), 'state belongs in PORTAL_DATA_DIR');
});

test('no machine-specific path or path into the admin repository folder', () => {
    // Built from parts so this file does not match itself.
    const RULES = [
        [new RegExp('/opt' + '/devel'), 'a developer machine path'],
        [new RegExp('[A-Za-z]:[\\\\/]+(Projects|GitServer|Users)[\\\\/]'), 'a Windows machine path'],
        [new RegExp('Admin-Files-Manager' + '-fixed[\\\\/]'), 'a path inside the admin repository folder'],
    ];
    const ROOTS = ['lib', 'test', 'scripts', 'docs', 'public', 'server.js', '.env.example', 'package.json', 'Dockerfile'];
    const hits = [];
    const walk = (rel) => {
        const full = path.join(REPO, rel);
        if (!fs.existsSync(full)) return;
        if (fs.statSync(full).isDirectory()) { for (const e of fs.readdirSync(full)) walk(path.join(rel, e)); return; }
        if (!/\.(js|md|json|html|css|sh|ya?ml)$|^\.env\.example$|^Dockerfile$/.test(path.basename(rel))) return;
        fs.readFileSync(full, 'utf8').split(/\r?\n/).forEach((line, i) => {
            for (const [re, what] of RULES) if (re.test(line)) hits.push(`${rel}:${i + 1}: ${what}: ${line.trim().slice(0, 120)}`);
        });
    };
    for (const root of ROOTS) walk(root);
    assert.deepStrictEqual(hits, []);
});
