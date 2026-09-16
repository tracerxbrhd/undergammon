# Season 0 implementation status

Snapshot: 2026-09-16. UNDERGAMMON is a deployed Telegram-first Season 0 Open Beta, not an undeployed prototype or local-only beta candidate. Production runs at `https://undergammon.tracerxbrhd.ru` with Telegram entry through `@UndergammonBot`.

## Implemented and production-verified

The following capabilities are implemented on `main` and have also been exercised with real Telegram accounts in production:

- Telegram `initData` authentication and Game Account creation;
- Telegram Mini App launch through the production bot;
- Long Nardy and Classic Backgammon PvP;
- server-authoritative dice, move validation, match state and results;
- casual matchmaking and private challenge/invite flows;
- realtime gameplay and reconnect/recovery;
- persistent profiles, per-ruleset Season 0 ratings, leaderboards, XP/level and match history;
- ranked Coin rewards backed by the append-only Coin ledger;
- 7-day progressive Daily Reward with explicit claim and authoritative Coin crediting;
- permanent cosmetic ownership and equipment with backend ownership/slot validation;
- Season 0 Tester Profile Frame;
- Store purchase flow with Bronze Profile Frame purchasable for Coins;
- purchase without auto-equip, plus `Store -> purchase -> Cosmetics -> equip -> Profile -> Default` flow;
- Profile/public-profile and match identity presentation of equipped Profile Frames;
- five primary Mini App destinations: `Store | Cosmetics | Play | Rankings | Profile`, with Play central;
- Docker Compose production deployment on the VPS with Caddy/HTTPS and PostgreSQL persistence.

Update 1 is implemented and deployed. Its functional chain is:

`Season 0 identity -> Daily Reward / ranked Coins -> Store -> ownership -> equipment -> cosmetic presentation`

## Implemented but requiring more tester feedback

PR 2 is implemented in this change and covered by repository verification, but is not production-verified until it is merged and deployed. It adds:

- Marble Checker Set as a second purchasable cosmetic type;
- multi-slot cosmetic identity using `(slot, cosmeticId)` across Store ownership, purchase references and equipment;
- independent Profile Frame / Checker Set equipment and `Default` fallback;
- owner-aware match presentation of equipped Checker Sets, including different sets for both participants;
- a reserved `DICE_SKIN` application slot with `Default` as its only current content.

The core production path works, but broader feedback is still useful for:

- Android/iOS Telegram WebView and compact-viewport coverage beyond the devices already used for acceptance;
- Store/Cosmetics interaction polish and visual feedback;
- Profile Frame and Checker Set presentation across unusual viewport sizes and real-device match sessions;
- less frequently exercised admin, account-lifecycle and notification/recovery paths;
- localization/editorial polish outside the main RU/EN player journey.

These are not claims that the underlying features are absent; they are areas where wider real-device/player coverage is still valuable.

## Partial / known technical debt

- Cosmetics remain intentionally narrow: `PROFILE_FRAME` and `CHECKER_SET` are functional slots. `DICE_SKIN` is reserved in the application contract but has only `Default`; Board Themes and Reaction Packs are not implemented content yet.
- `resolveMatchCosmetics` / `ResolvedMatchCosmetics` and BoardScene owner-aware hooks resolve trusted Profile Frames and per-owner Checker Sets. Board Theme and Dice Skin presentation currently fall back to `Default`.
- Primary navigation is correctly five-tab and configuration-driven, but the current glyphs are Unicode presentation shortcuts rather than the intended production icon set.
- The backend is a single process and live socket routing is process-local. Do not run multiple server replicas with the current realtime architecture.
- The transaction advisory-lock strategy deliberately prioritizes correctness over throughput; broad load/capacity testing has not been performed.
- Some secondary/admin strings and uncommon internal errors still need editorial localization polish.
- Automated off-site PostgreSQL backup is not configured; the documented operational baseline is manual `pg_dump` plus copying backups off the VPS.

## Intentionally deferred

The following are accepted deferrals rather than current defects:

- AI opponent mode;
- Telegram Stars / real-money currency or monetization;
- battle pass and large achievement systems;
- rotating/FOMO Store mechanics and personalized offers;
- leagues/tournaments;
- doubling cube;
- recent-opponent avoidance in matchmaking;
- Redis, queues and microservices;
- multi-instance realtime routing;
- automated off-site backup work;
- native App Store / Google Play standalone clients;
- broad Board Theme / Dice Skin / Reaction Pack catalog expansion and a larger Checker Set catalog beyond the current focused vertical slice.

## Deployment / operational notes

Production is live on one VPS using Docker Compose, Caddy and PostgreSQL. PostgreSQL is kept on the internal Docker network and production data lives in a persistent volume.

Production deployment remains deliberately manual. `.github/workflows/deploy.yml` is triggered with `workflow_dispatch`, runs the verification workflow first, deploys the selected commit to the VPS, runs migrations, updates services and checks `https://undergammon.tracerxbrhd.ru/health`. Merging to `main` does **not** automatically deploy production.

The current operational model has no staging environment, Redis, queue infrastructure, microservices or multiple realtime server replicas. Manual backup/restore commands are documented in [`docs/operations/README.md`](docs/operations/README.md); automated off-site backups remain deferred.

## Verification baseline

Update 1 final verification for PR #11 passed the repository's production verification baseline:

- build;
- ESLint;
- Prettier format check;
- strict workspace typecheck;
- **78 unit/integration tests**;
- Playwright E2E, including the Store -> purchase -> equip -> Profile -> Default flow;
- production dependency audit;
- Docker Compose configuration validation.

The repository CI definition runs the same core build/lint/format/typecheck/test/E2E/audit/Compose checks against an isolated PostgreSQL service. Tests and exact local commands are documented in [`docs/development/README.md`](docs/development/README.md). Integration tests truncate their test database: never point `TEST_DATABASE_URL` at production data.

## Current release position

There is no known documentation-level reason to treat real Telegram setup, production deployment, Daily Reward, Store or permanent Season 0 cosmetic ownership as future release blockers. Profile Frame functionality is production-verified; PR 2 adds the multi-slot Checker Set vertical slice pending deployment/real-device verification after merge.

Season 0 remains an Open Beta. Production verification does not imply broad scale/load validation or completion of every deferred product specification.
