/**
 * @file lib/routes/index.js
 * @brief The route table, in dispatch order (the first match answers).
 *
 * @typedef {object} Route
 * @property {string} name     Stable identifier.
 * @property {string} pattern  Route template, never a real path (metrics label).
 * @property {'none'|'policy'|'policy-aggregate'} gate
 *           How the handler gates access: `policy` gates every target through
 *           ctx.gate()/releaseGateLegacy(); `policy-aggregate` refuses when the
 *           policy is unavailable and screens every walked entry; `none` serves
 *           no governed content. test/routes.test.js enforces it for content URLs.
 * @property {(pathname:string, req:import('http').IncomingMessage) => boolean} match
 * @property {(ctx:object) => Promise<any>} handler
 */
'use strict';

const ops = require("./ops");
const auth = require("./auth");
const catalog = require("./catalog");
const releases = require("./releases");
const content = require("./content");
const statics = require("./static");

const byName = (list, name) => {
    const route = list.find((r) => r.name === name);
    if (!route) throw new Error("Unknown route: " + name);
    return route;
};

/** Answered first: before the rate limiter, sessions and every gate. */
const OPS = ops;

/** Answered before the request context exists (no session yet). */
const PRE_SESSION = auth;

/** Answered with the request context, in the order the original router checked them. */
const ROUTES = [
    byName(catalog, "health"),
    byName(catalog, "nav"),
    byName(catalog, "categories"),
    byName(releases, "releases"),
    byName(releases, "release-latest"),
    byName(catalog, "search"),
    ...content,
    ...statics,
];

module.exports = { OPS, PRE_SESSION, ROUTES };
