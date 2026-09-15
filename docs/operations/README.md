# Production operations guide

This document is the current production runbook for UNDERGAMMON. The accepted architecture and deployment constraints remain defined in [docs/architecture/22-hosting-and-deployment.md](../architecture/22-hosting-and-deployment.md).

## Current production model

Production runs on one VPS using Docker Compose, Caddy and PostgreSQL.

Public origin:

- `https://undergammon.tracerxbrhd.ru`

The backend/realtime process is intentionally single-instance because live socket routing is process-local. Do not run multiple server replicas with the current architecture.

PostgreSQL has no published production port and remains reachable only inside the Docker network.

## Fresh VPS bootstrap

Point the A record for `undergammon.tracerxbrhd.ru` to the VPS. Only add an AAAA record if IPv6 routing is configured. Allow inbound TCP 80/443 and, if desired, UDP 443. Install Docker Engine and Docker Compose.

```sh
git clone https://github.com/tracerxbrhd/undergammon.git
cd undergammon
cp .env.example .env
chmod 600 .env
# Edit .env and supply the required owner values below.
docker compose build
docker compose up -d db
docker compose run --rm server node dist/migrate.js
docker compose up -d --wait
curl --fail https://undergammon.tracerxbrhd.ru/health
```

Required owner-managed values:

| Variable | Requirement |
| --- | --- |
| `POSTGRES_PASSWORD` | Random URL-safe password; `openssl rand -hex 32` is suitable. |
| `BOT_TOKEN` | Actual token from BotFather. |
| `BOT_USERNAME` | Bot username without `@`, ending in `bot`. |
| `TELEGRAM_WEBHOOK_SECRET` | Independent random URL-safe value, 32–256 characters. |
| `ADMIN_TELEGRAM_IDS` | Optional comma-separated trusted Telegram numeric IDs. Empty grants no admins. |

Current tuning defaults are `TURN_SECONDS=60`, `TELEGRAM_AUTH_MAX_AGE_SECONDS=300` and `SESSION_HOURS=24`.

Production Compose supplies `DATABASE_URL`, `PUBLIC_ORIGIN`, `NODE_ENV` and service ports. Native local execution uses these from `.env`. `BOT_PORT` defaults to 3001 and server `PORT` to 3000.

## Telegram production setup

In BotFather, configure the bot's **Main Mini App** and menu button to:

```text
https://undergammon.tracerxbrhd.ru
```

Main Mini App configuration is required for `https://t.me/<BOT_USERNAME>?startapp=challenge_<token>` and match recovery links.

Users must start the bot to permit fallback messages. Production uses webhook delivery, not polling.

After HTTPS is live, register the webhook:

```sh
set -a
. ./.env
set +a
curl --fail --silent --show-error \
  --request POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  --data-urlencode 'url=https://undergammon.tracerxbrhd.ru/telegram/webhook' \
  --data-urlencode "secret_token=${TELEGRAM_WEBHOOK_SECRET}"
```

Never paste the expanded token, webhook secret or environment contents into logs, issues or pull requests.

## Production updates

Production deployment is deliberately manual. Merging to `main` does **not** automatically deploy production.

For a manual host-side update, build before restarting, run migrations and then update the Compose services. A failed migration must stop the deployment.

```sh
git pull --ff-only
docker compose build
docker compose up -d db
docker compose run --rm server node dist/migrate.js
docker compose up -d --wait
curl --fail https://undergammon.tracerxbrhd.ru/health
```

The server also applies pending migrations at startup, so a configured fresh host can recover from a plain build/up path, but explicit migration execution remains preferable for controlled production releases.

Never use `docker compose down -v` for production updates.

## GitHub Actions deployment

The manual deployment workflow uses the GitHub `production` environment and requires:

Secrets:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_KNOWN_HOSTS`

Variable:

- `DEPLOY_PATH` — absolute checkout path without spaces

Pin the actual SSH host key. Do not replace host verification with `StrictHostKeyChecking=no`.

The workflow deploys the selected commit, runs repository verification first, executes migrations, updates services and checks the public `/health` endpoint. Environment approval may be enabled if desired.

Actual VPS access and secrets are operator-managed configuration, not repository defaults.

## Backup

Automated off-site PostgreSQL backup is not currently configured. The Season 0 baseline is manual `pg_dump` plus copying the resulting dump off the VPS.

Create a backup:

```sh
mkdir -p backups
docker compose exec -T db pg_dump -U undergammon -d undergammon -Fc > backups/undergammon.dump
```

Copy the resulting dump off the VPS. Backup files must never be committed to the repository.

## Restore

A deliberate restore replaces database contents. Confirm the target and backup before proceeding and stop application writers first.

```sh
docker compose stop server bot
docker compose exec -T db pg_restore -U undergammon -d undergammon --clean --if-exists < backups/undergammon.dump
docker compose up -d --wait
```

After restoration, verify the public health endpoint and application behavior before reopening normal operations.

## Operational safety notes

- Do not expose PostgreSQL publicly.
- Do not run multiple realtime backend replicas with the current process-local socket routing.
- Do not commit `.env`, database dumps, logs containing credentials or Telegram authentication payloads.
- A failed migration is a deployment failure; do not continue with an incompatible application revision.
- Short restarts are designed to preserve persisted match snapshots and deadlines, but production changes should still be deliberate while active matches may exist.

## Useful references

- [Documentation index](../README.md)
- [Hosting and deployment architecture](../architecture/22-hosting-and-deployment.md)
- [Backend data model](../architecture/26-backend-data-model.md)
- [Security and source licensing](../architecture/28-security-and-source-licensing.md)
- [Current implementation status](../../IMPLEMENTATION_STATUS.md)
