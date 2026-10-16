/**
 * @file lib/rate-limiter.js
 * @brief Per-client request limit, shared by every process using one
 *        PORTAL_DATA_DIR (lib/state-store.js rate_buckets).
 *
 * @description
 * Windows are aligned to RATE_LIMIT_WINDOW_MS so every process counts into the
 * same bucket. Each process counts locally and flushes its increments every
 * FLUSH_MS or FLUSH_EVERY requests, reading back the merged total; so the
 * shared limit can be overshot by at most FLUSH_EVERY requests per process per
 * window. If the store cannot be written, counting falls back to this process
 * alone and a warning is logged (availability over precision; see ADR-013).
 */
'use strict';

const settings = require("./settings");
const store = require("./state-store");

const RATE_LIMIT_WINDOW_MS = settings.get("RATE_LIMIT_WINDOW_MS");
const RATE_LIMIT_MAX_REQ = settings.get("RATE_LIMIT_MAX_REQUESTS");
const RATE_LIMIT_MAX_IPS = settings.get("RATE_LIMIT_MAX_IPS");
const FLUSH_MS = 1000;
const FLUSH_EVERY = 20;

/** client -> { windowStart, shared (merged total at the last flush), pending (not yet flushed) } */
const counts = new Map();
let warned = false;

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

function evictIfNeeded() {
    while (counts.size > RATE_LIMIT_MAX_IPS) {
        let oldestKey = null;
        let oldest = Infinity;
        for (const [k, v] of counts.entries()) {
            if (v.windowStart < oldest) { oldest = v.windowStart; oldestKey = k; }
        }
        if (oldestKey === null) break;
        flush(oldestKey, counts.get(oldestKey));
        counts.delete(oldestKey);
    }
}

/** Adds the record's pending requests to the shared bucket; keeps counting locally on failure. */
function flush(client, record) {
    if (!record.pending) return;
    try {
        record.shared = store.addRequests(client, record.windowStart, record.pending);
        record.pending = 0;
        warned = false;
    } catch (err) {
        // Per-process fallback: the pending count stays and keeps limiting here.
        if (!warned) require("./logger").warn(`[rate-limit] shared counter unavailable, limiting per process: ${err.message}`);
        warned = true;
    }
}

function checkLimit(req) {
    const client = getKey(req);
    const now = Date.now();
    const windowStart = now - (now % RATE_LIMIT_WINDOW_MS);
    let record = counts.get(client);
    if (!record || record.windowStart !== windowStart) {
        record = { windowStart, shared: 0, pending: 0, flushedAt: now };
        counts.set(client, record);
        evictIfNeeded();
    }
    record.pending += 1;
    if (record.pending >= FLUSH_EVERY || now - record.flushedAt >= FLUSH_MS) {
        record.flushedAt = now;
        flush(client, record);
    }
    return record.shared + record.pending <= RATE_LIMIT_MAX_REQ;
}

// Flush idle clients so other processes see these counts, and drop old windows.
setInterval(() => {
    const now = Date.now();
    for (const [client, record] of counts.entries()) {
        flush(client, record);
        record.flushedAt = now;
        if (now - record.windowStart >= RATE_LIMIT_WINDOW_MS && !record.pending) counts.delete(client);
    }
}, FLUSH_MS).unref(); // housekeeping must not keep the process (or a test run) alive

module.exports = { checkLimit, FLUSH_EVERY };
