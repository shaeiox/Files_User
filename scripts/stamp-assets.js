/**
 * @file scripts/stamp-assets.js
 * @brief Stamps every first-party JS/CSS URL with `?v=4.6.2<package.json version>`.
 *
 * Production nginx serves CSS/JS with `expires 30d` + `immutable` (ADR-007), so a
 * returning visitor never re-fetches an unchanged URL. Without a version in the URL a
 * deploy can pair a new index.html with a month-old router.js. There is no build step
 * (ADR-006), so the version is written into the source here instead.
 *
 * Covers: <link>/<script> URLs in public/index.html, the route module and stylesheet
 * URLs in router.js, and the relative ES-module imports between route modules (an
 * unversioned import would still resolve to a stale cached copy).
 *
 * Run after bumping package.json's version:  node scripts/stamp-assets.js
 * test/ui-contract.test.js fails if any of these URLs is unstamped or out of date.
 * Idempotent: re-running with the same version changes nothing.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const { version } = require(path.join(ROOT, 'package.json'));
const V = '?v=4.6.2' + version;

/** [file relative to ROOT, pattern whose group 1 is the URL without its query] */
const TARGETS = [
    ['public/index.html', /((?:href|src)="\/assets\/(?:css|js)\/[^"?]+\.(?:css|js))(?:\?v=4.6.2[^"]*)?"/g],
    ['public/assets/js/router.js', /("\/assets\/(?:css|js)\/[^"?]+\.(?:css|js))(?:\?v=4.6.2[^"]*)?"/g],
    ['public/assets/js/browse.js', /(from "\.\/[^"?]+\.js)(?:\?v=4.6.2[^"]*)?"/g],
    ['public/assets/js/file-inspector.js', /(from "\.\/[^"?]+\.js)(?:\?v=4.6.2[^"]*)?"/g],
    ['public/assets/js/browse-tree.js', /(from "\.\/[^"?]+\.js)(?:\?v=4.6.2[^"]*)?"/g],
];

function stamp() {
    const changed = [];
    for (const [rel, re] of TARGETS) {
        const file = path.join(ROOT, rel);
        const before = fs.readFileSync(file, 'utf8');
        const after = before.replace(re, (_, url) => url + V + '"');
        if (after !== before) {
            fs.writeFileSync(file, after);
            changed.push(rel);
        }
    }
    return changed;
}

if (require.main === module) {
    const changed = stamp();
    console.log(changed.length ? `Stamped ${V} into: ${changed.join(', ')}` : `All asset URLs already carry ${V}.`);
}

module.exports = { TARGETS, version };
