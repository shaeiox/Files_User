/**
 * @file test/http-hardening.test.js
 * @brief Guards the HTTP-surface hardening: proxy-header trust, secure-request
 *        detection, CORS origin validation, and static path containment.
 */
'use strict';

const { test } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Configure before requiring the module: the env is read at load time.
process.env.TRUSTED_PROXIES = '127.0.0.1,::1';
process.env.CORS_ALLOWED_ORIGINS = 'https://ok.example';

const httpUtils = require('../lib/http-utils');
const { serveStatic } = require('../lib/static-handler');

function fakeReq({ remoteAddress = '203.0.113.9', headers = {}, encrypted = false } = {}) {
    return { socket: { remoteAddress, encrypted }, headers };
}

test('getClientIp ignores X-Forwarded-For from an untrusted peer', () => {
    const req = fakeReq({ remoteAddress: '203.0.113.9', headers: { 'x-forwarded-for': '1.2.3.4' } });
    assert.strictEqual(httpUtils.getClientIp(req), '203.0.113.9');
});

test('getClientIp honours X-Forwarded-For from a trusted proxy', () => {
    const req = fakeReq({ remoteAddress: '127.0.0.1', headers: { 'x-forwarded-for': '1.2.3.4' } });
    assert.strictEqual(httpUtils.getClientIp(req), '1.2.3.4');
});

test('getClientIp ignores client-supplied X-Forwarded-For entries a proxy appended to', () => {
    // nginx $proxy_add_x_forwarded_for: "<client header>, <real peer>"
    const req = fakeReq({ remoteAddress: '127.0.0.1', headers: { 'x-forwarded-for': '6.6.6.6, 1.2.3.4' } });
    assert.strictEqual(httpUtils.getClientIp(req), '1.2.3.4');
});

test('isSecureRequest trusts X-Forwarded-Proto only from a trusted proxy', () => {
    const spoofed = fakeReq({ remoteAddress: '203.0.113.9', headers: { 'x-forwarded-proto': 'https' } });
    assert.strictEqual(httpUtils.isSecureRequest(spoofed), false);
    const trusted = fakeReq({ remoteAddress: '127.0.0.1', headers: { 'x-forwarded-proto': 'https' } });
    assert.strictEqual(httpUtils.isSecureRequest(trusted), true);
});

test('applyCors echoes an allowlisted origin, never a wildcard with credentials', () => {
    const headers = {};
    const res = { setHeader: (k, v) => { headers[k] = v; } };
    httpUtils.applyCors(res, fakeReq({ headers: { origin: 'https://ok.example' } }));
    assert.strictEqual(headers['Access-Control-Allow-Origin'], 'https://ok.example');
    assert.notStrictEqual(headers['Access-Control-Allow-Origin'], '*');
    assert.strictEqual(headers.Vary, 'Origin');

    const headers2 = {};
    const res2 = { setHeader: (k, v) => { headers2[k] = v; } };
    httpUtils.applyCors(res2, fakeReq({ headers: { origin: 'https://evil.example' } }));
    assert.strictEqual(headers2['Access-Control-Allow-Origin'], undefined);
});

test('serveStatic serves public/ only and refuses traversal out of it', (t, done) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-static-'));
    fs.mkdirSync(path.join(root, 'public', 'assets', 'js'), { recursive: true });
    fs.writeFileSync(path.join(root, 'public', 'assets', 'js', 'app.js'), 'console.log(1)');
    fs.writeFileSync(path.join(root, 'server.js'), 'secret');
    fs.writeFileSync(path.join(root, 'public', 'index.html'), '<h1>hi</h1>');

    const results = [];
    const step = (url, next) => {
        const res = {
            status: 0,
            writeHead(code) { this.status = code; },
            setHeader() {},
            end() { results.push({ url, status: this.status }); next(); },
        };
        serveStatic(url, res, fakeReq(), root);
    };

    step('/assets/js/app.js', () =>
        step('/server.js', () =>
            step('/../server.js', () =>
                // Percent-encoded dot-segments survive URL parsing and reach
                // serveStatic already decoded; the allowlist must not be fooled.
                step('/assets/../.env', () =>
                    step('/assets/../server.js', () =>
                        step('/assets/%2e%2e%2f.env', () =>
                            step('/index.html', () => {
                                assert.deepStrictEqual(results, [
                                    { url: '/assets/js/app.js', status: 200 },
                                    { url: '/server.js', status: 404 },
                                    { url: '/../server.js', status: 404 },
                                    { url: '/assets/../.env', status: 404 },
                                    { url: '/assets/../server.js', status: 404 },
                                    { url: '/assets/%2e%2e%2f.env', status: 404 },
                                    { url: '/index.html', status: 200 },
                                ]);
                                fs.rmSync(root, { recursive: true, force: true });
                                done();
                            })))))));
});
