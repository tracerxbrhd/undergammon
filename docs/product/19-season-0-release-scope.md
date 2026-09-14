# Season 0 Release Scope

## Status

Accepted product decisions for the first public UNDERGAMMON beta release.

Season 0 is an **Open Beta / soft launch**. Registration is open to anyone who reaches the bot or Mini App; there is no whitelist or invite-code system. Distribution can remain intentionally small at first, but the product itself is not technically gated.

## Release principle

Season 0 is allowed to be visually incomplete in non-critical areas, but it must not compromise authoritative gameplay, realtime correctness, account progression, or rating integrity.

A defect that can corrupt authoritative match state, lose an active match, produce an invalid rules result, award the wrong rating/result, or break core reconnect/recovery is a release blocker.

## Required before opening Season 0

The following are launch requirements:

- Telegram bot entry flow and Mini App launch.
- Game Account creation and authentication through validated Telegram init data.
- Both canonical rulesets:
  - Long Nardy;
  - Classic Backgammon.
- Both rulesets must pass the complete PvP lifecycle.
- Private challenges through Telegram sharing.
- Casual matchmaking.
- Ranked matchmaking.
- Server-authoritative dice and gameplay state.
- Reconnect and match recovery.
- Turn timeout, surrender, disconnect and finish-state handling.
- Correct match result persistence.
- Rating and calibration flows.
- Account Level and XP progression from the first day.
- Coins earning and durable balance/ledger persistence.
- Profile.
- Private match history.
- Separate leaderboards for both rulesets.
- Optional tutorial for both rulesets.
- Full Rules Reference for both rulesets.
- Minimal transactional bot notifications required for active-flow recovery, including challenge acceptance and match recovery.
- Minimal hidden Admin tab with the previously defined moderation and controlled rating/Coins adjustment capabilities.
- Basic server-side telemetry and structured operational logs.
- Real-device end-to-end verification, including Android Telegram versus iPhone Telegram gameplay.

## Not release blockers

The following may be added in updates during Season 0 and must not delay the beta when the core game is otherwise ready:

- AI opponent mode.
- Daily rewards.
- Full cosmetic shop.
- Large cosmetic catalog.
- Advanced cosmetic effects.
- Level-up rewards.
- Full achievements system.
- Analytics dashboard.
- Automated crash-reporting service.
- In-app bug-report/ticket system.
- Real-money monetization / Telegram Stars.
- Tournament system.

## Economy during early Season 0

Coins are real persistent account progression from the first day even if the cosmetic store is not yet available.

Players may accumulate Coins before meaningful spend options exist. Those Coins are not removed when the cosmetic store or new skins are introduced later.

At launch, the critical economy requirement is therefore:

1. correct earning rules;
2. durable balance and ledger storage;
3. safe administrative corrections;
4. persistence across deployments and Season 0 updates.

A rich catalog is content, not a launch prerequisite.

## Season 0 persistence

Season 0 is part of the permanent history of a Game Account.

There is **no planned wipe** when Season 1 begins. Account Level, XP, Coins, owned cosmetics, historical Season 0 participation and beta-specific status/rewards must survive the transition.

Ranked ratings transition to Season 1 using the previously defined soft-reset and seasonal-calibration model rather than a full reset to the starting rating.

A full data wipe is acceptable only as an emergency recovery measure for a fundamental data-model or integrity failure that cannot be repaired safely through migration or reconciliation.

## Product positioning

Season 0 should be visibly identified as an Open Beta / testing season so users understand that the product is still being tuned.

This beta status does not mean progression is disposable. Users who participate in Season 0 are playing on their real persistent Game Accounts and their valid progression is intended to remain.