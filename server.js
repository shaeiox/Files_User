/**
 * @file server.js
 * @brief Application Entry Point.
 */
'use strict';

const http = require("http");
const { loadEnv, productionPathProblems } = require("./lib/load-env");

const PROJECT_ROOT = __dirname;
loadEnv(PROJECT_ROOT);

const logger = require("./lib/logger");
const apiRouter = require("./lib/api-router");
const filesService = require("./lib/files-service");
const adminDb = require("./lib/admin-db");
const accessPolicy = require("./lib/access-policy");
const { c } = logger;

// Configuration gate: in integration mode a missing or invalid ADMIN_DB_PATH
// must stop the server. It must never start and silently serve governed files
// as public. Any partial/inconsistent combination is refused here too.
const configProblems = [...productionPathProblems(), ...adminDb.validateStartup(PROJECT_ROOT)];
if (configProblems.length) {
    logger.error("Configuration is not usable — refusing to start:");
    for (const problem of configProblems) logger.error("  • " + problem);
    process.exit(1);
}

// Integration mode: RELEASE_PVM no longer implies sign-in; the admin lock on the
// release folder does. Say so once when that folder is open to anonymous callers.
const releaseRel = adminDb.isIntegrationEnabled() && filesService.releaseRel(PROJECT_ROOT);
if (releaseRel && accessPolicy.decide(releaseRel, null).result === "allow") {
    logger.warn(`Release folder "${releaseRel}" is public. Lock it in the Admin Files Manager to require sign-in for releases.`);
}

const HOST = "0.0.0.0";
const PORT = process.env.PORT || 4000;

const server = http.createServer((req, res) => {
    apiRouter.handleRequest(req, res, PROJECT_ROOT, PORT);
});

server.listen(PORT, HOST, () => {
    const peek = filesService.peekRootSync(PROJECT_ROOT);
    logger.info(`Portal started on port ${PORT} (auth ${process.env.AUTH_ENABLED || 'unset'}, admin gate ${adminDb.isIntegrationEnabled() ? 'on' : 'off'})`);
    const rootState = !peek.configured ? `${c.yellow}FILES_ROOT is not set${c.reset}`
        : !peek.exists ? `${c.yellow}FILES_ROOT path was not found${c.reset}`
            : !peek.isDirectory ? `${c.yellow}FILES_ROOT is not a directory${c.reset}`
                : `${c.green}FILES_ROOT is configured${c.reset}`;

    console.log(`
${c.cyan}${c.bold}
  ╔══════════════════════════════════════════════════╗
  ║     CloudAvid File Portal — File API Server      ║
  ╚══════════════════════════════════════════════════╝${c.reset}

  ${c.green}➜${c.reset}  Local:       ${c.bold}http://localhost:${PORT}/${c.reset}
  ${c.green}➜${c.reset}  Health:      http://localhost:${PORT}/api/health
  ${c.green}➜${c.reset}  Files API:   http://localhost:${PORT}/api/files/
  ${c.green}➜${c.reset}  Auth Status: http://localhost:${PORT}/api/auth/status

  ${c.green}➜${c.reset}  Admin gate:  ${adminDb.isIntegrationEnabled() ? `${c.green}enabled (admin.sqlite read-only)` : `${c.dim}legacy — all content public`}${c.reset}

  ${rootState}
  ${c.dim}Press Ctrl+C to stop${c.reset}
`);
});

process.on("SIGINT", () => {
    logger.warn("\nShutting down file portal…");
    server.close(() => process.exit(0));
});