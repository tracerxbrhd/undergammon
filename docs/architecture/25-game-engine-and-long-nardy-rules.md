# 25. Game Engine Source and Long Nardy Rules

## Status

Accepted for UNDERGAMMON Season 0.

## Decision

UNDERGAMMON will have its own `packages/game-engine` package. The legacy repository `tracerxbrhd/backgammon` is a reference and donor of proven algorithms, tests and design ideas, but it does not define the new repository structure and must not be imported wholesale.

Useful legacy areas to review and selectively port include:

- Long Nardy rules and move generation;
- classic Backgammon rules and move generation;
- deterministic state transitions;
- serialization helpers where still appropriate;
- unit tests;
- property tests;
- determinism/regression tests.

Every migrated rule must be reviewed against the current UNDERGAMMON product specification before reuse. Legacy behavior is not automatically authoritative merely because it already has code or tests.

## Game-engine boundary

`packages/game-engine` must remain a pure deterministic domain package.

It must not depend on:

- React or Mini App code;
- Telegram APIs;
- WebSocket or HTTP transport;
- PostgreSQL/Drizzle;
- server timers;
- account, rating or economy services;
- random-number generation infrastructure.

The engine receives already-determined inputs such as dice values and returns deterministic legal moves, state transitions and terminal game results.

Dice generation remains a backend responsibility.

## Long Nardy rules source of truth

For Long Nardy movement legality, UNDERGAMMON adopts the official Russian sport rules for the sport of backgammon/nardy approved by the Ministry of Sport of the Russian Federation in 2025 as the baseline ruleset.

Official Ministry of Sport reference:

- https://www.minsport.gov.ru/nardy-1/
- The 2026 official competition regulations continue to reference the rules approved by Ministry of Sport order No. 347 dated 30 April 2025.

The engine should implement the gameplay rules, not unrelated offline tournament administration.

Examples of rules that belong in the engine include:

- initial checker arrangement and movement direction;
- legal movement according to dice values;
- restrictions on moving checkers from the head;
- official opening-double exceptions where applicable;
- blocked-point and six-point blockade restrictions;
- mandatory use of the maximum possible number of dice;
- higher-die priority when only one die can legally be used;
- home-entry and bearing-off legality;
- game completion and winner determination.

## Product-specific deviations

UNDERGAMMON-specific match-format decisions must be documented separately from canonical movement rules.

Examples include:

- one online game is one UNDERGAMMON match/result;
- the 60-second online turn timer is server lifecycle policy, not a board-rule mechanic;
- reconnect and abandonment rules are backend lifecycle rules;
- rating, XP and Coins are outside the game engine;
- physical tournament clocks, dice cups, referee procedures and tournament brackets are not implemented as game-engine rules.

Any intentional difference from the adopted sport rules must be explicit, documented and tested rather than silently embedded in implementation details.

## Testing policy

The new engine must retain or improve the useful guarantees demonstrated by the legacy engine:

- deterministic state transitions;
- unit coverage for specific rule cases;
- property tests for invariants and move generation;
- regression tests for known edge cases;
- tests for both Long Nardy and Classic Backgammon.

Legacy tests may be ported when their expected behavior matches the accepted UNDERGAMMON rules. Tests encoding obsolete or conflicting legacy behavior must be rewritten rather than preserved for compatibility.

## Implementation principle

Do not perform a repository-history merge or treat the old engine as a dependency. Port reviewed code into the new package in small, auditable changes, with the current specification and authoritative rules taking precedence over the legacy implementation.
