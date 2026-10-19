/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @file        lib/archive-service.js
 * @brief       Streaming classic-ZIP writer for a selection of files and folders.
 *
 * @description
 * Produces a real ZIP archive on the fly for a set of selected files and folders.
 * The archive is never materialised on disk: entries are compressed and emitted one
 * at a time, so peak memory stays at a single compression chunk regardless of
 * selection size. Selection validation and folder expansion live in
 * `archive-selection.js`. This module writes the bytes.
 *
 * ── WHY HAND-ROLLED ─────────────────────────────────────────────────────────
 * `package.json` ships only bcrypt, dotenv and lenis. Adding an archive dependency
 * for a single endpoint would widen the supply-chain surface for no functional gain,
 * and ADR-001 keeps this project minimal-dependency. Node's built-in `zlib` provides
 * both raw deflate and CRC-32, so the format is written directly against the spec.
 *
 * ── STREAMING AND SIZES ──────────────────────────────────────────────────────
 * Sizes and CRC are not known until an entry has been fully compressed, but the local
 * file header is written first. This uses the standard resolution: general-purpose
 * bit 3, which defers CRC and both sizes to a data descriptor placed immediately
 * after the entry's data. The central directory (written at the end, once every
 * entry is known) carries the authoritative values. Every mainstream unzip
 * implementation reads this form.
 *
 * ── DIRECTORY ENTRIES ───────────────────────────────────────────────────────
 * A folder is a zero-length STORE entry whose name ends in `/`. Its CRC and sizes
 * are known up front (all zero), so it carries no data descriptor and no bit 3.
 * The external attributes set the MS-DOS directory bit. These entries keep empty
 * folders, and they carry each folder's modification time.
 *
 * ── SCOPE: CLASSIC ZIP ONLY ──────────────────────────────────────────────────
 * No ZIP64. A selection above 65535 entries or 4 GiB is rejected with an explicit
 * error rather than silently emitting a corrupt archive. ZIP64 is the upgrade path
 * if real selections ever approach that ceiling.
 *
 * Dependencies: node:zlib, node:fs (both built-in). No npm packages.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
'use strict';

const fs = require('fs');
const { createDeflateRaw, crc32 } = require('zlib');
const { Readable } = require('stream');
const { resolveSelection, MAX_ENTRIES, MAX_TOTAL_BYTES } = require('./archive-selection');

/* ── Format constants ──────────────────────────────────────────────────────── */
const SIG_LOCAL = 0x04034b50;
const SIG_DESC = 0x08074b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_EOCD = 0x06054b50;

const METHOD_DEFLATE = 8;
const METHOD_STORE = 0;

/** Bit 3 = CRC/sizes live in a trailing data descriptor. Bit 11 = UTF-8 names. */
const FLAG_DESCRIPTOR = 0x0008;
const FLAG_UTF8 = 0x0800;

const VERSION_STORE = 10;
const VERSION_DEFLATE = 20;

/**
 * "Version made by" high byte: 3 = Unix. It makes the Unix modes in the external
 * attributes meaningful, and stops Info-ZIP applying MS-DOS OEM code-page
 * translation to names that already carry the UTF-8 flag (non-Latin names).
 */
const HOST_UNIX = 3 << 8;

/** External attributes: unix mode in the high word, MS-DOS attribute bits in the low byte. */
const ATTR_FILE = (0o100644 << 16) >>> 0;
const ATTR_DIR = ((0o040755 << 16) | 0x10) >>> 0;

/** Read flags for walked files: never follow a link swapped in after the walk (POSIX). */
const NOFOLLOW_FLAGS = fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0);

/**
 * @brief Converts a Date into the DOS time/date pair ZIP records.
 */
function dosDateTime(d) {
    const dt = (d instanceof Date && !isNaN(d.getTime())) ? d : new Date();
    const year = Math.max(1980, dt.getFullYear());
    const time = ((dt.getHours() & 0x1f) << 11) | ((dt.getMinutes() & 0x3f) << 5) | ((dt.getSeconds() / 2) & 0x1f);
    const date = (((year - 1980) & 0x7f) << 9) | (((dt.getMonth() + 1) & 0x0f) << 5) | (dt.getDate() & 0x1f);
    return { time: time & 0xffff, date: date & 0xffff };
}

/**
 * @brief Compresses one file into deflated chunks, accumulating CRC over the raw input.
 * @details Byte counting of the compressed output is deliberately left to the caller:
 *          a `'data'` listener here would force flowing mode and could emit chunks
 *          before the async iterator attaches, so sizes are counted during yield instead.
 * @param   {object} entry     File entry ({ absPath, noFollow }).
 * @param   {object} counters  Mutated with the running raw CRC and byte total.
 */
async function* deflateEntry(entry, counters) {
    let crc = 0;
    let rawLen = 0;
    const deflate = createDeflateRaw();

    // A walked file is opened with O_NOFOLLOW; the handle's stream closes it on end/error.
    const src = entry.noFollow
        ? (await fs.promises.open(entry.absPath, NOFOLLOW_FLAGS)).createReadStream()
        : fs.createReadStream(entry.absPath);
    src.on('data', (chunk) => {
        crc = crc32(chunk, crc);
        rawLen += chunk.length;
    });
    src.on('error', (err) => deflate.destroy(err));

    src.pipe(deflate);
    for await (const chunk of deflate) yield chunk;

    counters.crc = crc >>> 0;
    counters.usize = rawLen;
}

/** @brief Reads a small file whole (STORE path), honouring the no-follow flag. */
async function readSmall(entry) {
    if (!entry.noFollow) return fs.promises.readFile(entry.absPath);
    const handle = await fs.promises.open(entry.absPath, NOFOLLOW_FLAGS);
    try { return await handle.readFile(); }
    finally { await handle.close(); }
}

/** @brief Builds a 30-byte local file header. */
function localHeader({ version, flags, method, time, date, crc, csize, usize, nameLen }) {
    const local = Buffer.alloc(30);
    local.writeUInt32LE(SIG_LOCAL, 0);
    local.writeUInt16LE(version, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(csize, 18);
    local.writeUInt32LE(usize, 22);
    local.writeUInt16LE(nameLen, 26);
    local.writeUInt16LE(0, 28);            // extra length
    return local;
}

/**
 * @brief Yields the complete classic-ZIP byte stream for a resolved selection.
 */
async function* zipStream(entries) {
    const central = [];
    let offset = 0;

    const emit = function* (buf) {
        offset += buf.length;
        yield buf;
    };

    for (const entry of entries) {
        const nameBuf = Buffer.from(entry.name, 'utf8');
        const { time, date } = dosDateTime(entry.mtime);
        const entryOffset = offset;

        if (entry.kind === 'dir') {
            // Directory: everything is known up front, so no data descriptor.
            const flags = FLAG_UTF8;
            yield* emit(localHeader({ version: VERSION_STORE, flags, method: METHOD_STORE, time, date, crc: 0, csize: 0, usize: 0, nameLen: nameBuf.length }));
            yield* emit(nameBuf);
            central.push({ nameBuf, time, date, flags, method: METHOD_STORE, crc: 0, csize: 0, usize: 0, offset: entryOffset, attrs: ATTR_DIR });
            continue;
        }

        // Choose the cheapest correct method for this entry. Tiny files are stored
        // verbatim — deflate would inflate them and can even grow them.
        const useDeflate = entry.size > 64;
        const method = useDeflate ? METHOD_DEFLATE : METHOD_STORE;
        const version = useDeflate ? VERSION_DEFLATE : VERSION_STORE;
        const flags = FLAG_DESCRIPTOR | FLAG_UTF8;

        // Local file header — CRC and both sizes are zero here and follow the data
        // in a descriptor, because they are not known until the entry is compressed.
        yield* emit(localHeader({ version, flags, method, time, date, crc: 0, csize: 0, usize: 0, nameLen: nameBuf.length }));
        yield* emit(nameBuf);

        let crc = 0, csize = 0, usize = 0;

        if (useDeflate) {
            const counters = {};
            for await (const chunk of deflateEntry(entry, counters)) {
                csize += chunk.length;
                yield* emit(chunk);
            }
            crc = counters.crc >>> 0;
            usize = counters.usize;
        } else {
            const buf = await readSmall(entry);
            crc = crc32(buf, 0) >>> 0;
            csize = buf.length;
            usize = buf.length;
            yield* emit(buf);
        }

        // Data descriptor — the real CRC and sizes, known only now.
        const desc = Buffer.alloc(16);
        desc.writeUInt32LE(SIG_DESC, 0);
        desc.writeUInt32LE(crc, 4);
        desc.writeUInt32LE(csize, 8);
        desc.writeUInt32LE(usize, 12);
        yield* emit(desc);

        central.push({ nameBuf, time, date, flags, method, crc, csize, usize, offset: entryOffset, attrs: ATTR_FILE });
    }

    // Central directory.
    const cdStart = offset;
    for (const e of central) {
        const version = e.method === METHOD_DEFLATE ? VERSION_DEFLATE : VERSION_STORE;
        const cd = Buffer.alloc(46);
        cd.writeUInt32LE(SIG_CENTRAL, 0);
        cd.writeUInt16LE(HOST_UNIX | version, 4);
        cd.writeUInt16LE(version, 6);
        cd.writeUInt16LE(e.flags, 8);
        cd.writeUInt16LE(e.method, 10);
        cd.writeUInt16LE(e.time, 12);
        cd.writeUInt16LE(e.date, 14);
        cd.writeUInt32LE(e.crc, 16);
        cd.writeUInt32LE(e.csize, 20);
        cd.writeUInt32LE(e.usize, 24);
        cd.writeUInt16LE(e.nameBuf.length, 28);
        cd.writeUInt16LE(0, 30);              // extra
        cd.writeUInt16LE(0, 32);              // comment
        cd.writeUInt16LE(0, 34);              // disk number
        cd.writeUInt16LE(0, 36);              // internal attrs
        cd.writeUInt32LE(e.attrs, 38);        // external attrs: regular file 0644 / directory 0755
        cd.writeUInt32LE(e.offset, 42);
        yield* emit(cd);
        yield* emit(e.nameBuf);
    }
    const cdSize = offset - cdStart;

    // End of central directory.
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(SIG_EOCD, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(central.length, 8);
    eocd.writeUInt16LE(central.length, 10);
    eocd.writeUInt32LE(cdSize, 12);
    eocd.writeUInt32LE(cdStart, 16);
    eocd.writeUInt16LE(0, 20);
    yield* emit(eocd);
}

/**
 * @brief Validates a selection and returns a Readable of the ZIP archive.
 * @param   {string}   projectRoot  Project root.
 * @param   {string}   dirRel       Relative path of the directory being browsed.
 * @param   {string[]} relPaths     Selected relative paths (files and, with `allow`, folders).
 * @param   {object}   [options]    Forwarded to archive-selection.resolveSelection
 *                                  (`allow` enables folder expansion).
 * @returns {Promise<Readable & {archiveEntryCount: number, archiveDir: string, archiveSoleFolder: ?string}>}
 *          Stream that yields the whole archive. `archiveEntryCount` counts files.
 */
async function createArchive(projectRoot, dirRel, relPaths, options = {}) {
    const { dirRel: dir, entries, soleFolder } = await resolveSelection(projectRoot, dirRel, relPaths, options);
    const stream = /** @type {Readable & {archiveEntryCount: number, archiveDir: string, archiveSoleFolder: ?string}} */ (Readable.from(zipStream(entries), { objectMode: false }));
    stream.archiveEntryCount = entries.filter(e => e.kind === 'file').length;
    stream.archiveDir = dir;
    stream.archiveSoleFolder = soleFolder;
    return stream;
}

/** @brief Letters and digits of any script, dot, dash and underscore survive; anything else becomes `_`. */
function safeBaseName(value, fallback) {
    return String(value || '').replace(/[^\p{L}\p{N}._-]+/gu, '_').slice(0, 60) || fallback;
}

/**
 * @brief Builds a safe download filename for the archive.
 * @param {string}  dirRel       Browsed directory.
 * @param {number}  entryCount   Files in the archive.
 * @param {?string} [soleFolder] Folder name when the selection is exactly one folder.
 */
function archiveName(dirRel, entryCount, soleFolder) {
    if (soleFolder) return `${safeBaseName(soleFolder, 'folder')}.zip`;
    const base = dirRel ? String(dirRel).split('/').filter(Boolean).pop() : 'files';
    return `${safeBaseName(base, 'files')}-${entryCount}-files.zip`;
}

module.exports = { createArchive, archiveName, resolveSelection, MAX_ENTRIES, MAX_TOTAL_BYTES };
