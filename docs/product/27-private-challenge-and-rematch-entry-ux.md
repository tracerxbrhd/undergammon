# 27 — Private Challenge and Rematch Entry UX

Status: accepted UX/UI v2 decision, implementation pending

## Purpose

This document defines the accepted UX/UI v2 flow for private challenges and rematch invitations in the UNDERGAMMON Telegram Mini App.

It complements:

- `04-private-challenges.md` for authoritative challenge lifecycle;
- `06-match-lifecycle-reconnect-timeouts.md` for match creation and join behavior;
- `21-miniapp-ux-ui-v2.md` for the general v2 information architecture;
- `26-play-home-and-match-entry-ux.md` for Home and matchmaking entry.

The goal is to keep friend/private match entry as short and Telegram-native as possible while preserving the existing authoritative challenge model.

## Creating a private challenge

Private challenge creation starts directly from Home after the player selects:

- Casual;
- Friend;
- the desired ruleset.

The primary action becomes `Create Challenge` or equivalent localized copy.

After creation, the UI moves to a dedicated focused waiting flow rather than leaving challenge state embedded in Home.

The normal bottom navigation is hidden while this focused flow is active.

## Outgoing challenge waiting state

The dedicated outgoing challenge state should show only information relevant to the invitation:

- selected ruleset;
- Private / Unrated context;
- challenge expiry/countdown;
- dominant `Share Invite` action;
- secondary `Cancel` action.

Conceptually:

```text
Challenge created

Long Nardy
Private · Unrated

Expires in 09:24

[ Share Invite ]
[ Cancel ]
```

Do not expose technical challenge tokens, room codes or internal identifiers as part of the normal player experience.

The primary share action should use the existing Telegram/deep-link flow.

## Persistence and recovery

Closing or minimizing the Mini App does not cancel an outgoing challenge.

When the player returns while an outgoing challenge is still authoritative and unexpired, Home should surface that state ahead of creating another challenge and allow the player to return to the challenge waiting flow.

A compact recovery state may show:

- ruleset;
- remaining time;
- `Return to challenge`;
- `Cancel`.

The UI must not create a second challenge while the authoritative lifecycle allows only one outgoing challenge.

## Incoming ordinary challenge

Opening a generic challenge deep link leads to a dedicated incoming-challenge surface.

The flow should provide:

- the authoritative challenge context currently available to the client;
- a dominant `Accept` action;
- a secondary dismiss/`Not now` action.

The current backend does not provide an authoritative read-only preview containing challenger identity before acceptance. Until such a contract exists, the UI must not invent challenger name, avatar or other metadata.

A future lightweight challenge-preview endpoint may enrich this surface without changing the accepted flow.

## Accepting a challenge

Challenge acceptance remains authoritative.

Accepted transition:

```text
Incoming challenge
-> Accept
-> authoritative challenge acceptance
-> match created
-> Game Screen / WAITING_FOR_PLAYERS as needed
```

Do not add a separate Ready step after challenge acceptance.

If a challenge is expired, already used or otherwise invalid, show a dedicated human-readable state instead of a raw backend error code.

## Rematch invitations

Casual/private rematch uses the same overall invitation pattern but a different data variant.

Where the rematch endpoint already provides authoritative opponent metadata, the invitation may show:

- opponent nickname;
- ruleset;
- Unrated/private context;
- `Accept rematch`;
- `Decline`.

Ranked direct rematch remains unsupported and must not be offered.

## Reusable ChallengeFlow shell

Ordinary private challenge and rematch invitation should share one reusable presentation shell rather than two independently implemented flows.

Conceptually:

```text
ChallengeFlow
├─ outgoing private challenge
├─ incoming generic challenge
└─ incoming rematch invitation
```

Variants may differ in available metadata and actions, but should share:

- focused layout;
- safe-area handling;
- expiry/status presentation;
- primary/secondary action structure;
- loading/error/expired states;
- transition into the authoritative match lifecycle.

## Navigation behavior

Challenge waiting and incoming challenge acceptance are focused flows and may hide the normal bottom navigation.

Returning to ordinary app navigation must not implicitly cancel an authoritative challenge unless the player explicitly chooses Cancel.

The Telegram/native Back behavior should dismiss or return from non-destructive challenge surfaces where appropriate, but must not silently cancel a challenge.

## Scope guard

This UX decision does not require:

- room codes;
- manual token entry;
- a friend list;
- global player search;
- a social graph;
- a pre-match Ready confirmation;
- speculative challenger metadata unavailable from the backend.

Private match entry remains based on shareable Telegram/deep-link challenges and the existing authoritative lifecycle.
