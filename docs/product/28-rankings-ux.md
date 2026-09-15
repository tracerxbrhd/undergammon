# 28 — Rankings UX

Status: accepted UX/UI v2 decision, implementation pending

## Purpose

This document defines the accepted Rankings experience for the UNDERGAMMON Telegram Mini App.

It complements:

- `05-matchmaking-rating-seasons.md` for rating/calibration semantics;
- `08-profile-and-match-history.md` for public profile behavior;
- `21-miniapp-ux-ui-v2.md` for overall Mini App v2 direction;
- `25-miniapp-navigation-shell.md` for the shared application shell.

Rankings is a primary product destination, but it should remain compact, readable and game-focused rather than becoming a decorative tournament dashboard.

## Primary structure

The Rankings screen uses the shared `AppShell` and bottom navigation.

Its accepted structure is:

```text
Rankings

[ Long Nardy ] [ Backgammon ]

leaderboard list

persistent/separate self-position card

bottom navigation
```

The ruleset selector is visible and uses the same compact segmented/tile language as other two-option first-class selectors in UX/UI v2.

## Leaderboard rows

The leaderboard list is a dense mobile-first list rather than a large podium composition.

Each row should expose only the information needed for comparison:

- leaderboard position;
- avatar;
- nickname;
- current authoritative rating.

`Peak` and other secondary statistics are not shown in every leaderboard row. They remain available in the public player profile where appropriate.

Rows are tappable and open the player's public game profile.

## Top-3 treatment

The first three positions may receive restrained visual emphasis, but keep the same underlying row geometry as the rest of the list.

Preferred hierarchy:

- #1: strongest accent/emphasis;
- #2: secondary highlight;
- #3: secondary highlight;
- #4+: normal row treatment.

Avoid a large podium, oversized portraits, crowns, throne-like artwork or casino-style visual noise that would reduce useful list density.

## Current-player position

The user should be able to see their own ranking context without having to scroll to their exact leaderboard position.

Use a clearly separated self-position card/row near the bottom of the Rankings surface.

Conceptually:

```text
Your position
#38   avatar   You   1482
```

If the user also happens to be visible in the current list viewport, duplicate presentation is acceptable when it preserves the persistent self-context; implementation may visually distinguish the self row.

## Calibration state

A player who has not completed the required calibration matches does not receive a fabricated leaderboard position.

Use an explicit calibration state instead, for example:

```text
Your position
Calibration
6 / 10 matches
≈1048
```

Do not display fake values such as `#0`, `#—` presented as a real rank, or an invented estimated leaderboard position.

Preliminary rating presentation must follow the existing approximate/preliminary semantics.

## Ruleset separation

Long Nardy and Classic Backgammon maintain separate rankings.

Switching the ruleset updates:

- leaderboard rows;
- self-position/calibration state;
- rating context.

Do not merge the two ratings or imply a universal skill number across rulesets.

## Scrolling and pagination

The leaderboard list is vertically scrollable inside the ordinary application content region while the bottom navigation remains part of the shared shell.

The current backend top-100 contract is sufficient for UX/UI v2.

Do not add speculative infinite-history semantics or client-only ranking data beyond what the backend returns.

## No speculative filters

UX/UI v2 does not add unsupported filters such as:

- friends;
- country/region;
- day/week/month;
- historical seasons;
- leagues/divisions;
- arbitrary rating ranges.

These can be added only when product/backend contracts exist for them.

## Loading, empty and error states

Rankings should preserve the screen shell while data is loading.

Use compact row skeletons rather than replacing the entire application with a spinner.

If the leaderboard is empty or temporarily unavailable:

- keep the selected ruleset visible;
- show a concise empty/error state;
- preserve the self/calibration context if it is independently available;
- offer Retry for recoverable errors.

## Non-goals

The Rankings v2 screen does not introduce:

- a podium-heavy tournament presentation;
- leagues or named tiers;
- seasonal archive browsing;
- player search;
- social/friends filters;
- detailed statistics in every row;
- leaderboard-specific monetization surfaces.

The screen should make competitive standing easy to understand with minimal visual overhead.
