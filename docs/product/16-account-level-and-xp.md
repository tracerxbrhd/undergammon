# Account Level and XP Progression

## Status

Accepted product decisions for the first public release / Season 0.

## Purpose

UNDERGAMMON has a permanent Account Level that represents long-term activity and play history. It is intentionally separate from competitive rating and seasonal progression.

- Rating represents skill in a specific ruleset.
- Seasons represent current competitive performance.
- Account Level represents cumulative participation over the lifetime of the account.

Account Level must never affect matchmaking, dice RNG, game rules, or competitive rating.

## XP Sources

All playable match types may grant Account XP so that every form of play provides at least some persistent progression:

- Ranked PvP
- Casual PvP
- Private / friend matches
- AI matches

Different modes may use different XP multipliers. Exact values are tuning parameters and are not fixed in the product contract yet.

Ranked and normal PvP should generally be more efficient sources than easily farmable modes such as AI. Private and AI matches still grant meaningful XP.

## Result Rules

A completed win grants more XP than a completed loss.

A normal, honestly completed loss still grants meaningful XP.

The following outcomes grant no XP:

- Surrender
- Abandon / disconnect loss
- Technical no-contest

Timeout handling should follow the same anti-farming principle as other prematurely terminated matches and must not become a convenient XP farming mechanism.

The core model should remain simple:

`base completed-match XP + win bonus`, then apply a mode multiplier.

Exact amounts and multipliers should be tuned during Season 0 rather than hard-coded as immutable product rules.

## No Duration-Based XP

XP does not depend on:

- match duration;
- number of turns;
- number of checker moves;
- captures;
- bearing-off count;
- other low-level gameplay actions.

This avoids rewarding players for intentionally extending matches and keeps progression understandable.

## Permanent Progression

Account Level is permanent.

- It does not reset between seasons.
- XP is never removed because of losses.
- Account Level does not decrease.
- Seasonal soft resets affect rating only, not Account XP.

## Level Model

There is no hard maximum Account Level.

The XP required for each next level grows progressively so that early levels arrive quickly while high levels represent substantial long-term play.

Persist `totalXp` as the authoritative progression value. Account Level should be derived from the XP curve rather than maintained as an independently mutable counter.

Conceptually:

```ts
account.totalXp = 18_420;
accountLevel = levelFromXp(account.totalXp);
```

This prevents `level` and `xp` from drifting out of sync and keeps future balancing options open.

## Rewards

Level-up rewards are not required for Season 0.

The progression model must nevertheless allow rewards to be attached to levels later without redesigning XP storage or progression semantics. Potential future rewards include:

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

It should not be permanently displayed in the in-match HUD. The match HUD should remain focused on information that matters to the active game, such as nickname, avatar, ruleset rating, turn state, timer, dice, and connection state.

Account Level must not visually imply competitive strength or replace the ruleset-specific rating.