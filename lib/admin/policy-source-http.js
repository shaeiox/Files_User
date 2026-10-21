/**
 * @file lib/admin/policy-source-http.js
 * @brief Policy source over the admin's HTTP integration contract v1 (isolate-app-roots).
 *
 * The portal reads the admin's users, policies, grants, navbar and settings from
 * `GET <ADMIN_API_URL>/api/v1/integration/portal/snapshot`, authenticated by the
 * service token. Nothing about the admin's host, filesystem or schema is assumed.
 *
 * Contract values are mapped back to the exact row shape the SQLite source
 * returns, so lib/admin-db.js validates and builds both identically - the
 * transport can never change an access decision. The one difference: users carry
 * a `credential_stamp` instead of a password hash (sign-in is verified by the
 * admin, `verifyCredentials`).
 */
'use strict';

/** Newest contract version this portal understands; a newer one is refused (fail closed). */
const KNOWN_CONTRACT = 1;

const SNAPSHOT_PATH = '/api/v1/integration/portal/snapshot';
const VERIFY_PATH = '/api/v1/integration/portal/credentials/verify';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * Why `raw` cannot be ADMIN_API_URL, or null. https anywhere; plain http only to
 * loopback, so the token never crosses a network in clear text. An origin only.
 */
function urlProblem(raw) {
    let url;
    try { url = new URL(raw); } catch { return 'ADMIN_API_URL must be an absolute URL (e.g. https://admin.example.internal).'; }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return 'ADMIN_API_URL must be http(s).';
    if (url.protocol === 'http:' && !LOOPBACK_HOSTS.has(url.hostname)) {
        return 'ADMIN_API_URL must use https unless the admin is on this host (127.0.0.1, ::1, localhost).';
    }
    if ((url.pathname !== '/' && url.pathname !== '') || url.search || url.hash || url.username || url.password) {
        return 'ADMIN_API_URL must be an origin only (no path, query, fragment or credentials).';
    }
    return null;
}

const origin = (raw) => new URL(raw).origin;

const flag = (v) => (v === true ? 1 : v === false ? 0 : v);

/**
 * Contract v1 document -> SQLite-shaped rows (see lib/admin/policy-source-sqlite.js).
 * Throws on a document that is not contract v1 at all; individual bad values are
 * passed through for the builder to mark invalid (fail closed per row).
 */
function toRows(doc) {
    if (!doc || typeof doc !== 'object') throw new Error('admin contract: body is not a JSON object');
    if (!Number.isSafeInteger(doc.contract) || doc.contract < 1) throw new Error('admin contract: no contract version');
    if (doc.contract > KNOWN_CONTRACT) {
        throw new Error(`admin contract v${doc.contract} is newer than this portal understands (v${KNOWN_CONTRACT})`);
    }
    for (const key of ['users', 'policies', 'userGrants', 'groupMembers', 'groupGrants', 'nav']) {
        if (!Array.isArray(doc[key])) throw new Error(`admin contract: "${key}" is not a list`);
    }
    const auth = doc.auth && typeof doc.auth === 'object' ? doc.auth : {};

    const settings = new Map();
    const put = (key, value) => { if (value !== null && value !== undefined) settings.set(key, value); };
    put('volume_id', doc.volumeId);
    put('portal_root_client_path', doc.publishedRoot);
    put('release_client_path', doc.releaseClientPath);
    for (const [field, key] of [['sessionMinutes', 'portal.auth_session_minutes'],
        ['maxFailedAttempts', 'portal.max_failed_attempts'], ['lockoutMinutes', 'portal.lockout_minutes']]) {
        put(key, auth[field] === null || auth[field] === undefined ? null : String(auth[field]));
    }

    return {
        users: doc.users.map((u) => ({
            id: u.id, username: u.username, role: u.role, status: u.status,
            locked_until: u.lockedUntil === undefined ? null : u.lockedUntil,
            credential_stamp: u.credentialStamp,
        })),
        revocations: doc.users.filter((u) => u.sessionsRevokedAt !== null && u.sessionsRevokedAt !== undefined)
            .map((u) => ({ target_id: u.id, at: u.sessionsRevokedAt })),
        policies: doc.policies.map((p) => ({
            file_id: p.fileId, client_path: p.clientPath, is_directory: flag(p.isDirectory),
            access_mode: p.accessMode, is_published: flag(p.isPublished), is_locked: flag(p.isLocked),
            available_from: p.availableFrom === undefined ? null : p.availableFrom,
            available_until: p.availableUntil === undefined ? null : p.availableUntil,
            default_level: p.defaultLevel === null ? undefined : p.defaultLevel,
        })),
        permissions: doc.userGrants.map((g) => ({ file_id: g.fileId, user_id: g.userId, permission: g.permission, level: g.level === null ? undefined : g.level })),
        groupMembers: doc.groupMembers.map((m) => ({ group_id: m.groupId, user_id: m.userId })),
        groupPermissions: doc.groupGrants.map((g) => ({ file_id: g.fileId, group_id: g.groupId, permission: g.permission, level: g.level })),
        navFolders: doc.nav.map((n) => ({ client_path: n.clientPath, label: n.label, hide_from_home: flag(n.hideFromHome) })),
        settings,
    };
}

/**
 * One snapshot request. `etag` makes it conditional.
 * @returns {Promise<{notModified:true} | {notModified:false, etag:string|null, rows:object}>}
 * @throws on a network error, a timeout, a redirect, any status but 200/304, or a bad document.
 */
async function fetchSnapshot({ url, token, etag, timeoutMs }) {
    const res = await fetch(origin(url) + SNAPSHOT_PATH, {
        redirect: 'error',
        signal: AbortSignal.timeout(timeoutMs),
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(etag ? { 'If-None-Match': etag } : {}) },
    });
    if (res.status === 304) return { notModified: true };
    if (res.status !== 200) {
        await res.body?.cancel();
        throw new Error(`admin snapshot answered HTTP ${res.status}`);
    }
    const doc = await res.json();
    return { notModified: false, etag: res.headers.get('etag'), rows: toRows(doc) };
}

/**
 * Checks a sign-in with the admin. Resolves `{userId, credentialStamp}` or null
 * (wrong credentials); throws when the admin cannot answer (caller: SERVER_ERROR).
 */
async function verifyCredentials({ url, token, timeoutMs, username, password, clientIp }) {
    const res = await fetch(origin(url) + VERIFY_PATH, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(clientIp ? { 'X-Portal-Client-IP': String(clientIp) } : {}),
        },
        body: JSON.stringify({ username, password }),
    });
    if (res.status === 401) { await res.body?.cancel(); return null; }
    if (res.status !== 200) {
        await res.body?.cancel();
        throw new Error(`admin credential check answered HTTP ${res.status}`);
    }
    const body = await res.json();
    if (!body || !Number.isSafeInteger(body.userId) || typeof body.credentialStamp !== 'string') {
        throw new Error('admin credential check: malformed answer');
    }
    return { userId: body.userId, credentialStamp: body.credentialStamp };
}

module.exports = { fetchSnapshot, verifyCredentials, toRows, urlProblem, KNOWN_CONTRACT };
