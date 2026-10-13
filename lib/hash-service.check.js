/**
 * @file        lib/hash-service.check.js
 * @brief       Runnable self-check for the streaming SHA-256 service.
 *
 * @description
 * Two things about this service must be true and are easy to get wrong:
 *   1. The digest is CORRECT — it must match an independently computed hash.
 *   2. Memory stays FLAT — a streaming implementation that quietly buffers would
 *      produce correct digests for small files and fall over on large ones, which is
 *      exactly the failure the portal exists to avoid.
 * Both are asserted here, the second by hashing a 128 MiB file and watching RSS.
 *
 * Usage:
 *     node lib/hash-service.check.js
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'hashcheck-'));
process.env.FILES_ROOT = ROOT;

const hashService = require('./hash-service');

let pass = 0, fail = 0;
const results = [];
const check = (label, ok, detail) => {
    (ok ? pass++ : fail++);
    results.push(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ' — ' + detail : ''}`);
};

/** Resident set size in MB, with a GC nudge so the reading is meaningful. */
function rssMb() {
    if (global.gc) { global.gc(); global.gc(); }
    return process.memoryUsage().rss / (1024 * 1024);
}

(async () => {
    // ── 1. Digest correctness against an independent computation ──────────────
    const small = 'v2rayN payload — the quick brown fox';
    fs.writeFileSync(path.join(ROOT, 'small.bin'), small);

    const r1 = await hashService.hashFile(process.cwd(), 'small.bin');
    const expected = crypto.createHash('sha256').update(Buffer.from(small, 'utf8')).digest('hex');
    check('digest matches an independently computed SHA-256',
        r1.digest === expected, `${r1.digest.slice(0, 16)}… vs ${expected.slice(0, 16)}…`);
    check('digest is 64 lowercase hex chars', /^[0-9a-f]{64}$/.test(r1.digest), r1.digest.length + ' chars');
    check('algorithm is reported as sha256', r1.algorithm === 'sha256', r1.algorithm);
    check('size and relPath come from the filesystem, not the request',
        r1.size === Buffer.byteLength(small) && r1.relPath === 'small.bin',
        `size=${r1.size} relPath=${r1.relPath}`);

    // Reproducible for unchanged content.
    const r2 = await hashService.hashFile(process.cwd(), 'small.bin');
    check('same bytes produce the same digest', r1.digest === r2.digest, '');

    // ── 2. Content sensitivity ───────────────────────────────────────────────
    fs.writeFileSync(path.join(ROOT, 'small.bin'), small + '!');
    const r3 = await hashService.hashFile(process.cwd(), 'small.bin');
    check('a one-byte change changes the digest', r3.digest !== r1.digest, '');

    // ── 3. Binary + empty ────────────────────────────────────────────────────
    const bin = crypto.randomBytes(200000);
    fs.writeFileSync(path.join(ROOT, 'binary.bin'), bin);
    const r4 = await hashService.hashFile(process.cwd(), 'binary.bin');
    check('binary content hashes correctly',
        r4.digest === crypto.createHash('sha256').update(bin).digest('hex'), '');

    fs.writeFileSync(path.join(ROOT, 'empty.bin'), Buffer.alloc(0));
    const r5 = await hashService.hashFile(process.cwd(), 'empty.bin');
    check('empty file hashes to the well-known SHA-256 of nothing',
        r5.digest === 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', r5.digest.slice(0, 16) + '…');

    // ── 4. Size cap (4.7) ────────────────────────────────────────────────────
    fs.writeFileSync(path.join(ROOT, 'cap.bin'), Buffer.alloc(1024));
    const prevCap = process.env.HASH_MAX_BYTES;
    process.env.HASH_MAX_BYTES = '512';
    check('size cap is read from HASH_MAX_BYTES', hashService.maxBytes() === 512, String(hashService.maxBytes()));
    let capErr = null;
    try { await hashService.hashFile(process.cwd(), 'cap.bin'); } catch (e) { capErr = e; }
    check('a file over the cap is refused with FILE_TOO_LARGE',
        capErr && capErr.code === 'FILE_TOO_LARGE' && capErr.httpStatus === 413,
        capErr ? `${capErr.code}/${capErr.httpStatus}` : 'no error');

    process.env.HASH_MAX_BYTES = '4096';
    const okUnder = await hashService.hashFile(process.cwd(), 'cap.bin');
    check('a file under the cap still verifies', okUnder.digest.length === 64, '');

    if (prevCap === undefined) delete process.env.HASH_MAX_BYTES; else process.env.HASH_MAX_BYTES = prevCap;

    // ── 5. Security: the existing path policy still applies ───────────────────
    fs.writeFileSync(path.join(ROOT, '.hidden'), 'secret');
    fs.mkdirSync(path.join(ROOT, 'dir'), { recursive: true });
    const bad = [
        ['hidden dotfile', '.hidden'],
        ['directory', 'dir'],
        ['traversal', '../outside.bin'],
        ['nonexistent', 'missing.bin'],
    ];
    for (const [label, p] of bad) {
        let err = null;
        try { await hashService.hashFile(process.cwd(), p); } catch (e) { err = e; }
        check(`refuses ${label}`, !!err, err ? `${err.code}/${err.httpStatus}` : 'NOT REFUSED');
    }

    // ── 6. Memory stays flat on a large file (5.6) ────────────────────────────
    const BIG = 128 * 1024 * 1024;   // 128 MiB
    const bigPath = path.join(ROOT, 'big.bin');
    const fd = fs.openSync(bigPath, 'w');
    const block = Buffer.alloc(1024 * 1024, 0x61); // 1 MiB of 'a'
    for (let i = 0; i < 128; i++) fs.writeSync(fd, block);
    fs.closeSync(fd);

    const before = rssMb();
    const t0 = Date.now();
    const rBig = await hashService.hashFile(process.cwd(), 'big.bin');
    const ms = Date.now() - t0;
    const after = rssMb();

    check('128 MiB file hashes', rBig.digest.length === 64 && rBig.size === BIG, `${rBig.size} bytes in ${ms}ms`);
    check('memory stays flat (never buffers the file)',
        Math.abs(after - before) < 64,
        `RSS ${before.toFixed(1)} MB -> ${after.toFixed(1)} MB (delta ${(after - before).toFixed(1)} MB for a 128 MiB file)`);

    fs.rmSync(bigPath, { force: true });

    console.log(results.join('\n'));
    console.log(`\n${pass} passed, ${fail} failed`);
    try { fs.rmSync(ROOT, { recursive: true, force: true }); } catch { }
    process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('CHECK CRASHED:', e); process.exit(1); });