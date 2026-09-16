# Update 2 release candidate

Update 2 is feature-frozen. This document defines the acceptance boundary for the next production deployment of UNDERGAMMON.

## Included in the release

The release candidate contains the completed post-Update 1 slices:

- Marble Checkers and the multi-slot cosmetics foundation;
- Obsidian Dice with owner-aware match presentation;
- Midnight Board with hybrid owner-aware board regions;
- Neon Reactions with sender-owned trusted presentation;
- acknowledged controlling-session takeover and reconnect recovery hardening;
- compact Telegram WebView polish for Store, Cosmetics and blocking match overlays.

No additional gameplay systems, economy features or cosmetic catalog expansion should be added before this release. Any new feature starts the next development cycle.

## Automated release gate

The candidate is eligible for real-device acceptance only when the repository Verify workflow is green on the exact PR head and includes:

- production build;
- ESLint;
- Prettier;
- strict workspace typecheck;
- unit, property and integration tests;
- Playwright E2E, including the Update 2 release-smoke flow;
- production dependency audit;
- Docker Compose configuration validation.

The release-smoke flow must cover the current purchasable cosmetic set as one system: purchase, independent equipment, reload persistence, trusted match snapshot, compact match presentation, reaction delivery, match completion and history persistence.

## Real Telegram acceptance

Run this checklist after the release-candidate PR is merged and before production deployment. Use at least two real Telegram accounts.

- Launch the Mini App from `@UndergammonBot` on a compact mobile viewport.
- Confirm RU and EN primary flows render without clipped controls or horizontal scrolling.
- Open Store and Cosmetics and inspect all five cosmetic slots.
- Purchase/equip the new Checker Set, Dice Skin, Board Theme and Reaction Pack on a test account with sufficient Coins.
- Reload the Mini App and confirm equipment persists.
- Create and complete one Long Nardy match.
- Create and complete one Classic Backgammon match.
- Exercise both casual matchmaking and a private challenge/invite.
- Confirm the opponent sees cosmetics attached to the correct owner.
- Send and receive all three semantic reactions (`WAVE`, `NICE`, `GG`).
- Reload the Mini App during an active match and confirm recovery.
- Open the same match from a second session of one account and use **Continue on this device** to transfer authoritative control.
- Confirm match result, XP/rating behavior where applicable, Coins and match history after completion.
- Confirm no gameplay-critical control is covered or unreachable on the smallest tested Telegram WebView.

Any failure in authentication, authoritative gameplay, reconnect/control transfer, persistence, match completion or data integrity blocks the release. Purely cosmetic imperfections may be deferred only when they do not obscure controls, board state or player identity.

## Production release procedure

1. Ensure the release-candidate commit is the current `main` head and its Verify run is green.
2. Create a PostgreSQL backup and copy it off the VPS.
3. Trigger the manual production deploy workflow for that exact commit, or follow the documented host-side update procedure.
4. Let migrations complete before application services are considered updated.
5. Require Docker services to become healthy and the public `/health` endpoint to pass.
6. Launch the production Mini App from Telegram with two real accounts and repeat a short post-deploy smoke: auth, Store/Cosmetics, private match, reaction, reconnect and match completion.

Do not use `docker compose down -v` during the update.

## Release decision

When automated Verify, the real Telegram acceptance checklist and the post-deploy smoke are all green, Update 2 is considered released. Remaining accepted items such as broad load testing, automated off-site backups, multi-instance realtime routing, larger cosmetic catalogs and Fastify maintenance remain separate follow-up work rather than reasons to keep this release open indefinitely.
