/* ═══════════════════════════════════════════════════════════════
   server.js — CloudAvid File Portal
   Filesystem-driven HTTP server (Windows + Linux)
   ═══════════════════════════════════════════════════════════════ */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PROJECT_ROOT = __dirname;
const { loadEnv } = require("./lib/load-env");
loadEnv(PROJECT_ROOT);

const filesService = require("./lib/files-service");
const authService = require("./lib/auth-service");

const HOST = "0.0.0.0";
const PORT = process.env.PORT || 3000;
const ROOT = PROJECT_ROOT;

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
    ".md": "text/markdown; charset=utf-8",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".vsdx": "application/vnd.ms-visio.drawing",
};

// Rate Limiting Storage: max 100 requests per minute per IP
const ipRequestCounts = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQ = 120; // 120 requests/min

function checkGlobalRateLimit(req) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = ipRequestCounts.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

    if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + RATE_LIMIT_WINDOW_MS;
    } else {
        record.count += 1;
    }

    ipRequestCounts.set(ip, record);
    return record.count <= RATE_LIMIT_MAX_REQ;
}

setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of ipRequestCounts.entries()) {
        if (now > record.resetTime) ipRequestCounts.delete(ip);
    }
}, RATE_LIMIT_WINDOW_MS);


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

function sendJSON(res, status, data, headers = {}) {
    const body = JSON.stringify(data, null, 0);
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
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

function sendServiceError(res, err) {
    const status = err.httpStatus || 500;
    sendJSON(res, status, {
        error: err.message || "Unexpected error",
        code: err.code || "INTERNAL",
    });
}

/**
 * @brief   Reads a JSON body from the request stream with size limit.
 * @param   {http.IncomingMessage} req
 * @param   {number} [maxBytes=8192]  Maximum accepted body size.
 * @returns {Promise<object>}
 */
function readJsonBody(req, maxBytes = 8192) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        req.on('data', (chunk) => {
            size += chunk.length;
            if (size > maxBytes) {
                req.destroy();
                reject(new Error('Payload too large'));
                return;
            }
            chunks.push(chunk);
        });
        req.on('end', () => {
            try {
                const raw = Buffer.concat(chunks).toString('utf8').trim();
                resolve(raw ? JSON.parse(raw) : {});
            } catch {
                reject(new Error('Invalid JSON body'));
            }
        });
        req.on('error', reject);
    });
}

/**
 * @brief   Determines whether the current connection is HTTPS.
 * @param   {http.IncomingMessage} req
 * @returns {boolean}
 */
function isSecureRequest(req) {
    return req.socket && req.socket.encrypted === true
        || String(req.headers['x-forwarded-proto'] || '').toLowerCase() === 'https';
}

function securityHeaders(res) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

    res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:;"
    );
}

function isInsideRoot(rootDir, filePath) {
    const rel = path.relative(rootDir, filePath);
    return rel && !rel.startsWith("..") && !path.isAbsolute(rel);
}

function decodePathname(rawUrl) {
    return decodeURIComponent(new URL(rawUrl, `http://localhost:${PORT}`).pathname);
}

function relFromPrefix(pathname, prefix) {
    const rest = pathname.slice(prefix.length);
    return rest.replace(/^\/+/, "");
}

function contentDisposition(fileName) {
    const fallback = String(fileName).replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "");
    const encoded = encodeURIComponent(fileName);
    return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
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
    const safe = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, "");
    const fp = path.join(ROOT, safe === "/" || safe === "" ? "index.html" : safe);
    const ext = path.extname(fp).toLowerCase();

    if (!isInsideRoot(ROOT, fp) && path.resolve(fp) !== path.resolve(ROOT, "index.html")) {
        sendText(res, 403, "Forbidden");
        return;
    }

    fs.readFile(fp, (err, data) => {
        if (err) {
            if ([".png", ".jpg", ".jpeg", ".webp", ".ico", ".svg"].includes(ext)) {
                const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3" opacity="0.3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>`;
                res.writeHead(200, { "Content-Type": "image/svg+xml" });
                res.end(svg);
                return;
            }

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

function streamDownload(req, res, fileInfo) {
    const ext = path.extname(fileInfo.fileName).toLowerCase();
    const headers = {
        "Content-Type": MIMES[ext] || "application/octet-stream",
        "Content-Length": fileInfo.size,
        "Content-Disposition": contentDisposition(fileInfo.fileName),
        "Cache-Control": "private, max-age=0, must-revalidate",
        "Access-Control-Allow-Origin": "*",
        "X-Content-Type-Options": "nosniff",
    };

    if (req.method === "HEAD") {
        res.writeHead(200, headers);
        res.end();
        return;
    }

    securityHeaders(res);
    res.writeHead(200, headers);
    const stream = fs.createReadStream(fileInfo.absPath);
    stream.on("error", () => {
        if (!res.headersSent) sendText(res, 500, "Failed to read file");
        else res.destroy();
    });
    req.on("close", () => stream.destroy());
    stream.pipe(res);
}

const server = http.createServer(async (req, res) => {
    const start = Date.now();
    let pathname;
    let url;

    if (!checkGlobalRateLimit(req)) {
        sendJSON(res, 429, { error: "Too many requests. Please slow down.", code: "RATE_LIMITED" });
        return;
    }

    try {
        url = new URL(req.url, `http://localhost:${PORT}`);
        pathname = decodeURIComponent(url.pathname);
    } catch {
        sendText(res, 400, "Bad Request");
        return;
    }

    if (req.method === "OPTIONS") {
        res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
            "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "86400",
        });
        res.end();
        return;
    }

    const isAuthEndpoint = pathname.startsWith("/api/auth/");
    if (req.method !== "GET" && req.method !== "HEAD" && !(isAuthEndpoint && req.method === "POST")) {
        sendText(res, 405, "Method Not Allowed");
        return;
    }

    const blocked = pathname === "/.env" || pathname.startsWith("/lib/") || pathname.startsWith("/data/") || pathname.startsWith("/node_modules/");
    if (blocked) {
        sendText(res, 403, "Forbidden");
        log(req.method, 403, pathname);
        return;
    }

    // ═══════════════════════════════════════════════════════
    // AUTH ENDPOINTS
    // ═══════════════════════════════════════════════════════

    // GET /api/auth/status → { enabled, authenticated, user?, expiresIn? }
    if (pathname === "/api/auth/status") {
        const enabled = authService.isAuthEnabled();
        if (!enabled) {
            sendJSON(res, 200, { enabled: false, authenticated: true });
            log("GET", 200, pathname, `disabled · ${Date.now() - start}ms`);
            return;
        }
        const session = authService.verifySession(req);
        sendJSON(res, 200, {
            enabled: true,
            authenticated: session.ok,
            user: session.ok ? session.user : null,
            reason: session.ok ? null : session.reason,
        });
        log("GET", 200, pathname, `auth:${session.ok} · ${Date.now() - start}ms`);
        return;
    }

    // POST /api/auth/login
    if (pathname === "/api/auth/login" && req.method === "POST") {
        if (!authService.isAuthEnabled()) {
            sendJSON(res, 403, { error: "Authentication is disabled", code: "AUTH_DISABLED" });
            log("POST", 403, pathname);
            return;
        }
        let body;
        try { body = await readJsonBody(req); }
        catch { sendJSON(res, 400, { error: "Invalid body", code: "BAD_BODY" }); return; }

        const { username, password } = body || {};
        if (!username || !password) {
            sendJSON(res, 400, { error: "Missing credentials", code: "MISSING_FIELDS" });
            return;
        }

        const result = await authService.login(PROJECT_ROOT, username, password);
        if (!result.ok) {
            const status = result.reason === "LOCKED_OUT" ? 429 : 401;
            sendJSON(res, status, {
                error: result.reason === "LOCKED_OUT"
                    ? "Too many failed attempts. Please try again later."
                    : "Invalid username or password.",
                code: result.reason,
                retryAfterMs: result.retryAfterMs,
            });
            log("POST", status, pathname, `${username} · ${result.reason}`);
            return;
        }

        const cookie = authService.makeSessionCookieHeader(
            result.token, result.ttlSec, isSecureRequest(req)
        );
        sendJSON(res, 200, {
            ok: true,
            user: result.user,
            expiresIn: result.ttlSec,
        }, { "Set-Cookie": cookie });
        log("POST", 200, pathname, `login:${username}`);
        return;
    }

    // POST /api/auth/logout
    if (pathname === "/api/auth/logout" && req.method === "POST") {
        const cookie = authService.makeClearCookieHeader();
        sendJSON(res, 200, { ok: true }, { "Set-Cookie": cookie });
        log("POST", 200, pathname);
        return;
    }

    // ═══════════════════════════════════════════════════════
    // AUTH GATE — protects RELEASE_PVM routes
    // ═══════════════════════════════════════════════════════
    if (authService.pathRequiresAuth(pathname, PROJECT_ROOT)) {
        const session = authService.verifySession(req);
        if (!session.ok) {
            sendJSON(res, 401, {
                error: "Authentication required to access release resources.",
                code: "AUTH_REQUIRED",
                reason: session.reason,
            });
            log(req.method, 401, pathname, `blocked · ${session.reason}`);
            return;
        }
        // Sliding session: renew cookie on activity
        const renewed = authService.renewSession(session.user);
        res.setHeader("Set-Cookie", authService.makeSessionCookieHeader(
            renewed.token, renewed.ttlSec, isSecureRequest(req)
        ));
    }

    try {
        if (pathname === "/__health" || pathname === "/api/health") {
            const peek = filesService.peekRootSync(PROJECT_ROOT);
            sendJSON(res, 200, {
                status: peek.configured && peek.exists && peek.isDirectory ? "ok" : "degraded",
                service: "CloudAvid File Portal",
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
                filesRootConfigured: peek.configured,
                filesRootReady: Boolean(peek.exists && peek.isDirectory),
            });
            log("GET", 200, pathname, `${Date.now() - start}ms`);
            return;
        }

        if (pathname === "/api/categories") {
            const categories = await filesService.listCategories(PROJECT_ROOT);
            sendJSON(res, 200, categories);
            log("GET", 200, pathname, `${categories.length} categories · ${Date.now() - start}ms`);
            return;
        }

        if (pathname === "/api/releases") {
            const limit = url.searchParams.get("limit");
            const osFilter = url.searchParams.get("os");
            const result = await filesService.listLatestReleases(PROJECT_ROOT, limit, osFilter);
            sendJSON(res, 200, result);
            log("GET", 200, pathname, `os:${osFilter || 'all'} | count:${result.items ? result.items.length : 0} · ${Date.now() - start}ms`);
            return;
        }

        if (pathname === "/api/search") {
            const q = url.searchParams.get("q") || "";
            const limit = url.searchParams.get("limit");
            const data = await filesService.searchEntries(PROJECT_ROOT, q, { limit });
            sendJSON(res, 200, data);
            log("GET", 200, pathname, `${data.results.length} · ${Date.now() - start}ms`);
            return;
        }

        if (pathname === "/api/files" || pathname.startsWith("/api/files/")) {
            const rel = pathname === "/api/files"
                ? (url.searchParams.get("path") || "")
                : relFromPrefix(pathname, "/api/files");
            const entries = await filesService.listPath(PROJECT_ROOT, rel);
            sendJSON(res, 200, entries);
            log("GET", 200, pathname, `${entries.length} items · ${Date.now() - start}ms`);
            return;
        }

        if (pathname === "/api/download" || pathname.startsWith("/api/download/")) {
            const rel = pathname === "/api/download"
                ? (url.searchParams.get("path") || "")
                : relFromPrefix(pathname, "/api/download");
            const fileInfo = await filesService.getDownloadTarget(PROJECT_ROOT, rel);
            streamDownload(req, res, fileInfo);
            log(req.method, 200, pathname, `${fileInfo.fileName} · ${Date.now() - start}ms`);
            return;
        }

        if (
            pathname === "/" ||
            pathname === "/index.html" ||
            pathname === "/browse" ||
            pathname.startsWith("/browse/")
        ) {
            const ext = path.extname(pathname).toLowerCase();
            if (ext && MIMES[ext] && ext !== ".html") {
                serveStatic(pathname, res);
                log("GET", 200, pathname, `static · ${Date.now() - start}ms`);
                return;
            }
            serveSPA(res);
            log("GET", 200, pathname, `SPA · ${Date.now() - start}ms`);
            return;
        }

        serveStatic(pathname, res);
        log("GET", 200, pathname, `asset · ${Date.now() - start}ms`);
    } catch (err) {
        const status = err.httpStatus || 500;
        sendServiceError(res, err);
        log(req.method, status, pathname, `${err.code || err.message} · ${Date.now() - start}ms`);
    }
});

server.listen(PORT, HOST, () => {
    const peek = filesService.peekRootSync(PROJECT_ROOT);
    const rootState = !peek.configured
        ? `${c.yellow}FILES_ROOT is not set${c.reset}`
        : !peek.exists
            ? `${c.yellow}FILES_ROOT path was not found${c.reset}`
            : !peek.isDirectory
                ? `${c.yellow}FILES_ROOT is not a directory${c.reset}`
                : `${c.green}FILES_ROOT is configured${c.reset}`;

    console.log(`
${c.cyan}${c.bold}
  ╔══════════════════════════════════════════════════╗
  ║     CloudAvid File Portal — File API Server      ║
  ╚══════════════════════════════════════════════════╝${c.reset}

  ${c.green}➜${c.reset}  Local:       ${c.bold}http://localhost:${PORT}/${c.reset}
  ${c.green}➜${c.reset}  Health:      http://localhost:${PORT}/api/health
  ${c.green}➜${c.reset}  Categories:  http://localhost:${PORT}/api/categories
  ${c.green}➜${c.reset}  Files:       http://localhost:${PORT}/api/files/<category>
  ${c.green}➜${c.reset}  Download:    http://localhost:${PORT}/api/download/<category>/<file>
  ${c.green}➜${c.reset}  Search:      http://localhost:${PORT}/api/search?q=
  ${c.green}➜${c.reset}  Releases:    http://localhost:${PORT}/api/releases

  ${rootState}
  ${c.dim}Set FILES_ROOT in .env — no filesystem paths are hardcoded.${c.reset}
  ${c.dim}Press Ctrl+C to stop${c.reset}
`);
});

process.on("SIGINT", () => {
    console.log(`\n${c.yellow}Shutting down file portal…${c.reset}`);
    server.close(() => process.exit(0));
});
