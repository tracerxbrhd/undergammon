# 30 — Match History UX

Status: accepted UX/UI v2 decision, implementation pending

## Purpose

This document defines the accepted Season 0 Match History presentation for the UNDERGAMMON Telegram Mini App.

It complements:

- `08-profile-and-match-history.md` for product/history semantics;
- `21-miniapp-ux-ui-v2.md` for the overall Mini App v2 direction;
- `29-profile-hub-and-account-progression-ux.md` for Profile navigation;
- the existing backend history contract for authoritative persisted match data.

The goal is to make match history compact, readable and trustworthy without implying features such as replay or complete client-side filtering that do not exist yet.

## Screen role

Match History is a secondary destination under Profile.

It is a chronological list of completed matches, not a statistics dashboard and not a replay browser.

The screen uses the normal AppShell navigation model unless opened as a nested secondary page where the navigation hierarchy already provides an appropriate back affordance.

## Match row information hierarchy

Each row/card should answer the following questions quickly:

1. What was the result?
2. Who was the opponent?
3. Which ruleset and mode was played?
4. Did the match affect rating, and by how much?
5. When was the match played?

Conceptual Ranked example:

```text
VICTORY
vs PlayerName

Long Nardy · Ranked
+18 rating

Today · 18:42
```

Conceptual Casual/Private example:

```text
VICTORY
vs PlayerName

Long Nardy · Private
Unrated

Sep 14 · 21:35
```

The exact typography and row density are visual-system details, but the hierarchy above is accepted.

## Result presentation

Use human product language rather than raw backend/internal status codes.

Examples of meaningful finish context:

```text
Victory · Opponent resigned
Defeat · Timeout
Victory · Gammon
```

Do not display technical labels such as `NORMAL_COMPLETION`, enum names or internal finish identifiers to the user.

For a normal naturally completed match, omit redundant finish wording unless the ruleset-specific result class itself is meaningful.

For Classic Backgammon, NORMAL / GAMMON / BACKGAMMON classification may be shown only when it comes from authoritative persisted result data.

## Rating delta

Ranked history rows may show the persisted authoritative rating delta.

Requirements:

- show positive/negative delta only for Ranked;
- never infer rating change from two independently fetched profile snapshots;
- Casual and Private matches display `Unrated` or equivalent localized semantics;
- calibration/preliminary semantics must remain consistent with the rating product contract.

## Opponent interaction

The opponent identity is the useful interactive target in a history row.

Tapping the opponent opens the existing Public Profile surface when the opponent account is still available and public-profile data can be fetched.

The history row itself does not imply replay functionality.

## No replay in UX/UI v2

Season 0 Match History does not introduce:

- board replay;
- turn-by-turn timeline;
- dice history;
- move list;
- analysis engine;
- downloadable match records.

If replay is added later, it becomes a separate product/contract feature rather than a client-only reconstruction from incomplete history data.

## Filtering

Do not add full-looking client-side filters over only the currently loaded page of history.

A filter UI would imply that the complete history is being queried, which is misleading if the backend only returned the first page/batch.

Season 0 baseline therefore keeps history chronological and unfiltered.

Future filters may be added when the backend exposes authoritative query parameters such as ruleset, mode, result and cursor-based pagination.

## Pagination

Prefer explicit pagination/loading semantics such as `Load more` over an uncontrolled infinite-scroll implementation.

Reasons:

- it is easier to reason about in the Telegram Mini App viewport;
- users understand that more history exists;
- error/retry states remain localized;
- it avoids implying that the currently loaded rows represent the complete history.

The exact backend pagination mechanism remains a contract concern; the UX must not fabricate completeness.

## Empty state

A new account with no completed matches should receive a useful empty state rather than a blank list.

Conceptually:

```text
No matches yet

Your completed games will appear here.

[ Play a match ]
```

The CTA returns to the primary Play destination.

## Information intentionally omitted

The ordinary Match History row should not display:

- match UUID;
- internal account IDs;
- raw database timestamps;
- RNG seed/fairness internals;
- internal finish/status codes;
- turn count;
- raw move counts;
- debug data;
- per-match XP unless and until the backend exposes authoritative match-attributed reward data suitable for history presentation.

Technical/fairness information belongs in its dedicated product surfaces, not in the ordinary history list.

## Visual direction

History should feel denser than Profile cards while remaining touch-readable.

Accepted direction:

- strong result label or concise semantic indicator;
- opponent identity visually prominent;
- ruleset/mode as secondary metadata;
- rating delta aligned consistently;
- date/time quietest in the hierarchy;
- no table-style desktop column grid on narrow phones.

Win/loss meaning must not rely on color alone.
