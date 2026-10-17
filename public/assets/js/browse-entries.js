/**
 * @file        browse-entries.js
 * @brief       One listing-entry model shared by the Browse table and its folder tree,
 *              so the two can never disagree about what an entry is or which are hidden
 *              (browse-split-explorer task 1.1).
 */

/** @brief Maps an API entry (listing or search hit) to a row/node model. */
function mapEntry(x, relPath) {
    return {
        name: String(x.name),
        relPath: x.path || (relPath ? relPath.replace(/\/+$/, "") + "/" + x.name : x.name),
        type: x.type === "directory" ? "directory" : "file",
        size: Number(x.size || 0),
        modified: x.mtime || x.modified || x.time || 0,
        // Admin policy: visible by name only until the visitor signs in.
        locked: x.locked === true,
        // Admin policy "view" level: listed, but not downloadable.
        viewOnly: x.viewOnly === true
    };
}

function isHidden(n) {
    const l = (n || "").toLowerCase();
    return l === "index.html" || l === "index.php" || l.startsWith(".");
}

/** @brief Raw listing → visible entries, unsorted. */
function toEntries(data, relPath) {
    return data
        .filter(x => x && x.name && x.name !== "." && x.name !== "..")
        .filter(x => !isHidden(x.name))
        .map(x => mapEntry(x, relPath));
}

/** @brief Folders before files, then by name. */
function byFoldersThenName(a, b) {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
}

export { mapEntry, isHidden, toEntries, byFoldersThenName };
