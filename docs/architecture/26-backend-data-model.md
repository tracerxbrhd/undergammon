# 26. Backend Data Model

## Status

Accepted for the initial UNDERGAMMON architecture.

## Core principles

- PostgreSQL is the primary durable store.
- Domain entities use internal IDs; Telegram user IDs are identity-provider data, not domain IDs.
- Relational columns are used for data that must be queried, constrained, joined, ranked, or aggregated.
- Authoritative game state is stored as a versioned JSONB snapshot because the board state is a complex domain object and does not benefit from being decomposed into point/checker SQL rows.
- Match state changes that affect progression, economy, rating, or statistics must be committed atomically.
- Redis is not required for the initial architecture.

## Primary entities

Initial logical model:

- `game_accounts`
- `account_identities`
- `sessions`
- `profiles`
- `account_progression`
- `seasons`
- `ratings`
- `matches`
- `match_players`
- `match_events`
- `challenges`
- `matchmaking_entries`
- `coin_ledger`
- `cosmetic_ownership`
- `daily_reward_claims`
- `admin_audit_log`

Exact table and column names may evolve during implementation, but the domain boundaries should remain explicit.

## Game accounts and identities

`GameAccount` is the stable domain identity used by gameplay, ratings, history, progression, economy, moderation, and public profile features.

External login providers are represented separately through `AccountIdentity`.

Season 0 only implements Telegram authentication, but the model must allow another provider later without migrating rating/history/economy ownership away from Telegram IDs.

Conceptually:

```text
GameAccount
  └─ AccountIdentity
       ├─ provider = TELEGRAM
       └─ providerUserId
```

A provider identity must uniquely resolve to one Game Account.

## Profiles

Profile data is separated from authentication identity.

The profile contains the public pseudonymous representation such as nickname and curated avatar selection. Telegram profile data is not automatically exposed publicly.

## Seasons and ratings

Ratings are stored per:

- Game Account,
- ruleset,
- season.

The model must support initial calibration, seasonal calibration, current rating, peak rating, match count, and leaderboard eligibility without coupling those concerns to the match snapshot.

## Match persistence

`matches` contains relational metadata such as:

- internal match ID,
- ruleset,
- mode,
- lifecycle status,
- finish reason,
- authoritative `stateVersion`,
- versioned authoritative state snapshot,
- turn/deadline timestamps,
- created/started/finished timestamps.

Players are represented through `match_players` so match ownership and result information remain queryable without decoding the game snapshot.

### Snapshot format

The authoritative game state is stored in JSONB together with a schema version.

The game-engine owns the semantic structure. Database code must not duplicate game rules or interpret board coordinates independently.

Stored snapshots must be sufficient to restore an ACTIVE match after a normal server restart.

## Match events

An append-only `match_events` stream is retained for technical audit, debugging, recovery analysis, and deterministic investigation.

UNDERGAMMON does not use full event sourcing as its primary persistence model. The authoritative current snapshot remains directly stored on the Match.

Typical events may include:

- match created,
- opening roll resolved,
- dice rolled,
- turn committed,
- reconnect/disconnect lifecycle changes,
- surrender,
- timeout,
- match completion,
- NO_CONTEST transition.

## Atomic match finalization

Finalizing a match must be transactional.

A successful transaction may include, depending on mode and finish reason:

```text
mark Match finished
+ persist final authoritative state
+ persist result
+ update rating/calibration
+ update account statistics
+ update XP progression
+ append Coin ledger entries
+ append technical/audit events
```

These effects must not be independently committed in a way that permits partially finalized matches.

A `NO_CONTEST` caused by confirmed UNDERGAMMON infrastructure failure does not modify competitive statistics, rating, calibration progress, XP, Coins, season statistics, or streaks. The match itself and its technical events remain stored and the private history may show it as an uncounted server-error result.

## Coin economy

Coins use an append-only ledger rather than treating a mutable balance as the only source of truth.

Ledger entries must distinguish meaningful sources such as:

- ranked reward,
- streak reward,
- seasonal reward,
- future achievement/event reward,
- cosmetic purchase,
- admin adjustment.

A cached/current balance may be maintained for efficient reads, but it must remain transactionally consistent with ledger operations.

## Matchmaking and challenges

Private challenges and matchmaking queue entries are explicit persisted entities instead of being embedded into accounts.

Challenge acceptance must support atomic first-valid-accept-wins semantics.

For the initial single-server deployment, live socket/session routing can remain in process memory, but durable challenge/match state belongs in PostgreSQL.

## Account deletion

User-requested deletion uses a 30-day soft-deletion window.

When deletion is requested:

- the account enters a pending-deletion state immediately;
- normal authentication/gameplay is disabled while deletion is pending;
- the user can restore the account within 30 days;
- after 30 days, personally identifying/account-linked data is removed or anonymized according to the final retention implementation.

Historical match records may remain in anonymized form where required to preserve database integrity, historical results, auditability, or aggregate statistics. Retained records must no longer expose the deleted user's public profile or external identity.

The 30-day window is a product rule and should not be hard-coded across unrelated modules; deletion timing belongs to the account lifecycle configuration/service.

## Administrative audit

Privileged mutations such as sanctions, nickname resets, rating adjustments, Coin adjustments, and exceptional maintenance actions are recorded in `admin_audit_log` with actor, target, action, reason, timestamp, and relevant before/after information.

## Migration policy

Production schema changes are performed through versioned Drizzle migrations as established in the deployment architecture. Direct manual schema editing is an emergency-only operation.

## Non-goals

The initial data model does not introduce:

- generic multi-game platform abstractions,
- microservice-owned databases,
- Redis-backed authoritative match state,
- full event sourcing,
- arbitrary user-uploaded assets,
- a second premium currency,
- durable storage of UI-only/transient animation state.
