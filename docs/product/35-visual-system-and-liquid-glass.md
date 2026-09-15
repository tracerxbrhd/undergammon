# 35 — Visual System and Liquid Glass

Status: accepted UX/UI v2 decision, implementation pending

## Purpose

This document defines the accepted visual foundation for the UNDERGAMMON Telegram Mini App v2.

It complements:

- `21-miniapp-ux-ui-v2.md` for the global UX/UI direction;
- `22-board-scene-cosmetics-architecture.md` for board/cosmetic separation;
- `23-game-screen-hud-and-turn-states.md` for match HUD structure;
- `25-miniapp-navigation-shell.md` for primary application navigation;
- `26-play-home-and-match-entry-ux.md` and subsequent screen-specific UX documents.

The design goal is a modern competitive board-game interface that feels current on iOS and Android without becoming visually fragile, over-decorated or dependent on one platform-specific rendering implementation.

## Core visual identity

The accepted v2 visual identity is:

> Dark Liquid Glass game shell floating above a warm physical backgammon board, with restrained moss accents and precise competitive typography.

The UI should feel contemporary and premium, but not like a casino, cyberpunk interface, mobile RPG, neon dashboard or generic Telegram-blue application.

## Three-layer visual model

The interface is conceptually divided into three layers.

### 1. Environment

The application environment provides the dark atmospheric foundation:

- dark graphite/green-black background;
- low-noise visual treatment;
- no large decorative gradients that compete with content;
- no glass effect applied to the root background itself.

### 2. Content

Content surfaces remain materially readable and relatively stable.

This includes:

- Rankings rows;
- Profile information;
- Match History;
- Rules content;
- Settings content;
- the physical game board;
- checkers;
- dice.

The game board is intentionally warmer and more physical than the surrounding application shell.

### 3. Liquid UI

Liquid Glass is primarily a navigation, control and overlay material language.

Appropriate uses include:

- bottom navigation;
- segmented controls;
- primary/secondary floating controls where useful;
- Game Screen ActionDock;
- selected PlayerStrip/HUD treatments where readability permits;
- Match Menu;
- reaction picker/bubbles;
- Public Profile sheet;
- Edit Profile sheet;
- Result Sheet;
- confirmations;
- other transient overlays.

The glass layer should float above content rather than replacing content.

## Liquid Glass is not global glassmorphism

Do not make every container translucent or blurred.

Avoid applying glass treatment to:

- the game board itself;
- checkers;
- the application root/background;
- every Rankings row;
- every Settings row;
- every History item;
- long-form Rules Reference content;
- all Profile containers by default.

Excessive glass weakens hierarchy, contrast and performance.

The rule is:

> Use Liquid Glass for interactive/navigation/overlay layers; use stable opaque or lightly elevated surfaces for content.

## Semantic material system

Do not hard-code one reusable `.glass` style for all cases.

The design system should expose semantic material tokens conceptually similar to:

```text
surface-base
surface-raised

glass-soft
glass-regular
glass-strong

glass-border
glass-highlight
glass-shadow

scrim
```

Exact CSS variable names are implementation detail, but the semantic distinction is required.

### Glass Soft

Use for subtle navigation/control grouping where the background remains clearly visible.

Characteristics:

- low-to-medium opacity;
- low-to-medium backdrop blur;
- subtle edge/highlight;
- minimal shadow.

### Glass Regular

Default interactive glass material.

Characteristics:

- stronger readability than Glass Soft;
- moderate backdrop blur;
- subtle saturation;
- restrained specular/top highlight;
- clear but understated edge separation.

### Glass Strong

Use for important overlays where text/content readability is more important than transparency.

Characteristics:

- higher opacity;
- stronger separation from background;
- stable contrast for text and controls;
- still visually part of the same Liquid Glass family.

Examples include confirmations and portions of Result Sheet.

## Base color direction

The ordinary application UI remains dark and restrained.

Suggested starting palette:

```text
Background      #101411
Surface 1       #171C18
Surface 2       #1D241F
Surface 3       #242D27
Border subtle   #2C3630
Border strong   #3A463E
```

Primary accent direction:

```text
Accent          #98A86F
Accent active   #ACBC7D
Accent muted    #66704E
On accent       #121610
```

Text direction:

```text
Text primary    #F0F1EC
Text secondary  #AEB5AC
Text muted      #777F78
Text disabled   #555D57
```

Semantic colors remain distinct from the primary accent:

```text
Success         #7FA978
Danger          #C96F6A
Warning         #C9A461
Info            #7899AC
```

These values are accepted as design-starting tokens, not immutable brand constants. They may be tuned during real-device visual testing as long as the semantic hierarchy remains intact.

## Glass tint behavior

Ordinary glass should stay mostly neutral/graphite and inherit visual context from what is behind it.

Tint should be semantic and restrained:

- normal glass: neutral dark translucent material;
- selected navigation/control: moss accent through icon/indicator and subtle tint;
- primary action: stronger moss-stained treatment where appropriate;
- danger action: restrained red tint only for genuinely destructive semantics.

Do not tint every glass surface green.

## Board material direction

The game board remains the warm visual focus.

Suggested starting board direction:

```text
Wood dark       #4A3428
Wood mid        #72503A
Board field     #B79B72
Point dark      #48382E
Point light     #D5C39D
```

Checker direction:

```text
Ivory checker   #E8DFCF
Dark checker    #252824
```

The exact Default Board Theme is still a cosmetic implementation concern, but the baseline contrast should remain:

```text
cold dark shell
-> warm physical board
-> ivory/dark checkers
-> translucent digital controls above it
```

Liquid Glass must never reduce legal-target visibility, checker readability or dice readability.

## Typography

Use a system mobile font stack rather than adding a remote web font dependency by default.

Preferred stack conceptually:

```text
-apple-system
BlinkMacSystemFont
Segoe UI
Roboto
Helvetica
Arial
sans-serif
```

Suggested type scale:

```text
28/32  major result / major screen title where justified
22/26  section hero
18/22  section heading
16/20  primary body / controls
14/18  secondary text
12/16  metadata
```

Suggested weights:

```text
400 normal
500 controls/body emphasis
600 headings/selected states
700 major result / critical numbers only
```

Avoid routine use of 800/900 weights.

Rating, timers, XP and other changing numbers should use tabular numerals.

## Spacing

Use a 4px base grid.

Accepted spacing scale direction:

```text
4
8
12
16
20
24
32
40
```

Ordinary AppShell screens:

- horizontal gutter: approximately 16px;
- compact-phone gutter: approximately 12px;
- normal section gap: approximately 24px;
- normal card/control-group padding: approximately 16px.

The Game Screen uses a denser dedicated layout while still aligning to the same token system.

## Radius

The application should not become excessively rounded or bubble-like.

Suggested radius scale:

```text
6px    tiny elements
10px   standard controls
14px   cards/content containers
18px   sheets/large floating surfaces
999px  true pill semantics only
```

Large pill radius is appropriate for segmented controls, status pills and similar semantic cases, not every button or card.

## Buttons

Use a small number of semantic button treatments.

### Primary

- visually dominant action;
- strong moss accent treatment;
- high readability;
- normally one dominant primary action per surface.

### Secondary

- neutral/glass or raised-surface treatment;
- lower visual priority;
- clear active/pressed state.

### Danger

- reserved for destructive actions such as surrender or account deletion;
- red tint/semantic treatment only where destruction is real.

Do not create several competing primary buttons on one surface.

## Segmented controls

`Casual / Ranked` and `Long Nardy / Backgammon` should use one shared segmented-control family.

The container may use Glass Soft or Glass Regular depending on context.

Selected state should rely on:

- contrast;
- stronger surface/material separation;
- accent text/icon/indicator;
- restrained tint.

Do not simply flood the entire selected segment with bright green.

## Bottom navigation

The accepted bottom navigation from `25-miniapp-navigation-shell.md` should become one of the clearest Liquid Glass expressions in the app.

Requirements:

- floating or visually detached glass material;
- safe-area aware;
- central Play remains the strongest item;
- Play may be slightly raised/enlarged while still belonging to the same material family;
- unselected items remain quiet;
- geometry stable across normal AppShell screens.

Do not turn Play into an oversized unrelated FAB.

## Sheets and overlays

Public Profile, Edit Profile, Match Menu, Result and confirmations should share one coherent sheet/material system.

Typical properties:

- Glass Regular or Glass Strong depending on information density;
- stable top radius;
- common scrim behavior;
- common edge/highlight language;
- consistent spacing and title hierarchy;
- optional visual drag handle where useful.

A sheet does not need to be physically draggable merely because it looks like a mobile sheet.

## Iconography

Use one coherent vector icon family.

Accepted direction:

- outline-oriented;
- approximately 20–24px optical size;
- approximately 1.75–2px stroke;
- rounded joins where appropriate;
- consistent visual weight.

Do not mix emoji, arbitrary Unicode symbols, unrelated filled icon packs and random SVG styles.

A library such as Lucide or an application-owned curated SVG subset is acceptable as an implementation source.

## Motion

Motion should explain state changes rather than act as decoration.

Suggested timing direction:

```text
120–160ms  press/selection feedback
180–220ms  normal screen/sheet transitions
250–350ms  dice reveal
300–500ms  XP/rating progression phases
```

Avoid permanent glow, floating or blur animations.

Prefer transform/opacity for frequent motion rather than continuously animating backdrop blur/refraction.

Respect `prefers-reduced-motion` even though a dedicated Reduced Motion setting is not part of Season 0.

## Performance tiers

Liquid Glass is an enhancement layer, not a prerequisite for correct UX.

The implementation should support three practical presentation tiers without changing layout geometry.

### Full

- backdrop blur;
- restrained saturation;
- subtle highlight/specular edge;
- soft shadow where needed.

### Reduced

- lower blur radius;
- higher material opacity;
- less saturation/highlight complexity;
- no expensive continuous effects.

### Fallback

- opaque or semi-opaque material;
- no dependency on backdrop-filter;
- same component geometry, hierarchy and interaction contract.

The exact tier-selection mechanism is an implementation decision and should not become a user-facing setting unless there is a real product need.

## Platform principle

The visual language should feel especially natural on modern iPhones, but the Mini App remains cross-platform web UI inside Telegram.

Do not depend on native iOS-only rendering behavior.

The design must remain coherent on Android Telegram, including lower-powered devices where blur may need to be reduced or omitted.

## Extensibility

The visual system should make it possible to strengthen the Liquid Glass expression later without changing feature architecture.

Future tuning may increase:

- material transparency;
- blur quality;
- highlight/specular treatment;
- depth/elevation;
- tint sophistication;
- transition polish.

Such changes should normally be token/material-level changes, not component rewrites.

This is why feature components should consume semantic material tokens instead of owning arbitrary blur/opacity/shadow values.

## Non-goals

This visual direction does not mean:

- implementing a native iOS renderer;
- reproducing Apple's system components pixel-for-pixel;
- applying glass to every surface;
- sacrificing readability for transparency;
- sacrificing Android performance for iPhone aesthetics;
- introducing multiple user-selectable themes in Season 0;
- changing board geometry or gameplay semantics.

## Acceptance summary

The v2 visual system is considered aligned when:

- ordinary screens feel like one coherent product;
- Liquid Glass is clearly visible in navigation/controls/overlays without dominating content;
- the board remains the strongest physical visual object during a match;
- primary actions remain readable over all backgrounds;
- critical gameplay information never depends on blur/transparency for legibility;
- Android fallback preserves layout and function;
- future stronger Liquid Glass styling can be achieved primarily through shared material tokens rather than per-screen rewrites.
