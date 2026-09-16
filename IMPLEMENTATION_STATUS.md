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

PR 2 is merged into `main` and adds the multi-slot cosmetics foundation plus the first Checker Set vertical slice. Its post-merge production/device verification remains separate from the repository-level implementation claim.

PR 3 is merged into `main` and adds the first Dice Skin vertical slice: Obsidian Dice, independent Dice Skin equipment, trusted match-snapshot capture and authoritative owner-aware dice presentation. Its post-merge production/device verification remains separate from the repository-level implementation claim.

PR 4 is merged into `main` and adds the first Board Theme vertical slice: Midnight Board, independent Board Theme equipment, trusted match-snapshot capture and hybrid owner-aware board presentation. Its post-merge production/device verification remains separate from the repository-level implementation claim.

PR 5 is merged into `main` and adds the first Reaction Pack vertical slice: Neon Reactions, independent Reaction Pack equipment, trusted match-snapshot capture and sender-owned realtime reaction presentation. Realtime semantics remain strictly `WAVE`, `NICE` and `GG`; packs only map those trusted semantics to application-owned presentation. Its post-merge production/device verification remains separate from the repository-level implementation claim.

PR 6 is merged into `main` and starts the production-hardening stage with controlling-session and reconnect recovery work:

- the Mini App transport tracks session control as `requesting`, `owned` or `lost` instead of optimistically treating a local button press as ownership;
- **Continue on this device** only restores gameplay after the server acknowledges the exact `OPEN` command;
- takeover intent survives a transient socket interruption and retries after reconnect;
- an offline client cannot hide `CONTROL_LOST` by pressing the takeover action when no command was sent;
- server-authoritative control ownership and match rules remain unchanged;
- deterministic transport coverage exercises acknowledgement, offline requests and reconnect retry semantics, while a multi-session browser scenario verifies real authoritative control transfer between two sessions of one Game Account.

Its post-merge production/device verification remains separate from the repository-level implementation claim.

PR 7 is implemented in this change as the Update 2 release-candidate hardening slice:

- Update 2 is feature-frozen; new gameplay, economy and cosmetic catalog work moves to the next development cycle;
- compact Store/Cosmetics cards remain usable down to the supported 320px Telegram WebView width;
- reaction and blocking match overlays are constrained for narrow mobile viewports;
- a release-smoke browser scenario covers the current purchasable cosmetic set as one system: purchase, independent equipment, reload persistence, trusted private-match snapshot, compact presentation, reaction delivery, match completion and history persistence;
- [`docs/operations/update-2-release.md`](docs/operations/update-2-release.md) defines the automated gate, two-account real Telegram acceptance, backup/deploy and post-deploy smoke checklist.

PR 7 is not production-verified until it is merged, deployed and exercised on real Telegram clients.

The core production path works, but broader feedback is still useful for:

- Android/iOS Telegram WebView and compact-viewport coverage beyond the devices already used for acceptance;
- Store/Cosmetics interaction polish and visual feedback;
- Profile Frame, Checker Set, Dice Skin, Board Theme and Reaction Pack presentation across unusual viewport sizes and real-device match sessions;
- less frequently exercised admin, account-lifecycle and notification/recovery paths;
- localization/editorial polish outside the main RU/EN player journey.

These are not claims that the underlying features are absent; they are areas where wider real-device/player coverage is still valuable.

## Partial / known technical debt

- Cosmetics remain intentionally narrow: `PROFILE_FRAME`, `CHECKER_SET`, `DICE_SKIN`, `BOARD_THEME` and `REACTION_PACK` are functional slots with focused non-default Store items. Broad catalogs are intentionally deferred.
- `resolveMatchCosmetics` / `ResolvedMatchCosmetics` resolves trusted owner-aware Profile Frames, Checker Sets, Dice Skins, Board Themes and Reaction Packs. The catalog remains deliberately small rather than generalized into remote/custom skin content.
- Board Theme composition deliberately themes owner regions while keeping the shared center deterministic and neutral; broader theme catalogs and richer visual assets are deferred until the first hybrid slice has real-device feedback.
- The backend is a single process and live socket routing is process-local. Do not run multiple server replicas with the current realtime architecture.
- The transaction advisory-lock strategy deliberately prioritizes correctness over throughput; broad load/capacity testing has not been performed.
- Some secondary/admin strings and uncommon internal errors still need editorial localization polish.
- Automated off-site PostgreSQL backup is not configured; the documented operational baseline is manual `pg_dump` plus copying backups off the VPS.
- Fastify still emits the `FSTDEP023` deprecation warning for the current request-logging configuration; this is maintenance debt rather than a Season 0 gameplay blocker.

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
- broad Board Theme / Dice Skin / Reaction Pack / Checker Set catalog expansion beyond the current focused vertical slices.

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

PR 3 added focused catalog/resolver/integration coverage plus an end-to-end Obsidian Dice purchase -> equip -> reload-persistence scenario. BoardScene unit coverage verifies opening-roll owner mapping and active-player Dice Skin mapping for both supported rulesets.

PR 4 added focused protocol/catalog/resolver coverage, BoardScene perspective tests for hybrid theme-region ownership in both supported rulesets, and an end-to-end Midnight Board purchase -> equip -> reload -> new-match-snapshot scenario.

PR 5 added focused protocol/catalog/resolver coverage and an end-to-end Neon Reactions purchase -> equip -> reload -> new-match-snapshot -> realtime sender-owned presentation scenario.

PR 6 added transport-level tests for acknowledged controlling-session ownership, offline requests and reconnect retry, plus a browser scenario with two sessions for one Game Account that verifies explicit authoritative control transfer.

PR 7 adds the aggregate Update 2 release-smoke scenario and compact-layout assertions. Its final verification result should be taken from the PR CI run rather than inferred from this document.

## Current release position

There is no known documentation-level reason to treat real Telegram setup, production deployment, Daily Reward, Store or permanent Season 0 cosmetic ownership as future release blockers. Profile Frame functionality is production-verified; PR 2, PR 3, PR 4, PR 5 and PR 6 are merged. PR 7 is the final code-level release-candidate gate before Update 2 real Telegram acceptance and production deployment.

Season 0 remains an Open Beta. Production verification does not imply broad scale/load validation or completion of every deferred product specification.
