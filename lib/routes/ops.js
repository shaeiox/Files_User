/**
 * @file lib/routes/ops.js
 * @brief Operational endpoints: liveness, readiness and metrics; and the two
 *        service endpoints the Admin Files Manager calls (isolate-app-roots).
 *
 * Answered before the rate limiter and before any session work, so probes are
 * never throttled and never touch auth. Probe bodies carry fixed identifiers
 * only: no paths, error text, users or versions.
 *
 * Service endpoints (`/api/ops/log`, `/api/ops/access-check`) exist only when
 * ADMIN_SERVICE_TOKEN is set (otherwise they are unknown paths), and require it
 * as `Authorization: Bearer`, compared in constant time. Ten failures per minute
 * from one address answer 429 even with the right token. The admin then needs
 * neither this portal's disk (its log) nor a copy of its rules (its decisions).
 */
'use strict';

const crypto = require("crypto");
const fs = require("fs/promises");
const { sendJSON, isIpTrusted, readJsonBody, getClientIp } = require("../http-utils");
const filesService = require("../files-service");
const adminDb = require("../admin-db");
const accessPolicy = require("../access-policy");
const logger = require("../logger");
const settings = require("../settings");
const metrics = require("../metrics");

const LOG_TAIL_BYTES = 512 * 1024;
const MAX_LOG_ENTRIES = 1000;
const TOKEN_FAILURES_PER_MINUTE = 10;
const tokenFailures = new Map(); // ip -> { count, resetAt }

const serviceToken = () => settings.raw("ADMIN_SERVICE_TOKEN");

/**
 * Checks the service token; answers 401/429 itself and returns false on refusal.
 * sha256 on both sides: equal lengths for timingSafeEqual, and no length leak.
 */
function serviceAuthorized(req, res) {
    const now = Date.now();
    const ip = getClientIp(req) || "unknown";
    let bucket = tokenFailures.get(ip);
    if (bucket && bucket.resetAt <= now) { tokenFailures.delete(ip); bucket = undefined; }
    if (bucket && bucket.count >= TOKEN_FAILURES_PER_MINUTE) {
        res.setHeader("Retry-After", String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
        sendJSON(res, req, 429, { error: "Too many requests", code: "RATE_LIMITED" });
        return false;
    }
    const header = String(req.headers.authorization || "");
    const presented = /^Bearer /i.test(header) ? header.slice(7).trim() : "";
    const digest = (v) => crypto.createHash("sha256").update(v).digest();
    if (presented && crypto.timingSafeEqual(digest(presented), digest(serviceToken()))) return true;
    if (!bucket) { bucket = { count: 0, resetAt: now + 60000 }; tokenFailures.set(ip, bucket); }
    bucket.count += 1;
    if (tokenFailures.size > 10000) tokenFailures.clear();
    logger.warn(`[ops] rejected service token from ${ip}`);
    sendJSON(res, req, 401, { error: "Unauthorized", code: "UNAUTHORIZED" });
    return false;
}

/** Newest-first JSON entries from the end of the trace file (the last 512 KiB). */
async function readLogTail(file, n) {
    let handle;
    try {
        handle = await fs.open(file, "r");
    } catch (err) {
        if (err.code === "ENOENT") return [];
        throw err;
    }
    try {
        const { size } = await handle.stat();
        const length = Math.min(size, LOG_TAIL_BYTES);
        const buffer = Buffer.alloc(length);
        await handle.read(buffer, 0, length, size - length);
        const lines = buffer.toString("utf8").split("\n");
        if (size > length) lines.shift(); // cut mid-line
        const entries = [];
        for (let i = lines.length - 1; i >= 0 && entries.length < n; i--) {
            try { entries.push(JSON.parse(lines[i])); } catch { /* blank or partial line */ }
        }
        return entries;
    } finally {
        await handle.close();
    }
}

const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

async function filesRootCheck(projectRoot) {
    try {
        await fs.readdir(await filesService.getRoot(projectRoot));
        return "ok";
    } catch {
        return "fail";
    }
}

function adminPolicyCheck() {
    if (!adminDb.isIntegrationEnabled()) return "skipped";
    try {
        adminDb.getSnapshot();
        return "ok";
    } catch {
        return "fail";
    }
}

/**
 * Metrics are for the host's own scraper: loopback, or the trusted proxy's own
 * socket without a forwarded client. Anyone else is answered as for an unknown
 * path (the route does not match), so the endpoint is not revealed.
 */
function metricsAllowed(req) {
    const ip = req.socket && req.socket.remoteAddress;
    if (req.headers["x-forwarded-for"] !== undefined || req.headers["x-real-ip"] !== undefined) return false;
    return LOOPBACK.has(ip) || isIpTrusted(ip);
}

/** @type {import('./index').Route[]} */
module.exports = [
    {
        name: "ops-log", pattern: "/api/ops/log", gate: "none",
        match: (p, req) => p === "/api/ops/log" && req.method === "GET" && serviceToken() !== "",
        async handler({ req, res, url }) {
            if (!serviceAuthorized(req, res)) return;
            const n = Math.min(Math.max(Number.parseInt(url.searchParams.get("limit"), 10) || 200, 1), MAX_LOG_ENTRIES);
            const file = logger.traceFile();
            if (!file) return sendJSON(res, req, 200, { available: false, entries: [] });
            try {
                return sendJSON(res, req, 200, { available: true, entries: await readLogTail(file, n) });
            } catch {
                return sendJSON(res, req, 500, { error: "The trace could not be read", code: "LOG_UNREADABLE" });
            }
        },
    },
    {
        name: "ops-access-check", pattern: "/api/ops/access-check", gate: "none",
        match: (p, req) => p === "/api/ops/access-check" && req.method === "POST" && serviceToken() !== "",
        async handler({ req, res }) {
            if (!serviceAuthorized(req, res)) return;
            const body = await readJsonBody(req).catch(() => null);
            const clientPath = body && body.clientPath;
            const userId = body ? body.userId : undefined;
            if (typeof clientPath !== "string" || !clientPath.startsWith("/") || clientPath.length > 4096 ||
                !(userId === null || Number.isSafeInteger(userId))) {
                return sendJSON(res, req, 400, { error: "Body must be {clientPath:\"/…\", userId:number|null}", code: "BAD_REQUEST" });
            }
            // Legacy mode governs nothing: everything is downloadable.
            if (!adminDb.isIntegrationEnabled()) return sendJSON(res, req, 200, { outcome: "download", policies: [] });
            let answer;
            try {
                answer = accessPolicy.explain(clientPath, userId);
            } catch (err) {
                adminDb.logFault("access-check snapshot", err);
                return sendJSON(res, req, 503, { error: "Policy unavailable", code: "POLICY_UNAVAILABLE" });
            }
            if (!answer) return sendJSON(res, req, 404, { error: "User not found", code: "USER_NOT_FOUND" });
            return sendJSON(res, req, 200, answer);
        },
    },
    {
        name: "livez", pattern: "/livez", gate: "none",
        match: (p, req) => p === "/livez" && (req.method === "GET" || req.method === "HEAD"),
        async handler({ req, res }) {
            return sendJSON(res, req, 200, { status: "ok" });
        },
    },
    {
        name: "readyz", pattern: "/readyz", gate: "none",
        match: (p, req) => p === "/readyz" && (req.method === "GET" || req.method === "HEAD"),
        async handler({ req, res, projectRoot }) {
            const checks = { filesRoot: await filesRootCheck(projectRoot), adminPolicy: adminPolicyCheck() };
            const ready = !Object.values(checks).includes("fail");
            return sendJSON(res, req, ready ? 200 : 503, { status: ready ? "ready" : "not_ready", checks });
        },
    },
    {
        name: "metrics", pattern: "/metrics", gate: "none",
        match: (p, req) => p === "/metrics" && req.method === "GET" && metricsAllowed(req),
        async handler({ res }) {
            const body = metrics.render();
            res.writeHead(200, {
                "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
                "Content-Length": Buffer.byteLength(body),
                "Cache-Control": "no-store",
            });
            return res.end(body);
        },
    },
];
