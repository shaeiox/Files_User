// Checks BrowseIcons.kindOf() mapping and that every symbol exists in the vendored sprite.
// Run: node scripts/check-file-icons.js
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const root = path.join(__dirname, "..");
const ctx = {};
vm.runInNewContext(fs.readFileSync(path.join(root, "public/assets/js/browse-icons.js"), "utf8") + ";this.BrowseIcons=BrowseIcons;", ctx);
const { kindOf, forItem } = ctx.BrowseIcons;
const kind = (name, type = "file") => kindOf({ name, type }).kind;

assert.strictEqual(kind("x", "directory"), "folder");
assert.strictEqual(kind("rocky-9.4.ISO"), "disk");
assert.strictEqual(kind("disk.qcow2"), "disk");
assert.strictEqual(kind("bundle.tar.gz"), "archive");
assert.strictEqual(kind("agent-1.2.x86_64.rpm"), "package");
assert.strictEqual(kind("SHA256SUMS.sha256"), "secure");
assert.strictEqual(kind("install.sh"), "code");
assert.strictEqual(kind("notes.pdf"), "pdf");
assert.strictEqual(kind("server.log"), "text");
assert.strictEqual(kind("Makefile"), "file");
assert.strictEqual(kind(".hidden"), "file");

const sprite = fs.readFileSync(path.join(root, "public/assets/icon/phosphor/file-icons.svg"), "utf8");
const names = ["x.iso", "x.zip", "x.rpm", "x.sh", "x.sig", "x.pdf", "x.doc", "x.csv", "x.png", "x.mp4", "x.mp3", "x.txt", "x"];
for (const n of names) assert.ok(sprite.includes(`id="${kindOf({ name: n }).symbol}"`), n);
assert.ok(sprite.includes('id="folder-open"') && forItem({ type: "directory" }, 18, true).includes("#folder-open"));

console.log("file-icons: ok");
