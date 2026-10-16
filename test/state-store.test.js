'use strict';

const test = require('node:test');
const assert = require('node:assert');

// Under `node --test` the store is in memory, per test process.
const store = require('../lib/state-store');

const MIN = 60 * 1000;

test('failed sign-ins count up and lock at the limit, once', () => {
    const now = Date.now();
    assert.deepStrictEqual(store.recordFailedLogin('alice', 3, 15 * MIN, now), { attempts: 1, lockedUntil: 0, newlyLocked: false });
    store.recordFailedLogin('alice', 3, 15 * MIN, now);
    const third = store.recordFailedLogin('alice', 3, 15 * MIN, now);
    assert.strictEqual(third.newlyLocked, true);
    assert.strictEqual(third.lockedUntil, now + 15 * MIN);
    // Further failures while locked extend the lock but are not a new lockout.
    assert.strictEqual(store.recordFailedLogin('alice', 3, 15 * MIN, now + 1).newlyLocked, false);
    assert.strictEqual(store.getFailedLogin('alice').attempts, 4);
    store.clearFailedLogin('alice');
    assert.strictEqual(store.getFailedLogin('alice'), null);
});

test('an expired lock or an idle count starts a fresh count', () => {
    const now = Date.now();
    for (let i = 0; i < 3; i++) store.recordFailedLogin('bob', 3, MIN, now);
    assert.strictEqual(store.recordFailedLogin('bob', 3, MIN, now + 2 * MIN).attempts, 1, 'after the lock expired');

    store.recordFailedLogin('carol', 5, MIN, now);
    const dayLater = now + 25 * 60 * MIN; // AUTH_FAILED_IDLE_MS defaults to 24 h
    assert.strictEqual(store.recordFailedLogin('carol', 5, MIN, dayLater).attempts, 1, 'after the idle time');
});

test('revoked sessions stay revoked until they expire', () => {
    const nowSec = Math.floor(Date.now() / 1000);
    store.revokeSession('sid-1', nowSec + 60);
    assert.strictEqual(store.isSessionRevoked('sid-1', nowSec), true);
    assert.strictEqual(store.isSessionRevoked('sid-1', nowSec + 61), false, 'expired');
    assert.strictEqual(store.isSessionRevoked('sid-2', nowSec), false);
    // A later revocation of the same session never shortens it.
    store.revokeSession('sid-1', nowSec + 10);
    assert.strictEqual(store.isSessionRevoked('sid-1', nowSec + 30), true);
});

test('request counts add up per client and window', () => {
    assert.strictEqual(store.addRequests('10.0.0.1', 60000, 5), 5);
    assert.strictEqual(store.addRequests('10.0.0.1', 60000, 7), 12);
    assert.strictEqual(store.addRequests('10.0.0.1', 120000, 1), 1, 'next window');
    assert.strictEqual(store.addRequests('10.0.0.2', 60000, 1), 1, 'other client');
});

test('purge removes rows that expired and keeps live ones', () => {
    const now = Date.now();
    const nowSec = Math.floor(now / 1000);
    store.revokeSession('old', nowSec - 11 * 60);
    store.revokeSession('live', nowSec + 60);
    store.recordFailedLogin('expired-lock', 1, MIN, now - 20 * MIN);
    store.recordFailedLogin('live-lock', 1, 15 * MIN, now);
    store.addRequests('1.1.1.1', now - 10 * MIN, 3);
    store.purge(now);
    assert.strictEqual(store.isSessionRevoked('old', nowSec - 12 * 60), false);
    assert.strictEqual(store.isSessionRevoked('live', nowSec), true);
    assert.strictEqual(store.getFailedLogin('expired-lock'), null);
    assert.ok(store.getFailedLogin('live-lock'));
    assert.strictEqual(store.addRequests('1.1.1.1', now - 10 * MIN, 1), 1, 'old bucket was purged');
});
