# CloudAvid File Portal — container image (alternative to the systemd unit in docs/DEPLOYMENT.md).
# Debian slim, not Alpine: bcrypt ships no musl prebuilds.
FROM node:22.16-bookworm-slim

ENV NODE_ENV=production \
    PORT=4000 \
    FILES_ROOT=/srv/files \
    PORTAL_DATA_DIR=/var/lib/files-portal

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server.js ./
COPY lib ./lib
COPY public ./public

# The code layer stays root-owned, so the `node` user cannot write it (checked in CI,
# isolate-app-roots). The portal only writes PORTAL_DATA_DIR (trace log, security
# state, legacy users.json).
RUN mkdir -p /var/lib/files-portal && chown node:node /var/lib/files-portal
VOLUME ["/var/lib/files-portal"]
USER node

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:' + (process.env.PORT || 4000) + '/livez').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]

CMD ["node", "server.js"]
