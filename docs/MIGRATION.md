# Migration Guide — from tradingview-alert-connector to Open Multiroute DEX Bot

This guide moves an existing v1 (upstream) deployment to v2 with minimal
downtime. Read it once end-to-end before starting.

## What changes at a glance

| Area                | v1 (upstream)                       | v2 (this project)                          |
| ------------------- | ----------------------------------- | ------------------------------------------ |
| Server              | Express                             | Fastify                                    |
| Config              | `config/*.yaml` + `.env`            | Environment variables only                 |
| Persistence         | `node-json-db` + CSV files          | PostgreSQL via Prisma (+ optional CSV)     |
| Webhook             | `POST /`                            | `POST /api/webhook`                        |
| Passphrase env      | `TRADINGVIEW_PASSPHRASE`            | `WEBHOOK_PASSPHRASE`                       |
| Auth                | none                                | SIWE wallet sessions                       |
| Dashboard           | none                                | Next.js 15 app (`apps/web`)                |
| Logging             | console                             | Pino structured JSON                       |
| DEX credentials     | `.env` only                         | `.env` (server) + encrypted store (optional) |

## Step-by-step

### 1. Provision PostgreSQL

```bash
docker run -d --name omdb-pg -e POSTGRES_USER=omdb -e POSTGRES_PASSWORD=omdb \
  -e POSTGRES_DB=omdb -p 5432:5432 postgres:16
```

### 2. Migrate environment variables

Copy your existing values into `.env` (see `.env.example`):

- `TRADINGVIEW_PASSPHRASE` → `WEBHOOK_PASSPHRASE`
- DEX private keys/mnemonics keep their names where possible
  (`DYDX_V4_PRIVATE_KEY`, `HYPERLIQUID_PRIVATE_KEY`, `GMX_PRIVATE_KEY`,
  `PERP_PRIVATE_KEY`, `BLUEFIN_MNEMONIC`).
- Add: `DATABASE_URL`, `CREDENTIALS_ENCRYPTION_KEY` (`openssl rand -hex 32`),
  `CORS_ORIGINS=http://localhost:3001`.

Any values that lived in `config/*.yaml` (RPC URLs, slippage, builder fee)
now map to env overrides, e.g.:

```bash
GMX.Network.host        → GMX_RPC_URL
Hyperliquid.User.slippage → HYPERLIQUID_SLIPPAGE
```

Defaults match the upstream YAMLs, so you only need to set what you
customized.

### 3. Run migrations

```bash
pnpm db:migrate        # prisma migrate deploy
```

### 4. Import legacy strategy state and trade history

Strategy positions previously lived in
`data/strategies/<env>/myStrategies.json`. A one-shot import script is
planned (`scripts/import-v1.ts`, see issue tracker). Until then:

- For a fresh start: do nothing — the engine re-learns state from the next
  alert per strategy (first-alert flag resets).
- To preserve reverse-sizing correctness, either import state manually into
  the `Strategy` table or send one "flat" alert per strategy after switching
  to re-sync.

Legacy CSV exports (`data/exports/*.csv`) can be imported into the `Trade`
table with any Postgres CSV import; the column order is unchanged.

### 5. Update TradingView webhook URL

Change every alert's webhook URL from `https://host/` to
`https://host/api/webhook`. The JSON message body is **unchanged** — same
fields, same semantics (`reverse`, `size`, `sizeUsd`, `position`, …).

### 6. Start v2

```bash
docker compose up -d   # or pnpm dev for manual setups
```

Verify: `GET /healthz` returns `{"status":"ok"}`, and a test alert shows up
in the dashboard Alert Log.

## Rollback

Keep the v1 container stopped (not removed) for one trading cycle. Rolling
back = pointing TradingView at the old webhook URL and restarting v1; the
two versions do not share state, so positions tracked only in v1 must be
manually closed or reconciled.

## Common gotchas

- **GRVT** is not routed in v2 — remove `exchange: "grvt"` alerts or port
  the client yourself (see CONTRIBUTING "Adding a new DEX").
- **Sentry**: v1's Sentry v6 integration was removed; use platform logging
  or re-add modern Sentry yourself.
- The webhook now returns structured JSON (`{accepted, reason}`) instead of
  plain text — TradingView ignores bodies either way, but custom scripts
  that parsed the old `OK` string need updating.
