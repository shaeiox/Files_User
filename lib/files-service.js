// [fs_snip_requires]
const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");
// [fs_snip_requires]

// [fs_snip_limits]
const MAX_WALK_ENTRIES = 8000;
const MAX_WALK_DEPTH = 12;
const SEARCH_LIMIT = 200;
const RELEASES_LIMIT = 12;
// [fs_snip_limits]

// [fs_snip_ishidden]
function isHidden(name) {
    const l = String(name || "").toLowerCase();
    return !name || l === "index.html" || l === "index.php" || name.startsWith(".");
}
// [fs_snip_ishidden]

// [fs_snip_serviceerror]
function serviceError(httpStatus, code, message) {
    const err = new Error(message);
    err.httpStatus = httpStatus;
    err.code = code;
    return err;
}
// [fs_snip_serviceerror]

// [fs_snip_resolveconfig]
function resolveConfiguredRoot(projectRoot) {
    const raw = process.env.FILES_ROOT;
    if (raw == null || String(raw).trim() === "") {
        throw serviceError(
            503,
            "FILES_ROOT_MISSING",
            "FILES_ROOT is not set. Add it to your .env file."
        );
    }
    const configured = String(raw).trim();
    return path.isAbsolute(configured)
        ? path.resolve(configured)
        : path.resolve(projectRoot, configured);
}
// [fs_snip_resolveconfig]

// [fs_snip_getroot]
async function getRoot(projectRoot) {
    const root = resolveConfiguredRoot(projectRoot);
    let stat;
    try {
        stat = await fs.stat(root);
    } catch {
        throw serviceError(
            503,
            "FILES_ROOT_NOT_FOUND",
            "FILES_ROOT does not exist. Check the path in your .env file."
        );
    }
    if (!stat.isDirectory()) {
        throw serviceError(
            503,
            "FILES_ROOT_NOT_DIRECTORY",
            "FILES_ROOT exists but is not a directory."
        );
    }
    return root;
}
// [fs_snip_getroot]

// [fs_snip_splitrel]
function splitRel(relPath) {
    return String(relPath || "")
        .replace(/\\/g, "/")
        .split("/")
        .map((p) => p.trim())
        .filter(Boolean);
}
// [fs_snip_splitrel]

// [fs_snip_resolveinside]
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
    return {
        target,
        parts,
        relPosix: parts.join("/"),
    };
}
// [fs_snip_resolveinside]

// [fs_snip_toposixrel]
function toPosixRel(root, absPath) {
    return path.relative(root, absPath).split(path.sep).filter(Boolean).join("/");
}
// [fs_snip_toposixrel]

// [fs_snip_readvisible]
async function readVisibleEntries(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter((e) => !isHidden(e.name));
}
// [fs_snip_readvisible]

// [fs_snip_assertstruct]
async function assertCategoryStructure(root) {
    const visible = await readVisibleEntries(root);
    if (visible.length === 0) {
        throw serviceError(
            503,
            "FILES_ROOT_EMPTY",
            "FILES_ROOT is empty and is not a valid resource repository."
        );
    }
    const dirs = visible.filter((e) => e.isDirectory());
    if (dirs.length === 0) {
        throw serviceError(
            503,
            "FILES_ROOT_NO_CATEGORIES",
            "FILES_ROOT contains no category folders. Only directories are used as categories; files in the root are ignored."
        );
    }
    return dirs;
}
// [fs_snip_assertstruct]

// [fs_snip_summarizetree]
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
                } catch {
                    /* skip unreadable */
                }
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
// [fs_snip_summarizetree]

// [fs_snip_listcategories]
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
            } catch {
                mtime = null;
            }
            const summary = await summarizeTree(full);
            return {
                name: ent.name,
                path: ent.name,
                type: "directory",
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
// [fs_snip_listcategories]

// [fs_snip_listpath]
async function listPath(projectRoot, relPath) {
    const root = await getRoot(projectRoot);
    const { target, parts } = resolveInsideRoot(root, relPath);

    if (parts.length === 0) {
        const dirs = await assertCategoryStructure(root);
        const listed = await Promise.all(
            dirs.map(async (ent) => {
                const full = path.join(root, ent.name);
                let st;
                try {
                    st = await fs.stat(full);
                } catch {
                    return null;
                }
                return {
                    name: ent.name,
                    path: ent.name,
                    type: "directory",
                    size: 0,
                    mtime: st.mtime.toISOString(),
                };
            })
        );
        return listed.filter(Boolean);
    }

    let stat;
    try {
        stat = await fs.stat(target);
    } catch {
        throw serviceError(404, "NOT_FOUND", "Path not found.");
    }
    if (!stat.isDirectory()) {
        throw serviceError(400, "NOT_A_DIRECTORY", "Path is not a directory.");
    }

    const entries = await readVisibleEntries(target);
    const listed = await Promise.all(
        entries.map(async (ent) => {
            const full = path.join(target, ent.name);
            let st;
            try {
                st = await fs.stat(full);
            } catch {
                return null;
            }
            const childRel = toPosixRel(root, full);
            if (ent.isDirectory()) {
                return {
                    name: ent.name,
                    path: childRel,
                    type: "directory",
                    size: 0,
                    mtime: st.mtime.toISOString(),
                };
            }
            if (ent.isFile()) {
                return {
                    name: ent.name,
                    path: childRel,
                    type: "file",
                    size: st.size,
                    mtime: st.mtime.toISOString(),
                };
            }
            return null;
        })
    );
    return listed.filter(Boolean);
}
// [fs_snip_listpath]

// [fs_snip_getdownload]
async function getDownloadTarget(projectRoot, relPath) {
    const root = await getRoot(projectRoot);
    const { target, parts } = resolveInsideRoot(root, relPath);
    if (parts.length === 0) {
        throw serviceError(400, "INVALID_PATH", "A file path is required.");
    }
    let stat;
    try {
        stat = await fs.stat(target);
    } catch {
        throw serviceError(404, "NOT_FOUND", "File not found.");
    }
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
// [fs_snip_getdownload]

// [fs_snip_namematches]
function nameMatches(name, query) {
    if (!query) return true;
    return String(name).toLowerCase().includes(query);
}
// [fs_snip_namematches]

// [fs_snip_search]
async function searchEntries(projectRoot, query, options = {}) {
    const root = await getRoot(projectRoot);
    await assertCategoryStructure(root);
    const q = String(query || "").trim().toLowerCase();
    const limit = Math.min(Number(options.limit) || SEARCH_LIMIT, SEARCH_LIMIT);
    const results = [];
    let scanned = 0;
    let visited = 0;

    const stack = [{ dir: root, rel: "", depth: 0 }];
    while (stack.length && results.length < limit && visited < MAX_WALK_ENTRIES) {
        const { dir, rel, depth } = stack.pop();
        if (depth > MAX_WALK_DEPTH) continue;
        let entries;
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        } catch {
            continue;
        }
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
                    results.push({
                        name: ent.name,
                        path: childRel,
                        type: "directory",
                    });
                }
            } else if (ent.isFile() && nameMatches(ent.name, q)) {
                results.push({
                    name: ent.name,
                    path: childRel,
                    type: "file",
                });
            }
        }
    }

    return { results, scanned, truncated: visited >= MAX_WALK_ENTRIES || results.length >= limit };
}
// [fs_snip_search]

// [fs_snip_releases]
async function listLatestReleases(projectRoot, limit = RELEASES_LIMIT) {
    const root = await getRoot(projectRoot);
    await assertCategoryStructure(root);
    const cap = Math.min(Number(limit) || RELEASES_LIMIT, 50);
    const files = [];
    let visited = 0;

    async function walk(dir, rel, depth) {
        if (depth > MAX_WALK_DEPTH || visited >= MAX_WALK_ENTRIES) return;
        let entries;
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        } catch {
            return;
        }
        for (const ent of entries) {
            if (visited >= MAX_WALK_ENTRIES) return;
            if (isHidden(ent.name)) continue;
            visited += 1;
            const childRel = rel ? `${rel}/${ent.name}` : ent.name;
            const full = path.join(dir, ent.name);
            if (ent.isDirectory()) {
                await walk(full, childRel, depth + 1);
            } else if (ent.isFile()) {
                try {
                    const st = await fs.stat(full);
                    files.push({
                        name: ent.name,
                        path: childRel,
                        category: childRel.split("/")[0] || "",
                        type: "file",
                        size: st.size,
                        mtime: st.mtime.toISOString(),
                    });
                } catch {
                    /* skip */
                }
            }
        }
    }

    await walk(root, "", 0);
    files.sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
    return files.slice(0, cap);
}
// [fs_snip_releases]

// [fs_snip_peek]
function peekRootSync(projectRoot) {
    try {
        const root = resolveConfiguredRoot(projectRoot);
        const exists = fsSync.existsSync(root);
        const isDir = exists && fsSync.statSync(root).isDirectory();
        return { configured: true, exists, isDirectory: isDir };
    } catch (err) {
        return {
            configured: err.code !== "FILES_ROOT_MISSING",
            exists: false,
            isDirectory: false,
            error: err.code || "UNKNOWN",
        };
    }
}
// [fs_snip_peek]

// [fs_snip_exports]
module.exports = {
    listCategories,
    listPath,
    getDownloadTarget,
    searchEntries,
    listLatestReleases,
    peekRootSync,
    getRoot,
};
// [fs_snip_exports]
