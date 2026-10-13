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
 *   - envloader.js             - Populates process.env from .env file
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

/* ─────────────────────────────────────────────────────────────────────────────
 * CONSTANTS — Operational Limits
 * ───────────────────────────────────────────────────────────────────────────── */

/** @constant {number} Maximum entries visited during a single walk operation. */
const MAX_WALK_ENTRIES = 8000;

/** @constant {number} Maximum directory nesting depth for recursive walks. */
const MAX_WALK_DEPTH = 12;

/** @constant {number} Hard cap on search result size. */
const SEARCH_LIMIT = 200;

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
    const err = new Error(message);
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
 * @brief   Lists the direct children of a directory inside FILES_ROOT.
 */
async function listPath(projectRoot, relPath) {
    const root = await getRoot(projectRoot);

    const { target, parts } = resolveInsideRoot(root, relPath);

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

    let stat;
    try { stat = await fs.stat(target); }
    catch { throw serviceError(404, "NOT_FOUND", "Path not found."); }

    if (!stat.isDirectory()) {
        throw serviceError(400, "NOT_A_DIRECTORY", "Path is not a directory.");
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

/**
 * @brief   Resolves a file path to a downloadable target with metadata.
 */
async function getDownloadTarget(projectRoot, relPath) {
    const root = await getRoot(projectRoot);

    const { target, parts } = resolveInsideRoot(root, relPath);

    if (parts.length === 0) {
        throw serviceError(400, "INVALID_PATH", "A file path is required.");
    }
    let stat;
    try { stat = await fs.stat(target); }
    catch { throw serviceError(404, "NOT_FOUND", "File not found."); }
    if (!stat.isFile()) {
        throw serviceError(400, "NOT_A_FILE", "Requested path is not a file.");
    }
    return {
        absPath: target,
        fileName: parts[parts.length - 1],
        size: stat.size,
        mtime: stat.mtime,
    };
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
 * @returns {Promise<fs.Dirent[]>}
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
    const raw = process.env.FILES_ROOT;
    if (raw == null || String(raw).trim() === '') {
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
 * @brief   Resolves an optional dedicated release path from RELEASE_PVM.
 * @param   {string} projectRoot  Project root, used for relative env values.
 * @returns {string|null}         Absolute release path, or null if unset.
 *
 * @note    Unlike FILES_ROOT, this variable is optional. When null, callers
 *          should fall back to scanning FILES_ROOT itself.
 */
function resolveReleaseRoot(projectRoot) {
    const raw = process.env.RELEASE_PVM;
    if (raw == null || String(raw).trim() === '') return null;
    const configured = String(raw).trim();
    return path.isAbsolute(configured)
        ? path.resolve(configured)
        : path.resolve(projectRoot, configured);
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
 * @returns {Promise<fs.Dirent[]>}  All visible directory entries in root.
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
 * @returns {Promise<{fileCount:number, folderCount:number, latestModified:(number|null)}>}
 *
 * @details
 *   - Walks up to MAX_WALK_DEPTH levels deep.
 *   - Unreadable entries are silently skipped (no throw).
 *   - latestModified is a Unix millisecond timestamp; null if no files found.
 */
async function summarizeTree(dir) {
    let fileCount = 0;
    let folderCount = 0;
    let latestModified = 0;

    async function walk(current, depth) {
        if (depth > MAX_WALK_DEPTH) return;
        let entries;
        try {
            entries = await fs.readdir(current, { withFileTypes: true });
        } catch {
            return;
        }
        for (const ent of entries) {
            if (isHidden(ent.name)) continue;
            const full = path.join(current, ent.name);
            if (ent.isDirectory()) {
                folderCount += 1;
                await walk(full, depth + 1);
            } else if (ent.isFile()) {
                fileCount += 1;
                try {
                    const st = await fs.stat(full);
                    if (st.mtimeMs > latestModified) latestModified = st.mtimeMs;
                } catch { /* skip unreadable */ }
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
 * @returns {Promise<Array>}      Sorted category descriptors.
 *
 * @description
 * Each returned category includes: name, path, type, fileCount, folderCount,
 * mtime (ISO), and latestModified (ISO). Sorted alphabetically by name.
 *
 * Consumed by the home page's resource card grid (home.js → ResourceService).
 */
async function listCategories(projectRoot) {
    const root = await getRoot(projectRoot);
    const dirs = await assertCategoryStructure(root);

    const categories = await Promise.all(
        dirs.map(async (ent) => {
            const full = path.join(root, ent.name);
            let mtime = null;
            try {
                const st = await fs.stat(full);
                mtime = st.mtime.toISOString();
            } catch { mtime = null; }
            const summary = await summarizeTree(full);
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

    categories.sort((a, b) => a.name.localeCompare(b.name));
    return categories;
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
 * @param   {number} [options.limit=200] Max results (capped at SEARCH_LIMIT).
 * @returns {Promise<{results:Array, scanned:number, truncated:boolean}>}
 *
 * @details
 *   - Uses an iterative stack (not recursion) to avoid call-stack limits.
 *   - Bounded by MAX_WALK_ENTRIES and MAX_WALK_DEPTH.
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

    const stack = [{ dir: root, rel: "", depth: 0 }];

    if (releaseDir && !path.resolve(releaseDir).startsWith(path.resolve(root))) {
        try {
            const st = await fs.stat(releaseDir);
            if (st.isDirectory()) {
                const relRelease = path.basename(releaseDir);
                stack.push({ dir: releaseDir, rel: relRelease, depth: 0 });
            }
        } catch { /* skip */ }
    }

    while (stack.length && results.length < limit && visited < MAX_WALK_ENTRIES) {
        const { dir, rel, depth } = stack.pop();
        if (depth > MAX_WALK_DEPTH) continue;

        let entries;
        try { entries = await fs.readdir(dir, { withFileTypes: true }); }
        catch { continue; }

        scanned += 1;
        for (const ent of entries) {
            if (results.length >= limit || visited >= MAX_WALK_ENTRIES) break;
            if (isHidden(ent.name)) continue;
            visited += 1;

            const childRel = rel ? `${rel}/${ent.name}` : ent.name;
            const full = path.join(dir, ent.name);

            if (ent.isDirectory()) {
                stack.push({ dir: full, rel: childRel, depth: depth + 1 });
                if (nameMatches(ent.name, q)) {
                    results.push({ name: ent.name, path: childRel, type: "directory" });
                }
            } else if (ent.isFile() && nameMatches(ent.name, q)) {
                results.push({ name: ent.name, path: childRel, type: "file" });
            }
        }
    }

    return { results, scanned, truncated: visited >= MAX_WALK_ENTRIES || results.length >= limit };
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
 * @param   {number} [limit=RELEASES_LIMIT] Max releases to return (default: 5).
 * @param   {string|null} [osFilter=null]       Specific OS folder to scan (e.g., "el8" or "el9").
 * @returns {Promise<{browsePath: string, items: Array}>} Object containing dynamic browse path and sorted releases.
 *
 * @description
 * Dynamically computes `browsePath` relative to FILES_ROOT regardless of how
 * RELEASE_PVM is configured in .env (e.g. "release/el9" or "updates/pvm/el8").
 */
async function listLatestReleases(projectRoot, limit = RELEASES_LIMIT, osFilter = null) {
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

            if (ent.isDirectory()) {
                await walk(full, depth + 1);
                continue;
            }
            if (!ent.isFile()) continue;

            let st;
            try { st = await fs.stat(full); } catch { continue; }

            const childRel = toPosixRel(root, full);
            const segments = childRel.split('/');
            const category = segments.length >= 2
                ? segments[segments.length - 2]
                : (segments[0] || 'Release');

            if (osFilter && category.toLowerCase() !== String(osFilter).toLowerCase()) {
                continue;
            }

            files.push({
                name: ent.name,
                path: childRel,
                category,
                type: 'file',
                size: st.size,
                mtime: st.mtime.toISOString(),
                version: extractVersion(ent.name),
            });
        }
    }

    try {
        await walk(scanTarget, 0);
    } catch (err) {
        console.warn(`[files-service] Release walk failed: ${err.message}`);
    }

    files.sort((a, b) => {
        const vc = compareVersions(a.version, b.version);
        if (vc !== 0) return vc;
        return new Date(b.mtime) - new Date(a.mtime);
    });

    const browsePath = calculateReleaseBrowsePath(root, scanTargetValid ? releaseDir : null, osFilter);

    return {
        browsePath,
        items: files.slice(0, cap)
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

    // Diagnostics
    peekRootSync,
    getRoot,
};