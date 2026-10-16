/**
 * @file lib/routes/ops.js
 * @brief Operational endpoints: liveness, readiness and metrics.
 *
 * Answered before the rate limiter and before any session work, so probes are
 * never throttled and never touch auth. Bodies carry fixed identifiers only:
 * no paths, error text, users or versions.
 */
'use strict';

const fs = require("fs/promises");
const { sendJSON, isIpTrusted } = require("../http-utils");
const filesService = require("../files-service");
const adminDb = require("../admin-db");
const metrics = require("../metrics");

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
