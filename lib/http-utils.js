/**
 * @file lib/http-utils.js
 * @brief Core HTTP response formatters and request parsers.
 */
'use strict';

function sendJSON(res, status, data, headers = {}) {
    const body = JSON.stringify(data, null, 0);
    res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body),
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "no-store",
        ...headers,
    });
    res.end(body);
}

function sendText(res, status, text, contentType = "text/plain; charset=utf-8") {
    res.writeHead(status, { "Content-Type": contentType, "Access-Control-Allow-Origin": "*" });
    res.end(text);
}

function sendServiceError(res, err) {
    sendJSON(res, err.httpStatus || 500, { error: err.message || "Unexpected error", code: err.code || "INTERNAL" });
}

function readJsonBody(req, maxBytes = 8192) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        req.on('data', (chunk) => {
            size += chunk.length;
            if (size > maxBytes) { req.destroy(); return reject(new Error('Payload too large')); }
            chunks.push(chunk);
        });
        req.on('end', () => {
            try {
                const raw = Buffer.concat(chunks).toString('utf8').trim();
                resolve(raw ? JSON.parse(raw) : {});
            } catch { reject(new Error('Invalid JSON body')); }
        });
        req.on('error', reject);
    });
}

function isSecureRequest(req) {
    return req.socket?.encrypted === true || String(req.headers['x-forwarded-proto'] || '').toLowerCase() === 'https';
}

function securityHeaders(res) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:;");
}

module.exports = { sendJSON, sendText, sendServiceError, readJsonBody, isSecureRequest, securityHeaders };