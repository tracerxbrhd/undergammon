# 22 — Board Scene and Cosmetic Architecture

Status: accepted UX/UI v2 architecture baseline; initial resolver/BoardScene integration and trusted Profile Frame presentation are implemented.

## Purpose

This document defines how the UNDERGAMMON Board Scene must be structured so board skins and other cosmetics can be added without rewriting gameplay UI.

It complements:

- `07-game-board-ux.md` for board interaction and presentation rules;
- `10-economy-and-cosmetics.md` for cosmetic ownership/product rules;
- `21-miniapp-ux-ui-v2.md` for the Mini App v2 composition.

The central rule is:

> Cosmetics may change presentation, but must never change board geometry, gameplay semantics, interaction hitboxes, move legality, checker identity, dice authority, game state or competitive readability.

## Default appearance is the first skin

The Season 0 visual design must not be implemented as a collection of hard-coded special cases.

`Default` is treated as the first implementation of every cosmetic slot:

- Default Board Theme;
- Default Checker Set;
- Default Dice Skin;
- Default Profile Frame;
- Default Reaction Pack.

Update 1 has since implemented Store, permanent ownership and equipment for the `PROFILE_FRAME` slot. The same rendering boundary remains important for slots that are not yet functional content: Board Theme, Checker Set, Dice Skin and Reaction Pack currently fall back to `Default`.

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

The Board Scene must be composable by player ownership rather than implemented as one inseparable background image or one global `board-theme-*` class for the whole match.

Conceptually:

```text
opponent-owned board region -> opponent Board Theme
shared/central region       -> deterministic neutral/composed presentation
local-player board region   -> local Board Theme
```

The implementation must map ownership from authoritative player/seat identity through the current local perspective. It must not hard-code `top = opponent theme` or a domain-seat coordinate assumption that breaks after perspective rotation.

A board theme therefore needs composable visual regions/tokens rather than a single bitmap that assumes both halves always use the same skin.

Board Theme remains future cosmetic content; the current resolver deliberately returns `Default` for both owner regions.

### Checker Set

Each participant's checkers use that participant's equipped Checker Set.

Checker cosmetics must fit a common checker bounding box and must not change stack spacing, hit area or effective checker size.

The owner-aware Checker Set hooks exist in BoardScene, but current presentation remains `Default` because no functional Checker Set ownership/equipment contract is exposed yet.

### Dice Skin

The accepted product direction is that the visible dice pair can combine cosmetics from both players, with `Default` as fallback.

Dice skins may style the die body/material, but value readability is mandatory. Pip/value presentation should remain constrained by the application or by a validated skin specification so a skin cannot obscure the authoritative dice result.

Dice skins must fit fixed dice bounds and must not affect roll semantics or animation timing. The current BoardScene has separate local/opponent Dice Skin presentation hooks, both resolving to `Default` today.

### Profile Frame and reactions

Profile Frame belongs to the owning player identity surface. This is the currently functional cosmetic slot: trusted equipped Profile Frames are resolved for local/opponent identity and are also presented on profile/public-profile surfaces.

Reaction Pack controls only the available visual reaction assets/presentation for reactions the account is allowed to use. Reactions remain non-blocking and must not cover gameplay-critical controls or board regions for an extended period. Reaction Pack remains `Default` in the current implementation.

## Cosmetic resolution boundary

The rendering code consumes one resolved presentation model rather than reading ownership/store state directly throughout the component tree.

This boundary is now present in code:

```text
trusted account/match cosmetic data
        ↓
resolveMatchCosmetics(...)
        ↓
ResolvedMatchCosmetics
        ↓
BoardScene / player identity presentation
```

`ResolvedMatchCosmetics` contains owner-aware local/opponent presentation slots for board, checkers, dice and profile frames, plus the local reaction presentation. Perspective is resolved from the viewer's authoritative seat identity rather than from fixed screen-top/screen-bottom assumptions.

Current implementation status:

- `profile.localFrame` / `profile.opponentFrame`: resolve trusted equipped Profile Frames;
- `board.localTheme` / `board.opponentTheme`: `Default`;
- `checkers.localSet` / `checkers.opponentSet`: `Default`;
- `dice.localSkin` / `dice.opponentSkin`: `Default`;
- `reactions.localPack`: `Default`.

The important architectural requirement remains the resolver boundary. Adding a future accepted slot should extend trusted data/presentation through that boundary rather than scattering ownership logic through rendering components.

## Server ownership and trust boundary

Cosmetic ownership/equipment is functional for Profile Frames and the backend is authoritative for what an account owns and has equipped.

The client must not be trusted to declare arbitrary cosmetic IDs to the opponent. Store price, purchase eligibility, ownership and equipment validation are server-owned concerns.

Match/profile presentation uses server-trusted equipment data. Future Board Theme, Checker Set, Dice Skin or Reaction Pack contracts must preserve the same trust boundary.

This is an economy/identity trust requirement, not a game-rule requirement: cosmetic state must not enter the deterministic game engine.

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

The exact Board Scene aspect ratio and fine visual proportions remain adjustable during implementation/device testing.

## Checker stack presentation

Checker stacks use one stable presentation rule for both rulesets and for all Checker Sets.

Accepted baseline:

- stacks of up to five checkers are shown as individual physical checker discs;
- stacks larger than five keep the same geometry instead of extending indefinitely along the point;
- the visible stack is compressed after the fifth checker and displays a compact count badge for the full stack count;
- the whole visible stack remains one consistent touch target for source selection;
- the count indicator is application-controlled UI and must remain readable across all Checker Sets;
- a Checker Set may style the checker discs but may not change the stack algorithm, spacing contract, touch target, or count readability;
- bar and bearing-off occupancy follow the same principle: large counts must not cause Board Scene reflow.

This rule is especially important for Long Nardy, where large stacks are normal gameplay and must remain readable on compact phones.

## Scope after Update 1

Store screens, Profile Frame purchasing, permanent ownership/equipment persistence and backend ownership tables are no longer future requirements: Update 1 implemented that vertical slice.

This Board Scene architecture still does not require prematurely implementing:

- non-default Board Themes;
- non-default Checker Sets;
- non-default Dice Skins;
- non-default Reaction Packs;
- Telegram Stars;
- rarity economy;
- a large cosmetic catalog;
- arbitrary match-protocol changes solely to make speculative skins usable.

Future cosmetic expansion must reuse this architecture rather than changing geometry, hitboxes, legal moves, checker identity, dice authority or game state.
