/**
 * @file test/archive-selection.test.js
 * @brief Folder-aware ZIP selection: recursive expansion, directory entries,
 *        hidden/symlink skipping, per-descendant authorization (allow pruning),
 *        fail-closed folder refusal without an authorizer, overlap dedupe, the
 *        classic-ZIP ceilings and archive naming.
 *        Spec: openspec/changes/folder-zip-and-range-selection/specs/bulk-download.
 */
'use strict';

const { test, describe, before, after } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { readZip, zipNames } = require('./helpers/zip-reader');

const ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'zipsel-'));
const PROJECT = path.resolve(__dirname, '..');
let prevRoot;

const archiveService = require('../lib/archive-service');
const allowAll = () => true;

function write(rel, content) {
    const full = path.join(ROOT, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
}

async function zipOf(dir, items, options) {
    const stream = await archiveService.createArchive(PROJECT, dir, items, options);
    const chunks = [];
    for await (const c of stream) chunks.push(c);
    return { buf: Buffer.concat(chunks), stream };
}

async function refusal(promise) {
    try { await promise; } catch (err) { return err; }
    return null;
}

before(() => {
    prevRoot = process.env.FILES_ROOT;
    process.env.FILES_ROOT = ROOT;
    write('pkg/top.txt', 'top');
    write('pkg/sub/a.txt', 'alpha');
    write('pkg/sub/deep/b.bin', Buffer.from('bravo '.repeat(200)));
    write('pkg/sub/.secret', 'hidden-dotfile');
    write('pkg/sub/index.html', '<html>');
    write('pkg/sub/.git/config', 'hidden-dir');
    fs.mkdirSync(path.join(ROOT, 'pkg/sub/empty'), { recursive: true });
    write('other/outside.txt', 'outside');
});

after(() => {
    if (prevRoot === undefined) delete process.env.FILES_ROOT; else process.env.FILES_ROOT = prevRoot;
    fs.rmSync(ROOT, { recursive: true, force: true });
});

describe('folder expansion', () => {
    test('a folder expands recursively with directory entries, named relative to the browsed dir', async () => {
        const { buf } = await zipOf('pkg', ['pkg/sub'], { allow: allowAll });
        assert.deepStrictEqual(zipNames(buf), [
            'sub/', 'sub/a.txt', 'sub/deep/', 'sub/deep/b.bin', 'sub/empty/',
        ]);
    });

    test('extracted content matches the sources byte for byte; directories carry the directory attribute', async () => {
        const { buf } = await zipOf('pkg', ['pkg/sub'], { allow: allowAll });
        const entries = readZip(buf);
        const byName = Object.fromEntries(entries.map((e) => [e.name, e]));
        assert.strictEqual(byName['sub/a.txt'].content.toString(), 'alpha');
        assert.ok(byName['sub/deep/b.bin'].content.equals(fs.readFileSync(path.join(ROOT, 'pkg/sub/deep/b.bin'))));
        for (const e of entries.filter((x) => x.isDir)) {
            assert.strictEqual(e.content.length, 0, e.name);
            assert.strictEqual(e.externalAttrs & 0x10, 0x10, e.name + ' has the MS-DOS directory bit');
        }
    });

    test('a category folder zips from the root listing under its own name', async () => {
        const { buf } = await zipOf('', ['pkg'], { allow: allowAll });
        const names = zipNames(buf);
        assert.ok(names.includes('pkg/'));
        assert.ok(names.includes('pkg/top.txt'));
        assert.ok(names.includes('pkg/sub/deep/b.bin'));
    });

    test('files and folders mix in one selection', async () => {
        const { buf } = await zipOf('pkg', ['pkg/top.txt', 'pkg/sub'], { allow: allowAll });
        const names = zipNames(buf);
        assert.ok(names.includes('top.txt'));
        assert.ok(names.includes('sub/a.txt'));
    });

    test('hidden names (dotfiles, dot-folders, index.html) never enter the archive', async () => {
        const names = zipNames((await zipOf('pkg', ['pkg/sub'], { allow: allowAll })).buf);
        for (const n of names) {
            assert.ok(!/(^|\/)\./.test(n), n);
            assert.ok(!/index\.html$/.test(n), n);
        }
    });

    test('symbolic links (file and directory) are skipped, like the listing', async (t) => {
        const fileLink = path.join(ROOT, 'pkg/sub/link.txt');
        const dirLink = path.join(ROOT, 'pkg/sub/linkdir');
        try {
            fs.symlinkSync(path.join(ROOT, 'other/outside.txt'), fileLink);
            fs.symlinkSync(path.join(ROOT, 'other'), dirLink, 'junction');
        } catch (err) {
            return t.skip(`cannot create links here (${err.code})`);
        }
        try {
            const { buf } = await zipOf('pkg', ['pkg/sub'], { allow: allowAll });
            const names = zipNames(buf);
            assert.ok(!names.some((n) => n.includes('link')), names.join(', '));
            assert.ok(!buf.includes(Buffer.from('outside')));
        } finally {
            fs.rmSync(fileLink, { force: true });
            fs.rmSync(dirLink, { force: true, recursive: false });
        }
    });
});

describe('per-descendant authorization', () => {
    test('a refused descendant folder is neither listed nor walked', async () => {
        const asked = [];
        const allow = (rel) => { asked.push(rel); return rel !== 'pkg/sub/deep'; };
        const { buf } = await zipOf('pkg', ['pkg/sub'], { allow });
        const names = zipNames(buf);
        assert.ok(!names.some((n) => n.startsWith('sub/deep')), names.join(', '));
        assert.ok(names.includes('sub/a.txt'));
        assert.ok(asked.includes('pkg/sub/deep'), 'the folder itself is decided');
        assert.ok(!asked.includes('pkg/sub/deep/b.bin'), 'nothing under a refused folder is consulted');
    });

    test('a refused descendant file is omitted while its siblings stay', async () => {
        const { buf } = await zipOf('pkg', ['pkg/sub'], { allow: (rel) => rel !== 'pkg/sub/a.txt' });
        const names = zipNames(buf);
        assert.ok(!names.includes('sub/a.txt'));
        assert.ok(names.includes('sub/deep/b.bin'));
    });

    test('the authorizer receives root-relative POSIX paths', async () => {
        const asked = [];
        await zipOf('pkg', ['pkg/sub'], { allow: (rel) => { asked.push(rel); return true; } });
        assert.ok(asked.length > 0);
        for (const rel of asked) {
            assert.ok(rel.startsWith('pkg/sub/'), rel);
            assert.ok(!rel.includes('\\'), rel);
        }
    });

    test('without an authorizer a folder is refused (fail closed) and files still work', async () => {
        const err = await refusal(zipOf('pkg', ['pkg/sub']));
        assert.ok(err, 'refused');
        assert.strictEqual(err.code, 'NOT_A_FILE');
        assert.strictEqual(err.httpStatus, 400);
        const { buf } = await zipOf('pkg', ['pkg/top.txt']);
        assert.deepStrictEqual(zipNames(buf), ['top.txt']);
    });

    test('a folder outside the browsed directory is refused', async () => {
        const err = await refusal(zipOf('pkg', ['other'], { allow: allowAll }));
        assert.ok(err);
        assert.strictEqual(err.code, 'ENTRY_OUTSIDE_DIR');
    });

    test('a hidden folder cannot be named directly', async () => {
        const err = await refusal(zipOf('pkg', ['pkg/sub/.git'], { allow: allowAll }));
        assert.ok(err);
        assert.ok([403, 404].includes(err.httpStatus), String(err.httpStatus));
    });
});

describe('dedupe and ceilings', () => {
    test('a file also covered by a selected folder appears once', async () => {
        const { buf } = await zipOf('pkg', ['pkg/sub', 'pkg/sub/a.txt'], { allow: allowAll });
        const names = readZip(buf).map((e) => e.name);
        assert.strictEqual(names.filter((n) => n === 'sub/a.txt').length, 1);
    });

    test('the entry ceiling stops the walk with 413', async () => {
        const err = await refusal(zipOf('pkg', ['pkg/sub'], { allow: allowAll, maxEntries: 3 }));
        assert.ok(err);
        assert.strictEqual(err.code, 'TOO_MANY_ENTRIES');
        assert.strictEqual(err.httpStatus, 413);
    });

    test('the byte ceiling stops the walk with 413', async () => {
        const err = await refusal(zipOf('pkg', ['pkg/sub'], { allow: allowAll, maxBytes: 10 }));
        assert.ok(err);
        assert.strictEqual(err.code, 'ARCHIVE_TOO_LARGE');
        assert.strictEqual(err.httpStatus, 413);
    });
});

describe('naming', () => {
    test('a single-folder selection is named after the folder', async () => {
        const { stream } = await zipOf('pkg', ['pkg/sub'], { allow: allowAll });
        assert.strictEqual(stream.archiveSoleFolder, 'sub');
        assert.strictEqual(archiveService.archiveName('pkg', stream.archiveEntryCount, stream.archiveSoleFolder), 'sub.zip');
    });

    test('any other selection keeps the <dir>-<n>-files name', async () => {
        const { stream } = await zipOf('pkg', ['pkg/top.txt', 'pkg/sub'], { allow: allowAll });
        assert.strictEqual(stream.archiveSoleFolder, null);
        assert.strictEqual(archiveService.archiveName('pkg', 2), 'pkg-2-files.zip');
    });

    test('entries declare a Unix host and UTF-8 names so Info-ZIP keeps non-Latin names', async () => {
        // Info-ZIP on Linux applies OEM code-page translation to names from an
        // MS-DOS host even when the UTF-8 flag is set, garbling Persian folder
        // names on extraction. Host 3 (Unix) also makes the Unix modes in the
        // external attributes meaningful.
        write('pkg/نسخه ۲/فایل.txt', 'fa');
        const { buf } = await zipOf('pkg', ['pkg/نسخه ۲'], { allow: allowAll });
        const entries = readZip(buf);
        assert.deepStrictEqual(entries.map(e => e.name), ['نسخه ۲/', 'نسخه ۲/فایل.txt']);
        for (const e of entries) {
            assert.strictEqual(e.versionMadeBy >> 8, 3, `${e.name}: host must be Unix`);
            assert.ok(e.flags & 0x800, `${e.name}: UTF-8 flag must be set`);
        }
        fs.rmSync(path.join(ROOT, 'pkg/نسخه ۲'), { recursive: true, force: true });
    });

    test('non-Latin folder names survive; unsafe characters do not', () => {
        assert.strictEqual(archiveService.archiveName('', 1, 'نسخه ۲'), 'نسخه_۲.zip');
        assert.strictEqual(archiveService.archiveName('', 1, 'a"b/c\\d'), 'a_b_c_d.zip');
    });
});
