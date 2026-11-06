# Contributing to Open Multiroute DEX Bot

Thanks for your interest in improving the project! This document covers the
practical bits: setup, conventions, and how changes get merged.

## Development setup

```bash
git clone https://github.com/algomanlife/open-multiroute-dex-bot.git
cd open-multiroute-dex-bot
pnpm install
cp .env.example .env            # adjust values as needed
pnpm --filter @omdb/core test   # unit tests (no DB required)
pnpm typecheck                   # strict TS across all packages
pnpm dev                         # api :3000 + web :3001 (needs DATABASE_URL)
```

## Project layout

| Package        | Responsibility                              |
| -------------- | ------------------------------------------- |
| `apps/api`     | Fastify REST + tRPC server, Prisma, Swagger |
| `apps/web`     | Next.js 15 dashboard                        |
| `packages/core`| Trading engine + DEX clients                |
| `packages/ui`  | Shared presentational components            |

## Conventions

- **TypeScript strict, no `any`** — use `unknown` + narrowing.
- **Zod for every external input** (webhook payloads, route bodies, env).
- **Comments only where logic is genuinely tricky** — prefer self-documenting code.
- **Tests**: Vitest. Core logic must keep ≥80% line coverage; run
  `pnpm --filter @omdb/core test:coverage`.
- **Commits**: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`…).
- **Migrations**: additive and idempotent; never edit an applied migration.

## Adding a new DEX

1. Create `packages/core/src/clients/<name>/<name>Client.ts` extending
   `AbstractDexClient` (implement `getIsAccountReady` + `placeOrder`).
2. Register it in `packages/core/src/clients/registry.ts`.
3. Add it to `SUPPORTED_EXCHANGES` in `trading/alert.ts` and to the dashboard
   exchange list.
4. Unit tests for sizing/param mapping + docs table entry.

## Pull requests

- Keep PRs scoped to one concern.
- Include tests and, for UI changes, screenshots.
- CI (lint, typecheck, unit tests, docker build) must pass.

## Reporting bugs

Open an issue with: environment (docker/manual), API logs, the alert JSON
(redact secrets), and what you expected vs. what happened. Security issues:
see [SECURITY.md](SECURITY.md) — do not open public issues for them.
