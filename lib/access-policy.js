/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @file        lib/access-policy.js
 * @brief       Authorization gate over the admin file-access policies.
 *
 * @description
 * Turns the admin application's per-file policy data into a decision for a
 * single portal request. This is the ONE definition of the rule; every
 * file-serving route calls it with the resolved relative path.
 *
 * Semantics (docs/integration-admin-files-manager.md, decisions settled):
 *   - no policy row ............ public (never governed)
 *   - is_published === 0 ....... denied to everyone
 *   - outside available window . denied
 *   - is_locked ................ raises the floor to "authenticated"
 *   - access_mode public ....... no login needed
 *   - access_mode authenticated  any active user
 *   - access_mode restricted ... explicit `grant` row required (absence/deny = deny)
 *   - mapping impossible or DB unreadable -> deny (fail closed)
 *
 * In legacy mode (integration not configured) every path is allowed, keeping the
 * portal's existing public-serving behaviour.
 *
 * @version     1.0.0
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use strict';

const adminDb = require('./admin-db');

/** Requirement ranks; higher is stricter. */
const RANK = { public: 0, authenticated: 1, restricted: 2 };

/** Ranks an access mode; an unknown value is treated as the strictest. */
function rankOf(mode) {
    return Object.prototype.hasOwnProperty.call(RANK, mode) ? RANK[mode] : RANK.restricted;
}

/** True when a session carries an authenticated admin user id. */
function authenticatedUserId(session) {
    const user = session && session.user;
    return user && typeof user.id === 'number' ? user.id : null;
}

/**
 * Authorizes one portal-relative path for a session.
 *
 * @param {string} relPath   Path relative to FILES_ROOT ("" for the root).
 * @param {object} session   Result of authService.verifySession().
 * @returns {{allowed:boolean, challenge?:boolean, reason?:string}}
 *   `challenge` means the caller is anonymous and could succeed by logging in
 *   (401); otherwise a denial is final for this caller (403).
 */
function authorize(relPath, session) {
    if (!adminDb.isIntegrationEnabled()) return { allowed: true };

    const clientPath = adminDb.toAdminClientPath(relPath);
    if (clientPath == null) {
        return { allowed: false, reason: 'UNMAPPED_PATH' };
    }

    let snapshot;
    try {
        snapshot = adminDb.getSnapshot();
    } catch (err) {
        adminDb.logFault('policy snapshot unavailable', err);
        return { allowed: false, reason: 'POLICY_UNAVAILABLE' };
    }

    const policy = snapshot.policyByPath.get(adminDb.normalizeClientPath(clientPath));
    if (!policy) return { allowed: true };

    const now = Date.now();
    if (policy.availableFrom != null && now < policy.availableFrom) {
        return { allowed: false, reason: 'NOT_YET_AVAILABLE' };
    }
    if (policy.availableUntil != null && now > policy.availableUntil) {
        return { allowed: false, reason: 'NO_LONGER_AVAILABLE' };
    }

    // Decision 1: unpublished is denied to everyone.
    if (!policy.isPublished) return { allowed: false, reason: 'UNPUBLISHED' };

    // is_locked raises the floor; access_mode sets the base.
    const floor = policy.isLocked ? RANK.authenticated : RANK.public;
    const need = Math.max(floor, rankOf(policy.accessMode));
    if (need === RANK.public) return { allowed: true };

    const userId = authenticatedUserId(session);
    if (userId == null) return { allowed: false, challenge: true, reason: 'AUTH_REQUIRED' };

    if (policy.accessMode === 'restricted') {
        const perm = snapshot.grantByPair.get(policy.fileId + ':' + userId);
        return perm === 'grant'
            ? { allowed: true }
            : { allowed: false, reason: 'NO_GRANT' };
    }

    return { allowed: true };
}

/**
 * Filters listing/search results down to what the session may see.
 * Entries are expected to carry a `.path` (portal-relative).
 */
function filterVisible(entries, session) {
    if (!adminDb.isIntegrationEnabled()) return entries;
    if (!Array.isArray(entries)) return entries;
    return entries.filter((entry) => {
        if (!entry || typeof entry.path !== 'string') return true;
        return authorize(entry.path, session).allowed;
    });
}

/**
 * Builds the predicate files-service uses to exclude governed paths from
 * aggregate counts (see listCategories). Returns undefined in legacy mode so
 * files-service keeps its original all-inclusive walk.
 */
function visiblePredicate(session) {
    if (!adminDb.isIntegrationEnabled()) return undefined;
    return (relPath) => authorize(relPath, session).allowed;
}

module.exports = { authorize, filterVisible, visiblePredicate };
