# Deployment Guide

Three supported paths: Docker Compose (self-host), any Node host (VPS,
Railway, Fly.io), and development mode.

## Docker Compose (production)

`docker-compose.yml` runs three services: `postgres`, `api`, `web`.

```bash
cp .env.example .env        # fill DATABASE_URL, passphrase, DEX keys
docker compose up -d --build
docker compose exec api pnpm db:migrate
```

- Dashboard: `http://<host>:3001`
- API + Swagger: `http://<host>:3000/docs`
- Put a TLS reverse proxy (Caddy/Traefik/Nginx) in front; TradingView
  requires HTTPS webhook URLs.

## VPS / bare Node (pnpm ≥ 9, Node ≥ 20)

```bash
pnpm install
pnpm build                       # turbo build: core → api → web
pnpm db:migrate
node apps/api/dist/index.js      # API :3000
node apps/web/.next/standalone/server.js   # Dashboard :3001
```

Run under a process manager (systemd, PM2). Set `API_HOST=0.0.0.0`.

## Railway / Render / Fly.io

- **API**: root = `apps/api`, build `pnpm install && pnpm --filter @omdb/api build`,
  start `node dist/index.js`. Attach a managed PostgreSQL and set
  `DATABASE_URL`; release command `pnpm db:migrate`.
- **Web**: root = `apps/web`, `NEXT_PUBLIC_API_URL=https://api.<domain>`.
  The Next config uses `output: "standalone"` for slim images.

## Environment checklist (production)

- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` points at a private Postgres
- [ ] `WEBHOOK_PASSPHRASE` set (random)
- [ ] `CREDENTIALS_ENCRYPTION_KEY` = `openssl rand -hex 32`
- [ ] `CORS_ORIGINS=https://dashboard.<domain>` (no `*`)
- [ ] DEX credentials for exactly the exchanges you route to
- [ ] TLS termination in front of both ports
- [ ] Backups: Postgres dumps contain your trade history (`pg_dump omdb`)

## Health & monitoring

- `GET /healthz` — liveness probe
- Pino JSON logs on stdout → ship to any log aggregator
- Alert rejections appear in the dashboard Alert Log with reasons

## Scaling notes

The current design targets a single trading instance (strategy state is
in-process, nonces in-memory). For HA: run one trading instance, and scale
only the read-only dashboard behind it.
