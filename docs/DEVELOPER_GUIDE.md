# Developer Guide

Architecture, code flow and extension points for contributors.

## Monorepo layout

```
apps/api           Fastify server — REST + tRPC + Swagger + WebSocket
apps/web           Next.js 15 dashboard (React 19, RainbowKit, TanStack Query)
packages/core      Trading engine, DEX clients, types, strategy store
packages/ui        Shared presentational components
```

Turborepo defines task graphs (`build`, `typecheck`, `test`) with dependency
ordering (`packages/core` builds before `apps/api`).

## Request flow (alert → order → dashboard)

1. **Webhook** (`apps/api/src/routes/webhook.ts`) receives the JSON body.
2. **Validation** (`packages/core/src/trading/alert.ts`): Zod schema +
   upstream business rules (passphrase, exchange allow-list, strategy state,
   first-flat-close skip).
3. **TradingEngine.route** (`packages/core/src/trading/engine.ts`): resolves
   the client from **DexRegistry** (lazy construction) and submits the order
   with retry/backoff.
4. **DEX client** (`packages/core/src/clients/**`) executes on-exchange and
   calls `emitOrderFilled`.
5. **Persistence bridge** (`apps/api/src/lib/engine.ts`): writes `Trade`,
   nets `Position`, and broadcasts a WebSocket event.
6. **Dashboard** invalidates its TanStack Query caches and re-fetches.

## Key design decisions

- **Strategy state** is behind the `StrategyStore` interface. The API can
  swap the in-memory default for a Prisma-backed store without touching the
  engine (legacy `getStrategiesDB()` calls inside ported clients go through
  a compat shim that writes to the same store).
- **Clients are lazy**: missing credentials for one DEX never break the
  others; `getIsAccountReady()` reports per-exchange readiness.
- **Config shim** (`packages/core/src/utils/env.ts`) keeps the ported
  clients' `config.get("Hyperliquid.User.slippage")` call shape while
  sourcing env vars with upstream defaults.
- **Errors**: `OmdbError` hierarchy with `code` + `statusCode` — the Fastify
  error handler maps them to clean HTTP responses.

## Testing

```bash
pnpm --filter @omdb/core test:coverage   # engine, validation, utils, registry
pnpm --filter @omdb/api test             # crypto (AES-GCM), SIWE, env config
```

Tests run without a database. Route/integration tests that need Postgres are
executed in CI with a service container (see
`.github/workflows/ci.yml`).

## tRPC

`apps/api/src/trpc/router.ts` exposes `me`, `stats`, `recentTrades`,
`positions`. The router type is exported (`AppRouter`) so a typed client can
be generated for the dashboard — end-to-end type safety without codegen
steps.

## Where to extend

- **New DEX**: `packages/core/src/clients/<name>/` + registry entry (see
  CONTRIBUTING).
- **New sizing mode**: `packages/core/src/trading/alert.ts` schema +
  relevant client `placeOrder`.
- **Notifications** (Telegram/Discord): subscribe to
  `AbstractDexClient.onOrderFilled` from the API layer — no engine changes.
- **Multi-tenant routing**: the webhook accepts `?userId=` to attribute
  alerts; extend validation to enforce per-user exchange permissions.
