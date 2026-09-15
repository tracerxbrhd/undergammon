# 31 — Public Profile UX

Status: accepted UX/UI v2 decision, implementation pending

## Purpose

This document defines the accepted public game-profile presentation for UNDERGAMMON.

It complements:

- `08-profile-and-match-history.md` for public/private profile data boundaries;
- `21-miniapp-ux-ui-v2.md` for overall Mini App v2 information architecture;
- `28-rankings-ux.md` for leaderboard entry points;
- `30-match-history-ux.md` for opponent profile entry points.

The public profile is the player's game identity. It is not a mirror of the user's Telegram profile and must not expose Telegram identity data.

## Presentation model

Public Profile is presented as a reusable mobile-friendly bottom sheet / overlay surface rather than a desktop-style centered modal or a separate primary navigation destination.

The sheet opens from contexts such as:

- Rankings;
- Match History;
- in-match player identity surfaces where appropriate.

Opening the profile must preserve the underlying screen/context so the user can dismiss it and continue where they were.

## Public information

The sheet may show authoritative public game information including:

- avatar;
- nickname;
- Account Level;
- Long Nardy rating and peak;
- Classic Backgammon rating and peak;
- aggregate completed matches;
- aggregate wins;
- derived win rate when enough source data is available.

Exact layout is a visual-system concern, but the hierarchy should prioritize identity first, then ruleset ratings, then aggregate statistics.

Conceptually:

```text
[ avatar ]
PlayerName
Level 18

Long Nardy
1674 rating · Peak 1712

Backgammon
1531 rating · Peak 1590

Matches 248 · Wins 139
Win rate 56%
```

## Privacy boundary

Do not expose any of the following through Public Profile:

- Telegram username;
- Telegram user ID;
- Telegram account metadata not explicitly part of the game domain;
- internal Game Account UUID;
- session/authentication information;
- private settings;
- moderation/admin metadata;
- private Match History.

The domain identity remains the internal UNDERGAMMON game account and its public game-facing fields.

## No premature social actions

Public Profile v2 does not add speculative social features such as:

- Add Friend;
- Follow;
- Direct Message;
- Invite to clan/group;
- persistent social relationship state.

A direct Challenge action is also not required on the public-profile baseline while the product has no accepted social graph / universal player-search flow.

If social capabilities are introduced later, they should be added deliberately rather than turning the profile into a collection of non-functional placeholders.

## Interaction

The sheet must:

- be easy to dismiss with an explicit close/back interaction;
- integrate with Telegram BackButton semantics where appropriate;
- avoid resizing/reflowing the underlying screen;
- remain usable on compact phone heights;
- avoid nested scroll unless the profile genuinely outgrows the viewport.

For the current information set, the preferred result is a compact sheet that normally fits without excessive scrolling.

## Data rules

All displayed statistics must be server-authoritative or derived from authoritative public aggregates.

Do not fabricate missing values, infer Telegram identity, or expose private data through client-side joins.

If a rating is still preliminary/calibrating, use the same preliminary/calibration presentation semantics as the rest of the application rather than pretending it is a fully established competitive rating.

## Reuse

Use one reusable `PublicProfile` feature/surface across Rankings, Match History and other entry points.

Do not implement separate profile-card variants with different data/privacy behavior for each caller.

## Non-goals

Public Profile v2 does not include:

- public Match History;
- replay browsing;
- achievements/badges unless separately introduced as public profile metadata;
- social graph;
- chat/messaging;
- Telegram profile links;
- admin controls.
