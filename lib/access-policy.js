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
 * Per policy, for one caller:
 *   invalid row / unpublished / outside window / caller denied ... hidden
 *   anonymous:  is_locked -> locked, public -> allow, otherwise -> hidden
 *   logged in:  public, authenticated -> allow
 *               restricted -> allow only with a `grant` on THIS policy's file
 *
 * A policy applies to its path and every descendant. The decision for a path
 * combines the policies on the path and on each parent folder:
 * hidden > locked > allow. No applicable policy -> allow (ungoverned).
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

const ALLOW = Object.freeze({ result: 'allow', origin: null });
const HIDDEN = Object.freeze({ result: 'hidden', origin: null });
const UNAVAILABLE = Object.freeze({ result: 'unavailable', origin: null });

/** The caller's admin user id, or null when anonymous. */
function callerId(session) {
    const user = session && session.ok && session.user;
    return user && typeof user.id === 'number' ? user.id : null;
}

/** Evaluates one policy row for one caller: 'allow' | 'locked' | 'hidden'. */
function evaluate(policy, grants, userId, now) {
    if (!policy.valid || !policy.isPublished) return 'hidden';
    if (policy.availableFrom != null && now < policy.availableFrom) return 'hidden';
    if (policy.availableUntil != null && now > policy.availableUntil) return 'hidden';

    const permission = userId == null ? undefined : grants.get(policy.fileId)?.get(userId);
    if (permission === 'deny') return 'hidden';

    if (userId == null) {
        if (policy.isLocked) return 'locked';
        return policy.accessMode === 'public' ? 'allow' : 'hidden';
    }
    if (policy.accessMode === 'restricted') return permission === 'grant' ? 'allow' : 'hidden';
    return 'allow'; // public, authenticated
}

/** Admin client paths that govern `relPath`: the root, each parent folder, then the path itself. */
function governingPaths(relPath) {
    const parts = adminDb.clientPathOf(relPath).split('/').filter(Boolean);
    const out = ['/'];
    for (let i = 1; i <= parts.length; i++) out.push('/' + parts.slice(0, i).join('/'));
    return out;
}

/**
 * Decides access to one portal-relative path for a session.
 *
 * @param {string} relPath  Path relative to FILES_ROOT ("" for the root).
 * @param {object} session  Result of authService.verifySession().
 * @returns {{result:'allow'|'locked'|'hidden'|'unavailable', origin:'self'|'inherited'|null}}
 *   `unavailable` means the admin data could not be read (callers answer 503).
 */
function decide(relPath, session) {
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
    const paths = governingPaths(relPath);
    let lockedOrigin = null; // null | 'inherited' | 'self'

    for (let i = 0; i < paths.length; i++) {
        const own = i === paths.length - 1;
        for (const policy of snapshot.policyByPath.get(adminDb.normalizeClientPath(paths[i])) || []) {
            const outcome = evaluate(policy, snapshot.grants, userId, now);
            if (outcome === 'hidden') return HIDDEN;
            if (outcome === 'locked' && lockedOrigin !== 'inherited') lockedOrigin = own ? 'self' : 'inherited';
        }
    }
    return lockedOrigin ? { result: 'locked', origin: lockedOrigin } : ALLOW;
}

/**
 * Shapes a listing/search entry for the caller: unchanged when allowed, reduced
 * to name/path/type + `locked: true` when locked by its own policy, otherwise
 * null (omit it). Identity in legacy mode.
 */
function projectEntry(entry, decision) {
    if (decision.result === 'allow') return entry;
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
