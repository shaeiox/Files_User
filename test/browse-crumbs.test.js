/**
 * Breadcrumb contract (browse mobile/full-screen navigation).
 *
 * The root crumb ("Home") must take the user to the ROOT OF THE FILE TREE
 * (`ResourceService.browseHref("")` → `/browse/`), never to the site home
 * page: clicking it while in full-screen Browse previously ejected the user
 * out to "/" and re-rendered the home page. Same target as the tree pane
 * title (browse-tree.js `href="/browse/"`).
 */
'use strict';

const { test } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const JS = path.join(__dirname, '..', 'public', 'assets', 'js');
const browseJs = fs.readFileSync(path.join(JS, 'browse.js'), 'utf8');

/** Source of buildCrumbs(), up to the next top-level helper. */
function buildCrumbs() {
    const start = browseJs.indexOf('function buildCrumbs');
    assert.ok(start >= 0, 'buildCrumbs exists');
    const end = browseJs.indexOf('function escapeHtml', start);
    return browseJs.slice(start, end > start ? end : start + 2500);
}

test('breadcrumbs: the root crumb goes to the file root, never the site home', () => {
    const fn = buildCrumbs();
    // Root crumb targets the browse root via the shared href helper.
    assert.match(fn, /home\.href = ResourceService\.browseHref\(""\)/, 'root crumb → file root');
    assert.doesNotMatch(fn, /home\.href = "\/"/, 'root crumb must not point at the site home page');
    // Ancestor crumbs use the same helper, so no crumb can escape to "/".
    assert.match(fn, /link\.href = ResourceService\.browseHref\(acc\)/);
    assert.doesNotMatch(fn, /href\s*=\s*"\/"/, 'no crumb may hard-code the site home href');
});
