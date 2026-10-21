/**
 * @file lib/logger.js
 * @brief Terminal logging utility with ANSI colors, plus a JSON-lines trace
 *        file read by the Admin Files Manager (LOG_FILE, default <PORTAL_DATA_DIR>/portal.log).
 */
'use strict';

const fs = require('fs');
const { AsyncLocalStorage } = require('async_hooks');
const path = require('path');
const { dataDir } = require('./load-env');
const settings = require('./settings');

const c = {
    reset: "\x1b[0m", dim: "\x1b[2m", green: "\x1b[32m",
    yellow: "\x1b[33m", cyan: "\x1b[36m", red: "\x1b[31m", bold: "\x1b[1m"
};

const LOG_MAX_BYTES = 10 * 1024 * 1024;

/** The trace file's absolute path, or null when LOG_FILE=off. Read by GET /api/ops/log. */
function traceFile() {
    const logFile = settings.raw('LOG_FILE');
    if (logFile === 'off') return null;
    return logFile ? path.resolve(__dirname, '..', logFile) : path.join(dataDir(), 'portal.log');
}

// ponytail: rolls over to .1 only at startup; add a write-time size check if one run outgrows 10 MiB.
function openTrace() {
    // `node --test` sets NODE_TEST_CONTEXT: the suite never writes the real trace.
    if (settings.raw('NODE_TEST_CONTEXT')) return null;
    const file = traceFile();
    if (!file) return null;
    try {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        try {
            if (fs.statSync(file).size > LOG_MAX_BYTES) fs.renameSync(file, file + '.1');
        } catch { /* no trace yet */ }
        const stream = fs.createWriteStream(file, { flags: 'a' });
        stream.on('error', () => { /* tracing must never take the portal down */ });
        return stream;
    } catch {
        return null;
    }
}

const trace = openTrace();
// eslint-disable-next-line no-control-regex -- strips ANSI escapes on purpose
const stripAnsi = (s) => String(s).replace(/\x1b\[[0-9;]*m/g, '');
// Client input (URL path, username) must not forge log lines or inject terminal
// control sequences: drop C0/C1 controls, keeping the row intact.
// eslint-disable-next-line no-control-regex -- drops control characters on purpose
const sanitize = (s) => stripAnsi(s).replace(/[\x00-\x1f\x7f]/g, ' ');

function write(entry) {
    if (trace) trace.write(JSON.stringify({ t: new Date().toISOString(), ...entry }) + '\n');
}

/**
 * One request's access record. While a request runs (runRequest), logAccess()
 * only notes the route's detail; the single access line is written when the
 * response closes (finishRequest), with its request id, final status and duration.
 */
const requestStore = new AsyncLocalStorage();

function writeAccess(method, status, url, extra, fields = {}) {
    const color = status >= 500 ? c.red : status >= 400 ? c.yellow : status >= 300 ? c.cyan : c.green;
    const time = new Date().toISOString().slice(11, 19);
    const safeUrl = sanitize(url);
    const safeExtra = sanitize(extra);
    const id = fields.requestId ? ` ${c.dim}[${String(fields.requestId).slice(0, 8)}]${c.reset}` : '';
    console.log(`${c.dim}${time}${c.reset}${id} ${c.bold}${method.padEnd(6)}${c.reset} ${color}${status}${c.reset} ${safeUrl} ${c.dim}${safeExtra}${c.reset}`);
    write({ level: status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info', method, status, url: safeUrl, msg: safeExtra, ...fields });
}

function logAccess(method, status, url, extra = "") {
    const record = requestStore.getStore();
    if (record && !record.done) {
        record.url = url;
        if (extra) record.notes.push(String(extra));
        return;
    }
    writeAccess(method, status, url, extra);
}

/** Runs fn with `record` ({id, method, url, start, notes}) as the current request. */
function runRequest(record, fn) {
    return requestStore.run(record, fn);
}

/** Writes the request's one access line. Returns the duration in ms. */
function finishRequest(record, status, extra = {}) {
    if (record.done) return 0;
    record.done = true;
    const durationMs = Date.now() - record.start;
    writeAccess(record.method, status, record.url, record.notes.join(' · '), { requestId: record.id, durationMs, ...extra });
    return durationMs;
}

function info(msg) { console.log(`${c.cyan}[INFO]${c.reset} ${sanitize(msg)}`); write({ level: 'info', msg: stripAnsi(msg) }); }
function warn(msg) { console.log(`${c.yellow}[WARN]${c.reset} ${sanitize(msg)}`); write({ level: 'warn', msg: stripAnsi(msg) }); }
function error(msg) { console.log(`${c.red}[ERROR]${c.reset} ${sanitize(msg)}`); write({ level: 'error', msg: stripAnsi(msg) }); }

module.exports = { c, logAccess, runRequest, finishRequest, info, warn, error, traceFile };
