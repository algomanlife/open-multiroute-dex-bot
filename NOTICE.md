# NOTICE — Attribution

## This product

**Open Multiroute DEX Bot** — a modernized rebuild and rebrand of the
open-source project *tradingview-alert-connector*.

## Upstream derivation

This repository's DEX client implementations (dYdX v4, Hyperliquid, GMX v2,
Perpetual Protocol, Bluefin), the TradingView alert validation rules and the
strategy/position-sizing logic originate from:

- **Project**: [junta/tradingview-alert-connector](https://github.com/junta/tradingview-alert-connector)
- **Original author**: 0xIbuki
- **Upstream license**: GPL-3.0-only

The code was ported into `packages/core` and substantially refactored
(Fastify API, Prisma persistence, engine/event architecture, env-based
configuration, TypeScript strict mode, tests), but the derivation is real
and must be acknowledged.

## License compatibility note

This repository declares **MIT** per the project specification. However,
because parts of the code derive from a GPL-3.0-only upstream, distributors
should be aware that GPL obligations may attach to those derived files
unless they are re-implemented or the upstream author grants a relicensing
exception. Keeping this NOTICE file intact preserves attribution either way.

If you are the upstream author and want to discuss relicensing, please open
a discussion in this repository.

## Other credits

- TradingView® is a registered trademark of TradingView, Inc. This project
  is not affiliated with or endorsed by TradingView.
- Exchange names (dYdX, Hyperliquid, GMX, Perpetual Protocol, Bluefin) are
  trademarks of their respective owners; used descriptively.
- DEX SDKs used: `@dydxprotocol/v4-client-js`, `@nktkas/hyperliquid`,
  `@perp/sdk-curie`, `@bluefin-exchange/bluefin-v2-client`, `ethers`.
