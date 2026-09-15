# 24 — Match Result and Progression UX

Status: accepted UX/UI v2 product direction, implementation pending

## Purpose

This document defines how UNDERGAMMON presents the end of a match, rating change, Account XP progression and level-up feedback in the Telegram Mini App.

It complements:

- `05-matchmaking-rating-seasons.md` for rating semantics;
- `06-match-lifecycle-reconnect-timeouts.md` for match completion;
- `07-game-board-ux.md` for final move presentation;
- `16-account-level-and-xp.md` for Account XP rules;
- `21-miniapp-ux-ui-v2.md` for the overall Mini App v2 direction;
- `23-game-screen-hud-and-turn-states.md` for the fixed Game Screen composition.

## Result presentation principle

The final board state remains visible after the last committed move presentation.

The client must not immediately replace the game with an unrelated full-screen page. Instead, the Match Result is presented as an overlay/sheet over the final recognizable Board Scene.

The order is:

```text
final committed move presentation
→ result reveal
→ rating progression when applicable
→ Account XP progression
→ final actions
```

The presentation sequence is cosmetic. All values are already authoritative before their animation begins.

## Result reveal

The first result state communicates the authoritative outcome:

- Victory / Defeat / No Contest as applicable;
- opponent identity;
- ruleset and mode where useful;
- authoritative Classic Backgammon result classification when applicable;
- finish reason when it materially explains the result.

The client must never infer or reclassify NORMAL / GAMMON / BACKGAMMON locally.

## Rating progression

Rating presentation is shown only when the match affects rating.

For Ranked, the result may animate from the persisted rating-before value to rating-after and expose the signed delta, for example:

```text
1478 → 1496
      +18
```

Casual and Private matches are explicitly presented as Unrated and must not fabricate a rating change.

Direct same-opponent rematch remains unavailable for Ranked.

## Account XP progression

Account XP is presented as a separate progression step after rating presentation.

The result surface should show:

- XP gained from this specific match;
- the Account Level before/after when a level boundary is crossed;
- visual progress toward the next Account Level;
- a clear level-up moment when the awarded XP crosses one or more level boundaries.

Example conceptual presentation:

```text
ACCOUNT LEVEL 12
██████████████░░░░░░
+85 XP

→ animated fill →

ACCOUNT LEVEL 13
███░░░░░░░░░░░░░░░░
Level Up
```

Exact XP amounts remain balancing parameters defined by the authoritative progression system, not by the UI.

## Authoritative reward contract requirement

The frontend must not derive per-match XP by comparing `Profile.totalXp` snapshots before and after the match.

That approach is unsafe because unrelated XP/reward changes, reconnects, retries or future progression sources could make the inferred delta incorrect.

The result presentation requires authoritative match-attributed progression data.

A future implementation contract must provide enough information to render the final state without duplicating server policy. It should expose, directly or through an equivalent stable model:

- the XP delta awarded by this match;
- total XP before and after the award;
- Account Level before and after;
- enough authoritative level-boundary/progress information to render progress toward the next level without guessing the server XP curve.

The exact transport shape is an implementation decision. A protocol-wide redesign is not required; a small result/history/match-result contract extension is preferred.

The client must not maintain an independently tuned copy of the Account XP curve solely for animation purposes unless the curve is deliberately moved into shared deterministic code used by both server and client.

## Animation sequence

The preferred sequence is deliberately short and readable:

1. reveal Win/Loss/No Contest;
2. if Ranked, animate rating before → after and delta;
3. animate Account XP gained into the level progress indicator;
4. if a level boundary is crossed, briefly present Level Up and continue remaining XP into the new level;
5. reveal/finalize post-match actions.

If multiple levels are crossed by one award in the future, the animation may visually traverse the boundaries, but it must remain fast and skippable.

No gameplay or reward calculation waits for the animation.

## Skip / fast exit behavior

Result animations must never trap the player.

Accepted behavior:

- the player may skip/complete the progression animation immediately;
- skipping jumps every animated value to its final authoritative state;
- the player can then leave to Play/Home immediately;
- post-match navigation must not wait for timers, CSS animation callbacks or sound completion;
- closing/minimizing the Mini App during the animation loses no rewards because rewards are already persisted server-side.

A single obvious Continue/Skip interaction is preferred over forcing the user through several modal confirmation steps.

The result may begin animating automatically, while the main navigation action remains available once final values are resolved. Product implementation may allow a tap on the result surface to fast-forward the active animation.

## Post-match actions

After or during the skippable result presentation:

### Ranked

Primary actions may include:

- Find another opponent / Play again through normal matchmaking;
- Home / Play.

Do not expose a direct rematch with the same Ranked opponent.

### Casual / Private

Primary actions may include:

- Request rematch where lifecycle rules permit it;
- Home / Play.

## No invented rewards

The UI must display only rewards that are attributable to the completed match by authoritative backend data.

Do not infer or fabricate:

- XP;
- Coins;
- rating changes;
- level-up rewards;
- cosmetic rewards.

If Coins or level rewards are later added to the authoritative match result contract, they can be appended to the same progression sequence without changing the basic Result Sheet architecture.

## Motion and accessibility

Result motion is celebratory but restrained.

Requirements:

- no long unskippable sequences;
- no flashing;
- numeric values remain readable throughout;
- progress animation must not alter the underlying Board Scene geometry;
- sound/haptic feedback respects existing settings;
- the final values remain visible after animation completion.

## Acceptance criteria

- Final board remains recognizable behind the result surface.
- The result is shown only after required final move presentation.
- Ranked rating delta is authoritative.
- Match XP delta is authoritative and match-attributed.
- XP progress can animate across a level boundary without client-side reward calculation.
- Animation can be skipped immediately to final values.
- Leaving immediately after result does not affect already-earned progression.
- Casual/Private results never imply a rating change.
- No XP/Coins/reward values are inferred from unrelated profile diffs.
