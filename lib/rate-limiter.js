/**
 * @file lib/rate-limiter.js
 * @brief In-memory IP-based rate limiting to prevent DoS attacks.
 */
'use strict';

const ipRequestCounts = new Map();
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60 * 1000); // 1 minute
const RATE_LIMIT_MAX_REQ = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 120); // max requests per minute
const RATE_LIMIT_MAX_IPS = Number(process.env.RATE_LIMIT_MAX_IPS || 10000);

function getKey(req) {
    try {
        const httpUtils = require("./http-utils");
        return httpUtils.getClientIp(req);
    } catch {
        const forwarded = req.headers && (req.headers["x-forwarded-for"] || req.headers["X-Forwarded-For"]);
        if (forwarded) return String(forwarded).split(",")[0].trim();
        if (req.socket && req.socket.remoteAddress) return String(req.socket.remoteAddress).replace(/^::ffff:/, "");
        return "unknown";
    }
}

function evictIfNeeded(now) {
    if (ipRequestCounts.size <= RATE_LIMIT_MAX_IPS) return;
    let oldestKey = null;
    let oldest = Infinity;
    for (const [k, v] of ipRequestCounts.entries()) {
        const t = v.resetTime || now;
        if (t < oldest) {
            oldest = t;
            oldestKey = k;
            if (oldest <= now) break;
        }
    }
    if (oldestKey) ipRequestCounts.delete(oldestKey);
}

function checkLimit(req) {
    const ip = getKey(req);
    const now = Date.now();
    const record = ipRequestCounts.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

    if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + RATE_LIMIT_WINDOW_MS;
    } else {
        record.count += 1;
    }
    ipRequestCounts.set(ip, record);
    evictIfNeeded(now);
    return record.count <= RATE_LIMIT_MAX_REQ;
}

// Cleanup interval to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of ipRequestCounts.entries()) {
        if (now > record.resetTime) ipRequestCounts.delete(ip);
    }
}, RATE_LIMIT_WINDOW_MS).unref(); // housekeeping must not keep the process (or a test run) alive

module.exports = { checkLimit };