/**
 * @file lib/logger.js
 * @brief Terminal logging utility with ANSI colors.
 */
'use strict';

const c = {
    reset: "\x1b[0m", dim: "\x1b[2m", green: "\x1b[32m",
    yellow: "\x1b[33m", cyan: "\x1b[36m", red: "\x1b[31m", bold: "\x1b[1m"
};

function logAccess(method, status, url, extra = "") {
    const color = status >= 500 ? c.red : status >= 400 ? c.yellow : status >= 300 ? c.cyan : c.green;
    const time = new Date().toISOString().slice(11, 19);
    console.log(`${c.dim}${time}${c.reset} ${c.bold}${method.padEnd(6)}${c.reset} ${color}${status}${c.reset} ${url} ${c.dim}${extra}${c.reset}`);
}

function info(msg) { console.log(`${c.cyan}[INFO]${c.reset} ${msg}`); }
function warn(msg) { console.log(`${c.yellow}[WARN]${c.reset} ${msg}`); }
function error(msg) { console.log(`${c.red}[ERROR]${c.reset} ${msg}`); }

module.exports = { c, logAccess, info, warn, error };