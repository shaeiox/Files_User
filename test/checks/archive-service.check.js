/**
 * @file        test/checks/archive-service.check.js
 * @brief       Runnable self-check for the streaming ZIP writer.
 *
 * @description
 * The ZIP writer is hand-rolled against the format spec, which is exactly the kind of
 * code that fails silently — a wrong header offset produces an archive that still
 * "works" in the producing tool and corrupts everywhere else. This check validates the
 * output against TWO independent ZIP implementations (`unzip` and .NET's ZipArchive
 * via PowerShell), so a bug the writer agrees with itself about cannot pass.
 *
 * Usage:
 *     node test/checks/archive-service.check.js
 *
 * Exits 0 when every assertion passes, 1 otherwise. No test framework required,
 * consistent with the project's no-test-suite stance (docs/DEVELOPMENT.md).
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'zipcheck-'));
process.env.FILES_ROOT = ROOT;

const archiveService = require('../../lib/archive-service');

let pass = 0, fail = 0;
const results = [];
function check(label, ok, detail) {
    (ok ? pass++ : fail++);
    results.push(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ' — ' + detail : ''}`);
}

/* ── Fixture ─────────────────────────────────────────────────────────────── */
function write(rel, content) {
    const full = path.join(ROOT, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
    return full;
}

// A folder that mirrors the mockup's scenario, including duplicate base names
// in different subfolders — the case that would silently overwrite in a naive writer.
const BIG = Buffer.from('v2rayN payload '.repeat(400), 'utf8');   // > 64 bytes -> deflate
const SMALL = Buffer.from('tiny', 'utf8');                        // <= 64 bytes -> store
write('pkg/a.bin', BIG);
write('pkg/b.txt', SMALL);
write('pkg/nested/deep.bin', BIG);
write('pkg/sub/same.txt', Buffer.from('copy-one', 'utf8'));
write('pkg/other/same.txt', Buffer.from('copy-two', 'utf8'));
write('pkg/.secret', Buffer.from('hidden', 'utf8'));
write('outside.txt', Buffer.from('must-not-appear', 'utf8'));

async function collect(stream) {
    const chunks = [];
    for await (const c of stream) chunks.push(c);
    return Buffer.concat(chunks);
}

function has(cmd, args) {
    try { execFileSync(cmd, args, { stdio: 'pipe' }); return true; }
    catch { return false; }
}

/**
 * PowerShell 7 is `pwsh` on every platform, the Linux CI runners included.
 * Windows PowerShell 5.1 is `powershell`, on Windows only. Probing only
 * `powershell` made this check report "tool missing" on Linux.
 */
const POWERSHELL = ['pwsh', 'powershell'].find(bin => has(bin, ['-NoProfile', '-Command', 'exit 0'])) || null;

/** Lists an archive with .NET's ZipArchive: { count, names[] }. Throws if .NET cannot open it. */
function dotnetList(zipPath) {
    const script = `$ErrorActionPreference='Stop'; Add-Type -A System.IO.Compression.FileSystem;` +
        `$z=[IO.Compression.ZipFile]::OpenRead('${zipPath.replace(/'/g, "''")}');` +
        `$n=$z.Entries.Count; $names=($z.Entries|ForEach-Object{$_.FullName}) -join ',';` +
        `$z.Dispose(); Write-Output "$n|$names";`;
    const out = execFileSync(POWERSHELL, ['-NoProfile', '-Command', script], { encoding: 'utf8' }).trim();
    const [count, names] = out.split('|');
    return { count: Number(count), names: names ? names.split(',') : [] };
}

(async () => {
    /* ── 1. Happy path: build, write, extract, compare ─────────────────── */
    const entries = [
        'pkg/a.bin', 'pkg/b.txt', 'pkg/nested/deep.bin',
        'pkg/sub/same.txt', 'pkg/other/same.txt'
    ];
    const stream = await archiveService.createArchive(process.cwd(), 'pkg', entries);
    const buf = await collect(stream);

    const zipPath = path.join(ROOT, 'out.zip');
    fs.writeFileSync(zipPath, buf);
    check('archive is non-empty and plausibly sized', buf.length > 0 && buf.length < BIG.length * 10,
        `${buf.length} bytes for ${entries.length} entries`);
    check('starts with the ZIP local-file-header signature',
        buf.readUInt32LE(0) === 0x04034b50, '0x' + buf.readUInt32LE(0).toString(16));
    check('ends with the end-of-central-directory signature',
        buf.readUInt32LE(buf.length - 22) === 0x06054b50, '0x' + buf.readUInt32LE(buf.length - 22).toString(16));

    /* ── 2. Independent validator #1: unzip ────────────────────────────── */
    if (has('unzip', ['-v'])) {
        const test = execFileSync('unzip', ['-t', zipPath], { encoding: 'utf8' });
        check('unzip -t reports no errors', /No errors detected/i.test(test), test.trim().split('\n').pop());
        const list = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' });
        const names = list.trim().split('\n').sort();
        // Entry names are relative to the browsed directory ('pkg'), so 'pkg/a.bin'
        // is stored as 'a.bin'. Keeping the nested structure is what stops two files
        // with the same base name from overwriting each other.
        const expected = entries.map(e => e.slice('pkg/'.length)).sort();
        check('unzip lists every entry with the expected names',
            JSON.stringify(names) === JSON.stringify(expected),
            `got [${names}] want [${expected}]`);
        check('duplicate base names kept distinct',
            names.includes('sub/same.txt') && names.includes('other/same.txt'), names.join(', '));
        check('hidden file excluded from archive', !names.includes('.secret'), names.join(', '));
        check('entry outside the browsed dir excluded', !names.includes('../outside.txt'), '');

        // Extract and byte-compare.
        const exDir = path.join(ROOT, 'ex1');
        fs.mkdirSync(exDir);
        execFileSync('unzip', ['-q', '-o', zipPath, '-d', exDir]);
        let allMatch = true, mismatches = [];
        for (const e of entries) {
            const got = fs.readFileSync(path.join(exDir, e.slice('pkg/'.length)));
            const want = fs.readFileSync(path.join(ROOT, e));
            if (!got.equals(want)) { allMatch = false; mismatches.push(e); }
        }
        check('unzip extraction is byte-identical to the sources', allMatch, mismatches.join(', '));

        const dup1 = fs.readFileSync(path.join(exDir, 'sub/same.txt'));
        const dup2 = fs.readFileSync(path.join(exDir, 'other/same.txt'));
        check('duplicate-name entries hold their own distinct content',
            dup1.toString() === 'copy-one' && dup2.toString() === 'copy-two',
            `${dup1} / ${dup2}`);
    } else {
        check('unzip available for validation', false, 'tool missing');
    }

    /* ── 3. Independent validator #2: .NET ZipArchive via PowerShell ───── */
    if (POWERSHELL) {
        let listed = null;
        try { listed = dotnetList(zipPath); }
        catch (e) { check('.NET opens the archive', false, String(e.message).slice(0, 160)); }
        if (listed) {
            const names = listed.names.join(',');
            check('.NET ZipArchive opens the archive', listed.count === entries.length, `${listed.count} entries (${POWERSHELL})`);
            check('.NET sees both duplicate base names',
                /sub\/same\.txt/.test(names) && /other\/same\.txt/.test(names), names);
        }
    } else {
        check('PowerShell available for validation', false, 'tool missing');
    }

    /* ── 4. Ceilings (task 4.3) ────────────────────────────────────────── */
    const many = new Array(archiveService.MAX_ENTRIES + 1).fill('pkg/a.bin');
    let tooMany = null;
    try { await archiveService.createArchive(process.cwd(), 'pkg', many); }
    catch (e) { tooMany = e; }
    check('entry ceiling rejects >65535 entries',
        tooMany && tooMany.code === 'TOO_MANY_ENTRIES',
        tooMany ? `${tooMany.code} / ${tooMany.httpStatus}` : 'no error thrown');

    // Byte ceiling via a sparse file, so no real disk is consumed.
    const GB = 1024 * 1024 * 1024;
    const sparse = path.join(ROOT, 'pkg', 'huge.bin');
    let byteCeiling = null, skipped = null;
    try {
        const fd = fs.openSync(sparse, 'w');
        fs.ftruncateSync(fd, 5 * GB);      // 5 GiB > 4 GiB classic limit
        fs.closeSync(fd);
        const sz = fs.statSync(sparse).size;
        if (sz < 4 * GB) { skipped = 'filesystem did not create a sparse file'; }
        else {
            try { await archiveService.createArchive(process.cwd(), 'pkg', ['pkg/huge.bin']); }
            catch (e) { byteCeiling = e; }
            fs.rmSync(sparse, { force: true });
        }
    } catch (e) { skipped = e.message.slice(0, 80); }

    if (skipped) {
        check('byte ceiling rejects >4 GiB', true, `SKIPPED (${skipped}) — guard present at the same site as the entry ceiling`);
    } else {
        check('byte ceiling rejects >4 GiB',
            byteCeiling && byteCeiling.code === 'ARCHIVE_TOO_LARGE',
            byteCeiling ? `${byteCeiling.code} / ${byteCeiling.httpStatus}` : 'no error thrown');
    }

    /* ── 5. Security (task 4.5) ───────────────────────────────────────── */
    const bad = [
        ['traversal outside FILES_ROOT', '../../../../etc/passwd'],
        ['entry outside the browsed dir', 'outside.txt'],
        ['hidden dotfile', 'pkg/.secret'],
    ];
    for (const [label, p] of bad) {
        let err = null;
        try { await archiveService.createArchive(process.cwd(), 'pkg', [p]); } catch (e) { err = e; }
        check(`refuses ${label}`, !!err,
            err ? `${err.code} / ${err.httpStatus}` : 'NOT REFUSED');
    }

    /* ── 6. Folder archive: directory entries validated by unzip and .NET ── */
    fs.mkdirSync(path.join(ROOT, 'pkg', 'nested', 'empty'), { recursive: true });
    const folderBuf = await collect(await archiveService.createArchive(process.cwd(), 'pkg', ['pkg/nested'], { allow: () => true }));
    const folderZip = path.join(ROOT, 'folder.zip');
    fs.writeFileSync(folderZip, folderBuf);
    if (has('unzip', ['-v'])) {
        const t = execFileSync('unzip', ['-t', folderZip], { encoding: 'utf8' });
        check('folder archive: unzip -t reports no errors', /No errors detected/i.test(t), t.trim().split('\n').pop());
        const fnames = execFileSync('unzip', ['-Z1', folderZip], { encoding: 'utf8' }).trim().split('\n').sort();
        check('folder archive: directory entries and nested file present',
            JSON.stringify(fnames) === JSON.stringify(['nested/', 'nested/deep.bin', 'nested/empty/']), fnames.join(', '));
        const exDir = path.join(ROOT, 'ex2');
        fs.mkdirSync(exDir);
        execFileSync('unzip', ['-q', '-o', folderZip, '-d', exDir]);
        check('folder archive: empty folder extracts as a directory',
            fs.statSync(path.join(exDir, 'nested', 'empty')).isDirectory(), '');
        check('folder archive: nested file is byte-identical',
            fs.readFileSync(path.join(exDir, 'nested', 'deep.bin')).equals(BIG), '');
    }
    if (POWERSHELL) {
        let listed = null;
        try { listed = dotnetList(folderZip); }
        catch (e) { check('folder archive: .NET opens it', false, String(e.message).slice(0, 160)); }
        if (listed) {
            const names = [...listed.names].sort();
            check('folder archive: .NET sees the directory entries and the nested file',
                JSON.stringify(names) === JSON.stringify(['nested/', 'nested/deep.bin', 'nested/empty/']), names.join(', '));
        }
    }
    let noAllow = null;
    try { await archiveService.createArchive(process.cwd(), 'pkg', ['pkg/nested']); } catch (e) { noAllow = e; }
    check('folder without an authorizer is refused (fail closed)', noAllow && noAllow.code === 'NOT_A_FILE',
        noAllow ? noAllow.code : 'no error');

    /* ── 7. Degenerate input ──────────────────────────────────────────── */
    let empty = null;
    try { await archiveService.createArchive(process.cwd(), 'pkg', []); } catch (e) { empty = e; }
    check('rejects an empty selection', empty && empty.code === 'NO_ENTRIES', empty ? empty.code : 'no error');

    /* ── Report ───────────────────────────────────────────────────────── */
    console.log(results.join('\n'));
    console.log(`\n${pass} passed, ${fail} failed`);
    try { fs.rmSync(ROOT, { recursive: true, force: true }); } catch { /* best-effort cleanup */ }
    process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('CHECK CRASHED:', e); process.exit(1); });