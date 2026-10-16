/* ═══════════════════════════════════════════════════════════════
   resource-service.js — Resource data layer
   Fetches categories, listings, search, and releases from the API.
   ═══════════════════════════════════════════════════════════════ */

const ResourceService = (function () {
    'use strict';

    const CACHE_KEY = "cav_resources_cache";
    const CACHE_TTL = 5 * 60 * 1000;
    let memoryCache = null;

    function encodeRelPath(relPath) {
        return String(relPath || "")
            .replace(/\\/g, "/")
            .split("/")
            .filter(Boolean)
            .map(encodeURIComponent)
            .join("/");
    }

    function browseHref(relPath) {
        const encoded = encodeRelPath(relPath);
        return encoded ? "/browse/" + encoded + "/" : "/browse/";
    }

    function downloadHref(relPath) {
        return "/api/download/" + encodeRelPath(relPath);
    }

    /**
     * @brief   Builds the ZIP-download URL for a selection inside one browsed directory.
     * @details Stays here so this module remains the only place target URLs are
     *          constructed. `dirRel` is the directory being browsed; `relPaths` are the
     *          selected item paths relative to FILES_ROOT.
     */
    function zipDownloadHref(dirRel, relPaths) {
        const dir = encodeRelPath(dirRel);
        const items = (relPaths || []).map(encodeRelPath).filter(Boolean).join(",");
        return "/api/download-zip?dir=" + encodeURIComponent(dir) + "&items=" + encodeURIComponent(items);
    }

    /**
     * @brief   Builds the SHA-256 verification URL for one file.
     * @details Stays here so this module remains the only place target URLs are
     *          constructed, alongside browseHref / downloadHref / zipDownloadHref.
     */
    function hashHref(relPath) {
        return "/api/hash/" + encodeRelPath(relPath);
    }

    function inferIcon(name) {
        const n = String(name || "").toLowerCase();
        if (/(iso|image|disc|dvd|cd)/.test(n)) return "disc";
        if (/(log|db|server)/.test(n)) return "server";
        if (/(doc|guide|manual|template|readme)/.test(n)) return "doc";
        if (/(sandbox|test|lab)/.test(n)) return "box";
        if (/(system|sys|kernel|package)/.test(n)) return "folder";
        return "folder";
    }

    function isHidden(name) {
        const l = (name || "").toLowerCase();
        return l === "index.html" || l === "index.php" || l.startsWith(".");
    }

    function getCachedData() {
        if (memoryCache && (Date.now() - memoryCache.timestamp) < CACHE_TTL) {
            return memoryCache.data;
        }
        try {
            const raw = sessionStorage.getItem(CACHE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if ((Date.now() - parsed.timestamp) < CACHE_TTL) {
                    memoryCache = parsed;
                    return parsed.data;
                }
            }
        } catch { }
        return null;
    }

    function setCachedData(data) {
        const payload = { timestamp: Date.now(), data };
        memoryCache = payload;
        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
        } catch { }
    }

    function clearCache() {
        memoryCache = null;
        try {
            sessionStorage.removeItem(CACHE_KEY);
        } catch { }
    }

    function mapCategory(cat) {
        const name = cat.name || cat.path;
        const latest = cat.latestModified || cat.mtime || null;
        const latestMs = latest ? new Date(latest).getTime() : null;
        const files = Number(cat.fileCount || 0);
        const folders = Number(cat.folderCount || 0);
        return {
            id: cat.path || name,
            name,
            path: browseHref(cat.path || name),
            relPath: cat.path || name,
            iconType: inferIcon(name),
            // Admin policy: the category is visible by name only until sign-in.
            locked: cat.locked === true,
            stats: {
                available: true,
                total: files + folders,
                files,
                folders,
                latestModified: Number.isFinite(latestMs) ? latestMs : null,
                error: null
            }
        };
    }

    async function parseError(res) {
        // The returned Error carries .status and .code so callers can branch on
        // them (BrowsePage renders in-place 401/404 states from those fields).
        // Callers must rethrow THIS object — wrapping it in `new Error(...)`
        // discards both properties and silently downgrades every error to the
        // generic path.
        const err = new Error();
        err.status = res.status;
        try {
            const body = await res.json();
            err.message = body.error || ("HTTP " + res.status);
            err.code = body.code || null;
        } catch {
            err.message = "HTTP " + res.status;
            err.code = null;
        }
        return err;
    }

    async function getResources(options = {}) {
        const { forceRefresh = false } = options;
        if (!forceRefresh) {
            const cached = getCachedData();
            if (cached) return cached;
        }

        const res = await fetch("/api/categories", { cache: "no-store" });
        if (!res.ok) {
            throw await parseError(res);
        }
        const payload = await res.json();
        if (!Array.isArray(payload)) {
            throw new Error(payload && payload.error ? payload.error : "Invalid categories response");
        }

        const resources = payload
            .filter((c) => c && c.name && c.type !== "file")
            .map(mapCategory);

        setCachedData(resources);
        return resources;
    }

    function getRegistry() {
        const cached = getCachedData();
        if (cached && cached.length) {
            return cached.map((r) => ({ ...r, stats: null }));
        }
        return Array.from({ length: 6 }, (_, i) => ({
            id: "placeholder-" + i,
            name: "",
            path: "/",
            iconType: "folder",
            stats: null
        }));
    }

    async function listFiles(relPath) {
        const res = await fetch("/api/files/" + encodeRelPath(relPath), { cache: "no-store" });
        if (!res.ok) throw await parseError(res);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("Invalid file list");
        return data.filter((e) => e && e.name && !isHidden(e.name));
    }

    async function search(query, options = {}) {
        const params = new URLSearchParams();
        params.set("q", query || "");
        if (options.limit) params.set("limit", String(options.limit));
        if (options.path) params.set("path", options.path);
        const res = await fetch("/api/search?" + params.toString(), { cache: "no-store" });
        if (!res.ok) throw await parseError(res);
        return res.json();
    }

    /**
     * @brief   Fetches latest release artifacts along with dynamic browsePath.
     * @param   {number} [limit=5]  Max number of releases to fetch.
     * @param   {string|null} [os=null] OS filter category (e.g. "el8", "el9").
     * @returns {Promise<{browsePath: string, items: Array}>}
     */
    async function getReleases(limit = 5, os = null) {
        const params = new URLSearchParams();
        if (limit) params.set("limit", String(limit));
        if (os) params.set("os", String(os));

        const res = await fetch("/api/releases?" + params.toString(), { cache: "no-store" });
        if (!res.ok) throw await parseError(res);
        const data = await res.json();

        if (data && Array.isArray(data.items)) {
            return { browsePath: data.browsePath || "", items: data.items };
        }
        if (Array.isArray(data)) {
            return { browsePath: os || "", items: data };
        }
        return { browsePath: os || "", items: [] };
    }

    /**
     * @brief   Navbar folders set in the Admin (already filtered for this visitor).
     * @returns {Promise<Array<{name: string, path: string, locked?: boolean}>>}
     */
    async function getNav() {
        const res = await fetch("/api/nav", { cache: "no-store" });
        if (!res.ok) throw await parseError(res);
        const data = await res.json();
        return data && Array.isArray(data.folders) ? data.folders : [];
    }

    // --- Auth API ---
    let lastAuth = null;

    async function checkAuthStatus() {
        const res = await fetch("/api/auth/status", { cache: "no-store" });
        lastAuth = await res.json();
        return lastAuth;
    }

    /**
     * ` -u <username>` for shown curl commands when the visitor is signed in: the
     * terminal has no browser session, so curl must prompt for the password
     * itself. The password is never part of the command. A username that is not
     * shell-safe in both POSIX shells and PowerShell becomes a placeholder.
     */
    function cliUserArg() {
        if (!lastAuth || !lastAuth.enabled || !lastAuth.authenticated || !lastAuth.user) return "";
        const name = String(lastAuth.user.username || "");
        return " -u " + (/^[A-Za-z0-9._@-]+$/.test(name) ? name : "<username>");
    }

    async function login(username, password) {
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Authentication failed");
        // What a visitor may see depends on who they are (admin access policies),
        // so the cached category view must not outlive a sign-in or sign-out.
        clearCache();
        document.dispatchEvent(new CustomEvent("auth:changed"));
        return data;
    }

    async function logout() {
        await fetch("/api/auth/logout", { method: "POST" });
        clearCache();
        document.dispatchEvent(new CustomEvent("auth:changed"));
    }

    return {
        getResources,
        getRegistry,
        clearCache,
        listFiles,
        search,
        getReleases,
        getNav,
        browseHref,
        downloadHref,
        zipDownloadHref,
        hashHref,
        encodeRelPath,
        inferIcon,
        checkAuthStatus,
        cliUserArg,
        login,
        logout
    };
})();
