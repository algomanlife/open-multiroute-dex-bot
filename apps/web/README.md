# Open Multiroute DEX Bot — Web Dashboard

Next.js 15 (App Router) + React 19 dashboard for the Open Multiroute DEX Bot
platform. Wallet sign-in via SIWE, realtime updates over WebSocket.

## Stack

- Next.js 15 (App Router, standalone output)
- React 19 + TypeScript (strict)
- Tailwind CSS + `@omdb/ui` shared components
- RainbowKit + wagmi + viem (wallet connection)
- TanStack Query (data fetching + realtime cache invalidation)
- Recharts (P&L charts, lazy-loaded)

## Getting started

```bash
pnpm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL (API base)
pnpm dev                     # http://localhost:3001
```

## Pages

| Route                   | Purpose                        |
| ----------------------- | ------------------------------ |
| `/login`                | Connect wallet + SIWE sign-in  |
| `/dashboard`            | KPIs, cumulative P&L, alerts   |
| `/dashboard/positions`  | Open positions table           |
| `/dashboard/trades`     | Trade history + P&L chart      |
| `/dashboard/alerts`     | Webhook alert log              |
| `/dashboard/exchanges`  | DEX connections + credentials  |
| `/dashboard/settings`   | Webhook URL, profile, sign out |

## Notes

- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` empty → only injected/detected
  wallets are offered (dev-friendly). Set a WalletConnect Cloud project id
  for mobile wallet support.
- The API base URL (`NEXT_PUBLIC_API_URL`) must point to the Fastify server
  (default `http://localhost:3000`).
