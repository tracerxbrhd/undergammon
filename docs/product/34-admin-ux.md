# 34 — Admin UX

Status: accepted UX/UI v2 decision, implementation pending

## Purpose

This document defines the Season 0 Admin experience for the UNDERGAMMON Telegram Mini App.

Admin is an internal operational tool. Its priorities are correctness, authorization, auditability and low operator error rather than decorative presentation.

It complements:

- `13-moderation-and-admin.md` for moderation/admin product policy;
- `21-miniapp-ux-ui-v2.md` for the overall UX/UI v2 direction;
- `29-profile-hub-and-account-progression-ux.md` for Profile navigation;
- backend authorization and audit contracts already defined by the server.

## Entry and visibility

Admin is a secondary destination under Profile and is shown only when the authenticated profile exposes the account as administrative.

Client visibility is not authorization.

Every administrative API operation must still be independently authorized by the backend. The frontend must never assume that `me.admin === true` is sufficient security for privileged mutations.

## Primary workflow

The accepted Season 0 workflow is:

```text
account lookup
-> inspect account
-> choose authorized action
-> provide required reason where applicable
-> confirm
-> server executes or rejects
-> action becomes auditable
```

The screen should be utilitarian and information-dense without trying to become a general analytics dashboard.

## Account lookup

The Admin screen should begin with account lookup.

Supported identifiers should match authoritative backend capabilities, such as nickname and internal Game Account ID where already supported.

The UI must not expose Telegram identity as the primary administrative account model.

A successful lookup may show operationally relevant account data such as:

- nickname/avatar;
- account status;
- internal Game Account ID where needed for administration;
- Long Nardy rating;
- Backgammon rating;
- Coins;
- moderation/account state supported by the backend.

Do not overload the initial inspection surface with unrelated telemetry.

## Administrative actions

Season 0 may expose only actions that already have a justified backend contract, such as:

- moderation/account-state actions;
- rating adjustment;
- coin adjustment.

Each operation should open a focused action surface rather than placing many dangerous editable fields directly on the account card.

Conceptually:

```text
Adjust coins

PlayerName
Current: 840

Amount
[ +500 ]

Reason
[ Compensation for incident... ]

[ Confirm adjustment ]
```

Exact copy and field names are implementation details.

## Mandatory reason

Administrative mutations that affect player state, economy, moderation or rating must require an operator reason whenever the backend contract supports/requires one.

The UI must not silently invent default reasons.

Reason text should be explicit enough to be useful in the audit trail.

## Confirmation and destructive safety

Destructive or moderation-sensitive actions require a confirmation step before submission.

The confirmation surface should clearly identify:

- target account;
- operation;
- effective value/change;
- reason where applicable.

Confirmation is a protection against operator error, not a replacement for server-side validation and authorization.

## Audit trail

The Admin experience should expose recent administrative actions when supported by the backend, or at minimum provide a clear path to the existing audit-log surface.

Audit entries should be treated as authoritative server data.

Do not fabricate success history from optimistic client state.

## Visual direction

Admin should use the same shared visual system and AppShell conventions as the rest of the Mini App, but remain intentionally utilitarian.

Prefer:

- compact account cards;
- clear labels;
- strong distinction between read-only data and actions;
- semantic warning/danger states;
- readable confirmation sheets/dialogs.

Avoid decorative dashboards, oversized KPI cards or game-like presentation for privileged operations.

## Explicit non-goals for UX/UI v2

Do not introduce the following merely because an Admin section exists:

- mass user-management tables;
- DAU/MAU analytics dashboards;
- revenue/economy charts;
- season-management UI;
- live-match inspector;
- arbitrary database editors;
- bulk rating/economy mutations;
- general-purpose support CRM;
- Telegram identity tooling beyond a separately justified backend/admin need.

These are separate internal-tooling scopes if they become necessary later.

## Security invariant

All privileged actions remain server-authoritative.

The client must never be able to obtain or execute administrative capability merely through local UI state, route manipulation, modified JavaScript or claimed identifiers.

Frontend UX may reduce mistakes; backend authorization is the security boundary.
