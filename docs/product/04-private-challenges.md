# UNDERGAMMON — Private challenges

Status: product decision captured during discovery.

## Goal

Private play should preserve UNDERGAMMON's core product promise: starting a game with a friend must require as little friction as possible. No room codes, manual lobby identifiers, or separate registration flow should be required.

## Canonical flow

1. Player A selects `CASUAL`, a ruleset, and `Friend` in the Mini App.
2. The primary action becomes `Invite friend` rather than the generic match-start action.
3. The backend creates a lightweight `Challenge`, not a `Match`.
4. Telegram's native share/chat-selection flow is used to send the invitation.
5. The invitation contains a single-use challenge link/deep link into UNDERGAMMON.
6. The first eligible user who accepts the challenge becomes Player B.
7. Acceptance is processed atomically on the backend.
8. Only after successful acceptance is an actual game `Match` created.
9. No additional ready-check is required.
10. Both players may enter/resume the created match through the Mini App.

## Challenge semantics

A private challenge:

- is not pre-bound to a recipient Telegram user ID;
- may be accepted by the first eligible user who receives/opens the invitation;
- cannot be accepted by its creator;
- is single-use;
- expires after **10 minutes**;
- can be cancelled manually by its creator before acceptance;
- does not itself count as a game or match;
- creates a match only after successful acceptance.

This intentionally supports forwarding an invitation to another person. Recipient identity is learned only when the invitation is accepted.

## Concurrent acceptance

Acceptance must be server-authoritative and atomic.

If several users attempt to accept the same challenge concurrently:

- exactly one acceptance may succeed;
- that acceptance closes the challenge and creates the match;
- every later/concurrent loser receives a clear `challenge already accepted` result;
- duplicate match creation must be impossible.

## One outgoing challenge per user

A user may have only one active outgoing private challenge at a time.

The UI must allow the creator to cancel the current challenge. Creating several simultaneous outgoing private challenges is intentionally unsupported for the initial product.

## Waiting state

After sharing an invitation, the creator sees a dedicated waiting state rather than silently returning to the main menu.

The waiting state should show at least:

- selected ruleset;
- casual/private mode;
- remaining challenge lifetime;
- an explicit `Cancel invitation` action.

Closing the Mini App does not cancel the challenge.

If the challenge is accepted while the creator is away, the Telegram bot may notify the creator and provide an action/deep link to return directly to the created match.

## Match creation and readiness

A successful challenge acceptance immediately creates the match. There is no separate `ready` confirmation from both players.

If one player is temporarily absent after match creation, reconnect/session recovery policy handles that situation. Private challenge flow must not introduce another pre-match ready-state solely for this case.

## Rematch

After a completed private game, either player may request a rematch.

Rematch behavior:

- does not require another Telegram share/invitation;
- the opponent must explicitly accept the rematch request;
- retains the same ruleset;
- remains casual/private;
- does not affect rating;
- starts a new match rather than mutating the completed match.

Changing ruleset requires leaving the rematch flow and creating a new game configuration.

## Rating

Private games are never ranked and never modify player rating.

Ruleset-specific player rating may still be displayed in private-game UI as part of the player's identity/profile. Showing rating does not make the match rated.

## Security and implementation constraints

Challenge links/tokens must be treated as capabilities:

- tokens must be unguessable;
- challenge state and trusted metadata live on the backend;
- the client/link must not be trusted to provide creator ID, ruleset, expiry, or acceptance state;
- expiry, creator identity, current status, self-accept protection, and single-use semantics are validated server-side.

Exact token format and persistence implementation are intentionally deferred until technical architecture design.