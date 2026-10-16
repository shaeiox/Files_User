/**
 * @file lib/content-index.js
 * @brief Cached raw directory reads for the category summaries and search walks.
 *
 * @description
 * Caches what a directory holds (name, type, size, mtime), unfiltered and keyed
 * by absolute path, for CONTENT_INDEX_TTL_MS (0 disables it). It never caches
 * an access decision: the walks in lib/files-service.js still screen every
 * entry per request, so a policy change takes effect with no added delay.
 * Download, hash and archive routes do not use it; they resolve on disk.
 * At most CONTENT_INDEX_MAX_DIRS directories are kept (least recently used out);
 * concurrent misses for one directory share a single read.
 */
'use strict';

const fs = require('fs/promises');
const path = require('path');
const settings = require('./settings');

/**
 * @typedef {{name:string, type:'directory'|'file'|null, size:(number|null), mtimeMs:(number|null)}} IndexEntry
 */

/** absDir -> { at:number, entries:IndexEntry[] }, in least-recently-used order. */
const cache = new Map();
/** absDir -> Promise<IndexEntry[]> for reads in flight. */
const inflight = new Map();

/**
 * Reads a directory from disk; files carry size and mtime (null when unreadable).
 * @param {string} dir
 * @returns {Promise<IndexEntry[]>}
 */
async function readFromDisk(dir) {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    return Promise.all(dirents.map(async (ent) => {
        /** @type {'directory'|'file'|null} */
        const type = ent.isDirectory() ? 'directory' : ent.isFile() ? 'file' : null;
        if (type !== 'file') return { name: ent.name, type, size: null, mtimeMs: null };
        try {
            const st = await fs.stat(path.join(dir, ent.name));
            return { name: ent.name, type, size: st.size, mtimeMs: st.mtimeMs };
        } catch {
            return { name: ent.name, type, size: null, mtimeMs: null };
        }
    }));
}

function remember(dir, entries) {
    cache.delete(dir);
    cache.set(dir, { at: Date.now(), entries });
    const max = settings.get('CONTENT_INDEX_MAX_DIRS');
    while (cache.size > max) cache.delete(cache.keys().next().value);
}

/**
 * Entries of `dir` (absolute), from the index when fresh. Rejects like
 * fs.readdir when the directory cannot be read; failures are not cached.
 * @param {string} dir
 * @returns {Promise<IndexEntry[]>}
 */
function readDir(dir) {
    const ttl = settings.get('CONTENT_INDEX_TTL_MS');
    if (ttl === 0) return readFromDisk(dir);

    const hit = cache.get(dir);
    if (hit && Date.now() - hit.at < ttl) {
        cache.delete(dir); // most recently used goes last
        cache.set(dir, hit);
        return Promise.resolve(hit.entries);
    }
    if (inflight.has(dir)) return inflight.get(dir);

    const pending = readFromDisk(dir)
        .then((entries) => { remember(dir, entries); return entries; })
        .finally(() => inflight.delete(dir));
    inflight.set(dir, pending);
    return pending;
}

/** Empties the index (tests). */
function clear() {
    cache.clear();
}

module.exports = { readDir, clear, size: () => cache.size };
