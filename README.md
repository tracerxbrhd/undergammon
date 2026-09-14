# UNDERGAMMON

Telegram-first online Long Nardy and Classic Backgammon. Season 0 is a persistent
Open Beta. This is public-source **proprietary software**, not open source; see
[LICENSE](LICENSE) and [CONTRIBUTING.md](CONTRIBUTING.md).

Approved decisions remain in [docs/product](docs/product) and
[docs/architecture](docs/architecture). Read [AGENTS.md](AGENTS.md) before changing
behavior. See [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for verification
results, incomplete release requirements, and operator actions.

## Local development

Requirements: Node 24, pnpm 12.4.1, Docker with Compose 2.24.4 or newer.

```sh
npm install --global pnpm@12.4.1
pnpm install --frozen-lockfile
docker compose -f compose.test.yaml up -d --wait
cp .env.example .env
# Set BOT_TOKEN, BOT_USERNAME and other values in .env.
pnpm build
node --env-file=.env apps/server/dist/index.js
# In a separate terminal:
pnpm --filter @undergammon/miniapp dev
```

Open `http://localhost:5173`. Normal browser visits show the Telegram landing page.
There is no development authentication bypass. Actual Telegram launch requires a
Telegram-accessible HTTPS origin and a real bot; automated browser tests instead
sign synthetic launch data with a test-only token against the real authentication
implementation. The test harness never ships as an authentication route.

A Docker-only local smoke stack is also available:

```sh
docker compose --env-file .env -f compose.yaml -f compose.dev.yaml up -d --build --wait
# Landing page/API health: http://localhost:8080
```

The dev override binds the web port to loopback and turns off HTTPS cookies for
local HTTP. Never use `compose.dev.yaml` in production. The disposable test DB is
separate from the production database and binds only `127.0.0.1:55432`.

## Verification

```sh
pnpm build
pnpm lint
pnpm format:check
pnpm typecheck
TEST_DATABASE_URL=postgresql://undergammon_test:local_test_only@127.0.0.1:55432/undergammon_test pnpm test
pnpm exec playwright install chromium
TEST_DATABASE_URL=postgresql://undergammon_test:local_test_only@127.0.0.1:55432/undergammon_test pnpm test:e2e
docker compose --env-file .env.example config --quiet
```

PowerShell: set `$env:TEST_DATABASE_URL='postgresql://...'` before the test command.
Integration tests truncate their database: **never set TEST_DATABASE_URL to a real
application database**. Without that variable, database tests are explicitly skipped.
CI supplies an isolated PostgreSQL 18 service and runs the database and browser suites.
Build shared packages before typechecking because workspace exports point at `dist`.

## Production on one VPS

Point the A record for `undergammon.tracerxbrhd.ru` to the VPS. Only add an AAAA
record if IPv6 routing is configured. Allow inbound TCP 80/443 (and optionally UDP
443). PostgreSQL has no published production port. Install Docker Engine and Compose.

```sh
git clone https://github.com/tracerxbrhd/undergammon.git
cd undergammon
cp .env.example .env
chmod 600 .env
# Edit .env: supply the four required values below.
docker compose build
docker compose up -d db
docker compose run --rm server node dist/migrate.js
docker compose up -d --wait
curl --fail https://undergammon.tracerxbrhd.ru/health
```

Required owner values:

| Variable                  | Value                                                                          |
| ------------------------- | ------------------------------------------------------------------------------ |
| `POSTGRES_PASSWORD`       | Random URL-safe password; `openssl rand -hex 32` is suitable.                  |
| `BOT_TOKEN`               | Actual token from BotFather.                                                   |
| `BOT_USERNAME`            | Bot username without `@`, ending in `bot`.                                     |
| `TELEGRAM_WEBHOOK_SECRET` | Independent random URL-safe value, 32–256 characters.                          |
| `ADMIN_TELEGRAM_IDS`      | Optional comma-separated trusted Telegram numeric IDs. Empty grants no admins. |

Tuning defaults: `TURN_SECONDS=60`, `TELEGRAM_AUTH_MAX_AGE_SECONDS=300`,
`SESSION_HOURS=24`. Production Compose supplies `DATABASE_URL`, `PUBLIC_ORIGIN`,
`NODE_ENV`, and service ports. Native local execution uses these from `.env`.
`BOT_PORT` defaults to 3001 and server `PORT` to 3000.

In BotFather, configure the bot's **Main Mini App** and menu button to
`https://undergammon.tracerxbrhd.ru`. Main Mini App configuration is required for
`https://t.me/<BOT_USERNAME>?startapp=challenge_<token>` and match recovery links.
Users must start the bot to permit fallback messages. Production uses webhook,
never polling. Register it after HTTPS is live:

```sh
set -a
. ./.env
set +a
curl --fail --silent --show-error \
  --request POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  --data-urlencode 'url=https://undergammon.tracerxbrhd.ru/telegram/webhook' \
  --data-urlencode "secret_token=${TELEGRAM_WEBHOOK_SECRET}"
```

Do not paste this command's expanded token or environment into logs/issues.
Configure GitHub private vulnerability reporting before public launch.

For subsequent releases, build before restarting; then run migrations and
`docker compose up -d --wait`. A failed migration must stop deployment. The server
also applies pending migrations at startup, so plain `docker compose up --build`
works on a fresh configured host. Never use `down -v` for production updates.

The manual GitHub Actions workflow needs environment `production`, secrets
`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_KNOWN_HOSTS`, and variable `DEPLOY_PATH`
(an absolute checkout path without spaces). Pin the actual SSH host key; do not
replace verification with `StrictHostKeyChecking=no`. The selected workflow commit
is deployed; pushes to main never automatically deploy. Enable environment approval
if desired. Actual VPS access and secrets are operator setup, not repository defaults.

## Data and operational behavior

PostgreSQL snapshots and absolute deadlines are authoritative. A single transaction
advisory lock serializes state-changing domain operations for the initial one-server
beta; database uniqueness constraints additionally protect critical invariants.
This deliberately favors correctness over high-throughput multi-instance scaling.
Do not run multiple server replicas: live socket routing is process-local.

The engine's reviewed movement algorithms were selectively ported from the local
frozen `tracerxbrhd/backgammon` engine. No legacy infrastructure/history was imported.
Long Nardy follows the [federation's 2025 rules](https://sportnardy.ru/images/NARDI/Pravila_Nardy_30.04.2025.pdf),
including the second-player opening-double exception and transient blockade restriction.
Classic results use NORMAL/GAMMON/BACKGAMMON without reward multipliers or a cube.

Rating is Elo with expected score `1/(1+10^((opponent-rating)/400))`, K=64 during
10-game calibration and K=32 thereafter, rounded to an integer. Ratings are per
ruleset and season. Current application policy selects Season 0; future season
rollover tooling and five-game seasonal calibration remain future work.

Normal completion awards 100 XP to the winner and 40 to the loser; private games
use 50%. Surrender, timeout, abandon and no-contest award no XP to either player.
Level is derived from total XP using progressively increasing 100, 200, 300… costs.
Ranked wins award 20 Coins plus deterministic streak bonuses of 30/70/200 at
3/5/10 wins. Casual/private play awards no Coins. Constants live in
`apps/server/src/policy.ts`; there is no paid currency or shop.

Sessions use random opaque tokens, stored only as SHA-256 hashes, with HttpOnly
SameSite=Strict cookies (Secure in production). Telegram launch data expires after
five minutes by default; duplicate fields, invalid signatures and future timestamps
beyond 30 seconds are rejected. Admin authorization is rechecked on the server.

Short restarts preserve snapshots and turn deadlines. A persisted service heartbeat
identifies deadlines crossed during service unavailability; affected matches become
NO_CONTEST. Operators can explicitly invalidate an unfinished match with a reason
through `/api/admin/no-contest`. Completed-match compensation uses audited separate
adjustments; there is no unsafe completed-match rewrite API.

Deletion disables normal use immediately, with restoration through fresh validated
Telegram authentication for 30 days. Maintenance then removes provider bindings and
anonymizes current profile/match snapshots. Immutable internal audit/event records
remain access-controlled for integrity investigation; there is no public event-log API.

## Manual backup and restore

```sh
mkdir -p backups
docker compose exec -T db pg_dump -U undergammon -d undergammon -Fc > backups/undergammon.dump
# Copy the dump off the VPS yourself. Stop writers before a deliberate restore:
docker compose stop server bot
docker compose exec -T db pg_restore -U undergammon -d undergammon --clean --if-exists < backups/undergammon.dump
docker compose up -d --wait
```

Restore replaces database contents: confirm the target and backup first. Automated
off-site backups remain intentionally deferred. Keep dumps out of source control.
