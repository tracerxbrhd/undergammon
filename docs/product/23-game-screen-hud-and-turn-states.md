# 23 — Game Screen HUD and Turn States

Status: accepted UX/UI v2 decisions, implementation pending

## Purpose

This document defines the accepted HUD and turn-state behavior for the UNDERGAMMON active Game Screen.

It complements:

- `06-match-lifecycle-reconnect-timeouts.md` for authoritative match lifecycle;
- `07-game-board-ux.md` for interaction and board presentation;
- `21-miniapp-ux-ui-v2.md` for the overall Mini App v2 composition;
- `22-board-scene-cosmetics-architecture.md` for board/cosmetic boundaries.

## Core layout

The Game Screen remains a viewport-locked, non-scrollable game surface.

Its portrait structure is stable:

```text
Opponent PlayerStrip
Board Scene
Local PlayerStrip
ActionDock
safe-area-bottom
```

The Board Scene is the dominant surface. HUD elements must remain compact and must not introduce a separate status row between the player strips and the board.

## PlayerStrip baseline

Each player has one compact `PlayerStrip` that remains visible for the duration of the active match.

Permanent identity information:

- avatar;
- nickname;
- relevant ruleset rating;
- connection/reconnect status when relevant.

The active player's strip additionally communicates:

- active-turn emphasis;
- authoritative remaining turn time.

Account Level, Coins, XP, match ID, detailed statistics and other secondary information are not part of the permanent match HUD.

## Timer placement

The authoritative turn timer belongs to the `PlayerStrip` of the player whose turn is active.

Accepted behavior:

- there is no separate central/global timer row;
- the timer appears in a stable reserved location inside the active player's strip;
- when turn ownership changes, the timer moves semantically to the other player's strip rather than creating a new HUD element;
- the strip itself does not resize when the timer appears/disappears;
- inactive strips preserve their geometry;
- timer typography should use tabular numerals where available to avoid width jitter.

The timer should be visually associated with the active player so ownership of the countdown is immediately obvious.

## Timer warning states

Timer presentation may increase emphasis as the deadline approaches, but it must remain restrained.

Preferred direction:

- normal state for most of the turn;
- warning emphasis around the final ~15 seconds;
- critical emphasis around the final ~10 seconds.

Exact thresholds may be tuned during implementation, but the UI must not flash aggressively or change layout.

The timer remains presentation-only. The server-provided `turnStartsAt` / deadline remains authoritative.

## ActionDock baseline

The `ActionDock` owns a stable region below the local player strip.

Its contents are phase-aware, but its allocated geometry must not move the Board Scene.

Conceptual states:

```text
WAITING_FOR_ROLL
[ Reaction ] [              Roll Dice              ]

AWAITING_MOVE
[ Reaction ] [ Undo ] [        Confirm Turn       ]

OPPONENT_TURN
[ Reaction ] [           Opponent's turn          ]

PRESENTING_COMMITTED_MOVE
[ Reaction ] [              Presenting             ]

RECONNECTING / CONTROL_LOST
[                state-specific control/status     ]
```

`Roll Dice` and `Confirm Turn` should reuse the same dominant primary-action region where practical so the dock does not jump between phases.

## Local-turn action behavior

The local-turn controls use persistent positions after the dice result is available.

Accepted behavior:

```text
BEFORE_ROLL
[ Reaction ] [              Roll Dice              ]

AFTER_ROLL, EMPTY/PARTIAL DRAFT
[ Reaction ] [ Undo ] [ Confirm Turn — disabled ]

AFTER_ROLL, COMPLETE LEGAL DRAFT
[ Reaction ] [ Undo ] [ Confirm Turn — active   ]
```

Rules:

- `Confirm Turn` becomes visible immediately after the authoritative dice result is presented;
- `Confirm Turn` stays disabled until the local draft represents a complete legal turn according to the existing game engine;
- `Undo` occupies its stable position after the roll and stays disabled while there is no draft move to undo;
- the controls must not appear/disappear in a way that resizes the dock or moves the Board Scene;
- disabled controls must remain visually distinguishable without becoming misleadingly prominent;
- enabling a control is presentation of an already-derived legal state, never client authority over legality.

This gives the player a stable action model while preserving the existing explicit draft/undo/confirm interaction contract.

## Dice presentation and roll flow

Dice remain part of the Board Scene rather than a detached browser-control row.

The accepted normal-turn sequence is:

```text
local turn starts
→ Roll Dice is available
→ player explicitly presses Roll Dice
→ client enters a neutral rolling/pending presentation state
→ authoritative server result arrives
→ dice values are revealed
→ legal board interaction becomes available
→ local draft is built
→ complete legal draft enables Confirm Turn
```

Rules:

- the client must never choose, predict or visually commit to dice values before the authoritative result is received;
- after the roll command is sent, a short neutral rolling animation may begin immediately, but it must not imply a specific result;
- repeated roll input is disabled while the command/result is pending;
- checker interaction remains unavailable until the authoritative dice result has been received and presented;
- the dice reveal should be brief and readable rather than theatrical; approximately 250–350 ms is an implementation target, not an authoritative timing requirement;
- dice use graphical die faces/pips rather than Unicode glyphs.

The dice area is permanently reserved by Board Scene geometry. Moving between empty/pre-roll, rolling, revealed, consumed and completed states must not resize or shift the board.

## Consumed dice presentation

Used dice values remain visible for the rest of the local draft instead of disappearing.

The UI should visually distinguish available and consumed values, for example by dimming/marking a consumed die while preserving the original result.

This lets the player understand both:

- the authoritative roll that occurred;
- which movement values remain available in the current draft.

Consumption state is presentation derived from the existing legal/draft model. It does not introduce new move semantics.

For doubles, the UI must clearly communicate four available uses without requiring four large physical dice. The preferred direction is to keep the normal dice pair and add four compact use/consumption indicators. Exact visual treatment may be tuned during implementation.

## Classic Backgammon opening roll

Classic Backgammon opening roll is a special presentation state matching the existing authoritative game rule.

The client does not show a normal `Roll Dice` action for that opening determination.

Instead:

- the opening values are generated authoritatively;
- presentation may identify one die with each player while the higher value determines the starting player;
- the result is briefly revealed in the Board Scene;
- the starting player's first turn continues using the authoritative opening dice according to the existing game-engine rules;
- the client must not locally reroll, select the starter or reinterpret the opening result.

## Dice cosmetics boundary

Dice presentation must respect the cosmetic architecture in `22-board-scene-cosmetics-architecture.md`.

The current hybrid direction is:

- one visible die uses the local participant's resolved Dice Skin;
- the other visible die uses the opponent participant's resolved Dice Skin;
- `Default` is used as fallback;
- dice geometry and placement remain application-controlled;
- authoritative value/pip readability remains application-controlled and cannot be weakened by a skin.

Dice skins may alter presentation but must never affect result generation, result interpretation, hit targets, animation timing semantics or Board Scene geometry.

## Reactions and match menu

Reactions use one compact trigger rather than multiple permanently visible reaction buttons.

The compact match menu remains available through a small overflow control, normally associated with the upper/opponent side of the HUD.

Surrender is not a permanent action-dock control. It belongs in the match menu and requires confirmation.

## Connection states

Connection state must not replace the whole HUD or board.

- local reconnect: keep the last authoritative board visible, lock gameplay input, show compact reconnecting status;
- opponent reconnect: represent primarily on the opponent `PlayerStrip`, optionally including authoritative reconnect deadline/countdown when available;
- `CONTROL_LOST`: distinguish clearly from transport loss and expose the existing Take control flow when allowed;
- `WAITING_FOR_PLAYERS`: remain inside the same fixed Game Screen geometry; no Ready button is added.

## Geometry invariant

Changes between at least the following states must not resize or vertically shift the Board Scene:

- waiting for players;
- waiting for roll;
- local draft;
- local confirm;
- opponent turn;
- committed-move presentation;
- local reconnect;
- opponent reconnect;
- control lost;
- match finished transition.

The screen may change visual emphasis and control availability, but not its structural layout.
