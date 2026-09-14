# Classic Backgammon: Season 0 Scoring and Opening Rules

## Status

Accepted product decision for UNDERGAMMON Season 0.

## Scope

This document resolves the remaining product-level rules questions for Classic Backgammon in the one-game Telegram match format.

## Doubling cube

The doubling cube is not used in Season 0.

UNDERGAMMON treats one complete game as one match/result rather than using a match-to-N-points structure. The doubling cube is therefore intentionally excluded from the initial product format instead of introducing a point system that conflicts with the fast one-game match model.

## Win classification

Classic Backgammon still distinguishes canonical result types:

- `NORMAL`: the losing player has borne off at least one checker.
- `GAMMON`: the losing player has borne off no checkers.
- `BACKGAMMON`: the losing player has borne off no checkers and still has at least one checker on the bar or in the winner's home board when the game ends.

The authoritative game engine determines the result type from the final server-side game state. The client must not classify the result independently.

No house-rule variants are used for this classification.

## Rating and progression impact

`NORMAL`, `GAMMON`, and `BACKGAMMON` all count as exactly one win for the winner and one loss for the loser.

The result type does not multiply:

- rating delta;
- Account XP;
- Coins;
- win-streak progression.

A gammon or backgammon may be retained as profile/statistical data and may later be referenced by achievements, badges, or presentation features, but it does not alter competitive or economic value in Season 0.

## Opening roll

Classic Backgammon uses the canonical opening roll:

1. The server rolls one die for each player.
2. If the values are equal, the server repeats the opening roll.
3. The player with the higher die moves first.
4. The two opening dice are used as that player's first turn roll.

Example: Player A receives `5` and Player B receives `3`; Player A starts and plays the first turn using `5-3`.

This is an exception to the normal manual roll interaction. The opening roll is generated server-side as part of match start. From the next turn onward, players use the normal manual `Roll Dice` action, while all dice values remain server-authoritative.

## Architectural consequences

- The game engine should model result classification independently from rating, XP, and economy code.
- Realtime protocol should transmit a result type such as `NORMAL`, `GAMMON`, or `BACKGAMMON` rather than a localized display string.
- The rating service must treat all three result types as a single binary win/loss result.
- Economy and Account XP services must not derive larger rewards from gammon/backgammon status.
- Dice generation, including the opening roll, remains server-side and uses the same neutral RNG policy defined for the rest of UNDERGAMMON.

## Deferred possibilities

A future dedicated match-points mode may reconsider the doubling cube and traditional multi-game match scoring. This is not part of Season 0 and must be treated as a distinct product mode rather than retrofitted into the existing one-game ranked format.