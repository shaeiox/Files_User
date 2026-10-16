/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @file        lib/access-policy.js
 * @brief       Authorization over the admin file-access policies.
 *
 * @description
 * Turns the admin application's policy data into ONE decision per path and
 * caller. Every endpoint that exposes file contents or metadata uses it
 * (openspec/changes/enforce-admin-file-policies, specs/file-access-policy).
 *
 * Per policy, for one caller (a "level" is view < download):
 *   invalid row / unpublished / outside window / caller denied ... hidden
 *   anonymous:  is_locked -> locked, public -> default level, otherwise -> hidden
 *   logged in:  public, authenticated -> default level, raised by any grant
 *               restricted -> only the level granted to the caller or one of
 *               their groups on THIS policy's file; none -> hidden
 *
 * A policy applies to its path and every descendant. The decision for a path
 * combines the policies on the path and on each parent folder:
 * hidden > locked > the LOWEST level. No applicable policy -> download (ungoverned).
 * An endpoint asks for a level: listings need `view`, contents need `download`.
 * A visible path below the asked level is `forbidden` (403, it is no secret).
 *
 * `origin` is 'self' when a `locked` result comes only from the path's own
 * policy, 'inherited' when a parent folder is locked. Listings show only
 * self-locked entries; anything inside a locked folder stays out of view.
 *
 * In legacy mode (integration not configured) every path is allowed.
 * `role` never changes the outcome.
 *
 * @version     2.0.0
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use strict';

const adminDb = require('./admin-db');

const ALLOW = Object.freeze({ result: 'allow', origin: null, level: 'download' });
const FORBIDDEN = Object.freeze({ result: 'forbidden', origin: null });
const HIDDEN = Object.freeze({ result: 'hidden', origin: null });
const UNAVAILABLE = Object.freeze({ result: 'unavailable', origin: null });

/** The caller's admin user id, or null when anonymous. */
function callerId(session) {
    const user = session && session.ok && session.user;
    return user && typeof user.id === 'number' ? user.id : null;
}

/** A policy's default level rank; a row built without one meant full access. */
const defaultRank = (policy) => policy.defaultLevel || adminDb.LEVELS.length;

/**
 * Evaluates one policy row for one caller: 'hidden' | 'locked' | a level name.
 * `grants` is the snapshot's fileId -> userId -> rank map (adminDb.DENY for a deny).
 */
function evaluate(policy, grants, userId, now) {
    if (!policy.valid || !policy.isPublished) return 'hidden';
    if (policy.availableFrom != null && now < policy.availableFrom) return 'hidden';
    if (policy.availableUntil != null && now > policy.availableUntil) return 'hidden';

    const granted = userId == null ? undefined : grants.get(policy.fileId)?.get(userId);
    if (granted === adminDb.DENY) return 'hidden';

    if (userId == null) {
        if (policy.isLocked) return 'locked';
        return policy.accessMode === 'public' ? adminDb.LEVELS[defaultRank(policy) - 1] : 'hidden';
    }
    const base = policy.accessMode === 'restricted' ? 0 : defaultRank(policy);
    const rank = Math.max(base, granted || 0);
    return rank > 0 ? adminDb.LEVELS[rank - 1] : 'hidden';
}

/**
 * Admin client paths that govern `relPath`: the storage root, each parent folder
 * (including FILES_ROOT's own position and its ancestors), then the path itself.
 */
function governingPaths(relPath, position = '/') {
    const parts = adminDb.clientPathOf(relPath, position).split('/').filter(Boolean);
    const out = ['/'];
    for (let i = 1; i <= parts.length; i++) out.push('/' + parts.slice(0, i).join('/'));
    return out;
}

/**
 * Decides access to one portal-relative path for a session.
 *
 * @param {string} relPath  Path relative to FILES_ROOT ("" for the root).
 * @param {object} session  Result of authService.verifySession().
 * @param {string} [need]   Level the caller needs ('view' for listings, 'download' for contents).
 * @returns {{result:'allow'|'forbidden'|'locked'|'hidden'|'unavailable', origin:'self'|'inherited'|null, level?:string}}
 *   `unavailable` means the admin data could not be read (callers answer 503).
 */
function decide(relPath, session, need = 'view') {
    if (!adminDb.isIntegrationEnabled()) return ALLOW;

    let snapshot;
    try {
        snapshot = adminDb.getSnapshot();
    } catch (err) {
        adminDb.logFault('policy snapshot unavailable', err);
        return UNAVAILABLE;
    }

    const userId = callerId(session);
    const now = Date.now();
    const paths = governingPaths(relPath, snapshot.position);
    /** @type {'self'|'inherited'|null} */
    let lockedOrigin = null; // null | 'inherited' | 'self'
    let rank = adminDb.LEVELS.length; // ungoverned: download

    for (let i = 0; i < paths.length; i++) {
        const own = i === paths.length - 1;
        for (const policy of snapshot.policyByPath.get(adminDb.normalizeClientPath(paths[i])) || []) {
            const outcome = evaluate(policy, snapshot.grants, userId, now);
            if (outcome === 'hidden') return HIDDEN;
            if (outcome === 'locked') {
                if (lockedOrigin !== 'inherited') lockedOrigin = own ? 'self' : 'inherited';
            } else {
                rank = Math.min(rank, adminDb.levelRank(outcome));
            }
        }
    }
    if (lockedOrigin) return { result: 'locked', origin: lockedOrigin };
    if (rank < adminDb.levelRank(need)) return FORBIDDEN;
    return rank === adminDb.LEVELS.length ? ALLOW : { result: 'allow', origin: null, level: adminDb.LEVELS[rank - 1] };
}

/**
 * Shapes a listing/search entry for the caller: unchanged when allowed (marked
 * `viewOnly: true` when the caller may see but not download it), reduced to
 * name/path/type + `locked: true` when locked by its own policy, otherwise
 * null (omit it). Identity in legacy mode.
 */
function projectEntry(entry, decision) {
    if (decision.result === 'allow') return decision.level === 'view' ? { ...entry, viewOnly: true } : entry;
    if (decision.result === 'locked' && decision.origin === 'self') {
        return { name: entry.name, path: entry.path, type: entry.type, locked: true };
    }
    return null;
}

/**
 * Filters and shapes listing/search results for a session. Entries are
 * expected to carry a portal-relative `.path`; one without it is dropped
 * in integration mode (fail closed).
 */
function filterVisible(entries, session) {
    if (!adminDb.isIntegrationEnabled() || !Array.isArray(entries)) return entries;
    const out = [];
    for (const entry of entries) {
        if (!entry || typeof entry.path !== 'string') continue;
        const shaped = projectEntry(entry, decide(entry.path, session));
        if (shaped) out.push(shaped);
    }
    return out;
}

module.exports = { decide, projectEntry, filterVisible, evaluate, governingPaths };
