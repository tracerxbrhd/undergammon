# 26 — Play Home and Match Entry UX

Status: accepted UX/UI v2 decision, implementation pending

## Purpose

This document defines the accepted Play/Home match-entry experience for the UNDERGAMMON Telegram Mini App.

It complements:

- `03-bot-miniapp-navigation.md` for product navigation and match setup rules;
- `05-matchmaking-rating-seasons.md` for Casual/Ranked behavior;
- `21-miniapp-ux-ui-v2.md` for the overall Mini App v2 direction;
- `25-miniapp-navigation-shell.md` for the shared application shell.

The product goal is to minimize the path from opening the Mini App to starting a game.

## Home is the match setup surface

Play/Home is not a dashboard followed by a separate match-configuration wizard.

The primary setup controls are directly available on Home:

- Casual / Ranked mode;
- ruleset;
- opponent path for Casual;
- relevant rating/calibration context;
- one dominant context-aware primary action.

Do not introduce a `Play -> Choose mode -> Choose ruleset -> Choose opponent` sequence of separate screens unless future product complexity makes it objectively necessary.

## Compact account context

Home may show compact account identity/context such as:

- avatar;
- nickname;
- Account Level;
- Coins.

This information must remain secondary to starting a match and should not turn Home into a profile dashboard.

## Mode selector

Casual / Ranked uses a compact visible segmented control.

Ranked removes unsupported direct-friend matchmaking options rather than showing them as selectable but invalid.

The primary CTA adapts to the selected mode/path.

Examples:

```text
Casual + Find Player -> Find Player
Casual + Friend      -> Create Challenge
Ranked               -> Find Ranked Match
```

Exact localized button copy is implementation detail.

## Ruleset selector

UX/UI v2 intentionally supersedes the older dropdown-oriented presentation direction for the current two-ruleset product.

Long Nardy and Classic Backgammon are both first-class game types and should be visible directly on Home.

Use a two-option segmented/tile selector such as:

```text
[ Long Nardy ] [ Backgammon ]
```

or an equivalent compact two-card treatment.

Requirements:

- both rulesets visible without opening a menu;
- one-tap switching;
- strong selected state;
- works with RU/EN labels;
- touch targets remain comfortable on narrow phones;
- selection persists as the user's last-used ruleset using the existing client preference behavior unless/until an account-level preference is introduced.

Do not use a native/HTML-style dropdown for the normal two-ruleset Home flow.

If the product later grows to many game variants, the selector may be revisited rather than forcing an ever-growing segmented control.

## Casual opponent path

Casual exposes two accepted paths:

- Find Player;
- Friend.

These should be visible and mutually exclusive without requiring a secondary configuration screen.

Selecting Friend changes the primary CTA to challenge creation; selecting Find Player changes it to matchmaking.

## Ranked context

Ranked exposes only matchmaking.

The Home surface may show the selected ruleset's current rating and calibration state.

Preliminary rating uses the existing approximate/preliminary presentation semantics, and calibration progress may be shown from authoritative played-count data.

Do not invent matchmaking search-radius values or other tuning details that the server does not expose.

## Active-match priority

If the account has an unfinished active match, normal match setup becomes secondary to recovery.

Home must prominently offer Return to Game / recovery rather than allowing the user to unknowingly start another conflicting flow.

The authoritative one-active-match lifecycle remains unchanged.

## Navigation shell

Home uses the shared `AppShell` and bottom navigation from `25-miniapp-navigation-shell.md`.

`Play` is the selected central primary destination and receives the strongest visual emphasis.

No empty placeholder tabs are shown for future Store/Social/etc destinations.

## Non-goals

This Home redesign does not introduce:

- a multi-step match setup wizard;
- AI placeholders when AI is not usable;
- Store widgets;
- achievements panels;
- daily rewards panels;
- news/feed content;
- detailed match analytics;
- speculative matchmaking controls unsupported by the backend.

Home remains focused on starting or returning to a game.
