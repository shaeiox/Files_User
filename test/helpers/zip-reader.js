/**
 * @file test/helpers/zip-reader.js
 * @brief Minimal, independent classic-ZIP reader for tests.
 *
 * Reads an archive from its central directory, the way unzip tools do, and
 * extracts each entry's content through the local header. It shares no code with
 * lib/archive-service.js, so a writer bug cannot pass because the reader agrees
 * with it. test/checks/archive-service.check.js still validates the writer
 * against the real `unzip` and .NET ZipArchive.
 */
'use strict';

const { inflateRawSync, crc32 } = require('zlib');

const SIG_EOCD = 0x06054b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_LOCAL = 0x04034b50;

/**
 * @param {Buffer} buf  Whole archive.
 * @returns {Array<{name:string, isDir:boolean, content:Buffer, externalAttrs:number, versionMadeBy:number, flags:number}>}
 */
function readZip(buf) {
    let eocd = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 0xffff); i--) {
        if (buf.readUInt32LE(i) === SIG_EOCD) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('no end-of-central-directory record');

    const count = buf.readUInt16LE(eocd + 10);
    let p = buf.readUInt32LE(eocd + 16);
    const out = [];
    for (let n = 0; n < count; n++) {
        if (buf.readUInt32LE(p) !== SIG_CENTRAL) throw new Error(`bad central header at ${p}`);
        const versionMadeBy = buf.readUInt16LE(p + 4);
        const flags = buf.readUInt16LE(p + 8);
        const method = buf.readUInt16LE(p + 10);
        const crc = buf.readUInt32LE(p + 16);
        const csize = buf.readUInt32LE(p + 20);
        const usize = buf.readUInt32LE(p + 24);
        const nameLen = buf.readUInt16LE(p + 28);
        const extraLen = buf.readUInt16LE(p + 30);
        const commentLen = buf.readUInt16LE(p + 32);
        const externalAttrs = buf.readUInt32LE(p + 38);
        const localOffset = buf.readUInt32LE(p + 42);
        const name = buf.toString('utf8', p + 46, p + 46 + nameLen);

        if (buf.readUInt32LE(localOffset) !== SIG_LOCAL) throw new Error(`bad local header for ${name}`);
        const lNameLen = buf.readUInt16LE(localOffset + 26);
        const lExtraLen = buf.readUInt16LE(localOffset + 28);
        const dataStart = localOffset + 30 + lNameLen + lExtraLen;
        const raw = buf.subarray(dataStart, dataStart + csize);
        const content = method === 8 ? inflateRawSync(raw) : Buffer.from(raw);
        if (content.length !== usize) throw new Error(`size mismatch for ${name}`);
        if ((crc32(content) >>> 0) !== crc) throw new Error(`crc mismatch for ${name}`);

        out.push({ name, isDir: name.endsWith('/'), content, externalAttrs, versionMadeBy, flags });
        p += 46 + nameLen + extraLen + commentLen;
    }
    return out;
}

/** Entry names, sorted. */
const zipNames = (buf) => readZip(buf).map((e) => e.name).sort();

module.exports = { readZip, zipNames };
