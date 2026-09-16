# 22 — Board Scene and Cosmetic Architecture

Status: accepted UX/UI v2 architecture baseline; resolver/BoardScene integration plus trusted Profile Frame, Checker Set, Dice Skin and hybrid Board Theme presentation are implemented.

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

Update 1 implemented Store, permanent ownership and equipment for `PROFILE_FRAME`; PR 2 extended the same model to `CHECKER_SET` and reserved `DICE_SKIN`; PR 3 made `DICE_SKIN` functional with Obsidian Dice as its first non-default implementation; PR 4 makes `BOARD_THEME` functional with Midnight Board and hybrid owner-aware composition. Reaction Pack content still falls back to `Default`.

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

The Board Scene is composable by player ownership rather than implemented as one inseparable background image or one global `board-theme-*` class for the whole match.

Conceptually:

```text
owner A board region -> owner A Board Theme
shared/central region -> deterministic neutral/composed presentation
owner B board region -> owner B Board Theme
```

The implementation maps ownership from authoritative physical player/seat identity through the current local perspective. It does not hard-code `top = opponent theme`, `bottom = local theme`, or another screen-coordinate shortcut that can become wrong after perspective rotation.

Current implementation rules:

- physical board points `0..11` belong to authoritative seat A's theme region and `12..23` to seat B's theme region;
- `physicalPoint(...)` performs the viewer/ruleset mapping before presentation classes are selected;
- each point receives presentation tokens from the authoritative owner of its physical region;
- the upper/lower surface layers are resolved from the same authoritative mapping rather than from player-screen assumptions;
- the 13% shared center remains a deterministic application-owned neutral layer;
- outer gameplay geometry, point buttons and hitboxes remain the existing Board Scene geometry;
- `Default` is the fallback for a missing/legacy `boardTheme` field;
- Midnight Board (`midnight_board`) is the first non-default Board Theme and is implemented with application-controlled CSS presentation tokens/classes.

A Board Theme therefore consists of composable visual regions/tokens rather than a single bitmap that assumes both halves always use the same skin.

### Checker Set

Each participant's checkers use that participant's equipped Checker Set.

Checker cosmetics must fit a common checker bounding box and must not change stack spacing, hit area or effective checker size.

The owner-aware Checker Set hooks in BoardScene consume trusted equipment. `Default` is the fallback and `marble_checker_set` is the first non-default implementation; neither changes checker geometry, stack behavior or hitboxes.

### Dice Skin

Dice Skin presentation follows authoritative die ownership, not a fixed "local die / opponent die" screen convention.

During the opening roll, the first die represents seat A and the second represents seat B, so each die uses the equipped Dice Skin of its owning seat. During normal turns, both dice belong to the authoritative `activePlayer` and therefore both use that player's equipped Dice Skin. `Default` remains the fallback for the relevant owner.

Dice skins may style the die body/material, but value readability is mandatory. Pip/value presentation remains application-controlled so a skin cannot obscure the authoritative dice result.

Dice skins fit the existing fixed dice bounds and do not affect roll semantics, rolled values, animation timing, move legality or game state. BoardScene consumes trusted owner-aware Dice Skin presentation through the local/opponent resolver boundary and maps it back to authoritative seat ownership. `obsidian_dice` is the first non-default implementation and changes CSS presentation only; the die DOM structure and geometry remain application-owned.

### Profile Frame and reactions

Profile Frame belongs to the owning player identity surface, while Checker Set belongs to that player's checkers in a match. Profile Frames, Checker Sets, Dice Skins and Board Themes are functional trusted cosmetic slots; Profile Frames are also presented on profile/public-profile surfaces.

Reaction Pack controls only the available visual reaction assets/presentation for reactions the account is allowed to use. Reactions remain non-blocking and must not cover gameplay-critical controls or board regions for an extended period. Reaction Pack remains `Default` in the current implementation.

## Cosmetic resolution boundary

The rendering code consumes one resolved presentation model rather than reading ownership/store state directly throughout the component tree.

This boundary is present in code:

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
- `checkers.localSet` / `checkers.opponentSet`: resolve each owner's trusted Checker Set independently, with `Default` fallback;
- `dice.localSkin` / `dice.opponentSkin`: resolve each owner's trusted Dice Skin independently, with `Default` fallback;
- `board.localTheme` / `board.opponentTheme`: resolve each owner's trusted Board Theme independently, with `Default` fallback; BoardScene then maps those presentations to authoritative physical owner regions;
- `reactions.localPack`: `Default`.

The important architectural requirement remains the resolver boundary. Adding a future accepted slot should extend trusted data/presentation through that boundary rather than scattering ownership logic through rendering components.

## Server ownership and trust boundary

Cosmetic ownership/equipment is functional for Profile Frames, Checker Sets, Dice Skins and Board Themes, and the backend is authoritative for what an account owns and has equipped.

The client must not be trusted to declare arbitrary cosmetic IDs to the opponent. Store price, purchase eligibility, ownership and equipment validation are server-owned concerns.

Match/profile presentation uses server-trusted equipment data. Future Reaction Pack contracts must preserve the same trust boundary.

This is an economy/identity trust requirement, not a game-rule requirement: cosmetic state must not enter the deterministic game engine.

## Asset safety and loading

Cosmetic assets must be data/assets, not arbitrary executable UI.

Do not support:

- remote HTML supplied by a cosmetic;
- arbitrary JavaScript;
- arbitrary runtime CSS injection;
- skin-defined gameplay DOM structure;
- skin-defined hitboxes.

Prefer a curated asset/specification model with known fields and application-controlled rendering. Current Board Theme and Dice Skin implementations use trusted IDs mapped to application-owned CSS classes/tokens rather than accepting runtime styles from account data.

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

Store screens, Profile Frame purchasing, permanent ownership/equipment persistence and backend ownership tables are no longer future requirements: Update 1 implemented that vertical slice. PR 2 extended it to Checker Sets without changing Board Scene geometry; PR 3 extended the same trusted path to Dice Skins without changing dice authority or geometry; PR 4 extends it to hybrid Board Themes without changing board geometry or game state.

This Board Scene architecture still does not require prematurely implementing:

- non-default Reaction Packs;
- a broad Board Theme, Dice Skin or Checker Set catalog;
- Telegram Stars;
- rarity economy;
- a large cosmetic catalog;
- arbitrary match-protocol changes solely to make speculative skins usable.

Future cosmetic expansion must reuse this architecture rather than changing geometry, hitboxes, legal moves, checker identity, dice authority or game state.
