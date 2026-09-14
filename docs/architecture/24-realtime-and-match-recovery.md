# 24. Realtime and Match Recovery

## Status

Accepted for Season 0.

## Realtime transport

UNDERGAMMON uses a plain WebSocket transport with a strictly typed command/event protocol. Socket.IO is not required for the initial architecture.

The shared realtime contract belongs in `packages/protocol` and must remain transport-oriented rather than containing game rules.

Client commands include identifiers needed for correctness and idempotency, including at minimum:

- `matchId`;
- `commandId`;
- expected `stateVersion`.

The server validates every command against the authenticated Game Account, current match state, current `stateVersion`, and `packages/game-engine`. Client state is never authoritative.

Duplicate commands must be safe to retry and must not be applied twice.

## Authoritative persistence

An active match must not exist only in process memory.

For every accepted state-changing command, the server must persist the resulting authoritative state before broadcasting it to clients.

Conceptually:

1. receive command;
2. validate account, match ownership, state version, and game legality;
3. calculate the next deterministic game state;
4. commit the updated match snapshot, incremented state version, and technical match event in PostgreSQL;
5. only after a successful transaction, broadcast the resulting server event.

This is not full event sourcing. The current match snapshot is the primary recovery state. An append-only technical event log is retained for diagnostics, audits, incident investigation, and possible recovery tooling.

## Server restart recovery

A normal short server/container restart must not destroy an active match.

After restart, the backend reconstructs an unfinished match from PostgreSQL. Reconnecting players receive a fresh authoritative snapshot and continue from that state.

Timers and reconnect windows are represented by absolute server timestamps such as `turnDeadlineAt` and `reconnectDeadlineAt`, not by process-local countdown values. A restart therefore must not silently grant additional time.

## Infrastructure-caused failures

If an UNDERGAMMON infrastructure failure prevents a match from being completed fairly, the match becomes `NO_CONTEST`.

A `NO_CONTEST` match caused by the service must not affect competitive or progression state:

- no rating change;
- no win or loss;
- no win-streak change;
- no calibration progress;
- no XP;
- no Coins;
- no seasonal result/statistic contribution.

Players must not be penalized for server-side failures.

Manual compensation, when appropriate, is handled separately through controlled administrative adjustments rather than being inferred automatically from the failed match.

## History and auditability

A `NO_CONTEST` match remains visible in the user's private match history with a clear non-competitive status such as `Match not counted — server error`.

It remains stored technically together with its event/audit information so incidents can be investigated. The existence of this historical record does not make it count toward gameplay statistics.

## Operational principle

Short recoverable restarts continue the match. Confirmed infrastructure failures that make fair continuation impossible invalidate the competitive result rather than choosing a winner by timeout or disconnect rules.
