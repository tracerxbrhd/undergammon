# Account Level and XP Progression

## Status

Accepted and implemented for Season 0. The current XP policy is server-owned and exposed to the client through shared progression contracts.

## Purpose

UNDERGAMMON has a permanent Account Level that represents long-term activity and play history. It is intentionally separate from competitive rating and seasonal progression.

- Rating represents skill in a specific ruleset.
- Seasons represent current competitive performance.
- Account Level represents cumulative participation over the lifetime of the account.

Account Level must never affect matchmaking, dice RNG, game rules, or competitive rating.

## Current XP sources

Current playable PvP modes grant Account XP only for naturally completed `BEAR_OFF` matches:

- Ranked PvP: winner `100 XP`, loser `40 XP`;
- Casual PvP: winner `100 XP`, loser `40 XP`;
- Private / friend match: winner `50 XP`, loser `20 XP`.

The values above are application policy, owned by the server rather than client UI.

AI is intentionally deferred in Season 0. If AI is implemented later, its XP policy must be accepted explicitly rather than inferred from this document.

## Result rules

A naturally completed win grants more XP than a naturally completed loss.

A normal, honestly completed loss still grants meaningful XP.

The current implementation grants no XP for non-`BEAR_OFF` finishes, including:

- surrender;
- abandon / disconnect loss;
- timeout;
- start timeout / incomplete match;
- technical no-contest.

This keeps prematurely terminated matches from becoming an XP farming mechanism.

## No duration-based XP

XP does not depend on:

- match duration;
- number of turns;
- number of checker moves;
- captures;
- bearing-off count before completion;
- other low-level gameplay actions.

This avoids rewarding players for intentionally extending matches and keeps progression understandable.

## Permanent progression

Account Level is permanent.

- It does not reset between seasons.
- XP is never removed because of losses.
- Account Level does not decrease.
- Seasonal soft resets affect rating only, not Account XP.

## Level model

There is no hard maximum Account Level.

The XP required for each next level grows progressively. The current server policy derives the level from authoritative `totalXp`; level is not maintained as an independently mutable counter.

Conceptually:

```ts
account.totalXp = 18_420;
accountLevel = levelFromXp(account.totalXp);
```

The shared profile/result contracts expose authoritative level-progress boundaries (`LevelProgress`) so the Mini App does not duplicate the XP curve merely to render progress.

This prevents `level`, `totalXp` and UI progress from drifting out of sync while preserving future balancing options.

## Rewards

Level-up rewards are not implemented/required for Season 0.

The progression model can later support rewards attached to levels without redesigning XP storage or progression semantics. Potential future rewards include:

- Coins;
- profile frames;
- dice skins;
- board cosmetics;
- badges;
- other non-gameplay cosmetic rewards.

No future level reward may provide a gameplay or ranked advantage.

## Presentation

Account Level is public account metadata.

It may be shown in:

- the player's public profile;
- player/profile cards;
- leaderboard-related player details where appropriate.

The owner Profile additionally receives authoritative `LevelProgress` data for progress-bar presentation. Match result progression is exposed as authoritative match-attributed data rather than inferred from unrelated profile snapshots.

Account Level should not be permanently displayed in the in-match HUD. The match HUD should remain focused on information that matters to the active game, such as nickname, avatar, ruleset rating, turn state, timer, dice, and connection state.

Account Level must not visually imply competitive strength or replace the ruleset-specific rating.
