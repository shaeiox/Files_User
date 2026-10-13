/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @file        lib/archive-service.js
 * @brief       Streaming classic-ZIP writer for a multi-file selection.
 *
 * @description
 * Produces a real ZIP archive on the fly for a set of selected files. The archive is
 * never materialised on disk: entries are compressed and emitted one at a time, so
 * peak memory stays at a single compression chunk regardless of selection size.
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
const path = require('path');
const { createDeflateRaw, crc32 } = require('zlib');
const { Readable } = require('stream');
const filesService = require('./files-service');

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

/** Classic-ZIP ceilings. Exceeding either is an explicit error, never a bad archive. */
const MAX_ENTRIES = 65535;
const MAX_TOTAL_BYTES = 4 * 1024 * 1024 * 1024; // 4 GiB

/**
 * @brief Raises a typed service error for the API layer.
 */
function archiveError(httpStatus, code, message) {
    const err = new Error(message);
    err.httpStatus = httpStatus;
    err.code = code;
    return err;
}

/**
 * @brief Converts a Date into the DOS time/date pair ZIP records.
 */
function dosDateTime(d) {
    const dt = (d instanceof Date && !isNaN(d)) ? d : new Date();
    const year = Math.max(1980, dt.getFullYear());
    const time = ((dt.getHours() & 0x1f) << 11) | ((dt.getMinutes() & 0x3f) << 5) | ((dt.getSeconds() / 2) & 0x1f);
    const date = (((year - 1980) & 0x7f) << 9) | (((dt.getMonth() + 1) & 0x0f) << 5) | (dt.getDate() & 0x1f);
    return { time: time & 0xffff, date: date & 0xffff };
}

/**
 * @brief Sanitises an archive entry name to a safe, relative POSIX path.
 * @details Takes the path RELATIVE TO THE BROWSED DIRECTORY, which already ends with
 *          the file name. Keeping the nested structure is what stops two files that
 *          share a base name in different folders from overwriting each other.
 */
function entryNameFor(relFromDir) {
    const parts = String(relFromDir || '')
        .replace(/\\/g, '/')
        .split('/')
        .filter(p => p && p !== '.' && p !== '..');
    if (!parts.length) {
        throw archiveError(400, 'INVALID_ENTRY', 'Invalid archive entry name.');
    }
    return parts.join('/');
}

/**
 * @brief Validates the requested selection and resolves every entry to a real file.
 * @details Every entry goes through `filesService.resolveReadableFile`, which reuses
 *          the project's containment helper and hidden-file policy. Nothing is
 *          trusted from the query string, and an entry outside the browsed directory
 *          or a hidden entry aborts the whole request.
 *
 * @param   {string} projectRoot  Project root.
 * @param   {string} dirRel       Relative path of the directory being browsed.
 * @param   {string[]} relPaths   Selected relative paths (root-relative).
 * @returns {Promise<{dirRel:string, entries:Array}>}
 */
async function resolveSelection(projectRoot, dirRel, relPaths) {
    if (!Array.isArray(relPaths) || relPaths.length === 0) {
        throw archiveError(400, 'NO_ENTRIES', 'Select at least one file.');
    }
    if (relPaths.length > MAX_ENTRIES) {
        throw archiveError(413, 'TOO_MANY_ENTRIES',
            `A ZIP archive holds at most ${MAX_ENTRIES} entries; ${relPaths.length} were requested.`);
    }

    const dirNorm = String(dirRel || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    const prefix = dirNorm ? dirNorm + '/' : '';

    const resolved = [];
    let total = 0;
    const seenNames = new Map();

    for (const raw of relPaths) {
        const rel = String(raw || '').trim();
        if (!rel) continue;

        // Resolve through the project's own containment + hidden-file policy.
        const info = await filesService.resolveReadableFile(projectRoot, rel);

        // The entry must live inside the directory being browsed, so a crafted
        // selection cannot pull in a sibling subtree the user is not looking at.
        if (prefix && !info.relPosix.startsWith(prefix)) {
            throw archiveError(403, 'ENTRY_OUTSIDE_DIR',
                'Selection contains an entry outside the browsed directory.');
        }

        total += info.size;
        if (total > MAX_TOTAL_BYTES) {
            throw archiveError(413, 'ARCHIVE_TOO_LARGE',
                'Selection exceeds the 4 GiB classic-ZIP limit.');
        }

        const name = entryNameFor(info.relPosix.slice(prefix.length));

        // Two selections mapping to the same entry name would silently overwrite.
        if (seenNames.has(name)) {
            throw archiveError(409, 'DUPLICATE_ENTRY', `Duplicate archive entry: ${name}`);
        }
        seenNames.set(name, true);

        resolved.push({ name, absPath: info.absPath, size: info.size, mtime: info.mtime });
    }

    if (!resolved.length) {
        throw archiveError(400, 'NO_ENTRIES', 'Select at least one file.');
    }

    return { dirRel: dirNorm, entries: resolved };
}

/**
 * @brief Compresses one file into deflated chunks, accumulating CRC over the raw input.
 * @details Byte counting of the compressed output is deliberately left to the caller:
 *          a `'data'` listener here would force flowing mode and could emit chunks
 *          before the async iterator attaches, so sizes are counted during yield instead.
 * @param   {object} counters  Mutated with the running raw CRC and byte total.
 */
async function* deflateEntry(absPath, counters) {
    let crc = 0;
    let rawLen = 0;
    const deflate = createDeflateRaw();

    const src = fs.createReadStream(absPath);
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

        // Choose the cheapest correct method for this entry. Tiny files are stored
        // verbatim — deflate would inflate them and can even grow them.
        const useDeflate = entry.size > 64;
        const method = useDeflate ? METHOD_DEFLATE : METHOD_STORE;
        const version = useDeflate ? VERSION_DEFLATE : VERSION_STORE;

        const entryOffset = offset;

        // Local file header — CRC and both sizes are zero here and follow the data
        // in a descriptor, because they are not known until the entry is compressed.
        const local = Buffer.alloc(30);
        local.writeUInt32LE(SIG_LOCAL, 0);
        local.writeUInt16LE(version, 4);
        local.writeUInt16LE(FLAG_DESCRIPTOR | FLAG_UTF8, 6);
        local.writeUInt16LE(method, 8);
        local.writeUInt16LE(time, 10);
        local.writeUInt16LE(date, 12);
        local.writeUInt32LE(0, 14);            // crc32   (descriptor)
        local.writeUInt32LE(0, 18);            // csize   (descriptor)
        local.writeUInt32LE(0, 22);            // usize   (descriptor)
        local.writeUInt16LE(nameBuf.length, 26);
        local.writeUInt16LE(0, 28);            // extra length

        yield* emit(local);
        yield* emit(nameBuf);

        let crc = 0, csize = 0, usize = 0;

        if (useDeflate) {
            const counters = {};
            for await (const chunk of deflateEntry(entry.absPath, counters)) {
                csize += chunk.length;
                yield* emit(chunk);
            }
            crc = counters.crc >>> 0;
            usize = counters.usize;
        } else {
            const buf = await fs.promises.readFile(entry.absPath);
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

        central.push({ nameBuf, time, date, method, crc, csize, usize, offset: entryOffset });
    }

    // Central directory.
    const cdStart = offset;
    for (const e of central) {
        const cd = Buffer.alloc(46);
        cd.writeUInt32LE(SIG_CENTRAL, 0);
        cd.writeUInt16LE(e.method === METHOD_DEFLATE ? VERSION_DEFLATE : VERSION_STORE, 4);
        cd.writeUInt16LE(e.method === METHOD_DEFLATE ? VERSION_DEFLATE : VERSION_STORE, 6);
        cd.writeUInt16LE(FLAG_DESCRIPTOR | FLAG_UTF8, 8);
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
        cd.writeUInt32LE((0o100644 << 16) >>> 0, 38); // external attrs: regular file 0644
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
 * @param   {string} projectRoot  Project root.
 * @param   {string} dirRel       Relative path of the directory being browsed.
 * @param   {string[]} relPaths   Selected relative paths.
 * @returns {Promise<Readable>}   Stream that yields the whole archive.
 */
async function createArchive(projectRoot, dirRel, relPaths) {
    const { dirRel: dir, entries } = await resolveSelection(projectRoot, dirRel, relPaths);
    const stream = Readable.from(zipStream(entries), { objectMode: false });
    stream.archiveEntryCount = entries.length;
    stream.archiveDir = dir;
    return stream;
}

/**
 * @brief Builds a safe download filename for the archive.
 */
function archiveName(dirRel, entryCount) {
    const base = dirRel ? String(dirRel).split('/').filter(Boolean).pop() : 'files';
    const safe = String(base).replace(/[^A-Za-z0-9._-]+/g, '_').slice(0, 60) || 'files';
    return `${safe}-${entryCount}-files.zip`;
}

module.exports = { createArchive, archiveName, resolveSelection, MAX_ENTRIES, MAX_TOTAL_BYTES };