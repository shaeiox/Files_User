/**
 * @file server.js
 * @brief Application Entry Point.
 */
'use strict';

const http = require("http");
const { loadEnv } = require("./lib/load-env");

const PROJECT_ROOT = __dirname;
loadEnv(PROJECT_ROOT);

const logger = require("./lib/logger");
const apiRouter = require("./lib/api-router");
const filesService = require("./lib/files-service");
const { c } = logger;

const HOST = "0.0.0.0";
const PORT = process.env.PORT || 4000;

const server = http.createServer((req, res) => {
    apiRouter.handleRequest(req, res, PROJECT_ROOT, PORT);
});

server.listen(PORT, HOST, () => {
    const peek = filesService.peekRootSync(PROJECT_ROOT);
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

  ${rootState}
  ${c.dim}Press Ctrl+C to stop${c.reset}
`);
});

process.on("SIGINT", () => {
    logger.warn("\nShutting down file portal…");
    server.close(() => process.exit(0));
});