/* ═══════════════════════════════════════════════════════════════
   server.js — CloudAvid File Portal · Dev / Mock Server
   Skill: Enterprise Local Simulation
   
   Features:
   ✓ Mock /__list/ API with realistic filesystem tree
   ✓ SPA shell for all frontend routes
   ✓ Static asset serving with MIME types
   ✓ CORS + Security headers
   ✓ Health check endpoint
   ✓ Optional artificial latency (for skeleton testing)
   ✓ Colored structured logging
   ═══════════════════════════════════════════════════════════════ */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

/* ── Config ── */
const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const ARTIFICIAL_LATENCY_MS = 5600; // set to 400–800 to test skeleton loading

/* ── Colors for console ── */
const c = {
    reset: "\x1b[0m",
    dim: "\x1b[2m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    cyan: "\x1b[36m",
    red: "\x1b[31m",
    magenta: "\x1b[35m",
    bold: "\x1b[1m",
};

/* ── MIME map ── */
const MIMES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".map": "application/json",
    ".txt": "text/plain; charset=utf-8",
    ".pdf": "application/pdf",
    ".iso": "application/octet-stream",
    ".zip": "application/zip",
    ".gz": "application/gzip",
    ".qcow2": "application/octet-stream",
    ".vmdk": "application/octet-stream",
    ".sql": "application/sql",
    ".log": "text/plain; charset=utf-8",
    ".yml": "text/yaml; charset=utf-8",
    ".yaml": "text/yaml; charset=utf-8",
    ".sh": "text/x-shellscript",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".vsdx": "application/vnd.ms-visio.drawing",
};

/* ═══════════════════════════════════════════════
   MOCK FILESYSTEM TREE
   Mirrors production layout expected by ResourceService
   ═══════════════════════════════════════════════ */
const MOCK_FS = {
    /* ── Root used by ResourceService: System Files ── */
    "/files/": [
        { name: "kernel-modules", type: "directory", mtime: "2025-06-12T08:00:00Z" },
        { name: "ca-certificates", type: "directory", mtime: "2025-06-10T09:30:00Z" },
        { name: "sysctl.conf", type: "file", size: 4200, mtime: "2025-05-01T12:00:00Z" },
        { name: "hosts.allow", type: "file", size: 890, mtime: "2025-04-20T10:00:00Z" },
        { name: "sshd_config.hardened", type: "file", size: 12500, mtime: "2025-06-01T14:00:00Z" },
    ],
    "/files/kernel-modules/": [
        { name: "nvidia-535.ko", type: "file", size: 24500000, mtime: "2025-06-12T08:00:00Z" },
        { name: "wireguard.ko", type: "file", size: 890000, mtime: "2025-06-08T11:00:00Z" },
    ],
    "/files/ca-certificates/": [
        { name: "cloudavid-root-ca.crt", type: "file", size: 2100, mtime: "2025-01-15T00:00:00Z" },
        { name: "intermediate-ca.crt", type: "file", size: 1800, mtime: "2025-01-15T00:00:00Z" },
    ],

    /* ── download-User root ── */
    "/download/download-User/": [
        { name: "Template", type: "directory", mtime: "2025-06-15T10:30:00Z" },
        { name: "Sandbox", type: "directory", mtime: "2025-06-20T14:20:00Z" },
        { name: "LogDB", type: "directory", mtime: "2025-06-18T09:00:00Z" },
        { name: "ISO", type: "directory", mtime: "2025-06-10T16:45:00Z" },
        { name: "imageClone", type: "directory", mtime: "2025-06-22T11:15:00Z" },
        { name: "Documents", type: "directory", mtime: "2025-06-21T09:00:00Z" },
    ],

    /* Templates */
    "/download/download-User/Template/": [
        { name: "Archived", type: "directory", mtime: "2024-12-01T10:00:00Z" },
        { name: "CloudAvid_Proposal.docx", type: "file", size: 152400, mtime: "2025-06-15T10:30:00Z" },
        { name: "Network_Diagram.vsdx", type: "file", size: 892000, mtime: "2025-06-16T11:20:00Z" },
        { name: "Security_Checklist.pdf", type: "file", size: 312000, mtime: "2025-06-14T09:00:00Z" },
        { name: "Deployment_Runbook.md", type: "file", size: 28500, mtime: "2025-06-17T15:00:00Z" },
        { name: "SLA_Template.docx", type: "file", size: 98000, mtime: "2025-06-10T08:00:00Z" },
    ],
    "/download/download-User/Template/Archived/": [
        { name: "Legacy_Proposal_2022.docx", type: "file", size: 78900, mtime: "2022-03-22T09:00:00Z" },
        { name: "Old_Network_Map_2021.vsdx", type: "file", size: 450000, mtime: "2021-11-05T14:00:00Z" },
    ],

    /* Sandbox */
    "/download/download-User/Sandbox/": [
        { name: "deploy_test.sh", type: "file", size: 2400, mtime: "2025-06-20T14:20:00Z" },
        { name: "api_mock.json", type: "file", size: 15600, mtime: "2025-06-19T13:00:00Z" },
        { name: "kernel_debug.log", type: "file", size: 890000, mtime: "2025-06-21T08:45:00Z" },
        { name: "load_test_results.csv", type: "file", size: 125000, mtime: "2025-06-22T10:00:00Z" },
        { name: "chaos_experiment.yml", type: "file", size: 4800, mtime: "2025-06-18T16:30:00Z" },
    ],

    /* LogDB */
    "/download/download-User/LogDB/": [
        { name: "pg_backup_2025-06.sql.gz", type: "file", size: 245000000, mtime: "2025-06-01T02:00:00Z" },
        { name: "nginx_access.log", type: "file", size: 12500000, mtime: "2025-06-22T00:00:00Z" },
        { name: "redis_snapshot.rdb", type: "file", size: 8900000, mtime: "2025-06-20T03:00:00Z" },
        { name: "mysql_dump_full.sql.gz", type: "file", size: 890000000, mtime: "2025-06-15T02:30:00Z" },
        { name: "audit_trail_2025-Q2.log", type: "file", size: 45000000, mtime: "2025-06-21T23:59:00Z" },
    ],

    /* ISO Images */
    "/download/download-User/ISO/": [
        { name: "Ubuntu_24.04_Server.iso", type: "file", size: 2100000000, mtime: "2025-05-10T16:45:00Z" },
        { name: "Rocky_9.4_Minimal.iso", type: "file", size: 1800000000, mtime: "2025-04-15T10:00:00Z" },
        { name: "ESXi_8.0u3.iso", type: "file", size: 620000000, mtime: "2025-05-20T08:30:00Z" },
        { name: "Alpine_3.20_Virt.iso", type: "file", size: 45000000, mtime: "2025-06-05T12:00:00Z" },
        { name: "Debian_12_Netinst.iso", type: "file", size: 680000000, mtime: "2025-05-28T09:00:00Z" },
        { name: "Proxmox_VE_8.2.iso", type: "file", size: 1200000000, mtime: "2025-06-01T11:00:00Z" },
    ],

    /* VM Images */
    "/download/download-User/imageClone/": [
        { name: "WebServer_Nginx.qcow2", type: "file", size: 12000000000, mtime: "2025-06-22T11:15:00Z" },
        { name: "DB_PostgreSQL_15.vmdk", type: "file", size: 25000000000, mtime: "2025-06-20T15:30:00Z" },
        { name: "PfSense_2.7.qcow2", type: "file", size: 3200000000, mtime: "2025-06-18T10:00:00Z" },
        { name: "K8s_Worker_Node.qcow2", type: "file", size: 8500000000, mtime: "2025-06-21T14:00:00Z" },
    ],

    /* Documents */
    "/download/download-User/Documents/": [
        { name: "Onboarding_Guide.pdf", type: "file", size: 4500000, mtime: "2025-06-10T09:00:00Z" },
        { name: "API_Reference.pdf", type: "file", size: 8900000, mtime: "2025-06-15T11:00:00Z" },
    ],

    /* ── download-Avid (Documentation) ── */
    "/download/download-Avid/": [
        { name: "Security_Policy.pdf", type: "file", size: 2400000, mtime: "2025-06-14T10:00:00Z" },
        { name: "Ansible_Playbooks", type: "directory", mtime: "2025-06-19T16:00:00Z" },
        { name: "Architecture_Diagrams", type: "directory", mtime: "2025-06-20T10:00:00Z" },
        { name: "Runbooks", type: "directory", mtime: "2025-06-18T14:00:00Z" },
        { name: "CHANGELOG.md", type: "file", size: 18500, mtime: "2025-06-22T08:00:00Z" },
    ],
    "/download/download-Avid/Ansible_Playbooks/": [
        { name: "setup_nginx.yml", type: "file", size: 3400, mtime: "2025-06-19T16:00:00Z" },
        { name: "harden_server.yml", type: "file", size: 5600, mtime: "2025-06-18T12:00:00Z" },
        { name: "deploy_monitoring.yml", type: "file", size: 7200, mtime: "2025-06-20T09:00:00Z" },
        { name: "inventory.ini", type: "file", size: 1200, mtime: "2025-06-19T15:00:00Z" },
    ],
    "/download/download-Avid/Architecture_Diagrams/": [
        { name: "Network_Topology.drawio", type: "file", size: 89000, mtime: "2025-06-20T10:00:00Z" },
        { name: "Service_Mesh_Overview.pdf", type: "file", size: 3200000, mtime: "2025-06-15T14:00:00Z" },
    ],
    "/download/download-Avid/Runbooks/": [
        { name: "Incident_Response.md", type: "file", size: 45000, mtime: "2025-06-18T14:00:00Z" },
        { name: "Backup_Restore.md", type: "file", size: 28000, mtime: "2025-06-12T11:00:00Z" },
        { name: "Failover_Procedure.md", type: "file", size: 35000, mtime: "2025-06-16T09:00:00Z" },
    ],
};

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */
function log(method, status, url, extra = "") {
    const color =
        status >= 500 ? c.red :
            status >= 400 ? c.yellow :
                status >= 300 ? c.cyan :
                    c.green;
    const time = new Date().toISOString().slice(11, 19);
    console.log(
        `${c.dim}${time}${c.reset} ${c.bold}${method.padEnd(6)}${c.reset} ${color}${status}${c.reset} ${url} ${c.dim}${extra}${c.reset}`
    );
}

function normalizeListPath(p) {
    // Ensure trailing slash for directory keys
    if (!p.endsWith("/")) p += "/";
    // Collapse duplicate slashes
    p = p.replace(/\/+/g, "/");
    return p;
}

function sendJSON(res, status, data, headers = {}) {
    const body = JSON.stringify(data, null, 0);
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "no-store",
        ...headers,
    });
    res.end(body);
}

function sendText(res, status, text, contentType = "text/plain; charset=utf-8") {
    res.writeHead(status, {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
    });
    res.end(text);
}

function securityHeaders(res) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
}

function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

function serveSPA(res) {
    const indexPath = path.join(ROOT, "index.html");
    fs.readFile(indexPath, (err, data) => {
        if (err) {
            sendText(res, 500, "index.html missing — place it next to server.js");
            return;
        }
        securityHeaders(res);
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(data);
    });
}

function serveStatic(reqPath, res) {
    // Prevent path traversal
    const safe = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, "");
    const fp = path.join(ROOT, safe === "/" || safe === "" ? "index.html" : safe);
    const ext = path.extname(fp).toLowerCase();

    // Block serving outside project root
    if (!fp.startsWith(ROOT)) {
        sendText(res, 403, "Forbidden");
        return;
    }

    fs.readFile(fp, (err, data) => {
        if (err) {
            // Friendly SVG placeholder for missing images
            if ([".png", ".jpg", ".jpeg", ".webp", ".ico", ".svg"].includes(ext)) {
                const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3" opacity="0.3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`;
                res.writeHead(200, { "Content-Type": "image/svg+xml" });
                res.end(svg);
                return;
            }

            // SPA fallback for unknown routes (client-side router handles them)
            if (!ext || ext === ".html") {
                serveSPA(res);
                return;
            }

            sendText(res, 404, `404 — ${reqPath}`);
            return;
        }

        securityHeaders(res);
        res.writeHead(200, {
            "Content-Type": MIMES[ext] || "application/octet-stream",
            "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600",
        });
        res.end(data);
    });
}

/* ═══════════════════════════════════════════════
   REQUEST HANDLER
   ═══════════════════════════════════════════════ */
const server = http.createServer(async (req, res) => {
    const start = Date.now();
    let pathname;

    try {
        pathname = decodeURIComponent(new URL(req.url, `http://localhost:${PORT}`).pathname);
    } catch {
        sendText(res, 400, "Bad Request");
        return;
    }

    // CORS preflight
    if (req.method === "OPTIONS") {
        res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "86400",
        });
        res.end();
        return;
    }

    // Only GET supported for mock
    if (req.method !== "GET" && req.method !== "HEAD") {
        sendText(res, 405, "Method Not Allowed");
        return;
    }

    /* ── Health check ── */
    if (pathname === "/__health") {
        sendJSON(res, 200, {
            status: "ok",
            service: "CloudAvid File Portal Mock",
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
            routes: Object.keys(MOCK_FS).length,
        });
        log("GET", 200, pathname, `${Date.now() - start}ms`);
        return;
    }

    /* ── List API ── */
    if (pathname.startsWith("/__list")) {
        if (ARTIFICIAL_LATENCY_MS > 0) {
            await delay(ARTIFICIAL_LATENCY_MS);
        }

        let listPath = pathname.replace(/^\/__list/, "") || "/";
        listPath = normalizeListPath(listPath);

        const entries = MOCK_FS[listPath];

        if (entries) {
            sendJSON(res, 200, entries);
            log("GET", 200, pathname, `${entries.length} items · ${Date.now() - start}ms`);
        } else {
            // Empty directory (not 404) — matches real nginx autoindex behaviour
            sendJSON(res, 200, []);
            log("GET", 200, pathname, `empty · ${Date.now() - start}ms`);
        }
        return;
    }

    /* ── SPA routes (download/files browse pages) ── */
    if (
        pathname === "/" ||
        pathname.startsWith("/download/") ||
        pathname.startsWith("/files/") ||
        pathname === "/index.html"
    ) {
        // If it looks like a real file download (has extension), try static first
        const ext = path.extname(pathname).toLowerCase();
        if (ext && MIMES[ext] && ext !== ".html") {
            // Simulate file download for mock assets
            serveStatic(pathname, res);
            log("GET", 200, pathname, `static/download · ${Date.now() - start}ms`);
            return;
        }

        serveSPA(res);
        log("GET", 200, pathname, `SPA · ${Date.now() - start}ms`);
        return;
    }

    /* ── Static assets ── */
    serveStatic(pathname, res);
    // status logged inside serveStatic is harder; approximate:
    log("GET", 200, pathname, `asset · ${Date.now() - start}ms`);
});

/* ═══════════════════════════════════════════════
   BOOT
   ═══════════════════════════════════════════════ */
server.listen(PORT, () => {
    console.log(`
${c.cyan}${c.bold}
  ╔══════════════════════════════════════════════════╗
  ║     CloudAvid File Portal — Mock API Server      ║
  ╚══════════════════════════════════════════════════╝${c.reset}

  ${c.green}➜${c.reset}  Local:    ${c.bold}http://localhost:${PORT}/${c.reset}
  ${c.green}➜${c.reset}  Health:   http://localhost:${PORT}/__health
  ${c.green}➜${c.reset}  List API: http://localhost:${PORT}/__list/files/

  ${c.dim}Sample browse routes:${c.reset}
  ${c.magenta}•${c.reset} Home          http://localhost:${PORT}/
  ${c.magenta}•${c.reset} System Files  http://localhost:${PORT}/files/
  ${c.magenta}•${c.reset} ISO Images    http://localhost:${PORT}/download/download-User/ISO/
  ${c.magenta}•${c.reset} Templates     http://localhost:${PORT}/download/download-User/Template/
  ${c.magenta}•${c.reset} Documentation http://localhost:${PORT}/download/download-Avid/

  ${c.dim}Mock directories: ${Object.keys(MOCK_FS).length}${c.reset}
  ${c.dim}Latency simulation: ${ARTIFICIAL_LATENCY_MS}ms${c.reset}
  ${c.dim}Press Ctrl+C to stop${c.reset}
`);
});

/* Graceful shutdown */
process.on("SIGINT", () => {
    console.log(`\n${c.yellow}Shutting down mock server…${c.reset}`);
    server.close(() => process.exit(0));
});