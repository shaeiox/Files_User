#!/usr/bin/env bash
# scripts/relocation-check.sh - run the whole suite from a copy of this repository
# at a fresh path with a space in its name, read-only (isolate-app-roots).
#
#   bash scripts/relocation-check.sh
#
# Proves the portal needs nothing from where it was developed: no .env, no data/,
# no Admin Files Manager folder, no write access to itself. test/relocation.test.js
# (part of `npm test`) covers the production smoke start and the path lint.
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
base="$(mktemp -d)"
copy="$base/relocated portal"
trap 'chmod -R u+w "$base" 2>/dev/null || true; rm -rf "$base"' EXIT

mkdir -p "$copy"
tar -C "$repo" \
    --exclude=./.git --exclude=./node_modules --exclude=./data --exclude=./graphify-out \
    --exclude=./.env --exclude=./openspec --exclude=./coverage --exclude='*.log' -cf - . | tar -C "$copy" -xf -
ln -s "$repo/node_modules" "$copy/node_modules"
chmod -R a-w "$copy"

echo "[relocation] running npm test in: $copy"
( cd "$copy" && env -u FILES_ROOT -u PORTAL_DATA_DIR -u NODE_ENV -u PORT npm test )
echo "[relocation] OK"
