# 06 — Match lifecycle, reconnect and timeouts

## Status

Accepted product decisions from interview question #6.

## Core principle

Online gameplay is server-authoritative. Client connectivity, local state and UI animation never determine authoritative match state, dice, timers, winner or result.

## Match states

A match uses at least the following lifecycle states conceptually:

- `WAITING_FOR_PLAYERS` — the match exists but both players have not yet connected to the realtime session.
- `ACTIVE` — both players are connected and gameplay has started.
- terminal result states — normal win/loss, timeout, surrender, abandon, start timeout or no-contest depending on reason.

Exact implementation names are not fixed by this product document.

## Initial join

After a private challenge is accepted, a Match may be created immediately, but gameplay does not start until both players have connected.

- No explicit Ready button is required.
- Successful connection to the realtime match session is treated as readiness.
- `WAITING_FOR_PLAYERS` has a 2-minute join timeout.
- Gameplay timers do not run while waiting for the initial connection of both players.
- If both players do not connect within 2 minutes, the match ends as `START_TIMEOUT` without a winner, loss or rating change.
- Ranked matchmaking should normally pair already-active clients, so this state is primarily important for private/casual flows.

## One active match per account

A Game Account may have at most one unfinished match at a time.

While an account is in `WAITING_FOR_PLAYERS` or `ACTIVE`, it cannot:

- enter another matchmaking queue;
- accept another private challenge;
- start another private match;
- start a match against AI.

The Mini App should prioritize the unfinished match over creating a new one.

## Turn timer

The initial product setting is **60 seconds per turn**.

- The timer covers the whole turn, including the time before the player presses the dice-roll action.
- The value must be server-side configurable so it can be tuned during beta/Season 0 without modifying game rules.
- The timer is a gameplay/session policy and must not be embedded into the deterministic game-engine rules.
- The UI should visibly warn the player as the deadline approaches.

### Turn timeout

If the 60-second turn deadline expires:

- no automatic move is made;
- no automatic dice roll is made;
- the player may not simply skip a legal move;
- the player loses the match by timeout.

In Ranked, this is a normal rated loss. In Casual/Private, it is a loss with no rating delta.

If the rules engine determines that no legal move exists, the server should advance the turn automatically rather than waiting for the player to press a redundant Skip button.

## Dice roll interaction

Dice are manually initiated by the player for participation and tactile feedback.

Flow:

1. the player's turn starts and the 60-second turn timer begins;
2. the player presses the roll action;
3. the backend generates the authoritative dice result;
4. the Mini App animates that already-determined result;
5. the player performs legal moves;
6. the turn completes.

The animation must never generate or alter the result.

There is no auto-roll on timeout.

Animation duration should not create a meaningful gameplay penalty. The exact UX handling may be tuned during implementation/testing while preserving one authoritative server deadline.

## Reconnect grace period

A disconnected client receives a **60-second reconnect grace period**.

- A short connectivity loss does not immediately end the match.
- Returning clients resume from authoritative server state.
- Local cached game state is never trusted as the source of truth.
- If the player does not reconnect within 60 seconds, the player loses by abandon.

No extra punishment is applied beyond the normal match result.

## Disconnect does not pause gameplay

Disconnecting never pauses the match or the active turn timer.

This prevents deliberate network interruption from becoming extra thinking time.

Example when the disconnected player is on turn:

- turn deadline has 42 seconds remaining;
- player disconnects;
- reconnect deadline is 60 seconds;
- the turn deadline continues counting;
- if the turn deadline expires first, the match ends by turn timeout.

If a player disconnects during the opponent's turn, the reconnect grace still applies. If the opponent finishes and control passes to the disconnected player, that player's normal turn timer starts while the reconnect deadline continues independently.

## Surrender and explicit leave

The game supports explicit surrender.

For an `ACTIVE` match:

- selecting Leave Game is semantically a surrender;
- the UI must confirm that leaving will end the match and count as a loss;
- in Ranked, rating changes as for a normal loss;
- in Casual/Private, the match records the loss but rating does not change;
- there is no additional punitive rating penalty for surrendering.

Simply closing or minimizing the Mini App is **not** an explicit surrender. It is treated as a disconnect and follows the reconnect grace period.

For a match still in `WAITING_FOR_PLAYERS`, leaving before gameplay begins may cancel participation and end the pending match without a gameplay result.

## Abandon

A player who remains disconnected beyond the 60-second reconnect grace loses by abandon.

The backend should not attempt to infer whether the cause was intentional rage-quit, mobile connectivity loss or application closure. Those cases are operationally indistinguishable and follow the same deterministic rule.

## Simultaneous disconnects

If both players disconnect, each has an independent reconnect deadline.

The player whose reconnect deadline expires first receives the abandon loss. Event ordering must be deterministic on the server.

No special "both offline means cancel" rule should exist because it could be exploited to avoid losses.

## Server-side incidents

A confirmed backend/infrastructure failure is different from a client disconnect.

If the server cannot reliably preserve or recover authoritative match state because of a service-side incident, the match should end as `NO_CONTEST`:

- no winner or loser;
- no rating change;
- players are not punished for infrastructure failure.

This status must be reserved for genuine server-side failure and not ordinary client connectivity problems.

## Reconnect state restoration

On reconnect, the client obtains the authoritative current match state from the backend instead of reconstructing the game from local memory.

The restored state should contain enough information to render the match correctly, including conceptually:

- current board position;
- current player/turn;
- authoritative dice result if already rolled;
- remaining/deadline timing information;
- match status;
- relevant player connection status.

The precise wire protocol is an implementation concern.

## Active-match recovery UX

If the user opens UNDERGAMMON while an unfinished match exists, that match takes priority on the main screen.

The user should see a prominent recovery action such as **Return to game** and may also choose **Leave game**.

The interface must not allow an active game to be accidentally lost behind normal match-creation navigation.

## Multiple devices

A user may open Telegram/UNDERGAMMON on more than one device, but only one realtime session may control the active match at a time.

Accepted takeover model:

- the device that most recently explicitly opens the active match becomes the controlling session;
- the previous session loses permission to send gameplay commands;
- the old client should be informed that the game continued on another device;
- taking control again is allowed;
- every takeover/resume performs an authoritative server resynchronization.

This prevents command races while allowing a player to continue the same match on another device.

## Product principles established by this block

- One Game Account = one unfinished match maximum.
- Initial join timeout: 2 minutes.
- Turn timer: 60 seconds, server configurable.
- Reconnect grace: 60 seconds.
- Disconnect never pauses gameplay.
- Turn timeout is a loss; no auto-move, auto-roll or skip.
- Dice are manually initiated but server generated.
- Surrender is a normal loss, not an extra penalty.
- Client disconnect and server incident are different failure classes.
- Server incidents may produce `NO_CONTEST` with zero rating impact.
- Reconnect and multi-device takeover always restore from authoritative server state.
