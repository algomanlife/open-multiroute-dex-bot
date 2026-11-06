# Changelog

All notable changes to this project are documented in this file.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project adheres to [Semantic Versioning](https://semver.org).

## [Unreleased]

## [2.0.0] — 2026-11-05

Complete rebrand, modernization and rebuild of
`tradingview-alert-connector` as **Open Multiroute DEX Bot**.

### Added

- Turborepo monorepo: `apps/api`, `apps/web`, `packages/core`, `packages/ui`.
- Fastify API server (replaces Express) with Zod validation, Pino structured
  logging, `@fastify/helmet`, CORS allow-list, rate limiting.
- PostgreSQL persistence via Prisma: `User`, `Session`,
  `ExchangeCredential`, `Trade`, `Position`, `Alert`, `Strategy`.
- SIWE wallet authentication with DB-backed sessions.
- REST API: `/api/auth/*`, `/api/exchanges`, `/api/trades`,
  `/api/positions`, `/api/alerts`, `/api/stats`, `/api/webhook`, `/healthz`.
- tRPC type-safe API (`/trpc`) for dashboard queries.
- Swagger/OpenAPI UI at `/docs`.
- WebSocket (`/ws`) realtime broadcast of trades, alerts and positions.
- Next.js 15 + React 19 dashboard (App Router): login, overview KPIs, P&L
  chart, positions, trades, alerts, exchange management, settings.
- RainbowKit + wagmi wallet connection; SIWE sign-in flow.
- AES-256-GCM encryption for stored exchange credentials.
- Trading engine with custom error hierarchy, retry with backoff, and
  pluggable strategy-state store (replaces node-json-db).
- Vitest unit tests for core trading logic, validation, crypto and SIWE.
- Docker Compose (prod + dev), multi-stage Dockerfiles.
- GitHub Actions CI: lint, typecheck, tests, docker build.
- Community files: CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, NOTICE, docs/.

### Changed

- All upstream DEX clients (dYdX v4, Hyperliquid, GMX v2, Perpetual,
  Bluefin) ported to `packages/core` with lazy construction and
  env-based configuration (replaces `node-config` YAML files).
- Alert validation rewritten with Zod (same rules as upstream).
- Config: YAML files → environment variables with safe defaults.

### Removed

- Legacy dYdX v3 code paths and dead `checkAfterPosition` scaffolding.
- `docker-compose-dev.yml` legacy file, Sentry v6 integration,
  `node-json-db` strategy store, CSV-only trade history as the primary
  persistence (CSV export remains available via `OMDB_EXPORT_DIR`).
- GRVT client (not part of the v2 routing scope).

### Credits

Derived from [tradingview-alert-connector](https://github.com/junta/tradingview-alert-connector)
by 0xIbuki (GPL-3.0). See [NOTICE.md](NOTICE.md).
