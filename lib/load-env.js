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

/* ─── Public API ─── */
module.exports = { loadEnv };