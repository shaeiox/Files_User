/**
 * @file lib/metrics.js
 * @brief In-process counters and histograms, rendered as Prometheus text 0.0.4.
 *
 * @description
 * Labels are route templates and status classes only, never a request path,
 * file name or user. Each process exposes its own series; the scraper sums
 * them (several instances are scraped separately).
 */
'use strict';

const DURATION_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60, 300];

/** route -> statusClass -> count */
const requests = new Map();
/** route -> { buckets:number[], sum:number, count:number } */
const durations = new Map();
const counters = { loginFailures: 0, lockouts: 0 };
let activeDownloads = 0;

function observeRequest(route, status, durationMs) {
    const statusClass = `${Math.floor(status / 100)}xx`;
    const byClass = requests.get(route) || new Map();
    byClass.set(statusClass, (byClass.get(statusClass) || 0) + 1);
    requests.set(route, byClass);

    const seconds = durationMs / 1000;
    const h = durations.get(route) || { buckets: DURATION_BUCKETS.map(() => 0), sum: 0, count: 0 };
    DURATION_BUCKETS.forEach((le, i) => { if (seconds <= le) h.buckets[i] += 1; });
    h.sum += seconds;
    h.count += 1;
    durations.set(route, h);
}

const loginFailed = () => { counters.loginFailures += 1; };
const lockedOut = () => { counters.lockouts += 1; };

/** Counts one open download or archive stream until `stream` closes. */
function trackDownload(stream) {
    activeDownloads += 1;
    stream.once('close', () => { activeDownloads -= 1; });
}

const esc = (v) => String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');

function render() {
    const lines = [];
    const metric = (name, type, help) => lines.push(`# HELP ${name} ${help}`, `# TYPE ${name} ${type}`);

    metric('portal_http_requests_total', 'counter', 'HTTP requests by route template and status class.');
    for (const [route, byClass] of requests) {
        for (const [cls, n] of byClass) lines.push(`portal_http_requests_total{route="${esc(route)}",status_class="${cls}"} ${n}`);
    }

    metric('portal_http_request_duration_seconds', 'histogram', 'HTTP request duration by route template.');
    for (const [route, h] of durations) {
        const r = esc(route);
        DURATION_BUCKETS.forEach((le, i) => lines.push(`portal_http_request_duration_seconds_bucket{route="${r}",le="${le}"} ${h.buckets[i]}`));
        lines.push(`portal_http_request_duration_seconds_bucket{route="${r}",le="+Inf"} ${h.count}`);
        lines.push(`portal_http_request_duration_seconds_sum{route="${r}"} ${h.sum}`);
        lines.push(`portal_http_request_duration_seconds_count{route="${r}"} ${h.count}`);
    }

    metric('portal_auth_login_failures_total', 'counter', 'Failed sign-in attempts (modal and CLI).');
    lines.push(`portal_auth_login_failures_total ${counters.loginFailures}`);
    metric('portal_auth_lockouts_total', 'counter', 'Accounts locked out after too many failed sign-ins.');
    lines.push(`portal_auth_lockouts_total ${counters.lockouts}`);
    metric('portal_downloads_active', 'gauge', 'Download and archive streams currently open.');
    lines.push(`portal_downloads_active ${activeDownloads}`);

    let age = null;
    try { age = require('./admin-db').snapshotAgeSeconds(); } catch { age = null; }
    if (age !== null && age !== undefined) {
        metric('portal_admin_snapshot_age_seconds', 'gauge', 'Age of the admin policy snapshot in use.');
        lines.push(`portal_admin_snapshot_age_seconds ${age}`);
    }
    return lines.join('\n') + '\n';
}

module.exports = { observeRequest, loginFailed, lockedOut, trackDownload, render, DURATION_BUCKETS };
