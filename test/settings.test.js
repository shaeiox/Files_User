'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const settings = require('../lib/settings');

const SECRET = 'x'.repeat(48);

test('unset and valid values parse; defaults apply', () => {
    assert.deepStrictEqual(settings.problems({}), []);
    assert.strictEqual(settings.get('PORT', {}), 4000);
    assert.strictEqual(settings.get('PORT', { PORT: ' 8080 ' }), 8080);
    assert.strictEqual(settings.get('AUTH_ENABLED', { AUTH_ENABLED: 'YES' }), true);
    assert.strictEqual(settings.get('AUTH_ENABLED', { AUTH_ENABLED: 'off' }), false);
    assert.deepStrictEqual(settings.get('TRUSTED_PROXIES', { TRUSTED_PROXIES: '10.0.0.1, ,10.0.0.2' }), ['10.0.0.1', '10.0.0.2']);
});

test('two bad values are reported together, each naming its variable', () => {
    const problems = settings.problems({ PORT: 'abc', RATE_LIMIT_MAX_REQUESTS: '-5' });
    assert.strictEqual(problems.length, 2);
    assert.match(problems[0], /^PORT must be a whole number from 1 to 65535 \(got "abc"\)/);
    assert.match(problems[1], /^RATE_LIMIT_MAX_REQUESTS must be a whole number from 1 to 1000000/);
});

test('numeric values must be whole numbers inside their range', () => {
    assert.match(settings.problems({ RATE_LIMIT_MAX_REQUESTS: 'lots' })[0], /RATE_LIMIT_MAX_REQUESTS.*1 to 1000000/);
    assert.match(settings.problems({ ADMIN_SYNC_TTL_MS: '500' })[0], /ADMIN_SYNC_TTL_MS.*1000 to 60000/);
    assert.strictEqual(settings.problems({ AUTH_SESSION_MINUTES: '1.5' }).length, 1);
    assert.deepStrictEqual(settings.problems({ CONTENT_INDEX_TTL_MS: '0' }), []);
    // A bad value never reaches a caller: get() falls back to the default.
    assert.strictEqual(settings.get('RATE_LIMIT_MAX_REQUESTS', { RATE_LIMIT_MAX_REQUESTS: 'lots' }), 120);
});

test('a typo in a boolean refuses startup instead of turning auth off', () => {
    const problems = settings.problems({ AUTH_ENABLED: 'ture' });
    assert.strictEqual(problems.length, 1);
    assert.match(problems[0], /^AUTH_ENABLED must be one of/);
    assert.match(settings.problems({ AUTH_BASIC_ALLOW_HTTP: 'maybe' })[0], /^AUTH_BASIC_ALLOW_HTTP/);
    assert.match(settings.problems({ ADMIN_INTEGRATION_ENABLED: 'enabled' })[0], /^ADMIN_INTEGRATION_ENABLED/);
});

test('a short signing secret is refused at startup and never printed', () => {
    const problems = settings.problems({ AUTH_ENABLED: 'true', AUTH_JWT_SECRET: 'short-secr' });
    assert.strictEqual(problems.length, 1);
    assert.match(problems[0], /^AUTH_JWT_SECRET must be at least 32 characters/);
    assert.ok(!problems[0].includes('short-secr'));
    assert.deepStrictEqual(settings.problems({ AUTH_ENABLED: 'true', AUTH_JWT_SECRET: SECRET }), []);
    // Auth off: no secret needed.
    assert.deepStrictEqual(settings.problems({ AUTH_ENABLED: 'false' }), []);
});

test('secret-named variables never echo their value', () => {
    assert.ok(settings.isSecret('AUTH_JWT_SECRET'));
    assert.ok(settings.isSecret('SMTP_PASSWORD'));
    assert.ok(settings.isSecret('API_TOKEN'));
    assert.ok(!settings.isSecret('PORT'));
});

test('production path rules are part of the same report', () => {
    const problems = settings.problems({ NODE_ENV: 'production', FILES_ROOT: 'relative/dir', PORT: 'x' });
    assert.ok(problems.some((p) => p.startsWith('PORT ')));
    assert.ok(problems.some((p) => p.startsWith('PORTAL_DATA_DIR is required')));
    assert.ok(problems.some((p) => p.startsWith('FILES_ROOT must be an absolute path')));
});

/* ─── server.js: startup refusal and --check-config ─── */

const SERVER = path.join(__dirname, '..', 'server.js');

function runServer(args, env) {
    const filesRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-settings-'));
    fs.mkdirSync(path.join(filesRoot, 'docs'));
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-settings-data-'));
    const res = spawnSync(process.execPath, [SERVER, ...args], {
        encoding: 'utf8',
        timeout: 20000,
        env: {
            PATH: process.env.PATH,
            SystemRoot: process.env.SystemRoot,
            // Every variable the checkout's own .env could supply is pinned here.
            FILES_ROOT: filesRoot,
            PORTAL_DATA_DIR: dataDir,
            LOG_FILE: '',
            AUTH_ENABLED: 'false',
            AUTH_JWT_SECRET: '',
            ADMIN_INTEGRATION_ENABLED: 'false',
            ADMIN_DB_PATH: '',
            RELEASE_PVM: '',
            NODE_ENV: '',
            AUTH_USERS_FILE: '', AUTH_SESSION_MINUTES: '', AUTH_LOCKOUT_MINUTES: '', AUTH_MAX_FAILED_ATTEMPTS: '',
            PORT: '45999', // never opened: every run here exits before listen
            ...env,
        },
    });
    return { ...res, dataDir };
}

test('startup is refused with every problem listed, and nothing listens', () => {
    const res = runServer([], { PORT: 'abc', RATE_LIMIT_MAX_REQUESTS: '-5' });
    assert.notStrictEqual(res.status, 0);
    assert.match(res.stdout, /refusing to start/);
    assert.match(res.stdout, /PORT must be/);
    assert.match(res.stdout, /RATE_LIMIT_MAX_REQUESTS must be/);
    assert.doesNotMatch(res.stdout, /Portal started/);
});

test('--check-config reports a problem, exits non-zero and opens no port', () => {
    const res = runServer(['--check-config'], { AUTH_ENABLED: 'ture' });
    assert.notStrictEqual(res.status, 0);
    assert.match(res.stdout, /AUTH_ENABLED must be one of/);
    assert.doesNotMatch(res.stdout, /Portal started/);
    assert.deepStrictEqual(fs.readdirSync(res.dataDir), [], 'no trace file is written');
});

test('--check-config on a clean configuration says so and exits 0', () => {
    const res = runServer(['--check-config'], {});
    assert.strictEqual(res.status, 0, res.stdout + res.stderr);
    assert.match(res.stdout, /Configuration is usable/);
    assert.deepStrictEqual(fs.readdirSync(res.dataDir), [], 'no trace file is written');
});

/* ─── Root isolation (isolate-app-roots) ─── */

test.describe('root isolation', () => {
    const { isolationProblems } = require('../lib/load-env');
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-iso-'));
    const code = path.join(base, 'relocated portal');
    const state = path.join(base, 'state');
    const files = path.join(base, 'files');
    for (const d of [path.join(code, 'data'), state, files]) fs.mkdirSync(d, { recursive: true });
    const iso = (env) => isolationProblems(env, code);

    test('state and FILES_ROOT outside the code folder: no problem', () => {
        assert.deepStrictEqual(iso({ PORTAL_DATA_DIR: state, LOG_FILE: path.join(state, 'portal.log'), FILES_ROOT: files }), []);
    });

    test('PORTAL_DATA_DIR or the LOG_FILE folder inside the code folder is reported', () => {
        const p = iso({ PORTAL_DATA_DIR: path.join(code, 'data'), LOG_FILE: path.join(code, 'data', 'portal.log'), FILES_ROOT: files });
        assert.ok(p.some((m) => m.startsWith('PORTAL_DATA_DIR')), p.join('\n'));
        assert.ok(p.some((m) => m.startsWith('LOG_FILE')), p.join('\n'));
    });

    test('AUTH_USERS_FILE counts in legacy mode only', () => {
        const users = path.join(code, 'data', 'users.json');
        assert.ok(iso({ AUTH_USERS_FILE: users }).some((m) => m.startsWith('AUTH_USERS_FILE')));
        assert.deepStrictEqual(iso({ AUTH_USERS_FILE: users, ADMIN_INTEGRATION_ENABLED: 'true' }), []);
    });

    test('FILES_ROOT containing the portal is reported', () => {
        const p = iso({ PORTAL_DATA_DIR: state, FILES_ROOT: base });
        assert.ok(p.some((m) => m.includes('overlaps the portal code folder')), p.join('\n'));
        assert.ok(p.some((m) => m.includes('overlaps PORTAL_DATA_DIR')), p.join('\n'));
    });

    test('a symlink cannot hide the overlap', (t) => {
        const link = path.join(base, 'link');
        try { fs.symlinkSync(code, link, 'dir'); } catch { return t.skip('symlinks unavailable'); }
        assert.ok(iso({ PORTAL_DATA_DIR: state, FILES_ROOT: link }).some((m) => m.includes('overlaps the portal code folder')));
    });

    test('LOG_FILE=off and relative values are not judged here', () => {
        assert.deepStrictEqual(iso({ LOG_FILE: 'off', PORTAL_DATA_DIR: 'data', FILES_ROOT: 'files' }), []);
    });

    test('production refuses the real code folder as data folder; development does not', () => {
        const real = path.join(__dirname, '..', 'data');
        const prod = settings.problems({ NODE_ENV: 'production', PORTAL_DATA_DIR: real, FILES_ROOT: files });
        const dev = settings.problems({ NODE_ENV: 'development', PORTAL_DATA_DIR: real, FILES_ROOT: files });
        assert.ok(prod.some((m) => m.includes("inside the portal's code folder")), prod.join('\n'));
        assert.ok(!dev.some((m) => m.includes("inside the portal's code folder")), dev.join('\n'));
    });
});
