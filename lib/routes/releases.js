/**
 * @file lib/routes/releases.js
 * @brief Latest-releases listing and the stable CLI "latest" download URLs.
 */
'use strict';

const logger = require("../logger");
const { sendJSON } = require("../http-utils");
const { streamDownload } = require("../static-handler");
const filesService = require("../files-service");

const LATEST_OS = { "/release9/latest": "el9", "/release8/latest": "el8" };

/** @type {import('./index').Route[]} */
module.exports = [
    {
        name: "releases", pattern: "/api/releases", gate: "policy-aggregate",
        match: (p) => p === "/api/releases",
        async handler({ req, res, projectRoot, url, pathname, start, policyUnavailable, releaseRootDecision, answerPolicy, decideFor }) {
            if (policyUnavailable()) return;
            const os = url.searchParams.get("os");
            const root = releaseRootDecision(os);
            if (root.result === "locked") return answerPolicy(root);
            if (root.result !== "allow") return sendJSON(res, req, 200, { browsePath: "", items: [] });
            const { lockedSkipped, ...result } = await filesService.listLatestReleases(projectRoot, url.searchParams.get("limit"), os, decideFor);
            // Nothing visible, but a locked folder was not walked: ask for sign-in
            // (as Browse does), never "no releases" for releases behind a lock.
            if (!result.items.length && lockedSkipped) return answerPolicy({ result: "locked", origin: "inherited" });
            logger.logAccess("GET", 200, pathname, `${result.items.length} items · ${Date.now() - start}ms`);
            return sendJSON(res, req, 200, result);
        },
    },
    {
        // Stable "latest release" CLI URLs. Version selection reuses listLatestReleases
        // (extractVersion + compareVersions), so there is one definition of "latest".
        name: "release-latest", pattern: "/release*/latest", gate: "policy",
        match: (p) => Object.prototype.hasOwnProperty.call(LATEST_OS, p),
        async handler({ req, res, projectRoot, pathname, start, policyUnavailable, releaseRootDecision, answerPolicy, decideFor, gate }) {
            const latestOs = LATEST_OS[pathname];
            if (policyUnavailable()) return;
            if (releaseRootDecision(latestOs).result === "locked") return answerPolicy({ result: "locked", origin: "inherited" });
            // The walk already dropped what this caller may not see; serve the newest
            // fully allowed build, so a governed newest does not hide an older one.
            const { items, lockedSkipped } = await filesService.listLatestReleases(projectRoot, Infinity, latestOs, decideFor);
            const newest = items.find((item) => !item.locked && !item.viewOnly);
            if (!newest) {
                if (items.some((item) => item.viewOnly)) return answerPolicy({ result: "forbidden" });
                if (items.length) return answerPolicy({ result: "locked", origin: "self" });
                if (lockedSkipped) return answerPolicy({ result: "locked", origin: "inherited" });
                logger.logAccess(req.method, 404, pathname, "no releases");
                return sendJSON(res, req, 404, { error: "No release found.", code: "NO_RELEASE" });
            }
            if (await gate([newest.path], "File not found.", "download")) return;
            const fileInfo = await filesService.getDownloadTarget(projectRoot, newest.path);
            logger.logAccess(req.method, 200, pathname, `latest → ${fileInfo.fileName} · ${Date.now() - start}ms`);
            return streamDownload(req, res, fileInfo);
        },
    },
];
