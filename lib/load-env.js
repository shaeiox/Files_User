/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @file        envloader.js
 * @module      utils/envloader
 * @brief       Environment variable loader with graceful dotenv fallback.
 *
 * @description
 * Loads key=value pairs from a .env file at the project root into
 * process.env. Prefers the official `dotenv` package if installed;
 * otherwise falls back to a minimal built-in parser so the app can
 * run in stripped-down environments without npm dependencies.
 *
 * Behavior:
 *   - Existing process.env values are NEVER overwritten (env-first policy).
 *   - Lines beginning with # are treated as comments.
 *   - Values may be optionally quoted with single or double quotes.
 *   - Blank lines are ignored.
 *
 * Consumed By:
 *   - server.js  → called before any service is required.
 *
 * Provides Values For:
 *   - files-service.js → FILES_ROOT, RELEASE_PVM
 *   - Any module that reads process.env.*
 *
 * @author      Shaiya
 * @version     1.1.0
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * @brief   Parses a raw .env file body and populates process.env.
 * @param   {string} text  Full text of the .env file.
 * @returns {void}
 *
 * @note    Uses env-first policy: variables already present in process.env
 *          (e.g. set by the OS or CI/CD) take precedence over .env values.
 */
function parseEnvText(text) {
    for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        const eq = line.indexOf('=');
        if (eq <= 0) continue;

        const key = line.slice(0, eq).trim();
        let value = line.slice(eq + 1).trim();

        // Strip matching outer quotes.
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }

        if (process.env[key] == null || process.env[key] === '') {
            process.env[key] = value;
        }
    }
}

/**
 * @brief   Loads the .env file from the given project root.
 * @param   {string} projectRoot  Absolute path to the project root directory.
 * @returns {void}
 *
 * @details
 * Tries the official `dotenv` package first. If it is not installed
 * (MODULE_NOT_FOUND), silently switches to the built-in parser.
 * Missing .env files are treated as a no-op (no error thrown).
 */
function loadEnv(projectRoot) {
    const envPath = path.join(projectRoot, '.env');

    // Preferred path: use dotenv if available.
    try {
        require('dotenv').config({ path: envPath });
        return;
    } catch {
        /* dotenv not installed — fall through to manual parser */
    }

    // Fallback: minimal built-in parser.
    try {
        if (fs.existsSync(envPath)) {
            parseEnvText(fs.readFileSync(envPath, 'utf8'));
        }
    } catch (err) {
        console.warn(`[envloader] Could not read .env: ${err.message}`);
    }
}

/* ─── Data directory and production paths ─── */

/** Project root: base for relative path values outside production. */
const PROJECT_ROOT = path.resolve(__dirname, '..');

/** Path variables that must be absolute when NODE_ENV=production. */
const PATH_VARS = ['PORTAL_DATA_DIR', 'FILES_ROOT', 'ADMIN_DB_PATH', 'LOG_FILE', 'AUTH_USERS_FILE', 'RELEASE_PVM'];

/**
 * Base directory of the portal's own data files (users.json, portal.log):
 * PORTAL_DATA_DIR, else <project>/data. Never the working directory.
 */
function dataDir(source = process.env) {
    const raw = String(source.PORTAL_DATA_DIR || '').trim();
    return raw ? path.resolve(PROJECT_ROOT, raw) : path.join(PROJECT_ROOT, 'data');
}

/**
 * With NODE_ENV=production a release directory must hold no state, so every
 * path variable must be absolute and PORTAL_DATA_DIR must be set.
 * @returns {string[]} Problems; empty means usable.
 */
function productionPathProblems(source = process.env) {
    if (String(source.NODE_ENV || '').trim() !== 'production') return [];
    const problems = [];
    if (!String(source.PORTAL_DATA_DIR || '').trim()) {
        problems.push('PORTAL_DATA_DIR is required when NODE_ENV=production (the data files must not live in the release directory).');
    }
    // With the admin integration on, sign-in reads the admin database only and
    // users.json is never opened: its path cannot misplace any state.
    const integration = ['true', '1', 'yes', 'on'].includes(String(source.ADMIN_INTEGRATION_ENABLED || '').trim().toLowerCase());
    for (const name of PATH_VARS) {
        if (name === 'AUTH_USERS_FILE' && integration) continue;
        const value = String(source[name] || '').trim();
        if (value && !(name === 'LOG_FILE' && value === 'off') && !path.isAbsolute(value)) {
            problems.push(`${name} must be an absolute path when NODE_ENV=production (got "${value}").`);
        }
    }
    return problems;
}

/* ─── Root isolation (isolate-app-roots) ─── */

/** realpath when the path exists, so a symlink cannot hide an overlap; else the resolved spelling. */
function realOrResolved(p) {
    try { return fs.realpathSync.native(p); } catch { return path.resolve(p); }
}

/** True when `child` is `parent` or inside it (case-folded on win32). */
function isWithin(parent, child) {
    const fold = (p) => (process.platform === 'win32' ? p.toLowerCase() : p);
    const rel = path.relative(fold(parent), fold(child));
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/**
 * The code folder holds no state, and FILES_ROOT overlaps neither the code nor
 * the state: otherwise the portal serves its own source and state database.
 * Judges only absolute values (relative ones are reported by
 * productionPathProblems in production and resolve under the code folder
 * otherwise, which is what the default `<project>/data` is for in development).
 * The caller decides whether these refuse (production) or warn.
 *
 * @param {NodeJS.ProcessEnv} [source]
 * @param {string} [codeDir]
 * @returns {string[]}
 */
function isolationProblems(source = process.env, codeDir = PROJECT_ROOT) {
    const problems = [];
    const code = realOrResolved(codeDir);
    const absolute = (v) => {
        const t = String(v || '').trim();
        return t && path.isAbsolute(t) ? realOrResolved(t) : null;
    };
    const integration = ['true', '1', 'yes', 'on'].includes(String(source.ADMIN_INTEGRATION_ENABLED || '').trim().toLowerCase());
    const logFile = String(source.LOG_FILE || '').trim();
    const state = [
        ['PORTAL_DATA_DIR', absolute(source.PORTAL_DATA_DIR)],
        ['LOG_FILE', logFile && logFile !== 'off' && path.isAbsolute(logFile) ? realOrResolved(path.dirname(logFile)) : null],
        ['AUTH_USERS_FILE', !integration && absolute(source.AUTH_USERS_FILE) ? path.dirname(absolute(source.AUTH_USERS_FILE)) : null],
    ];
    for (const [name, dir] of state) {
        if (dir && isWithin(code, dir)) {
            problems.push(`${name} (${dir}) is inside the portal's code folder (${code}); keep state outside the release.`);
        }
    }
    const root = absolute(source.FILES_ROOT);
    if (root) {
        for (const [name, dir] of [['the portal code folder', code], ['PORTAL_DATA_DIR', state[0][1]]]) {
            if (dir && (isWithin(root, dir) || isWithin(dir, root))) {
                problems.push(`FILES_ROOT (${root}) overlaps ${name} (${dir}); the portal would serve it. Use a dedicated folder.`);
            }
        }
    }
    return problems;
}

/* ─── Public API ─── */
module.exports = { loadEnv, dataDir, productionPathProblems, isolationProblems, PROJECT_ROOT };