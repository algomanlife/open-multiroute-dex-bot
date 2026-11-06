# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 2.x     | ✅        |
| 1.x (upstream tradingview-alert-connector) | ❌ |

## Reporting a vulnerability

Please report vulnerabilities privately:

1. Open a **private security advisory** via GitHub's
   "Report a vulnerability" tab on the Security page of this repository, or
2. Email the maintainer directly (see the repository owner profile).

Please include reproduction steps and affected components. We aim to respond
within 72 hours and to ship a fix for confirmed issues within 14 days.

**Do not open public GitHub issues for security problems.**

## Security features in this project

- **Webhook passphrase** — alerts without the matching `WEBHOOK_PASSPHRASE`
  are rejected.
- **Rate limiting** — webhook and global request limits via `@fastify/rate-limit`.
- **Credential encryption at rest** — AES-256-GCM with
  `CREDENTIALS_ENCRYPTION_KEY`; secrets are never returned by any API.
- **Security headers** — `@fastify/helmet`.
- **CORS allow-list** — `CORS_ORIGINS` (never `*` in production).
- **Session tokens** — 256-bit random, DB-backed, TTL-expiring.

## Hardening checklist for operators

- Run behind TLS (reverse proxy or platform ingress).
- Set a long random `WEBHOOK_PASSPHRASE`.
- Generate `CREDENTIALS_ENCRYPTION_KEY` with `openssl rand -hex 32`.
- Restrict `CORS_ORIGINS` to your dashboard origin.
- Keep the PostgreSQL instance private (compose network / private subnet).
- Never commit `.env` files or private keys.
- Trading accounts should use **dedicated, withdraw-limited** API credentials.
