/* Load .env from the project root. Prefers dotenv; falls back to a small parser. */
const fs = require("fs");
const path = require("path");

function parseEnvText(text) {
    for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const eq = line.indexOf("=");
        if (eq <= 0) continue;
        const key = line.slice(0, eq).trim();
        let value = line.slice(eq + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        if (process.env[key] == null || process.env[key] === "") {
            process.env[key] = value;
        }
    }
}

function loadEnv(projectRoot) {
    const envPath = path.join(projectRoot, ".env");
    try {
        require("dotenv").config({ path: envPath });
        return;
    } catch {
        /* dotenv not installed — parse .env manually */
    }
    try {
        if (fs.existsSync(envPath)) {
            parseEnvText(fs.readFileSync(envPath, "utf8"));
        }
    } catch (err) {
        console.warn("Could not read .env:", err.message);
    }
}

module.exports = { loadEnv };
