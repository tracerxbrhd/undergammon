# 25 — Mini App Navigation Shell

Status: accepted UX/UI v2 decision, implementation pending

## Purpose

This document defines the reusable application shell and primary bottom-navigation pattern for the UNDERGAMMON Telegram Mini App.

It complements:

- `03-bot-miniapp-navigation.md` for product navigation rules;
- `21-miniapp-ux-ui-v2.md` for the accepted Mini App v2 information architecture;
- `19-season-0-release-scope.md` for release scope.

The goal is to keep current navigation compact while avoiding a future structural rewrite when another major product destination such as Store is introduced.

## Primary navigation model

The current primary destinations remain:

- Rankings;
- Play;
- Profile.

`Play` is the product's primary destination and occupies the central navigation position.

Conceptually:

```text
[ Rankings ]    [ PLAY ]    [ Profile ]
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

The shell must support future primary destinations without rewriting the application layout.

Conceptually, the navigation component owns:

```text
leadingItems[]
primaryItem = Play
trailingItems[]
```

with a practical capacity of up to five primary destinations on normal phone widths.

Current configuration:

```text
leadingItems  = [Rankings]
primaryItem   = Play
trailingItems = [Profile]
```

A future configuration may become, for example:

```text
leadingItems  = [Rankings, Store]
primaryItem   = Play
trailingItems = [Social, Profile]
```

The exact future destinations are not accepted product scope yet; this is only a structural capability.

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

Do not use emoji as production navigation icons.

Use a consistent vector/icon source or application-owned icon components so stroke weight, optical size and alignment remain coherent.

## Architecture direction

The shell/navigation structure should be configuration-driven rather than hard-coded separately into each page.

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

Exact TypeScript names are implementation details. The important contract is that adding a future accepted primary destination should normally be a navigation configuration/layout change, not an AppShell rewrite.

## Scope guard

This extensibility does not mean Store, Social, Events or other speculative tabs should be implemented or shown during UX/UI v2 unless their product scope is separately accepted.

The shell is future-ready; the current navigation remains intentionally small.
