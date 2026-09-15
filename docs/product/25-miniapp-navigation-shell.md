# 25 — Mini App Navigation Shell

Status: accepted UX/UI v2 decision; five-destination shell implemented in Update 1.

## Purpose

This document defines the reusable application shell and primary bottom-navigation pattern for the UNDERGAMMON Telegram Mini App.

It complements:

- `03-bot-miniapp-navigation.md` for product navigation rules;
- `21-miniapp-ux-ui-v2.md` for the accepted Mini App v2 information architecture;
- `19-season-0-release-scope.md` for release scope.

The shell was intentionally designed to expand without a structural rewrite. Update 1 used that capacity for Store and Cosmetics.

## Primary navigation model

The current implemented primary destinations are, left to right:

- Store;
- Cosmetics;
- Play;
- Rankings;
- Profile.

`Play` remains the product's primary destination and occupies the central navigation position.

Conceptually:

```text
[ Store ] [ Cosmetics ] [ PLAY ] [ Rankings ] [ Profile ]
```

The navigation is icon-led rather than text-button-led.

Each item still requires an accessible semantic label for screen readers/tooling even when the visible presentation is icon-only.

## Central Play treatment

`Play` is the visual anchor of the navigation bar.

Accepted direction:

- always centered in the primary shell;
- visually larger than the secondary navigation icons;
- has the strongest selected state;
- may use a slightly raised/elevated treatment if it remains restrained and does not interfere with Telegram safe areas;
- represents the default/home gameplay destination.

The visual emphasis must not change the actual touch-target requirements: all navigation items need comfortable mobile hit areas.

## Expandable shell

The shell supports up to five primary destinations on normal phone widths without rewriting the application layout.

Conceptually, the navigation component owns:

```text
leadingItems[]
primaryItem = Play
trailingItems[]
```

Current configuration:

```text
leadingItems  = [Store, Cosmetics]
primaryItem   = Play
trailingItems = [Rankings, Profile]
```

Further primary destinations should not be added merely because the shell is structurally capable of more. The current five slots are occupied and any future change must be an explicit product/navigation decision.

## No empty placeholder buttons

Do not render disabled/empty navigation slots merely to reserve visible space for future features.

The current product should show only real, usable destinations.

Future capacity is reserved in the component/layout contract rather than through blank UI.

## Unified AppShell

Normal non-game destinations should share one shell that owns:

- Telegram stable viewport/safe-area handling;
- application background;
- primary content region;
- bottom navigation;
- route/section transitions where appropriate;
- common loading/offline surfaces that belong to the app rather than a feature.

Individual feature screens should not duplicate their own bottom-navigation markup.

The active Game Screen remains an explicit exception: it uses the dedicated viewport-locked match surface and does not show the application bottom navigation.

Focused flow screens such as matchmaking/challenge waiting may also temporarily hide the bottom navigation where already defined by UX/UI v2 flow decisions.

## Layout behavior

The navigation bar must:

- remain fixed to the bottom shell region;
- account for Telegram/content safe-area inset;
- never overlap scrollable page content;
- use stable geometry while switching between normal primary destinations;
- remain usable on compact phone widths;
- avoid horizontal scrolling.

The content region should reserve the navigation height so ordinary pages do not end underneath the bar.

## Visual consistency

All navigation items use the same icon system and shared selected/unselected semantics.

`Play` is intentionally larger, but must still belong to the same visual family rather than appearing as an unrelated floating control.

Recommended state hierarchy:

- selected `Play`: strongest accent and size emphasis;
- selected secondary item: accent/high-contrast state;
- unselected item: quieter neutral state;
- disabled primary-nav items are generally avoided because unusable destinations should not be exposed in the first place.

Do not use emoji or generic Unicode symbols as the final production navigation icon system.

The current implementation still uses simple Unicode glyphs as a presentation shortcut. Replacing them with a coherent application-owned/vector icon set is visual technical debt, not a reason to change the five-tab information architecture.

## Architecture direction

The shell/navigation structure is configuration-driven rather than hard-coded separately into each page.

Conceptually:

```ts
interface PrimaryNavItem {
  id: string;
  icon: IconComponent;
  label: LocalizedKey;
  destination: AppDestination;
}

interface PrimaryNavModel {
  leading: PrimaryNavItem[];
  primary: PrimaryNavItem; // Play
  trailing: PrimaryNavItem[];
}
```

Exact TypeScript names are implementation details. The important contract is that an accepted navigation change should normally be a configuration/layout change, not an AppShell rewrite.

## Scope guard

Store and Cosmetics are no longer speculative placeholders: both are implemented primary destinations in Update 1.

Social, Events and other speculative destinations remain outside current Season 0 navigation unless separately accepted and implemented.
