# User Guide (Traders)

How to run Open Multiroute DEX Bot and route your TradingView strategies to
DEXes.

## 1. Install

Fastest: [Docker Quick Start](../README.md#-quick-start). Manual setups: see
[Deployment](DEPLOYMENT.md).

## 2. Configure your exchange account

Set the credentials for the DEX(es) you actually use in `.env`:

| DEX         | Environment variables                                |
| ----------- | ---------------------------------------------------- |
| dYdX v4     | `DYDX_V4_PRIVATE_KEY` or `DYDX_V4_MNEMONIC`          |
| Hyperliquid | `HYPERLIQUID_PRIVATE_KEY` (+ optional slippage/fee)  |
| GMX v2      | `GMX_PRIVATE_KEY`, `GMX_RPC_URL`                     |
| Perpetual   | `PERP_PRIVATE_KEY`, `PERP_RPC_URL`                   |
| Bluefin     | `BLUEFIN_MNEMONIC`                                   |

**Safety**: use a dedicated trading wallet, never your main vault, and only
fund it with what you allocate to automated strategies.

## 3. Set a webhook passphrase

```bash
WEBHOOK_PASSPHRASE=$(openssl rand -hex 24)
```

Every alert must then include `"passphrase": "<same value>"`.

## 4. Create the TradingView alert

- **Condition**: your strategy signal
- **Webhook URL**: `https://your-host/api/webhook`
- **Message** (JSON):

```json
{
  "exchange": "hyperliquid",
  "strategy": "eth-momentum",
  "market": "ETH",
  "order": "buy",
  "price": "{{close}}",
  "position": "long",
  "reverse": false,
  "size": 0.1,
  "passphrase": "your-passphrase"
}
```

### Sizing options (pick one)

- `size` — base-asset quantity (e.g. 0.1 ETH)
- `sizeUsd` — notional in USD
- `sizeByLeverage` — notional sized against your account leverage

### Position semantics

- `position: "long" | "short"` — open/extend in that direction
- `position: "flat"` — close the strategy's position
- `reverse: true` — on position flips after the first order, the engine
  doubles size (close + open opposite), matching upstream behaviour.

## 5. Watch the dashboard

Sign in at `http://your-host:3001` with the same wallet you configured for
trading (or any wallet, for read-only views if your deployment allows it).
You get: KPIs, cumulative P&L, open positions, full trade history, alert log
with rejection reasons, and exchange connection status.

## 6. Troubleshooting alerts

| Dashboard shows                 | Meaning                                            |
| ------------------------------- | -------------------------------------------------- |
| Rejected · "not valid"          | JSON shape wrong — check field names/types         |
| Rejected · "Passphrase"         | `passphrase` missing or mismatched                 |
| Rejected · "must be one of"     | unknown `exchange` value                           |
| 503 · "not ready"               | DEX credential env var missing/invalid             |
| Skipped · "first-flat-close"    | expected: first alert was a close — nothing opened |

## Risk notice

Perpetual trading is high-risk. This software executes your alerts exactly
as specified — test with small sizes on testnets first. No warranty, see
[LICENSE](../LICENSE).
