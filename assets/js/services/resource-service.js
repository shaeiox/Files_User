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
        try {
            const body = await res.json();
            if (body && body.error) return body.error;
        } catch { }
        return "HTTP " + res.status;
    }

    async function getResources(options = {}) {
        const { forceRefresh = false } = options;
        if (!forceRefresh) {
            const cached = getCachedData();
            if (cached) return cached;
        }

        const res = await fetch("/api/categories", { cache: "no-store" });
        if (!res.ok) {
            throw new Error(await parseError(res));
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
        if (!res.ok) throw new Error(await parseError(res));
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("Invalid file list");
        return data.filter((e) => e && e.name && !isHidden(e.name));
    }

    async function search(query, options = {}) {
        const params = new URLSearchParams();
        params.set("q", query || "");
        if (options.limit) params.set("limit", String(options.limit));
        const res = await fetch("/api/search?" + params.toString(), { cache: "no-store" });
        if (!res.ok) throw new Error(await parseError(res));
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
        if (!res.ok) throw new Error(await parseError(res));
        const data = await res.json();

        if (data && Array.isArray(data.items)) {
            return { browsePath: data.browsePath || "", items: data.items };
        }
        if (Array.isArray(data)) {
            return { browsePath: os || "", items: data };
        }
        return { browsePath: os || "", items: [] };
    }

    // --- Auth API ---
    async function checkAuthStatus() {
        const res = await fetch("/api/auth/status", { cache: "no-store" });
        return res.json();
    }

    async function login(username, password) {
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Authentication failed");
        return data;
    }

    async function logout() {
        await fetch("/api/auth/logout", { method: "POST" });
    }

    return {
        getResources,
        getRegistry,
        clearCache,
        listFiles,
        search,
        getReleases,
        browseHref,
        downloadHref,
        encodeRelPath,
        inferIcon,
        checkAuthStatus,
        login,
        logout
    };
})();
