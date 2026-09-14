# Season 0 implementation status

Verified locally on 2026-09-14. This repository now contains an integrated playable
beta candidate, not just scaffolding. Production has **not** been deployed or
validated against a real Telegram bot. No real credentials were created or committed.

## Implemented and integrated

- Strict TypeScript/pnpm workspaces, React/Vite/Tailwind Mini App, Fastify/plain
  WebSocket server, thin grammY webhook bot, PostgreSQL, Drizzle versioned migrations.
- Pure deterministic Long Nardy and Classic Backgammon engine: full-turn legal
  generation/validation, mandatory dice use, doubles, opening, bearing off, head
  restrictions/blockades, hits/bar, result classification and serialization.
  Appropriate algorithms and regression tests were selectively ported from the
  frozen legacy repository; its infrastructure was not imported.
- Raw Telegram initData signature/freshness validation, internal account UUIDs,
  hashed opaque sessions, production secure cookies, origin/host checks, runtime
  contracts, HTTP/WebSocket limits and server-side admin authorization.
- Persistent casual/ranked queues, private challenges with expiry and first-valid
  acceptance, self-accept protection, one unfinished match per account, private/
  casual rematches. No direct ranked rematch.
- Cryptographically random server dice, full-turn validation, persisted versions,
  command idempotency, controlling-connection takeover, reconnect snapshots,
  initial-join/turn/disconnect deadlines, surrender, completion and recovery.
- Transactional result/rating/XP/Coin finalization; NO_CONTEST has no progression
  effects. Immutable audit/event/Coin ledger records and database constraints.
- Separate per-ruleset Season 0 Elo ratings, 10-game initial calibration,
  leaderboards, permanent XP/level, ranked win and streak Coins. Formula/reward
  constants are isolated and documented in README.
- Pseudonymous profiles, curated sample avatars/nickname words, nickname cooldown
  and basic moderation, public profile aggregates, private paginated history,
  settings, 30-day deletion/restoration and scheduled identity anonymization.
- Admin account lookup/details, suspension/ban/unban, nickname reset, Coin/rating
  adjustments with reasons and audit. Emergency unfinished-match NO_CONTEST API.
- Touch-first portrait board, legal highlights, local draft/undo/confirm, move
  playback, dice/timer HUD, surrender, reactions, reconnect/takeover, results,
  profile/history/leaderboards/rules/settings and hidden admin entry.
- RU/EN player copy and rules, small interactive bearing-off tutorial, optional
  haptic/sound feedback, clean unauthenticated browser landing and Telegram CTA.
- Bot /start launch, challenge/recovery Mini App links, durable notification
  delivery with bounded retry and suppression while an account is present.
- Production Docker Compose/Caddy, isolated local/test overrides, persistent DB
  without a public production port, health routes, CI and manual production workflow.
  Proprietary LICENSE, contribution and security policies.

## Partial or not yet verified

- Real Telegram Android/iOS/webview interaction, actual webhook delivery and
  challenge/recovery notifications require owner credentials and device acceptance.
  Automated browser tests use signed synthetic Telegram data against real auth;
  there is no production authentication bypass.
- RU/EN localization covers the main player journey; some admin labels and uncommon
  internal error values still need editorial localization. Tutorial is deliberately
  short and not a complete guided course.
- Seasonal storage supports later seasons, but rollover/soft-reset operations,
  five-game returning-season calibration, historical-season UI and a permanent
  Season 0 cosmetic marker are not implemented.
- Matchmaking does not preferentially avoid recent opponents. Critical system
  notification operations lack a dedicated admin composing surface. NO_CONTEST is
  available through the admin API rather than an admin screen.
- Single backend process is required. The transaction advisory lock deliberately
  serializes mutations; capacity/load testing and multi-instance socket routing
  are not provided. No production traffic/load claims are made.
- New profile/tutorial/admin flows have type and build verification, but not the
  same end-to-end browser coverage as matchmaking/gameplay/reconnect.
- Identity/profile snapshots are anonymized after retention; immutable private
  audit/event records are retained for integrity. Review the retention policy
  before public launch if different legal retention requirements apply.

## Intentionally deferred P1

AI opponents/difficulty, daily rewards, cosmetic inventory/shop, large catalogs
and richer effects are omitted. No paid currency, Telegram Stars, leagues or
doubling cube. Automated off-site backups remain outside this pass's scope.

## Verification results

- Frozen-lockfile install: passed using Node 24.19 and pnpm 12.4.1.
- ESLint, Prettier check, strict workspace typechecks: passed.
- Vitest: **46 tests passed across 9 files**, including real PostgreSQL integration
  tests and complete server-controlled games under both rulesets.
- Playwright Chromium: **3 tests passed**: mobile browser landing and two-player
  matchmaking/move submission/reconnect/surrender for each ruleset.
- Production workspace builds and all three Docker image builds: passed.
- Production Compose configuration and Caddy configuration validation: passed.
- Local Docker smoke stack: DB/server/bot started healthy, web started; landing,
  `/api/config` and `/health` returned HTTP 200 through Caddy.
- Code review/search found no TypeScript `any` escape hatches or `@ts-ignore`.
- Benign tooling notices remain: npm does not understand pnpm's
  strict-peer-dependencies setting; Fastify warns about its future removal of the
  current request-logging option. They do not fail the checks.

Tests and exact local commands are documented in README. Database integration
tests truncate their test database: never point TEST_DATABASE_URL at real data.

## Owner configuration

Populate `.env` from `.env.example`:

| Variable                | Required value                                                           |
| ----------------------- | ------------------------------------------------------------------------ |
| POSTGRES_PASSWORD       | Independent random URL-safe password                                     |
| BOT_TOKEN               | Real BotFather token                                                     |
| BOT_USERNAME            | Actual bot username without @                                            |
| TELEGRAM_WEBHOOK_SECRET | Independent random URL-safe 32–256 character secret                      |
| ADMIN_TELEGRAM_IDS      | Comma-separated numeric admin Telegram identities; empty disables admins |

Defaults: TURN_SECONDS=60, TELEGRAM_AUTH_MAX_AGE_SECONDS=300, SESSION_HOURS=24.
Production Compose supplies DATABASE_URL, PUBLIC_ORIGIN and NODE_ENV. Native local
execution needs their `.env.example` values adapted to its local database/origin.

## Production deployment

Run on the VPS after these changes have been published to the repository:

```sh
git clone https://github.com/tracerxbrhd/undergammon.git
cd undergammon
cp .env.example .env
chmod 600 .env
# Edit .env with the owner values listed above.
docker compose build
docker compose up -d db
docker compose run --rm server node dist/migrate.js
docker compose up -d --wait
curl --fail https://undergammon.tracerxbrhd.ru/health
```

Point domain A/appropriate AAAA records to the VPS, allow ports 80/443, configure
BotFather Main Mini App and menu URL as `https://undergammon.tracerxbrhd.ru`, and
start the bot with the tester accounts. Register the webhook once HTTPS is ready:

```sh
set -a
. ./.env
set +a
curl --fail --silent --show-error --request POST \
  "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  --data-urlencode 'url=https://undergammon.tracerxbrhd.ru/telegram/webhook' \
  --data-urlencode "secret_token=${TELEGRAM_WEBHOOK_SECRET}"
```

Manual GitHub deployment needs production environment secrets VPS_HOST, VPS_USER,
VPS_SSH_KEY, VPS_KNOWN_HOSTS and variable DEPLOY_PATH. No automatic main-branch
deployment is configured. README includes update and manual backup/restore commands.

## Release gates

No known failing local build/test or core gameplay blocker remains. Public release
still requires real bot/DNS/TLS setup and a real-device two-account acceptance pass,
including challenge deep links, disconnect/reconnect and bot fallback delivery.
The partial P0 items above mean this is not a claim of complete specification
coverage. Review and publish the working-tree changes before deploying from GitHub.
