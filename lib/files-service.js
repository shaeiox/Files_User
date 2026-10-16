/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @file        files-service.js
 * @module      services/files-service
 * @brief       File system abstraction layer for AVID Download Portal.
 *
 * @description
 * This service provides a secure, sandboxed interface to the file system exposed
 * by the FILES_ROOT environment variable. It handles category listing, directory
 * traversal, file downloads, recursive search, and specialized release tracking
 * for PVM (Package Version Management) artifacts.
 *
 * Security Model:
 *   - All paths are resolved and validated against FILES_ROOT to prevent
 *     directory traversal attacks (../, absolute paths, null bytes).
 *   - Hidden files (dot-prefixed, index.html, index.php) are filtered out.
 *   - Walk depth and entry count are capped to prevent DoS via deep trees.
 *
 * Environment Variables (loaded via envloader.js):
 *   @env {string} FILES_ROOT   - Absolute path to the root file repository.
 *                                Example: C:\Users\Shaiya\Downloads
 *   @env {string} RELEASE_PVM  - (Optional) Dedicated path for PVM releases.
 *                                When set, listLatestReleases() scans only this
 *                                directory instead of the full FILES_ROOT tree.
 *                                Example: C:\Users\Shaiya\Downloads\release
 *
 * Consumed By:
 *   - routes/api.js            - REST endpoints (/api/categories, /api/browse,
 *                                /api/download, /api/search, /api/releases)
 *   - server.js                - Boot-time health check via peekRootSync()
 *
 * Depends On:
 *   - envloader.js             - Populates the environment from .env file
 *   - Node.js built-ins        - fs/promises, fs, path
 *
 * @author      Shaiya
 * @version     2.0.0
 * @since       1.0.0
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use strict';

/* ─────────────────────────────────────────────────────────────────────────────
 * DEPENDENCIES
 * ───────────────────────────────────────────────────────────────────────────── */
const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const { projectEntry } = require('./access-policy');
const adminDb = require('./admin-db');
const settings = require('./settings');
const contentIndex = require('./content-index');

/* ─────────────────────────────────────────────────────────────────────────────
 * CONSTANTS — Operational Limits
 * ───────────────────────────────────────────────────────────────────────────── */

/** @constant {number} Maximum entries visited during a single walk operation. */
const MAX_WALK_ENTRIES = 8000;

/** @constant {number} Maximum directory nesting depth for recursive walks. */
const MAX_WALK_DEPTH = 12;

/** @constant {number} Hard cap on search result size. */
const SEARCH_LIMIT = 200;

/** @constant {number} Entries a search may visit; large so every subdirectory is reached. */
const SEARCH_MAX_ENTRIES = 200000;

/** @constant {number} Directory depth a search may descend to. */
const SEARCH_MAX_DEPTH = 64;

/** @constant {number} Default number of releases returned by listLatestReleases. */
const RELEASES_LIMIT = 5;

/** @constant {number} Absolute maximum releases per request (safety ceiling). */
const RELEASES_MAX_CAP = 50;

/* ─────────────────────────────────────────────────────────────────────────────
 * CONSTANTS — Regex Patterns
 * ───────────────────────────────────────────────────────────────────────────── */

/**
 * Matches PVM release filenames and captures the semantic version.
 * @example
 *   "pvm-release-7.1.15-el9-20260817-163318.tgz" → captures "7.1.15"
 */
const RE_PVM_RELEASE = /pvm-release-(\d+(?:\.\d+)*)/i;

/**
 * Fallback pattern: captures any semantic-version-like triplet in a filename.
 * @example
 *   "app-2.5.1-final.zip" → captures "2.5.1"
 */
const RE_GENERIC_SEMVER = /(\d+\.\d+(?:\.\d+)*)/;

/* ═══════════════════════════════════════════════════════════════════════════════
 * SECTION 1 — INTERNAL HELPERS
 * ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * @brief   Determines whether a directory entry should be hidden from listings.
 * @param   {string} name  Entry name (basename only).
 * @returns {boolean}      true if the entry must be filtered out.
 *
 * Hidden rules:
 *   - Empty names
 *   - Dotfiles (Unix hidden convention)
 *   - Web index files (index.html, index.php) — never exposed as content.
 */
function isHidden(name) {
    const l = String(name || '').toLowerCase();
    return !name || l === 'index.html' || l === 'index.php' || name.startsWith('.');
}

/**
 * @brief   Creates a typed service error with HTTP status metadata.
 * @param   {number} httpStatus  HTTP status code the API layer should return.
 * @param   {string} code        Machine-readable error code (SNAKE_CASE).
 * @param   {string} message     Human-readable error message.
 * @returns {Error}              Error instance with .httpStatus and .code props.
 */
function serviceError(httpStatus, code, message) {
    const err = /** @type {Error & {httpStatus?: number, code?: string}} */ (new Error(message));
    err.httpStatus = httpStatus;
    err.code = code;
    return err;
}

/**
 * @brief   Splits a relative path into POSIX-style segments, trimmed & filtered.
 * @param   {string} relPath  Raw path from request (may use \ or /).
 * @returns {string[]}        Array of non-empty path segments.
 */
function splitRel(relPath) {
    return String(relPath || '')
        .replace(/\\/g, '/')
        .split('/')
        .map((p) => p.trim())
        .filter(Boolean);
}

function resolveInsideRoot(root, relPath) {
    const parts = splitRel(relPath);
    if (parts.some((p) => p === "." || p === ".." || p.includes("\0"))) {
        throw serviceError(400, "INVALID_PATH", "Invalid path.");
    }
    // Hidden entries (dotfiles such as .dimension-volume, index.html) are never
    // listed, so no endpoint may reach them by name either: they do not exist.
    if (parts.some(isHidden)) {
        throw serviceError(404, "NOT_FOUND", "Path not found.");
    }
    const target = path.resolve(root, ...parts);

    const rel = path.relative(root, target);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
        throw serviceError(403, "PATH_TRAVERSAL", "Requested path is outside FILES_ROOT.");
    }

    try {
        if (fsSync.existsSync(target)) {
            const realTarget = fsSync.realpathSync(target);
            const realRoot = fsSync.realpathSync(root);
            const realRel = path.relative(realRoot, realTarget);
            if (realRel.startsWith("..") || path.isAbsolute(realRel)) {
                throw serviceError(403, "SYMLINK_TRAVERSAL", "Symlink targets outside repository.");
            }
        }
    } catch (err) {
        if (err.code === 'ENOENT') throw serviceError(404, "NOT_FOUND", "Path not found.");
        throw err;
    }

    return {
        target,
        parts,
        relPosix: parts.join("/"),
    };
}

/**
 * @brief   Applies an access decider to one walked entry.
 * @param   {(function(string):{result:string,origin:?string})|undefined} decideFor
 *          Per-path access decision (lib/access-policy decide). Absent = everything allowed.
 * @param   {{name:string, path:string, type:string}} entry
 * @returns {{entry:?object, descend:boolean}}  `entry` is what the caller may see
 *          (null = omit it, and do not count it); `descend` is false for anything
 *          not fully allowed, so nothing inside a locked or hidden folder is walked.
 */
function screen(decideFor, entry) {
    if (!decideFor) return { entry, descend: true };
    const decision = decideFor(entry.path);
    return { entry: projectEntry(entry, decision), descend: decision.result === 'allow' };
}

/**
 * @brief   Resolves a path to its canonical on-disk form, relative to FILES_ROOT.
 * @details The native realpath follows in-root symlinks and, on Windows, folds
 *          case, 8.3 short names, trailing dots/spaces and `::$DATA` stream
 *          suffixes into the file's real name. Access decisions are made on this
 *          form as well as on the requested one, so an alias of a governed file
 *          cannot be used to reach it.
 * @returns {Promise<string|null>}  POSIX relative path, or null when the path does
 *          not exist or resolves outside the root (the caller's own lookup then
 *          fails with its usual error).
 */
async function canonicalRel(projectRoot, relPath) {
    const root = await getRoot(projectRoot);
    try {
        const [real, realRoot] = await Promise.all([
            fs.realpath(path.resolve(root, ...splitRel(relPath))),
            fs.realpath(root),
        ]);
        const rel = path.relative(realRoot, real);
        if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
        return rel.split(path.sep).filter(Boolean).join('/');
    } catch {
        return null;
    }
}

/**
 * @brief   Resolves one selection entry to a readable file with metadata.
 * @details Used by the ZIP archive builder. This is a thin wrapper over the SAME
 *          `resolveInsideRoot` containment helper, `isHidden` policy, and `getRoot`
 *          resolution that listing and single-file download already use — it adds
 *          no new path logic, so path traversal and symlink escape are refused by
 *          exactly the same rules rather than a second, drift-prone implementation.
 *
 * @param   {string} projectRoot  Project root, forwarded to the resolver.
 * @param   {string} relPath      Relative path inside FILES_ROOT.
 * @returns {Promise<{absPath:string, fileName:string, relPosix:string, size:number, mtime:Date}>}
 * @throws  {Error} 400 INVALID_PATH / 403 PATH_TRAVERSAL / 403 SYMLINK_TRAVERSAL
 * @throws  {Error} 404 NOT_FOUND / 400 NOT_A_FILE
 */
async function resolveReadableFile(projectRoot, relPath) {
    const root = await getRoot(projectRoot);
    const { target, parts } = resolveInsideRoot(root, relPath);

    if (parts.length === 0) {
        throw serviceError(400, 'INVALID_PATH', 'A file path is required.');
    }

    // Same hidden-file policy as listing and download.
    if (isHidden(parts[parts.length - 1])) {
        throw serviceError(403, 'FORBIDDEN_ENTRY', 'Entry is not available.');
    }

    let stat;
    try { stat = await fs.stat(target); }
    catch { throw serviceError(404, 'NOT_FOUND', 'File not found.'); }

    if (!stat.isFile()) {
        throw serviceError(400, 'NOT_A_FILE', 'Requested path is not a file.');
    }

    return {
        absPath: target,
        fileName: parts[parts.length - 1],
        relPosix: toPosixRel(root, target),
        size: stat.size,
        mtime: stat.mtime,
    };
}

/**
 * @brief   Converts an absolute path to a POSIX-style path relative to root.
 * @param   {string} root     Absolute root directory.
 * @param   {string} absPath  Absolute path inside root.
 * @returns {string}          POSIX-normalized relative path.
 */
function toPosixRel(root, absPath) {
    return path.relative(root, absPath).split(path.sep).filter(Boolean).join('/');
}

/**
 * @brief   Reads a directory and filters out hidden entries.
 * @param   {string} dir  Absolute directory path.
 * @returns {Promise<import('fs').Dirent[]>}
 */
async function readVisibleEntries(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter((e) => !isHidden(e.name));
}

/* ═══════════════════════════════════════════════════════════════════════════════
 * SECTION 2 — ROOT RESOLUTION & VALIDATION
 * ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * @brief   Resolves the FILES_ROOT env var to an absolute path.
 * @param   {string} projectRoot  Project root, used for relative env values.
 * @returns {string}              Absolute, resolved FILES_ROOT path.
 * @throws  {Error} 503 FILES_ROOT_MISSING — env var is unset or blank.
 */
function resolveConfiguredRoot(projectRoot) {
    const raw = settings.raw('FILES_ROOT');
    if (raw === '') {
        throw serviceError(
            503,
            'FILES_ROOT_MISSING',
            'FILES_ROOT is not set. Add it to your .env file.'
        );
    }
    const configured = String(raw).trim();
    return path.isAbsolute(configured)
        ? path.resolve(configured)
        : path.resolve(projectRoot, configured);
}

/**
 * @brief   Resolves the optional dedicated release folder.
 * @param   {string} projectRoot  Project root, used for relative env values.
 * @returns {string|null}         Absolute release path, or null if unset.
 *
 * @note    With an admin that manages it (integration mode, admin schema v5)
 *          this is the admin's release folder, a client path under FILES_ROOT,
 *          and RELEASE_PVM is ignored. Otherwise RELEASE_PVM (optional). When
 *          null, callers fall back to scanning FILES_ROOT itself.
 * @throws  {Error} when the admin data is unavailable (callers fail closed).
 */
function resolveReleaseRoot(projectRoot) {
    if (adminDb.isIntegrationEnabled()) {
        const rel = adminDb.releaseRelPath();
        if (rel !== undefined) {
            return rel ? path.join(resolveConfiguredRoot(projectRoot), ...rel.split('/')) : null;
        }
    }
    const raw = settings.raw('RELEASE_PVM');
    if (raw === '') return null;
    const configured = String(raw).trim();
    return path.isAbsolute(configured)
        ? path.resolve(configured)
        : path.resolve(projectRoot, configured);
}

/**
 * @brief   RELEASE_PVM as a POSIX path relative to FILES_ROOT (e.g. "release/el9").
 * @param   {string} projectRoot  Project root, used for relative env values.
 * @returns {string|null}         null when unset, unconfigured, or outside FILES_ROOT.
 */
function releaseRel(projectRoot) {
    const releaseDir = resolveReleaseRoot(projectRoot);
    if (!releaseDir || !settings.raw('FILES_ROOT')) return null;
    const rel = path.relative(resolveConfiguredRoot(projectRoot), releaseDir).split(path.sep).filter(Boolean).join('/');
    return rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? rel : null;
}

/**
 * @brief   Validates FILES_ROOT exists and is a directory, then returns it.
 * @param   {string} projectRoot  Project root, forwarded to resolver.
 * @returns {Promise<string>}     Absolute, verified FILES_ROOT path.
 * @throws  {Error} 503 FILES_ROOT_NOT_FOUND     — path does not exist.
 * @throws  {Error} 503 FILES_ROOT_NOT_DIRECTORY — path is not a directory.
 */
async function getRoot(projectRoot) {
    const root = resolveConfiguredRoot(projectRoot);
    let stat;
    try {
        stat = await fs.stat(root);
    } catch {
        throw serviceError(
            503,
            'FILES_ROOT_NOT_FOUND',
            'FILES_ROOT does not exist. Check the path in your .env file.'
        );
    }
    if (!stat.isDirectory()) {
        throw serviceError(
            503,
            'FILES_ROOT_NOT_DIRECTORY',
            'FILES_ROOT exists but is not a directory.'
        );
    }
    return root;
}

/**
 * @brief   Asserts that the given root contains at least one category folder.
 * @param   {string} root  Absolute root directory.
 * @returns {Promise<import('fs').Dirent[]>}  All visible directory entries in root.
 * @throws  {Error} 503 FILES_ROOT_EMPTY         — root is empty.
 * @throws  {Error} 503 FILES_ROOT_NO_CATEGORIES — no subdirectories found.
 *
 * @note    Files placed directly in the root are intentionally ignored:
 *          only directories qualify as browsable "categories".
 */
async function assertCategoryStructure(root) {
    const visible = await readVisibleEntries(root);
    if (visible.length === 0) {
        throw serviceError(
            503,
            'FILES_ROOT_EMPTY',
            'FILES_ROOT is empty and is not a valid resource repository.'
        );
    }
    const dirs = visible.filter((e) => e.isDirectory());
    if (dirs.length === 0) {
        throw serviceError(
            503,
            'FILES_ROOT_NO_CATEGORIES',
            'FILES_ROOT contains no category folders. Only directories are used as categories; files in the root are ignored.'
        );
    }
    return dirs;
}

/* ═══════════════════════════════════════════════════════════════════════════════
 * SECTION 3 — TREE SUMMARIZATION
 * ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * @brief   Recursively summarizes a directory tree.
 * @param   {string} dir  Absolute directory path.
 * @param   {function(string):boolean} [allow]  Optional per-absolute-path
 *          predicate. A path that fails it is neither counted nor walked, so
 *          governed subtrees do not leak through aggregate counts.
 * @returns {Promise<{fileCount:number, folderCount:number, latestModified:(number|null)}>}
 *
 * @details
 *   - Walks up to MAX_WALK_DEPTH levels deep.
 *   - Unreadable entries are silently skipped (no throw).
 *   - latestModified is a Unix millisecond timestamp; null if no files found.
 */
async function summarizeTree(dir, allow) {
    let fileCount = 0;
    let folderCount = 0;
    let latestModified = 0;

    async function walk(current, depth) {
        if (depth > MAX_WALK_DEPTH) return;
        let entries;
        try {
            entries = await contentIndex.readDir(current);
        } catch {
            return;
        }
        for (const ent of entries) {
            if (isHidden(ent.name)) continue;
            const full = path.join(current, ent.name);
            if (allow && !allow(full)) continue;
            if (ent.type === 'directory') {
                folderCount += 1;
                await walk(full, depth + 1);
            } else if (ent.type === 'file') {
                fileCount += 1;
                if (ent.mtimeMs !== null && ent.mtimeMs > latestModified) latestModified = ent.mtimeMs;
            }
        }
    }

    await walk(dir, 0);
    return {
        fileCount,
        folderCount,
        latestModified: latestModified || null,
    };
}

/* ═══════════════════════════════════════════════════════════════════════════════
 * SECTION 4 — CATEGORY & DIRECTORY LISTING
 * ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * @brief   Lists all top-level categories with aggregate statistics.
 * @param   {string} projectRoot  Project root path.
 * @param   {function(string):object} [decideFor]  Per-path access decision. Hidden
 *          categories are omitted, a self-locked category is returned as
 *          `{name, path, type, locked: true}`, and counts/dates include only
 *          allowed entries.
 * @returns {Promise<Array>}      Sorted category descriptors.
 *
 * @description
 * Each returned category includes: name, path, type, fileCount, folderCount,
 * mtime (ISO), and latestModified (ISO). Sorted alphabetically by name.
 *
 * Consumed by the home page's resource card grid (home.js → ResourceService).
 */
async function listCategories(projectRoot, decideFor) {
    const root = await getRoot(projectRoot);
    const dirs = await assertCategoryStructure(root);

    // summarizeTree sees absolute paths; only fully allowed entries are counted
    // or walked, so counts and dates never reflect locked or hidden content.
    const allow = decideFor
        ? (full) => decideFor(toPosixRel(root, full)).result === 'allow'
        : undefined;

    const categories = await Promise.all(
        dirs.map(async (ent) => {
            const { entry, descend } = screen(decideFor, { name: ent.name, path: ent.name, type: 'directory' });
            if (!entry) return null;
            if (!descend) return entry; // locked category: name only, no counts or dates
            const full = path.join(root, ent.name);
            let mtime = null;
            try {
                const st = await fs.stat(full);
                mtime = st.mtime.toISOString();
            } catch { mtime = null; }
            const summary = await summarizeTree(full, allow);
            return {
                name: ent.name,
                path: ent.name,
                type: 'directory',
                fileCount: summary.fileCount,
                folderCount: summary.folderCount,
                mtime,
                latestModified: summary.latestModified
                    ? new Date(summary.latestModified).toISOString()
                    : mtime,
            };
        })
    );

    const visible = categories.filter(Boolean);
    visible.sort((a, b) => a.name.localeCompare(b.name));
    return visible;
}

/**
 * @brief   Lists the direct children of a directory inside FILES_ROOT.
 * @param   {string} projectRoot  Project root path.
 * @param   {string} relPath      Relative path from FILES_ROOT ("" = root).
 * @returns {Promise<Array>}      Non-recursive listing of files & folders.
 * @throws  {Error} 400 NOT_A_DIRECTORY — target is a file.
 * @throws  {Error} 404 NOT_FOUND       — target does not exist.
 *
 * @note    When relPath is empty, delegates to assertCategoryStructure to
 *          return the category folders (never files at root level).
 */
async function listPath(projectRoot, relPath) {
    const root = await getRoot(projectRoot);
    const { target, parts } = resolveInsideRoot(root, relPath);

    // Root listing: return only category folders.
    if (parts.length === 0) {
        const dirs = await assertCategoryStructure(root);
        const listed = await Promise.all(
            dirs.map(async (ent) => {
                const full = path.join(root, ent.name);
                let st;
                try { st = await fs.stat(full); } catch { return null; }
                return {
                    name: ent.name,
                    path: ent.name,
                    type: 'directory',
                    size: 0,
                    mtime: st.mtime.toISOString(),
                };
            })
        );
        return listed.filter(Boolean);
    }

    // Non-root listing: verify and enumerate children.
    let stat;
    try { stat = await fs.stat(target); }
    catch { throw serviceError(404, 'NOT_FOUND', 'Path not found.'); }
    if (!stat.isDirectory()) {
        throw serviceError(400, 'NOT_A_DIRECTORY', 'Path is not a directory.');
    }

    const entries = await readVisibleEntries(target);
    const listed = await Promise.all(
        entries.map(async (ent) => {
            const full = path.join(target, ent.name);
            let st;
            try { st = await fs.stat(full); } catch { return null; }
            const childRel = toPosixRel(root, full);
            if (ent.isDirectory()) {
                return {
                    name: ent.name,
                    path: childRel,
                    type: 'directory',
                    size: 0,
                    mtime: st.mtime.toISOString(),
                };
            }
            if (ent.isFile()) {
                return {
                    name: ent.name,
                    path: childRel,
                    type: 'file',
                    size: st.size,
                    mtime: st.mtime.toISOString(),
                };
            }
            return null;
        })
    );
    return listed.filter(Boolean);
}

/* ═══════════════════════════════════════════════════════════════════════════════
 * SECTION 5 — FILE DOWNLOAD RESOLUTION
 * ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * @brief   Resolves a file path to a downloadable target with metadata.
 * @param   {string} projectRoot  Project root path.
 * @param   {string} relPath      Relative path of the file inside FILES_ROOT.
 * @returns {Promise<{absPath:string, fileName:string, size:number, mtime:Date}>}
 * @throws  {Error} 400 INVALID_PATH — empty path.
 * @throws  {Error} 400 NOT_A_FILE   — target is a directory.
 * @throws  {Error} 404 NOT_FOUND    — target missing.
 *
 * @note    The returned absPath is safe to stream via res.download() or
 *          fs.createReadStream(), as it is guaranteed to be inside FILES_ROOT.
 */
async function getDownloadTarget(projectRoot, relPath) {
    const root = await getRoot(projectRoot);
    const { target, parts } = resolveInsideRoot(root, relPath);
    if (parts.length === 0) {
        throw serviceError(400, 'INVALID_PATH', 'A file path is required.');
    }
    let stat;
    try { stat = await fs.stat(target); }
    catch { throw serviceError(404, 'NOT_FOUND', 'File not found.'); }
    if (!stat.isFile()) {
        throw serviceError(400, 'NOT_A_FILE', 'Requested path is not a file.');
    }
    return {
        absPath: target,
        fileName: parts[parts.length - 1],
        size: stat.size,
        mtime: stat.mtime,
    };
}

/* ═══════════════════════════════════════════════════════════════════════════════
 * SECTION 6 — RECURSIVE SEARCH
 * ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * @brief   Case-insensitive substring name-matcher.
 * @param   {string} name   Entry name.
 * @param   {string} query  Lowercased query string ("" matches all).
 * @returns {boolean}
 */
function nameMatches(name, query) {
    if (!query) return true;
    return String(name).toLowerCase().includes(query);
}

/**
 * @brief   Recursively searches FILES_ROOT for entries matching a query.
 * @param   {string} projectRoot         Project root path.
 * @param   {string} query               Case-insensitive substring.
 * @param   {object} [options]
 * @param   {number|string} [options.limit=200] Max results (capped at SEARCH_LIMIT).
 * @param   {string} [options.path] Scope the walk to this subdirectory.
 * @param   {function(string):{result:string,origin:?string}} [options.decideFor] Per-path access decision; hidden entries
 *          and the contents of locked/hidden folders are skipped while walking.
 * @returns {Promise<{results:Array, scanned:number, truncated:boolean}>}
 *
 * @details
 *   - Iterative breadth-first walk, so every subdirectory is reached.
 *   - Bounded by SEARCH_MAX_ENTRIES and SEARCH_MAX_DEPTH.
 *   - options.path scopes the walk to a subdirectory (caller gates it).
 *   - Consumed by the global search bar (home.js → ResourceService.search).
 */
async function searchEntries(projectRoot, query, options = {}) {
    const root = await getRoot(projectRoot);
    const releaseDir = resolveReleaseRoot(projectRoot);

    const q = String(query || "").trim().toLowerCase();
    const limit = Math.min(Number(options.limit) || SEARCH_LIMIT, SEARCH_LIMIT);
    const results = [];
    let scanned = 0;
    let visited = 0;

    if (!q || q.length < 3) {
        return { results: [], scanned: 0, truncated: false };
    }

    // Optional scope: search only below options.path (Browse page).
    const { target: startDir, parts: scopeParts } = resolveInsideRoot(root, options.path || "");
    // Breadth-first, so every subdirectory is reached before the walk goes deep.
    const queue = [{ dir: startDir, rel: scopeParts.join("/"), depth: 0 }];

    if (!scopeParts.length && releaseDir && !path.resolve(releaseDir).startsWith(path.resolve(root))) {
        try {
            const st = await fs.stat(releaseDir);
            if (st.isDirectory()) {
                const relRelease = path.basename(releaseDir);
                queue.push({ dir: releaseDir, rel: relRelease, depth: 0 });
            }
        } catch { /* skip */ }
    }

    for (let head = 0; head < queue.length && results.length < limit && visited < SEARCH_MAX_ENTRIES; head++) {
        const { dir, rel, depth } = queue[head];
        queue[head] = null; // release processed slots
        if (depth > SEARCH_MAX_DEPTH) continue;

        let entries;
        try { entries = await contentIndex.readDir(dir); }
        catch { continue; }

        scanned += 1;
        for (const ent of entries) {
            if (results.length >= limit || visited >= SEARCH_MAX_ENTRIES) break;
            if (isHidden(ent.name)) continue;
            const type = ent.type;
            if (!type) continue;

            const childRel = rel ? `${rel}/${ent.name}` : ent.name;
            // Screened before counting, so limits and `truncated` reflect only
            // what this caller may see.
            const { entry, descend } = screen(options.decideFor, { name: ent.name, path: childRel, type });
            if (!entry) continue;
            visited += 1;

            if (type === "directory" && descend) {
                queue.push({ dir: path.join(dir, ent.name), rel: childRel, depth: depth + 1 });
            }
            if (!nameMatches(ent.name, q)) continue;
            if (type === "file" && !entry.locked && ent.size !== null) {
                results.push({ ...entry, size: ent.size, mtime: new Date(ent.mtimeMs) });
                continue;
            }
            results.push(entry); // directories, locked files, or unreadable metadata
        }
    }

    return { results, scanned, truncated: visited >= SEARCH_MAX_ENTRIES || results.length >= limit };
}

/* ═══════════════════════════════════════════════════════════════════════════════
 * SECTION 7 — SEMANTIC VERSION UTILITIES (for Latest Releases)
 * ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * @brief   Extracts a semantic version string from a filename.
 * @param   {string} filename  Basename (e.g. "pvm-release-7.1.15-el9-...tgz").
 * @returns {string|null}      Version string like "7.1.15", or null if none found.
 *
 * @details
 * Matches PVM-specific pattern first (pvm-release-X.Y.Z), then falls back to
 * a generic semver-like pattern (X.Y or X.Y.Z). Returns null for un-versioned
 * files, which are treated as lowest-priority in sorts.
 *
 * @example
 *   extractVersion("pvm-release-7.1.15-el9-20260817-163318.tgz") // → "7.1.15"
 *   extractVersion("app-2.5-final.zip")                           // → "2.5"
 *   extractVersion("readme.txt")                                  // → null
 */
function extractVersion(filename) {
    if (!filename) return null;
    const m1 = filename.match(RE_PVM_RELEASE);
    if (m1) return m1[1];
    const m2 = filename.match(RE_GENERIC_SEMVER);
    return m2 ? m2[1] : null;
}

/**
 * @brief   Compares two semver-like strings for descending sort.
 * @param   {string|null} v1  First version.
 * @param   {string|null} v2  Second version.
 * @returns {number}         -1 if v1 > v2, 1 if v1 < v2, 0 if equal.
 *
 * @details
 * Designed as an Array.sort() comparator producing NEWEST-FIRST order.
 * Null/undefined versions sort AFTER real versions.
 * Handles unequal segment counts (e.g. "7.1" vs "7.1.15") by treating
 * missing segments as 0.
 *
 * @example
 *   compareVersions("7.1.15", "7.1.2")  // → -1  (7.1.15 sorts before 7.1.2)
 *   compareVersions("7.1.15", "7.1.15") // →  0
 *   compareVersions(null,     "1.0.0")  // →  1  (null goes last)
 */
function compareVersions(v1, v2) {
    if (!v1 && !v2) return 0;
    if (!v1) return 1;
    if (!v2) return -1;

    const parts1 = v1.split('.').map((n) => Number(n) || 0);
    const parts2 = v2.split('.').map((n) => Number(n) || 0);
    const len = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < len; i++) {
        const a = parts1[i] || 0;
        const b = parts2[i] || 0;
        if (a > b) return -1;
        if (a < b) return 1;
    }
    return 0;
}

/* ═══════════════════════════════════════════════════════════════════════════════
 * SECTION 8 — LATEST RELEASES (PVM-Aware & OS-Filtered)
 * ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * @brief   Calculates the POSIX relative browse path from FILES_ROOT to the release folder.
 * @param   {string} root        Absolute FILES_ROOT path.
 * @param   {string|null} relDir Absolute RELEASE_PVM path (or null if unset).
 * @param   {string|null} os     Specific OS filter (e.g., "el8", "el9").
 * @returns {string}             POSIX relative path for web browsing (e.g. "release/el9").
 */
function calculateReleaseBrowsePath(root, relDir, os) {
    if (!relDir) return os || '';
    const target = os ? path.join(relDir, os) : relDir;
    const rel = path.relative(root, target);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
        return os || '';
    }
    return rel.split(path.sep).filter(Boolean).join('/');
}

/**
 * @brief   Lists the latest release artifacts with semantic version sorting & dynamic browse path.
 * @param   {string} projectRoot           Project root path.
 * @param   {number|string} [limit=RELEASES_LIMIT] Max releases to return (default: 5).
 * @param   {string|null} [osFilter=null]       Specific OS folder to scan (e.g., "el8" or "el9").
 * @returns {Promise<{browsePath: string, items: Array, lockedSkipped?: boolean}>} Object containing dynamic browse path and sorted releases.
 *
 * @description
 * Dynamically computes `browsePath` relative to FILES_ROOT regardless of how
 * RELEASE_PVM is configured in .env (e.g. "release/el9" or "updates/pvm/el8").
 */
async function listLatestReleases(projectRoot, limit = RELEASES_LIMIT, osFilter = null, decideFor = undefined) {
    const root = await getRoot(projectRoot);
    const cap = Math.min(Number(limit) || RELEASES_LIMIT, RELEASES_MAX_CAP);
    const releaseDir = resolveReleaseRoot(projectRoot);

    let scanTarget;
    let scanTargetValid = true;

    if (releaseDir) {
        const baseTarget = osFilter ? path.join(releaseDir, osFilter) : releaseDir;

        // Security check: Prevent path traversal
        if (osFilter && (!path.resolve(baseTarget).startsWith(path.resolve(releaseDir)) || osFilter.includes('..'))) {
            return { browsePath: osFilter || '', items: [] };
        }

        try {
            const st = await fs.stat(baseTarget);
            if (!st.isDirectory()) scanTargetValid = false;
        } catch {
            scanTargetValid = false;
        }

        if (!scanTargetValid) {
            if (osFilter) {
                const fallbackPath = calculateReleaseBrowsePath(root, releaseDir, osFilter);
                return { browsePath: fallbackPath, items: [] };
            }
            console.warn(`[files-service] RELEASE_PVM path unreachable. Falling back to FILES_ROOT.`);
        }
        scanTarget = scanTargetValid ? baseTarget : root;
    } else {
        await assertCategoryStructure(root);
        scanTarget = root;
    }

    const files = [];
    let visited = 0;
    let lockedSkipped = false;

    async function walk(dir, depth) {
        if (depth > MAX_WALK_DEPTH || visited >= MAX_WALK_ENTRIES) return;

        let entries;
        try { entries = await fs.readdir(dir, { withFileTypes: true }); }
        catch { return; }

        for (const ent of entries) {
            if (visited >= MAX_WALK_ENTRIES) return;
            if (isHidden(ent.name)) continue;
            visited += 1;

            const full = path.join(dir, ent.name);
            const childRel = toPosixRel(root, full);

            if (ent.isDirectory()) {
                const { entry, descend } = screen(decideFor, { name: ent.name, path: childRel, type: 'directory' });
                if (descend) await walk(full, depth + 1);
                else if (entry && entry.locked) lockedSkipped = true;
                continue;
            }
            if (!ent.isFile()) continue;

            // Screened before the cap, so it counts only what this caller may see.
            const decision = decideFor ? decideFor(childRel) : null;
            if (decision && !projectEntry({}, decision)) continue;

            let st;
            try { st = await fs.stat(full); } catch { continue; }

            const segments = childRel.split('/');
            const category = segments.length >= 2
                ? segments[segments.length - 2]
                : (segments[0] || 'Release');

            if (osFilter && category.toLowerCase() !== String(osFilter).toLowerCase()) {
                continue;
            }

            files.push({
                entry: {
                    name: ent.name,
                    path: childRel,
                    category,
                    type: 'file',
                    size: st.size,
                    mtime: st.mtime.toISOString(),
                    version: extractVersion(ent.name),
                },
                decision,
            });
        }
    }

    try {
        await walk(scanTarget, 0);
    } catch (err) {
        console.warn(`[files-service] Release walk failed: ${err.message}`);
    }

    files.sort(({ entry: a }, { entry: b }) => {
        const vc = compareVersions(a.version, b.version);
        if (vc !== 0) return vc;
        return new Date(b.mtime).getTime() - new Date(a.mtime).getTime();
    });

    const browsePath = calculateReleaseBrowsePath(root, scanTargetValid ? releaseDir : null, osFilter);

    return {
        browsePath,
        // Locked releases keep their place in version order but lose size/date.
        items: files.slice(0, cap).map(({ entry, decision }) => (decision ? projectEntry(entry, decision) : entry)),
        // Internal (the router strips it): a locked folder was not walked, so
        // releases may exist that this caller sees only after signing in.
        lockedSkipped,
    };
}

/* ═══════════════════════════════════════════════════════════════════════════════
 * SECTION 9 — BOOT-TIME HEALTH CHECK
 * ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * @brief   Synchronously inspects FILES_ROOT state without throwing.
 * @param   {string} projectRoot  Project root path.
 * @returns {{configured:boolean, exists:boolean, isDirectory:boolean, error?:string}}
 *
 * @description
 * Intended for server bootstrap (server.js) to log a friendly warning if
 * the file service is misconfigured, WITHOUT preventing the HTTP server
 * from starting. All errors are caught and returned as flags.
 *
 * Return shape:
 *   - configured  : true if FILES_ROOT env var is present.
 *   - exists      : true if the resolved path exists on disk.
 *   - isDirectory : true if the path is a directory.
 *   - error       : optional code (e.g. "FILES_ROOT_MISSING").
 */
function peekRootSync(projectRoot) {
    try {
        const root = resolveConfiguredRoot(projectRoot);
        const exists = fsSync.existsSync(root);
        const isDir = exists && fsSync.statSync(root).isDirectory();
        return { configured: true, exists, isDirectory: isDir };
    } catch (err) {
        return {
            configured: err.code !== 'FILES_ROOT_MISSING',
            exists: false,
            isDirectory: false,
            error: err.code || 'UNKNOWN',
        };
    }
}

/* ═══════════════════════════════════════════════════════════════════════════════
 * PUBLIC API
 * ═══════════════════════════════════════════════════════════════════════════════ */
module.exports = {
    // Directory & category operations
    listCategories,
    listPath,

    // File operations
    getDownloadTarget,
    resolveReadableFile,

    // Search
    searchEntries,

    // Releases (PVM-aware)
    listLatestReleases,
    releaseRel,

    // Access helpers
    canonicalRel,
    splitRel,

    // Diagnostics
    peekRootSync,
    getRoot,
};