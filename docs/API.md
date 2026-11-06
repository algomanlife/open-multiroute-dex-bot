# API Reference

Base URL: `http://localhost:3000` (configurable via `API_PORT`).
Interactive OpenAPI docs: **`/docs`** (Swagger UI) when the server runs.
A tRPC endpoint (`/trpc`) mirrors the dashboard queries with full type
safety.

## Authentication

Dashboard endpoints require a Bearer session token obtained via SIWE:

```
POST /api/auth/nonce            → {nonce}
POST /api/auth/verify           → {token, user}
     body: {message, signature}   (SIWE message signed with your wallet)
GET  /api/auth/me               → {walletAddress, displayName}
POST /api/auth/logout
```

Send `Authorization: Bearer <token>` on authenticated calls.

## Webhook

`POST /api/webhook` — TradingView alert receiver (rate-limited: 30/min).

Body (JSON):

| Field            | Type   | Notes                                   |
| ---------------- | ------ | --------------------------------------- |
| `exchange`       | string | `dydxv4`/`dydx`, `perpetual`, `gmx`, `bluefin`, `hyperliquid` (default `dydx`) |
| `strategy`       | string | unique strategy name                    |
| `market`         | string | exchange-specific market symbol         |
| `order`          | string | `buy` or `sell`                         |
| `price`          | number | alert price (e.g. `{{close}}`)          |
| `position`       | string | `long`, `short`, `flat`                 |
| `reverse`        | bool   | doubles size on flips after first order |
| `size` / `sizeUsd` / `sizeByLeverage` | number | optional sizing |
| `passphrase`     | string | required if `WEBHOOK_PASSPHRASE` is set |

Responses: `200 {accepted: true}` · `200 {accepted: false, reason}` (skipped)
· `400/422/503` for unsupported exchange / invalid payload / account not ready.

## Dashboard data

```
GET  /api/trades?limit=50&offset=0    → {trades[], limit, offset}
GET  /api/positions                   → {positions[]}          (open only)
GET  /api/alerts?limit=100&offset=0   → {alerts[], limit, offset}
GET  /api/stats                       → {totalTrades, winRate, totalPnl,
                                         openPositions, alertsToday}
GET  /healthz                         → {status:"ok"}
```

## Exchange credentials

```
GET    /api/exchanges                       → exchange readiness + stored labels
POST   /api/exchanges {exchange,label,apiKey,apiSecret}   → 201 (encrypted at rest)
DELETE /api/exchanges/:exchange/:label      → {deleted: n}
```

`POST` requires `CREDENTIALS_ENCRYPTION_KEY` on the server; secrets are
AES-256-GCM encrypted and never returned.

## Dashboard signals & Gains test routes

```
POST /api/signals           (auth) — Vela chart signals; same validation and
                                     routing as the webhook, no passphrase
GET  /api/gains/status       (auth) — {configured, chain, isDemoChain, agentAddress}
GET  /api/gains/positions    (auth) — live Gains positions of the agent account
POST /api/gains/test         (auth) — place a small test market order
       {market?, side?, size?, leverage?, strategy?, closeOnly?}
```

The Gains test route targets the **demo/testnet chain** (`arbitrum-sepolia`,
the environment behind demo.gains.trade) unless `GAINS_CHAIN=arbitrum`.

## WebSocket

`GET /ws` — server pushes JSON frames:

```json
{ "type": "trade" | "alert" | "position", "data": { ... } }
```

## Error format

```json
{ "error": "VALIDATION_ERROR", "message": "Alert message is not valid" }
```

with HTTP codes matching the error class (400 unknown exchange, 401
unauthorized, 422 validation, 429 rate-limited, 502 order failed, 503
account not ready).
