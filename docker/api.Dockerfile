# syntax=docker/dockerfile:1.7
# Multi-stage build for the Open Multiroute DEX Bot API server.

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# ── deps: install workspace with lockfile ────────────────────────────────────
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts

# ── build: prisma generate + compile core + api ──────────────────────────────
FROM deps AS build
COPY tsconfig.json turbo.json ./
COPY packages/core packages/core
COPY packages/ui packages/ui
COPY apps/api apps/api
RUN pnpm --filter @omdb/core build \
 && pnpm --filter @omdb/api db:generate \
 && pnpm --filter @omdb/api build

# ── runtime: slim image with only production artifacts ───────────────────────
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S omdb && adduser -S omdb -G omdb

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/packages/core/dist ./packages/core/dist
COPY --from=build /app/packages/core/package.json ./packages/core/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules

USER omdb
WORKDIR /app/apps/api
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
