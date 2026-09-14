# Moderation and Admin Controls

## Scope

The first public/testing release keeps moderation intentionally small. UNDERGAMMON does not need a full social-network moderation stack at this stage, but it does need safe profile inputs, enforceable account sanctions, and a minimal trusted admin surface.

## Player-facing moderation

- A public Report flow is planned for later, but is not part of the first release.
- A user block-list is intentionally not planned. Blocking users would reduce the available matchmaking pool and could be abused to avoid strong opponents.
- Reaction muting remains a lightweight per-match UX control and is not equivalent to blocking another account.

## Avatars

- Season 0 / first release uses only a curated UNDERGAMMON avatar pool.
- Telegram profile avatars are architecturally anticipated but are not exposed yet.
- Telegram-avatar support should be enabled only after report/moderation tooling exists.

## Nicknames

Custom nicknames are validated server-side on every change.

The backend must reject clearly unacceptable values, including:
- obvious profanity or abusive content;
- extremist or otherwise prohibited strings;
- advertising/links where not allowed;
- reserved or deceptive names that impersonate official project roles or the UNDERGAMMON brand.

Client-side validation may improve UX but must never be authoritative.

## Account moderation state

Game Accounts should support an explicit moderation status:

- `ACTIVE`
- `SUSPENDED`
- `BANNED`

A banned identity must remain linked to the same blocked Game Account so restarting the bot does not silently create a fresh account.

## Admin access

The first release uses a small built-in Admin tab inside the Mini App instead of a separate admin application.

Admin access is granted from the backend only after validating Telegram init data and matching the authenticated Telegram identity against an admin allowlist.

Recommended deployment configuration:

```text
ADMIN_TELEGRAM_IDS=<allowlisted Telegram IDs>
```

The admin tab must not be protected by frontend-only checks. Every administrative API operation re-validates admin permissions server-side.

The UI may hide the Admin tab when the authenticated account lacks the capability, but obscurity is not part of the security model.

## Initial Admin capabilities

The Season 0 Admin tab should support:

- finding a Game Account by internal account ID or Telegram ID;
- viewing basic account information and moderation status;
- suspend account;
- ban account;
- remove suspension/ban;
- force-reset an unacceptable nickname;
- inspect recent/basic match information when useful for support;
- adjust Long Nardy rating;
- adjust Backgammon rating;
- adjust Coins.

Telegram IDs exposed through admin tooling are private operational data and are never part of public player profiles.

## Rating and Coin corrections

Admin changes to competitive/economic state are explicit adjustments rather than unrestricted editing of the entire profile.

Preferred operations include:

- add/subtract rating for a specific ruleset and relevant season;
- add/subtract Coins;
- exceptional exact-value correction only when necessary.

Every adjustment requires an operator-supplied reason.

Examples:

```text
+500 Coins
Reason: Season 0 tester reward
```

```text
-35 Long Nardy rating
Reason: invalid match correction
```

Coins should be represented by a ledger-style transaction history so grants, rewards, purchases, refunds and admin corrections remain attributable.

Rating corrections should likewise be auditable instead of silently overwriting values where practical.

## Audit log

Every administrative mutation must produce an immutable audit record containing at least:

```text
actorAccountId
targetAccountId
action
reason
valueBefore
valueAfter
timestamp
```

Additional context such as ruleset, season and delta is stored when relevant.

Audit logging is required even while there is only one administrator.

## Statistics integrity

The Admin tab must not expose arbitrary editing of wins, losses, match count or match history.

Those values should remain derived from real matches. If later support requires correcting an illegitimate result, prefer a dedicated match invalidation/correction workflow that compensates affected rating/economy state instead of manually editing derived statistics.

## Deferred functionality

Not part of the first release:

- public Report UI;
- moderation queues;
- multiple moderator roles / complex RBAC;
- user block-lists;
- Telegram-avatar usage;
- bulk reward campaigns;
- unrestricted direct editing of derived match statistics.
