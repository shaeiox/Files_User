/**
 * @file lib/state-store.js
 * @brief Portal-owned security state shared by every process using one
 *        PORTAL_DATA_DIR: logout revocations, failed sign-ins, rate-limit counts.
 *
 * @description
 * <PORTAL_DATA_DIR>/portal-state.sqlite (WAL, busy timeout), opened lazily and
 * re-opened after a failure. Every function throws when the store cannot be
 * used; callers decide how to fail (sessions and sign-in fail closed, rate
 * limiting falls back to per-process counts). It holds no password, hash,
 * token or secret: session ids, lower-cased usernames, client addresses,
 * counters and expiry times only. Expired rows are purged every 5 minutes.
 *
 * Under `node --test` the store is in memory, per test process, so suites never
 * share state through the checkout's data directory. See ADR-013.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { dataDir } = require('./load-env');
const settings = require('./settings');

const FILE_NAME = 'portal-state.sqlite';
const BUSY_TIMEOUT_MS = 2000;
const PURGE_INTERVAL_MS = 5 * 60 * 1000;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS revoked_sessions (
    sid TEXT PRIMARY KEY,
    until INTEGER NOT NULL            -- epoch seconds: every token of the session has expired by then
);
CREATE TABLE IF NOT EXISTS failed_logins (
    username_key TEXT PRIMARY KEY,    -- lower-cased username
    attempts INTEGER NOT NULL,
    locked_until INTEGER NOT NULL,    -- epoch ms, 0 = not locked
    last_seen INTEGER NOT NULL        -- epoch ms
);
CREATE TABLE IF NOT EXISTS rate_buckets (
    client TEXT NOT NULL,
    window_start INTEGER NOT NULL,    -- epoch ms, aligned to RATE_LIMIT_WINDOW_MS
    count INTEGER NOT NULL,
    PRIMARY KEY (client, window_start)
);`;

/** @type {DatabaseSync|null} */
let db = null;
let stmts = null;

function filePath() {
    return settings.raw('NODE_TEST_CONTEXT') ? ':memory:' : path.join(dataDir(), FILE_NAME);
}

function open() {
    if (db) return stmts;
    const file = filePath();
    if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
    const conn = new DatabaseSync(file);
    try {
        conn.exec(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS};`);
        if (file !== ':memory:') conn.exec('PRAGMA journal_mode = WAL;');
        conn.exec(SCHEMA);
        stmts = {
            revoke: conn.prepare('INSERT INTO revoked_sessions (sid, until) VALUES (?, ?) ON CONFLICT(sid) DO UPDATE SET until = MAX(until, excluded.until)'),
            isRevoked: conn.prepare('SELECT 1 FROM revoked_sessions WHERE sid = ? AND until >= ?'),
            getFailed: conn.prepare('SELECT attempts, locked_until AS lockedUntil, last_seen AS lastSeen FROM failed_logins WHERE username_key = ?'),
            putFailed: conn.prepare('INSERT INTO failed_logins (username_key, attempts, locked_until, last_seen) VALUES (?, ?, ?, ?) ' +
                'ON CONFLICT(username_key) DO UPDATE SET attempts = excluded.attempts, locked_until = excluded.locked_until, last_seen = excluded.last_seen'),
            clearFailed: conn.prepare('DELETE FROM failed_logins WHERE username_key = ?'),
            addRequests: conn.prepare('INSERT INTO rate_buckets (client, window_start, count) VALUES (?, ?, ?) ' +
                'ON CONFLICT(client, window_start) DO UPDATE SET count = count + excluded.count RETURNING count'),
            purgeRevoked: conn.prepare('DELETE FROM revoked_sessions WHERE until < ?'),
            purgeLocked: conn.prepare('DELETE FROM failed_logins WHERE locked_until > 0 AND locked_until < ?'),
            purgeIdle: conn.prepare('DELETE FROM failed_logins WHERE locked_until = 0 AND last_seen < ?'),
            purgeBuckets: conn.prepare('DELETE FROM rate_buckets WHERE window_start < ?'),
            countFailed: conn.prepare('SELECT COUNT(*) AS n FROM failed_logins'),
            // Evict unlocked entries first, oldest first: flooding junk usernames
            // must never push out (and so unlock) an account that is locked out.
            evictFailed: conn.prepare('DELETE FROM failed_logins WHERE username_key IN (' +
                'SELECT username_key FROM failed_logins ORDER BY (locked_until > ?) ASC, last_seen ASC LIMIT ?)'),
        };
        db = conn;
        return stmts;
    } catch (err) {
        try { conn.close(); } catch { /* already unusable */ }
        throw err;
    }
}

/** Runs fn with the statements; a failure drops the connection so the next call re-opens. */
function use(fn) {
    try {
        return fn(open());
    } catch (err) {
        close();
        throw err;
    }
}

/** Runs fn inside one write transaction (read-modify-write across processes). */
function transaction(fn) {
    return use((s) => {
        db.exec('BEGIN IMMEDIATE');
        try {
            const out = fn(s);
            db.exec('COMMIT');
            return out;
        } catch (err) {
            try { db.exec('ROLLBACK'); } catch { /* connection lost */ }
            throw err;
        }
    });
}

function close() {
    if (db) { try { db.close(); } catch { /* ignore */ } }
    db = null;
    stmts = null;
}

/* ─── Logout revocations ─── */

/** Marks a session id revoked until `untilSec` (epoch seconds). */
function revokeSession(sid, untilSec) {
    use((s) => s.revoke.run(String(sid), untilSec));
}

/** True when the session id was revoked and has not yet expired. */
function isSessionRevoked(sid, nowSec = Math.floor(Date.now() / 1000)) {
    return use((s) => !!s.isRevoked.get(String(sid), nowSec));
}

/* ─── Failed sign-ins ─── */

/** @returns {{attempts:number, lockedUntil:number, lastSeen:number}|null} */
function getFailedLogin(key) {
    return use((s) => {
        const row = s.getFailed.get(key);
        return row ? { attempts: Number(row.attempts), lockedUntil: Number(row.lockedUntil), lastSeen: Number(row.lastSeen) } : null;
    });
}

/**
 * Counts one failed sign-in for `key` atomically and locks it at `maxAttempts`.
 * @returns {{attempts:number, lockedUntil:number, newlyLocked:boolean}}
 */
function recordFailedLogin(key, maxAttempts, lockoutMs, now = Date.now()) {
    return transaction((s) => {
        const row = s.getFailed.get(key);
        const prevLocked = row ? Number(row.lockedUntil) : 0;
        // An expired lock, or an unlocked count idle for AUTH_FAILED_IDLE_MS,
        // starts a fresh count (as the per-process tracker did).
        const expired = row && prevLocked && prevLocked <= now;
        const idle = row && !prevLocked && now - Number(row.lastSeen) > settings.get('AUTH_FAILED_IDLE_MS');
        const attempts = (row && !expired && !idle ? Number(row.attempts) : 0) + 1;
        let lockedUntil = prevLocked > now ? prevLocked : 0;
        let newlyLocked = false;
        if (attempts >= maxAttempts) {
            newlyLocked = !(prevLocked > now);
            lockedUntil = now + lockoutMs;
        }
        s.putFailed.run(key, attempts, lockedUntil, now);
        return { attempts, lockedUntil, newlyLocked };
    });
}

function clearFailedLogin(key) {
    use((s) => s.clearFailed.run(key));
}

/* ─── Rate limiting ─── */

/** Adds `n` requests to the shared bucket and returns the bucket's total. */
function addRequests(client, windowStart, n) {
    return use((s) => Number(s.addRequests.get(String(client), windowStart, n).count));
}

/* ─── Housekeeping ─── */

/** Deletes expired rows and caps the failed-login table. */
function purge(now = Date.now()) {
    use((s) => {
        s.purgeRevoked.run(Math.floor(now / 1000));
        s.purgeLocked.run(now);
        s.purgeIdle.run(now - settings.get('AUTH_FAILED_IDLE_MS'));
        s.purgeBuckets.run(now - 2 * settings.get('RATE_LIMIT_WINDOW_MS'));
        const max = settings.get('AUTH_MAX_FAILED_ENTRIES');
        const n = Number(s.countFailed.get().n);
        if (n > max) s.evictFailed.run(now, n - max);
    });
}

setInterval(() => {
    try { purge(); } catch { /* retried next interval; callers already see store errors */ }
}, PURGE_INTERVAL_MS).unref();

module.exports = {
    FILE_NAME,
    revokeSession, isSessionRevoked,
    getFailedLogin, recordFailedLogin, clearFailedLogin,
    addRequests,
    purge, close,
};
