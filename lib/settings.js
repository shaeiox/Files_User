/**
 * @file lib/settings.js
 * @brief One declaration per configuration variable: type, default, range.
 *
 * @description
 * `get(name)` parses the live environment on every call (tests and the admin
 * tunables change it at runtime), and falls back to the default on a value that
 * does not parse. `problems()` checks every declaration at once; server.js
 * refuses to start on any problem, so in production `get()` never sees a bad
 * value. Secret values are never quoted in a problem message.
 */
'use strict';

const { productionPathProblems, isolationProblems } = require('./load-env');

const TRUE = new Set(['true', '1', 'yes', 'on']);
const FALSE = new Set(['false', '0', 'no', 'off']);
const DAY_MS = 24 * 60 * 60 * 1000;

/** @typedef {{type:'int'|'bool'|'string'|'list', default:any, min?:number, max?:number, secret?:boolean}} Def */

/** @type {Object<string, Def>} */
const DEFS = {
    NODE_ENV: { type: 'string', default: '' },
    NODE_TEST_CONTEXT: { type: 'string', default: '' }, // set by `node --test`, not by operators
    PORT: { type: 'int', default: 4000, min: 1, max: 65535 },
    FILES_ROOT: { type: 'string', default: '' },
    RELEASE_PVM: { type: 'string', default: '' },
    PORTAL_DATA_DIR: { type: 'string', default: '' },
    LOG_FILE: { type: 'string', default: '' },

    AUTH_ENABLED: { type: 'bool', default: false },
    AUTH_JWT_SECRET: { type: 'string', default: '', secret: true },
    AUTH_SESSION_MINUTES: { type: 'int', default: 30, min: 1, max: 10080 },
    AUTH_MAX_FAILED_ATTEMPTS: { type: 'int', default: 5, min: 1, max: 1000 },
    AUTH_LOCKOUT_MINUTES: { type: 'int', default: 15, min: 1, max: 10080 },
    AUTH_USERS_FILE: { type: 'string', default: '' },
    AUTH_BASIC_ALLOW_HTTP: { type: 'bool', default: false },
    AUTH_MAX_FAILED_ENTRIES: { type: 'int', default: 5000, min: 100, max: 10000000 },
    AUTH_FAILED_IDLE_MS: { type: 'int', default: DAY_MS, min: 60000, max: 31 * DAY_MS },

    ADMIN_INTEGRATION_ENABLED: { type: 'bool', default: false },
    ADMIN_DB_PATH: { type: 'string', default: '' }, // deprecated: the SQLite source (isolate-app-roots)
    ADMIN_API_URL: { type: 'string', default: '' },
    ADMIN_SERVICE_TOKEN: { type: 'string', default: '', secret: true },
    FILES_ROOT_ADMIN_PATH: { type: 'string', default: '' }, // admin folder FILES_ROOT stands for (optional)
    ADMIN_SYNC_TTL_MS: { type: 'int', default: 5000, min: 1000, max: 60000 },
    ADMIN_STORAGE_ROOT: { type: 'string', default: '' }, // obsolete: ignored with a warning

    TRUSTED_PROXIES: { type: 'list', default: ['127.0.0.1', '::1', '::ffff:127.0.0.1'] },
    CORS_ALLOWED_ORIGINS: { type: 'list', default: [] },
    RATE_LIMIT_WINDOW_MS: { type: 'int', default: 60000, min: 1000, max: 3600000 },
    RATE_LIMIT_MAX_REQUESTS: { type: 'int', default: 120, min: 1, max: 1000000 },
    RATE_LIMIT_MAX_IPS: { type: 'int', default: 10000, min: 100, max: 10000000 },
    HASH_MAX_BYTES: { type: 'int', default: 512 * 1024 * 1024, min: 1, max: Number.MAX_SAFE_INTEGER },

    CONTENT_INDEX_TTL_MS: { type: 'int', default: 30000, min: 0, max: 600000 },
    CONTENT_INDEX_MAX_DIRS: { type: 'int', default: 20000, min: 100, max: 1000000 },
};

const MIN_SECRET_LENGTH = 32;

function isSecret(name) {
    return Boolean(DEFS[name] && DEFS[name].secret) || /(_SECRET|_PASSWORD|_TOKEN)$/.test(name);
}

/** The raw value as set ('' when unset). Secrets are not trimmed. */
function raw(name, env = process.env) {
    const v = env[name];
    if (v === undefined || v === null) return '';
    return isSecret(name) ? String(v) : String(v).trim();
}

/** @returns {{value:any, problem:?string}} */
function parse(name, env = process.env) {
    const def = DEFS[name];
    if (!def) throw new Error('Unknown setting: ' + name);
    const text = raw(name, env);
    if (text === '') return { value: def.default, problem: null };
    const got = isSecret(name) ? '' : ` (got "${text}")`;

    if (def.type === 'int') {
        const n = Number(text);
        if (!/^-?\d+$/.test(text) || !Number.isSafeInteger(n) || n < def.min || n > def.max) {
            return { value: def.default, problem: `${name} must be a whole number from ${def.min} to ${def.max}${got}.` };
        }
        return { value: n, problem: null };
    }
    if (def.type === 'bool') {
        const v = text.toLowerCase();
        if (TRUE.has(v)) return { value: true, problem: null };
        if (FALSE.has(v)) return { value: false, problem: null };
        return { value: def.default, problem: `${name} must be one of true/false, 1/0, yes/no, on/off${got}.` };
    }
    if (def.type === 'list') {
        return { value: text.split(',').map((s) => s.trim()).filter(Boolean), problem: null };
    }
    return { value: text, problem: null };
}

/** The parsed value, or the default when the variable is unset or does not parse. */
function get(name, env = process.env) {
    return parse(name, env).value;
}

/**
 * Every configuration problem, each naming its variable. Empty means usable.
 * Covers the declarations, the signing secret and the production path rules
 * (lib/load-env productionPathProblems). Admin database checks stay in
 * lib/admin-db validateStartup.
 * @returns {string[]}
 */
function problems(env = process.env) {
    const out = [];
    for (const name of Object.keys(DEFS)) {
        const { problem } = parse(name, env);
        if (problem) out.push(problem);
    }
    if (get('AUTH_ENABLED', env) && raw('AUTH_JWT_SECRET', env).length < MIN_SECRET_LENGTH) {
        out.push(`AUTH_JWT_SECRET must be at least ${MIN_SECRET_LENGTH} characters when AUTH_ENABLED is on.`);
    }
    out.push(...productionPathProblems(env));
    // Root isolation refuses in production; server.js warns about it otherwise.
    if (raw('NODE_ENV', env) === 'production') out.push(...isolationProblems(env));
    return out;
}

module.exports = { DEFS, MIN_SECRET_LENGTH, get, raw, parse, problems, isSecret };
