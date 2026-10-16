'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { PRE_SESSION, ROUTES } = require('../lib/routes');

/** URLs that serve governed content: whichever route answers them must gate it. */
const CONTENT_URLS = [
    '/api/files', '/api/files/docs/a.txt',
    '/api/download/docs/a.txt',
    '/api/hash/docs/a.txt',
    '/api/search',
    '/api/download-zip',
    '/api/releases',
    '/api/categories',
    '/api/nav',
    '/release9/latest', '/release8/latest',
];

const GET = { method: 'GET', headers: {} };
const answering = (pathname) => ROUTES.find((r) => r.match(pathname, GET));

/** Content URLs answered by a route that does not gate them (empty = all gated). */
function ungatedContentRoutes(routes) {
    return CONTENT_URLS
        .map((url) => ({ url, route: routes.find((r) => r.match(url, GET)) }))
        .filter(({ route }) => !route || !['policy', 'policy-aggregate'].includes(route.gate))
        .map(({ url, route }) => `${url} -> ${route ? route.name : '(no route)'}`);
}

test('every route declares a name, template, gate, matcher and handler', () => {
    for (const route of [...PRE_SESSION, ...ROUTES]) {
        assert.strictEqual(typeof route.name, 'string', JSON.stringify(route));
        assert.ok(route.pattern && !/\/(docs|a\.txt)/.test(route.pattern), route.name);
        assert.ok(['none', 'policy', 'policy-aggregate'].includes(route.gate), route.name);
        assert.strictEqual(typeof route.match, 'function', route.name);
        assert.strictEqual(typeof route.handler, 'function', route.name);
    }
    assert.strictEqual(new Set(ROUTES.map((r) => r.name)).size, ROUTES.length, 'names are unique');
});

test('every content URL is answered by a gated route', () => {
    assert.deepStrictEqual(ungatedContentRoutes(ROUTES), []);
});

test('the check fails when a content route loses its gate', () => {
    const tampered = ROUTES.map((r) => (r.name === 'download' ? { ...r, gate: 'none' } : r));
    assert.deepStrictEqual(ungatedContentRoutes(tampered), ['/api/download/docs/a.txt -> download']);
});

test('dispatch order keeps prefix routes apart', () => {
    assert.strictEqual(answering('/api/download-zip').name, 'download-zip');
    assert.strictEqual(answering('/api/download/x.zip').name, 'download');
    assert.strictEqual(answering('/browse/docs').name, 'spa');
    assert.strictEqual(answering('/assets/css/base.css').name, 'static');
    assert.strictEqual(ROUTES[ROUTES.length - 1].name, 'static', 'static fallback is last');
});
