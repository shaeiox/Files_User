/**
 * @file lib/http-utils.js
 * @brief Core HTTP response formatters and request parsers.
 */
'use strict';

const TRUSTED_PROXIES = (process.env.TRUSTED_PROXIES || "127.0.0.1,::1,::ffff:127.0.0.1")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function isIpTrusted(ip) {
  if (!ip) return false;
  const addr = String(ip).replace(/^::ffff:/, "");
  return TRUSTED_PROXIES.includes(addr) || TRUSTED_PROXIES.includes(String(ip));
}

function getClientIp(req) {
  const socketIp = req.socket && req.socket.remoteAddress;
  const realIp = req.headers && (req.headers["x-real-ip"] || req.headers["X-Real-IP"]);
  const forwarded = req.headers && (req.headers["x-forwarded-for"] || req.headers["X-Forwarded-For"]);

  if (forwarded && isIpTrusted(socketIp)) {
    const parts = String(forwarded)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    // Proxies append (nginx $proxy_add_x_forwarded_for), so the left entries are
    // whatever the client sent: take the rightmost hop that is not a trusted proxy.
    const hop = parts.reverse().find((p) => !isIpTrusted(p)) || parts[parts.length - 1];
    if (hop) return hop.replace(/^::ffff:/, "");
  }
  if (realIp && isIpTrusted(socketIp)) {
    return String(realIp).replace(/^::ffff:/, "");
  }
  if (socketIp) {
    return String(socketIp).replace(/^::ffff:/, "");
  }
  return "0.0.0.0";
}

function applyCors(res, req) {
  const origin = req.headers && (req.headers.origin || req.headers.Origin);
  if (!origin) return;

  if (ALLOWED_ORIGINS.length === 0) {
    return;
  }

  if (ALLOWED_ORIGINS.includes("*")) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Vary", "Origin");
    return;
  }

  if (ALLOWED_ORIGINS.includes(String(origin))) {
    res.setHeader("Access-Control-Allow-Origin", String(origin));
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
}

function isSecureRequest(req) {
  const socketIp = req.socket && req.socket.remoteAddress;
  const proto = req.headers && (req.headers["x-forwarded-proto"] || req.headers["X-Forwarded-Proto"]);
  if (proto && isIpTrusted(socketIp)) {
    return String(proto).toLowerCase() === "https";
  }
  return !!(req.socket && req.socket.encrypted);
}

function securityHeaders(res, req) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "accelerometer=(), camera=(), geolocation=(), microphone=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'"
  );
  if (req && isSecureRequest(req)) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
}

function sendJSON(res, req, status, data, headers = {}) {
  const body = JSON.stringify(data, null, 0);
  applyCors(res, req);
  securityHeaders(res, req);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(body);
}

function sendText(res, req, status, text, contentType = "text/plain; charset=utf-8") {
  applyCors(res, req);
  securityHeaders(res, req);
  res.writeHead(status, {
    "Content-Type": contentType,
  });
  res.end(text);
}

function sendServiceError(res, req, err) {
  const status = err && err.httpStatus ? err.httpStatus : 500;
  // Only service errors (httpStatus set) carry client-safe text; anything else
  // (EACCES with an absolute path, a ReferenceError) stays in the server log.
  const payload = err && err.httpStatus
    ? { error: err.message || "Unexpected error", code: err.code || "INTERNAL" }
    : { error: "Unexpected error", code: "INTERNAL" };
  sendJSON(res, req, status, payload);
}

function readJsonBody(req, maxBytes = 8192) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        req.destroy();
        return reject(new Error("Payload too large"));
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8").trim();
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

module.exports = {
  sendJSON,
  sendText,
  sendServiceError,
  readJsonBody,
  isSecureRequest,
  securityHeaders,
  applyCors,
  getClientIp,
  isIpTrusted,
};