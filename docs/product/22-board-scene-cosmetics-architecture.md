# 22 — Board Scene and Cosmetic Architecture

Status: accepted UX/UI v2 architecture baseline, implementation pending

## Purpose

This document defines how the UNDERGAMMON Board Scene must be structured so future board skins and other cosmetics can be added without rewriting gameplay UI.

It complements:

- `07-game-board-ux.md` for board interaction and presentation rules;
- `10-economy-and-cosmetics.md` for cosmetic ownership/product rules;
- `21-miniapp-ux-ui-v2.md` for the Mini App v2 composition.

The central rule is:

> Cosmetics may change presentation, but must never change board geometry, gameplay semantics, interaction hitboxes, move legality or competitive readability.

## Default appearance is the first skin

The initial Season 0 visual design must not be implemented as a collection of hard-coded special cases.

`Default` is treated as the first implementation of every cosmetic slot:

- Default Board Theme;
- Default Checker Set;
- Default Dice Skin;
- Default Profile Frame;
- Default Reaction Pack.

This does not require implementing the Store, inventory/economy UI or monetization in UX/UI v2. It only requires the rendering architecture to use the same cosmetic boundary that future owned/equipped cosmetics will use.

## Geometry and appearance are separate concerns

The Board Scene is conceptually split into two layers.

### Board geometry

Geometry owns gameplay-sensitive layout:

- 24 point locations;
- central bar location;
- bearing-off/off-board tray locations;
- checker stack anchors;
- dice placement bounds;
- source/destination hit targets;
- legal-target geometry;
- move-animation coordinates;
- responsive scaling and orientation;
- player-perspective mapping.

Geometry is derived from the Board Scene container and is independent of the selected cosmetic theme.

A cosmetic must never alter these values.

### Board appearance

Appearance may define visual presentation such as:

- frame material/color;
- playing-surface material/color;
- point colors/textures;
- bar and tray materials;
- decorative separators/ornaments that remain within reserved bounds;
- checker material/markings;
- dice body/material styling;
- profile-frame styling;
- reaction artwork/animation within safe presentation limits.

Appearance consumes geometry; it does not create geometry.

## Fixed gameplay overlay layer

Some visuals are gameplay communication and are not cosmetic slots.

The application owns a system overlay layer for:

- selected source;
- legal destination;
- recent move;
- focus/pressed state;
- reconnect/control-loss state;
- timer warnings;
- mandatory accessibility/contrast treatment.

Board themes and checker skins must not be allowed to replace, hide or weaken these signals.

The visual system may adapt overlay colors for contrast, but the semantics and minimum visibility are controlled by the application.

## Hybrid match presentation

The accepted product direction from `10-economy-and-cosmetics.md` remains authoritative: a match combines cosmetics from both participants.

### Board Theme

The Board Scene must be composable by player ownership rather than implemented as one inseparable background image.

Conceptually:

```text
opponent-owned board region -> opponent Board Theme
shared/central region       -> deterministic neutral/composed presentation
local-player board region   -> local Board Theme
```

The implementation must map ownership from authoritative player/seat identity through the current local perspective. It must not hard-code `top = opponent theme` or a domain-seat coordinate assumption that breaks after perspective rotation.

A board theme therefore needs composable visual regions/tokens rather than a single bitmap that assumes both halves always use the same skin.

### Checker Set

Each participant's checkers use that participant's equipped Checker Set.

Checker cosmetics must fit a common checker bounding box and must not change stack spacing, hit area or effective checker size.

### Dice Skin

The accepted product direction is that the visible dice pair can combine cosmetics from both players, with `Default` as fallback.

Dice skins may style the die body/material, but value readability is mandatory. Pip/value presentation should remain constrained by the application or by a validated skin specification so a skin cannot obscure the authoritative dice result.

Dice skins must fit fixed dice bounds and must not affect roll semantics or animation timing.

### Profile Frame and reactions

Profile Frame belongs to the owning player identity surface.

Reaction Pack controls only the available visual reaction assets/presentation for reactions the account is allowed to use. Reactions remain non-blocking and must not cover gameplay-critical controls or board regions for an extended period.

## Cosmetic resolution boundary

The rendering code should consume one resolved presentation model rather than read ownership/store state directly throughout the component tree.

Conceptually:

```text
account/match cosmetic data
        ↓
resolveMatchCosmetics(...)
        ↓
ResolvedMatchCosmetics
        ↓
BoardScene / PlayerStrip / Reactions
```

A conceptual resolved model contains stable IDs/specifications for at least:

```text
board.localTheme
board.opponentTheme
checkers.localSet
checkers.opponentSet
dice.localSkin
dice.opponentSkin
profile.localFrame
profile.opponentFrame
reactions.localPack
```

Exact TypeScript contracts are an implementation concern and should be introduced only where needed. The important architectural requirement is the resolver boundary.

For UX/UI v2, the resolver may initially return only `Default` cosmetics. This is preferable to adding speculative Store/backend contracts solely for the visual refactor.

## Server ownership and trust boundary

When cosmetic ownership/equipment becomes functional, the backend must be authoritative for which cosmetics an account owns and has equipped.

The client must not be trusted to declare arbitrary cosmetic IDs to the opponent.

A future match presentation contract may be carried in the match snapshot or provided through another server-resolved contract, but it must be validated server-side.

This is an economy/identity trust requirement, not a game-rule requirement: cosmetic state still must not enter the deterministic game engine.

## Asset safety and loading

Cosmetic assets must be data/assets, not arbitrary executable UI.

Do not support:

- remote HTML supplied by a cosmetic;
- arbitrary JavaScript;
- arbitrary runtime CSS injection;
- skin-defined gameplay DOM structure;
- skin-defined hitboxes.

Prefer a curated asset/specification model with known fields and application-controlled rendering.

The Board Scene geometry must be available immediately. Cosmetic loading failure must fall back to `Default` without preventing a match from starting.

Late asset loading must not resize or reflow the board.

Important default assets should be bundled or otherwise available through a predictable preload/cache strategy so match start remains fast.

## Responsive invariants

All Board Themes, Checker Sets and Dice Skins must work against the same responsive geometry contract.

A cosmetic is not allowed to require:

- a different board aspect ratio;
- a larger bar;
- different point widths;
- different checker stack spacing;
- a larger action area;
- additional scrolling;
- a second mobile/desktop board implementation.

Decorative content must clip or adapt inside the presentation bounds provided by the Board Scene.

## Competitive-readability requirements

Every cosmetic must preserve:

- clear ownership of both checker colors/sets;
- readable dice values;
- visible legal destinations;
- visible selected checker/source;
- visible recent-move feedback;
- sufficient contrast between checker and board surface;
- clear bar/off-tray occupancy;
- the same interaction target sizes as `Default`.

If a cosmetic cannot satisfy these conditions, it is not a valid match cosmetic regardless of rarity or acquisition source.

## Board Scene v2 structural baseline

The accepted structural direction remains:

```text
24 points
+ permanent central structure/bar
+ permanent side bearing-off/off-board area
+ dice presentation inside the Board Scene
+ checker/presentation overlay layers
```

The board geometry stays stable throughout the match. Bearing-off areas do not appear dynamically in a way that resizes the board.

The exact Board Scene aspect ratio, visual proportions and compression rules for checker stacks remain adjustable during implementation/device testing.

## Explicit non-goals for the UX/UI v2 refactor

The UI refactor does not need to implement:

- Store screens;
- cosmetic purchasing;
- inventory/equipment persistence;
- Telegram Stars;
- rarity economy;
- backend cosmetic ownership tables;
- match protocol changes solely to make non-default skins usable immediately.

It must, however, avoid architecture that would require the Board Scene to be rewritten when those systems are later introduced.
