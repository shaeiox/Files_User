/**
 * @file lib/logger.js
 * @brief Terminal logging utility with ANSI colors, plus a JSON-lines trace
 *        file read by the Admin Files Manager (LOG_FILE, default <PORTAL_DATA_DIR>/portal.log).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { dataDir } = require('./load-env');

const c = {
    reset: "\x1b[0m", dim: "\x1b[2m", green: "\x1b[32m",
    yellow: "\x1b[33m", cyan: "\x1b[36m", red: "\x1b[31m", bold: "\x1b[1m"
};

const LOG_MAX_BYTES = 10 * 1024 * 1024;

// ponytail: rolls over to .1 only at startup; add a write-time size check if one run outgrows 10 MiB.
function openTrace() {
    // `node --test` sets NODE_TEST_CONTEXT: the suite never writes the real trace.
    if (process.env.NODE_TEST_CONTEXT || process.env.LOG_FILE === 'off') return null;
    const file = process.env.LOG_FILE
        ? path.resolve(__dirname, '..', process.env.LOG_FILE)
        : path.join(dataDir(), 'portal.log');
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
const stripAnsi = (s) => String(s).replace(/\x1b\[[0-9;]*m/g, '');

function write(entry) {
    if (trace) trace.write(JSON.stringify({ t: new Date().toISOString(), ...entry }) + '\n');
}

function logAccess(method, status, url, extra = "") {
    const color = status >= 500 ? c.red : status >= 400 ? c.yellow : status >= 300 ? c.cyan : c.green;
    const time = new Date().toISOString().slice(11, 19);
    console.log(`${c.dim}${time}${c.reset} ${c.bold}${method.padEnd(6)}${c.reset} ${color}${status}${c.reset} ${url} ${c.dim}${extra}${c.reset}`);
    write({ level: status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info', method, status, url, msg: stripAnsi(extra) });
}

function info(msg) { console.log(`${c.cyan}[INFO]${c.reset} ${msg}`); write({ level: 'info', msg: stripAnsi(msg) }); }
function warn(msg) { console.log(`${c.yellow}[WARN]${c.reset} ${msg}`); write({ level: 'warn', msg: stripAnsi(msg) }); }
function error(msg) { console.log(`${c.red}[ERROR]${c.reset} ${msg}`); write({ level: 'error', msg: stripAnsi(msg) }); }

module.exports = { c, logAccess, info, warn, error };
