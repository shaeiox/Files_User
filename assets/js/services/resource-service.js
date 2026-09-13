/* ═══════════════════════════════════════════════════════════════
   resource-service.js — Enterprise Resource Data Layer
   Skill: Clean Architecture — Caching, Parallel Fetching, Fallback
   
   Responsibilities:
   - Fetch directory metadata from /__list/ API
   - Cache results (in-memory + sessionStorage)
   - Provide unified resource metadata (icons, keys, paths)
   - Graceful degradation on API failure
   ═══════════════════════════════════════════════════════════════ */

const ResourceService = (function () {
    'use strict';

    /* ── Cache Configuration ── */
    const CACHE_KEY = "cav_resources_cache";
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache lifetime
    let memoryCache = null;

    /* ── Resource Registry (Metadata Definition) ── */
    // Central config for all infrastructure resources
    // Each entry defines: path, icon type, i18n keys for title/description
    const RESOURCE_REGISTRY = [
        {
            id: "system-files",
            path: "/files/",
            iconType: "folder",
            titleKey: "sysFiles",
            descKey: "sysFilesDesc",
            defaultTitle: "System Files",
            defaultDesc: "Public system files and essential packages for infrastructure."
        },
        {
            id: "templates",
            path: "/download/download-User/Template/",
            iconType: "doc",
            titleKey: "template",
            descKey: "templateDesc",
            defaultTitle: "Templates",
            defaultDesc: "Common templates and configuration files for deployment."
        },
        {
            id: "sandbox",
            path: "/download/download-User/Sandbox/",
            iconType: "box",
            titleKey: "sandbox",
            descKey: "sandboxDesc",
            defaultTitle: "Sandbox",
            defaultDesc: "Isolated environment packages and test files."
        },
        {
            id: "log-server",
            path: "/download/download-User/LogDB/",
            iconType: "server",
            titleKey: "logServer",
            descKey: "logServerDesc",
            defaultTitle: "Log Server",
            defaultDesc: "Database exports and system logs for troubleshooting."
        },
        {
            id: "iso-images",
            path: "/download/download-User/ISO/",
            iconType: "disc",
            titleKey: "iso",
            descKey: "isoDesc",
            defaultTitle: "ISO Images",
            defaultDesc: "Operating systems and installation images."
        },
        {
            id: "documentation",
            path: "/download/download-Avid/",
            iconType: "book",
            titleKey: "docsTitle",
            descKey: "docsDesc",
            defaultTitle: "Documentation",
            defaultDesc: "Guides, manuals and technical documentation."
        }
    ];

    /* ── Utility: Check hidden files ── */
    function isHidden(name) {
        const l = (name || "").toLowerCase();
        return l === "index.html" || l === "index.php" || l.startsWith(".");
    }

    /* ── Cache Layer ── */
    function getCachedData() {
        // Try memory first (fastest)
        if (memoryCache && (Date.now() - memoryCache.timestamp) < CACHE_TTL) {
            return memoryCache.data;
        }

        // Try sessionStorage (survives page navigation)
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

    /* ── Fetch a single directory & compute stats ── */
    async function fetchDirectoryStats(path) {
        try {
            const res = await fetch("/__list" + path, { cache: "no-store" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const entries = await res.json();
            if (!Array.isArray(entries)) throw new Error("Invalid JSON");

            const visible = entries.filter(e =>
                e && e.name && e.name !== "." && e.name !== ".." && !isHidden(e.name)
            );

            const files = visible.filter(e => e.type !== "directory").length;
            const folders = visible.filter(e => e.type === "directory").length;
            const total = visible.length;

            // Find latest modified item
            let latestModified = null;
            visible.forEach(e => {
                const mtime = e.mtime || e.modified || e.time;
                if (mtime) {
                    const t = new Date(mtime).getTime();
                    if (!latestModified || t > latestModified) latestModified = t;
                }
            });

            return {
                available: true,
                total,
                files,
                folders,
                latestModified,
                error: null
            };
        } catch (err) {
            return {
                available: false,
                total: 0,
                files: 0,
                folders: 0,
                latestModified: null,
                error: err.message
            };
        }
    }

    /* ── Main API: fetch all resources in parallel ── */
    async function getResources(options = {}) {
        const { forceRefresh = false } = options;

        // Return cached data if available
        if (!forceRefresh) {
            const cached = getCachedData();
            if (cached) return cached;
        }

        // Fetch all resources in parallel
        const promises = RESOURCE_REGISTRY.map(async (resource) => {
            const stats = await fetchDirectoryStats(resource.path);
            return { ...resource, stats };
        });

        const resources = await Promise.all(promises);
        setCachedData(resources);
        return resources;
    }

    /* ── Get raw registry (for skeleton rendering) ── */
    function getRegistry() {
        return RESOURCE_REGISTRY.map(r => ({ ...r, stats: null }));
    }

    /* ── Public API ── */
    return {
        getResources,
        getRegistry,
        clearCache
    };
})();