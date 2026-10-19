/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @file        lib/archive-selection.js
 * @brief       Validates a ZIP selection and expands its folders into entries.
 *
 * @description
 * Turns the `items` of a ZIP request into the ordered entry list the writer
 * streams. A file becomes one file entry. A folder becomes a directory entry plus
 * everything beneath it that the caller may download.
 *
 * ── AUTHORIZATION IS INJECTED, NOT KNOWN ────────────────────────────────────
 * This module never sees a session or a policy. The route passes
 * `allow(rel) → boolean`, built from the request context (admin policy at
 * `download` level plus the legacy release gate). Every descendant is decided
 * individually. A refused folder is not entered, which is exact, because
 * hidden > locked > lowest level always propagate to descendants.
 * Without `allow`, a folder is refused with 400 NOT_A_FILE, as it was before
 * folders were supported (fail closed).
 *
 * The NAMED items are authorized by the caller (the route's gate()) before
 * this module runs, so a refused named item still refuses the whole request.
 *
 * ── WHAT IS NEVER WALKED ──────────────────────────────────────────────────
 * Hidden names (files-service isHidden) and anything that is not a regular file
 * or directory: symlinks, junctions, sockets. The listing skips the same
 * entries, so a link can never reach a governed target. Paths are decided in
 * both the requested and the canonical (realpath) form, the same as gate().
 *
 * ── CEILINGS ──────────────────────────────────────────────────────────────
 * Classic ZIP: at most 65 535 entries (directory entries included) and 4 GiB.
 * The walk stops as soon as either is exceeded, and nesting stops at 64
 * levels. Each limit raises 413. A truncated archive is never produced.
 *
 * Dependencies: node:fs, node:path, ./files-service. No npm packages.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
'use strict';

const fs = require('fs');
const path = require('path');
const filesService = require('./files-service');

/** Classic-ZIP ceilings. Exceeding either is an explicit error, never a bad archive. */
const MAX_ENTRIES = 65535;
const MAX_TOTAL_BYTES = 4 * 1024 * 1024 * 1024; // 4 GiB
/** Deeper trees are refused rather than silently cut. */
const MAX_DEPTH = 64;

/**
 * @brief Raises a typed service error for the API layer.
 */
function archiveError(httpStatus, code, message) {
    const err = /** @type {Error & {httpStatus?: number, code?: string}} */ (new Error(message));
    err.httpStatus = httpStatus;
    err.code = code;
    return err;
}

/**
 * @brief Sanitises an archive entry name to a safe, relative POSIX path.
 * @details Takes the path RELATIVE TO THE BROWSED DIRECTORY, which already ends with
 *          the entry's own name. Keeping the nested structure is what stops two files
 *          that share a base name in different folders from overwriting each other.
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
 * @brief Accumulates entries while enforcing dedupe and both ceilings.
 * @details A name always identifies one root-relative path, so a repeated name can
 *          only mean the same item was reached twice (a folder plus a file inside
 *          it). It is dropped instead of answering 409.
 */
function createCollector(maxEntries, maxBytes) {
    const entries = [];
    const names = new Set();
    let bytes = 0;
    return {
        entries,
        add(entry) {
            if (names.has(entry.name)) return;
            if (entries.length + 1 > maxEntries) {
                throw archiveError(413, 'TOO_MANY_ENTRIES',
                    `A ZIP archive holds at most ${maxEntries} entries.`);
            }
            if (entry.kind === 'file') {
                bytes += entry.size;
                if (bytes > maxBytes) {
                    throw archiveError(413, 'ARCHIVE_TOO_LARGE',
                        'Selection exceeds the 4 GiB classic-ZIP limit.');
                }
            }
            names.add(entry.name);
            entries.push(entry);
        },
    };
}

/** Joins a root-relative POSIX directory and a child name. */
const childRel = (dirRel, name) => (dirRel ? dirRel + '/' + name : name);

/**
 * @brief Walks one authorized folder depth-first in name order.
 * @param {object} at  { abs, rel, realRel, name, depth }: the folder on disk, its
 *                     requested and canonical root-relative paths, its entry name.
 */
async function walkFolder(at, allow, collect) {
    if (at.depth > MAX_DEPTH) {
        throw archiveError(413, 'TOO_DEEP', `Folder nesting exceeds ${MAX_DEPTH} levels.`);
    }
    let dirents;
    try {
        dirents = await fs.promises.readdir(at.abs, { withFileTypes: true });
    } catch {
        return; // unreadable folder: same as the listing, which shows nothing for it
    }
    dirents.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

    for (const ent of dirents) {
        if (filesService.isHidden(ent.name)) continue;
        // Dirent types come from lstat: a symlink is neither a file nor a directory.
        if (!ent.isFile() && !ent.isDirectory()) continue;

        const rel = childRel(at.rel, ent.name);
        const realRel = childRel(at.realRel, ent.name);
        if (!allow(rel) || (realRel !== rel && !allow(realRel))) continue;

        const abs = path.join(at.abs, ent.name);
        let stat;
        try { stat = await fs.promises.lstat(abs); } catch { continue; }
        const name = entryNameFor(at.name + '/' + ent.name);

        if (ent.isDirectory() && stat.isDirectory()) {
            collect.add({ kind: 'dir', name: name + '/', mtime: stat.mtime });
            await walkFolder({ abs, rel, realRel, name, depth: at.depth + 1 }, allow, collect);
        } else if (ent.isFile() && stat.isFile()) {
            // noFollow: the writer opens it with O_NOFOLLOW, so a file swapped for a
            // link between this walk and the read cannot redirect it.
            collect.add({ kind: 'file', name, absPath: abs, size: stat.size, mtime: stat.mtime, noFollow: true });
        }
    }
}

/**
 * @brief Validates the requested selection and resolves it to archive entries.
 *
 * @param   {string}   projectRoot  Project root.
 * @param   {string}   dirRel       Relative path of the directory being browsed.
 * @param   {string[]} relPaths     Selected relative paths (root-relative).
 * @param   {object}   [options]
 * @param   {(rel:string)=>boolean} [options.allow]  Per-descendant authorizer. Required to expand folders.
 * @param   {number}   [options.maxEntries]  Entry ceiling (tests lower it).
 * @param   {number}   [options.maxBytes]    Byte ceiling (tests lower it).
 * @returns {Promise<{dirRel:string, entries:Array<object>, soleFolder:?string}>}
 */
async function resolveSelection(projectRoot, dirRel, relPaths, options = {}) {
    const { allow, maxEntries = MAX_ENTRIES, maxBytes = MAX_TOTAL_BYTES } = options;

    if (!Array.isArray(relPaths) || relPaths.length === 0) {
        throw archiveError(400, 'NO_ENTRIES', 'Select at least one file.');
    }
    if (relPaths.length > maxEntries) {
        throw archiveError(413, 'TOO_MANY_ENTRIES',
            `A ZIP archive holds at most ${maxEntries} entries; ${relPaths.length} were requested.`);
    }

    const dirNorm = String(dirRel || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    const prefix = dirNorm ? dirNorm + '/' : '';
    const insideDir = (relPosix) => !prefix || relPosix.startsWith(prefix);
    const outside = () => archiveError(403, 'ENTRY_OUTSIDE_DIR',
        'Selection contains an entry outside the browsed directory.');

    const collect = createCollector(maxEntries, maxBytes);
    const folders = [];
    let named = 0;

    for (const raw of relPaths) {
        const rel = String(raw || '').trim();
        if (!rel) continue;
        named++;

        let file = null;
        try {
            // Same containment + hidden-file policy as listing and single download.
            file = await filesService.resolveReadableFile(projectRoot, rel);
        } catch (err) {
            if (err.code !== 'NOT_A_FILE' || typeof allow !== 'function') throw err;
        }

        if (file) {
            // The entry must live inside the browsed directory, so a crafted selection
            // cannot pull in a sibling subtree the user is not looking at.
            if (!insideDir(file.relPosix)) throw outside();
            collect.add({
                kind: 'file', name: entryNameFor(file.relPosix.slice(prefix.length)),
                absPath: file.absPath, size: file.size, mtime: file.mtime,
            });
            continue;
        }

        const dir = await filesService.resolveReadableDir(projectRoot, rel);
        if (!insideDir(dir.relPosix)) throw outside();
        const name = entryNameFor(dir.relPosix.slice(prefix.length));
        collect.add({ kind: 'dir', name: name + '/', mtime: dir.mtime });
        await walkFolder({ abs: dir.realPath, rel: dir.relPosix, realRel: dir.realRel, name, depth: 1 }, allow, collect);
        folders.push(dir.name);
    }

    if (!collect.entries.length) {
        throw archiveError(400, 'NO_ENTRIES', 'Select at least one file.');
    }

    return {
        dirRel: dirNorm,
        entries: collect.entries,
        soleFolder: named === 1 && folders.length === 1 ? folders[0] : null,
    };
}

module.exports = { resolveSelection, entryNameFor, archiveError, MAX_ENTRIES, MAX_TOTAL_BYTES, MAX_DEPTH };
