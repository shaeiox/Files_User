/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @file        lib/hash-service.js
 * @brief       Streaming SHA-256 computation for a single file.
 *
 * @description
 * Computes a SHA-256 digest over a file's real bytes on explicit user request.
 *
 * ── STREAMING, NEVER BUFFERED ────────────────────────────────────────────────
 * The file is piped through `crypto.createHash('sha256')` and never read into memory,
 * so digesting a multi-hundred-megabyte artifact costs one read stream rather than one
 * allocation of the same size. Peak memory is a single chunk regardless of file size.
 *
 * ── ON-DEMAND ONLY ───────────────────────────────────────────────────────────
 * Nothing here runs during a directory listing. A digest is produced only when the
 * client asks for one, which keeps listing latency independent of total corpus size.
 *
 * ── SIZE CAP ─────────────────────────────────────────────────────────────────
 * Hashing is I/O bound: a digest is always computable, but an unbounded request would
 * let one click saturate a shared host's disk. `HASH_MAX_BYTES` caps it and is the
 * calibration knob — change it to suit the deployment rather than editing code.
 * Over-cap requests are refused with a distinct code so the UI can say "too large to
 * verify" instead of reporting a generic failure.
 *
 * Dependencies: node:crypto, node:fs, node:stream (all built-in). No npm packages.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
'use strict';

const fs = require('fs');
const crypto = require('crypto');
const filesService = require('./files-service');
const settings = require('./settings');

const ALGORITHM = 'sha256';

/** Default ceiling when HASH_MAX_BYTES is unset: 512 MiB. */
const DEFAULT_MAX_BYTES = 512 * 1024 * 1024;

/**
 * @brief Raises a typed service error for the API layer.
 */
function hashError(httpStatus, code, message) {
    const err = /** @type {Error & {httpStatus?: number, code?: string}} */ (new Error(message));
    err.httpStatus = httpStatus;
    err.code = code;
    return err;
}

/**
 * @brief Reads the configured hashing ceiling in bytes.
 * @returns {number} A positive integer; falls back to the default on a bad value.
 */
function maxBytes() {
    return settings.get('HASH_MAX_BYTES');
}

/**
 * @brief Streams a file through SHA-256.
 * @param   {string} absPath  Absolute path to the file.
 * @returns {Promise<string>}  Lowercase hex digest.
 */
function digestFile(absPath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash(ALGORITHM);
        const stream = fs.createReadStream(absPath);
        stream.on('data', chunk => hash.update(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(hash.digest('hex')));
    });
}

/**
 * @brief Computes the SHA-256 of one file inside FILES_ROOT.
 * @details Path resolution, containment, and the hidden-file policy are delegated to
 *          `filesService.resolveReadableFile`, so this service adds no path logic of
 *          its own and cannot drift from the rules the listing already enforces.
 *
 * @param   {string} projectRoot  Project root.
 * @param   {string} relPath      Relative path inside FILES_ROOT.
 * @returns {Promise<{algorithm:string, digest:string, size:number, relPath:string, fileName:string}>}
 * @throws  {Error} 413 FILE_TOO_LARGE / 403 PATH_TRAVERSAL / 403 FORBIDDEN_ENTRY / 404 NOT_FOUND
 */
async function hashFile(projectRoot, relPath) {
    const info = await filesService.resolveReadableFile(projectRoot, relPath);

    const cap = maxBytes();
    if (info.size > cap) {
        throw hashError(413, 'FILE_TOO_LARGE',
            `File is ${info.size} bytes; this portal will verify up to ${cap} bytes.`);
    }

    let digest;
    try {
        digest = await digestFile(info.absPath);
    } catch (err) {
        // A file removed or made unreadable between listing and hashing lands here.
        throw hashError(404, 'NOT_HASHABLE',
            'The file could not be read. It may have been removed or made unavailable.');
    }

    return {
        algorithm: ALGORITHM,
        digest: digest,
        size: info.size,
        relPath: info.relPosix,
        fileName: info.fileName,
    };
}

module.exports = { hashFile, maxBytes, ALGORITHM, DEFAULT_MAX_BYTES };