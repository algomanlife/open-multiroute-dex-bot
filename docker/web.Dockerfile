# syntax=docker/dockerfile:1.7
# Multi-stage build for the Open Multiroute DEX Bot dashboard (standalone).

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM deps AS build
COPY tsconfig.json turbo.json ./
COPY packages/ui packages/ui
COPY apps/web apps/web
ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm --filter @omdb/web build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3001 \
    HOSTNAME=0.0.0.0
WORKDIR /app
RUN addgroup -S omdb && adduser -S omdb -G omdb

# Next standalone output ships its own minimal node_modules.
COPY --from=build --chown=omdb:omdb /app/apps/web/.next/standalone ./
COPY --from=build --chown=omdb:omdb /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=omdb:omdb /app/apps/web/public ./apps/web/public

USER omdb
EXPOSE 3001
CMD ["node", "apps/web/server.js"]
