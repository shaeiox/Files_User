/**
 * @file lib/rate-limiter.js
 * @brief In-memory IP-based rate limiting to prevent DoS attacks.
 */
'use strict';

const ipRequestCounts = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQ = 120; // max requests per minute

function checkLimit(req) {
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

// Cleanup interval to prevent memory leaks
setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of ipRequestCounts.entries()) {
        if (now > record.resetTime) ipRequestCounts.delete(ip);
    }
}, RATE_LIMIT_WINDOW_MS);

module.exports = { checkLimit };