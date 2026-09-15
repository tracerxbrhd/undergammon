# 37 — Mini App v2 Final UX/UI Specification

Status: accepted final UX/UI v2 baseline, implementation pending

## Purpose

This document is the consolidated implementation-level conclusion for UNDERGAMMON Telegram Mini App v2. It does not replace the detailed product documents; it defines the final visual/component/responsive rules that tie them together and should be treated as the default implementation contract for the frontend refactor.

The guiding visual formula is:

> Dark Liquid Glass game shell floating above a warm physical backgammon board, with restrained moss accents and precise competitive typography.

The product must feel like a modern digital board game, not a casino UI, cyberpunk dashboard, generic Telegram form, or mobile RPG.

## Layer model

The interface is built from three visual layers:

1. Environment — dark atmospheric application background.
2. Content — rankings, profile data, rules text, and especially the physical game board.
3. Liquid UI — navigation, controls, HUD, sheets, overlays, segmented controls and transient interaction surfaces.

Liquid Glass is a material language for interface chrome and controls. It must not be applied indiscriminately to all content.

The board, checkers and dice remain visually physical and materially distinct from the glass UI layer.

## Core palette

Baseline dark environment:

```text
background       #101411
surface-base     #171C18
surface-raised   #1D241F
surface-strong   #242D27
border-subtle    #2C3630
border-strong    #3A463E
```

Primary accent:

```text
accent           #98A86F
accent-active    #ACBC7D
accent-muted     #66704E
on-accent        #121610
```

Text:

```text
text-primary     #F0F1EC
text-secondary   #AEB5AC
text-muted       #777F78
text-disabled    #555D57
```

Semantic colors:

```text
success          #7FA978
danger           #C96F6A
warning          #C9A461
info              #7899AC
```

Success and accent are intentionally different semantic roles.

## Liquid Glass materials

Glass is implemented through semantic material tokens rather than component-local blur/opacity values.

Required material tiers:

```text
glass-soft
  low-opacity dark fill
  subtle backdrop blur
  minimal edge highlight
  used for quiet controls or overlays

glass-regular
  medium-opacity dark fill
  clearer backdrop blur/saturation
  thin border/specular edge
  used for PlayerStrip, segmented controls and normal floating UI

glass-strong
  higher-opacity dark fill
  strongest readability
  clearer border/highlight/shadow
  used for ActionDock, result sheets, blocking overlays and important modal surfaces
```

Implementation may begin approximately around 10–12px, 16–18px and 22–24px backdrop blur respectively, but these are tuning values rather than product contracts.

All materials require a non-blur fallback with the same geometry and readable contrast.

Do not animate backdrop-filter continuously. Normal motion should prefer transforms and opacity.

## Board materials

Default board palette is warm and physical:

```text
wood-dark        #4A3428
wood-mid         #72503A
board-field      #B79B72
point-dark       #48382E
point-light      #D5C39D
checker-ivory    #E8DFCF
checker-dark     #252824
```

The board should be stylized-premium rather than photorealistic. It may use restrained texture, depth, inner shadows and highlights, but must remain lightweight and legible.

Cosmetic Board Themes, Checker Sets and Dice Skins may change appearance but never board geometry, hit targets, legal-target readability or gameplay semantics.

## Typography

Use the system mobile font stack. Do not require a remote font for core UI.

Baseline scale:

```text
28/32  major result / major screen title
22/26  major section emphasis
18/22  section heading
16/20  primary body and controls
14/18  secondary content
12/16  metadata
```

Weights:

```text
400 normal
500 controls/body emphasis
600 headings/selected states
700 major result or critical number only
```

Rating, timers, XP and other dynamic numeric values use tabular numerals.

## Spacing and geometry

Use a 4px spatial grid:

```text
4 8 12 16 20 24 32 40
```

Normal phone horizontal gutter: 16px.
Compact-width gutter: 12px.
Normal section gap: 24px.
Typical content/surface padding: 16px.

Radius system:

```text
6px   small details
10px  controls
14px  cards/surfaces
18–20px sheets and large floating surfaces
999px pills only when the pill shape has semantic purpose
```

Do not make every component pill-shaped.

## Touch targets

All meaningful interactive targets should be approximately 44x44 CSS px minimum.

Primary buttons should normally have a minimum visual height around 48px.
Icon buttons may visually contain a 20–24px glyph while maintaining a 44px hit target.

Tiny checker stacks or board anchors may use larger invisible hit regions when needed, but hit regions must not overlap ambiguously.

## Buttons

Primary button:
- one dominant primary action per surface;
- moss-accent material/tint;
- high text contrast;
- minimum ~48px height.

Secondary button:
- neutral/glass material;
- subtle border/highlight;
- does not compete with primary.

Danger button:
- reserved for genuinely destructive actions such as surrender or account deletion;
- danger color should be restrained until the destructive choice is in focus.

Disabled controls keep readable labels but lose emphasis and interaction feedback.

## Icon buttons and iconography

Use one coherent outline icon family or application-owned SVG subset.

Baseline:

```text
20–24px optical icon size
~1.75–2px stroke
rounded joins/caps where appropriate
```

Do not mix emoji, Unicode symbols, unrelated SVG styles and filled icon systems in production navigation or core controls.

Accessible labels remain required even when visible text labels are omitted.

## Segmented controls

Casual/Ranked and Long Nardy/Backgammon share one component family.

Rules:
- minimum ~44px touch height;
- neutral glass container;
- selected segment uses stronger surface/tint plus accent text/indicator;
- do not fill every selected segment with saturated green;
- width must tolerate both RU and EN labels;
- selection changes must not shift surrounding geometry.

## Bottom navigation

Normal AppShell screens use one fixed safe-area-aware bottom navigation.

Current structure:

```text
Rankings      PLAY      Profile
```

Rules:
- Play stays centered and visually strongest;
- Play may be raised by roughly 4–6px relative to secondary icons;
- all items remain part of one visual family;
- no visible empty future slots;
- navigation layout is config-driven and supports up to five primary destinations;
- no horizontal scrolling;
- content reserves navigation height and never renders underneath it.

Target shell height before bottom safe-area is approximately 64–72px.

## Sheets, dialogs and popovers

Public Profile, Edit Profile, Match Menu, Result, confirmations and similar overlays use one shared material family.

Bottom sheets:
- glass-strong;
- 18–20px top radius;
- dimmed scrim;
- consistent top handle when visually useful;
- safe-area-aware bottom padding;
- must not reflow or resize the Game Screen board underneath.

Do not add drag behavior unless it provides real UX value. A visual handle does not require freeform draggable interaction.

Confirmation surfaces must present one clear primary decision and one clear cancel/back path.

## Motion

Baseline motion timing:

```text
120–160ms  press/selection feedback
180–220ms  normal screen/sheet transitions
250–350ms  authoritative dice reveal
300–500ms  rating/XP progression transitions
```

Motion should explain state changes rather than continuously decorate the screen.

Respect `prefers-reduced-motion` even though Reduced Motion is not a Season 0 user setting.

No mandatory animation may block leaving a result screen or claiming persisted rewards.

## Responsive model

The Mini App is phone-first and must work inside Telegram's stable viewport.

Normal AppShell screens may scroll vertically as needed. The active Game Screen must never scroll or pan.

Use responsive density tiers driven primarily by actual stable viewport dimensions rather than device-name detection.

Conceptual tiers:

```text
regular-height
  normal gutters, avatars and spacing

compact-height
  reduce decorative spacing
  reduce avatar sizes slightly
  reduce non-critical padding
  preserve touch targets and gameplay information

very-compact-height
  remove/de-emphasize decoration first
  tighten PlayerStrip and ActionDock internal spacing
  preserve board usability, timer, identities and controls
```

Do not solve compact-height devices by enabling gameplay scrolling.

Width adaptation should rely on fluid sizing (`clamp`, flex/grid constraints, percentage sizing) rather than maintaining separate Android/iPhone layouts.

## Telegram viewport and safe areas

Platform integration must expose stable viewport size and Telegram safe-area/content-safe-area insets to the layout layer.

The app should prefer stable viewport dimensions for geometry-sensitive screens, especially Game Screen.

Do not assume `100vh` represents the usable Telegram viewport.

Fullscreen may be explored for active matches after real-device testing, but it is not required for the baseline UX.

## Performance tiers

The visual system must remain usable on lower-end Android devices.

Conceptual rendering tiers:

```text
full
  intended blur/saturation/highlight materials

reduced
  lower blur and simpler shadow/highlight treatment

fallback
  opaque/semi-opaque surfaces with no backdrop-filter
```

All tiers preserve component geometry, information hierarchy and interaction behavior.

No gameplay correctness or layout may depend on blur support.

## Localization resilience

RU and EN must both be first-class layouts.

Rules:
- controls must tolerate longer Russian labels;
- avoid fixed-width text containers where wrapping or flex growth is appropriate;
- primary action copy may shorten responsively if the meaning remains clear;
- do not shrink core control text below readable mobile size merely to preserve one line;
- truncation is acceptable for long nicknames where the full name can be revealed in profile surfaces;
- layout must be tested with long realistic nicknames and both languages.

## Loading, errors and connectivity

Use branded skeleton/loading surfaces rather than blank screens.

Normal pages:
- local skeletons for local data;
- inline retry for recoverable failures;
- persistent small network/offline banner where appropriate.

Game Screen:
- preserve last authoritative board during reconnect;
- lock gameplay input locally;
- show compact reconnect glass overlay;
- opponent disconnect is represented primarily inside opponent PlayerStrip;
- CONTROL_LOST uses a blocking glass card with Take control;
- never replace an existing match board with a full-screen loading spinner during recoverable realtime reconnect.

## Game Screen visual contract

The Game Screen root owns the stable viewport and is fully non-scrollable/non-pannable.

Portrait composition remains:

```text
Opponent PlayerStrip
Board Scene
Local PlayerStrip
ActionDock
safe-area-bottom
```

Board Scene scales as one stable geometry object. Dice zone, bar and bearing-off areas are permanently reserved. The board must not resize or move when turn controls or match phases change.

Visual invariant:

> Board and game pieces are physical content. HUD and controls are Liquid Glass interface.

PlayerStrips use glass-regular; the active strip receives restrained accent emphasis and contains the authoritative timer.

ActionDock uses glass-strong and stable slots for Reaction, Undo/state, and primary Roll/Confirm action.

Selected checkers use a thin moss ring/elevation treatment. Legal destinations use small clear moss target markers rather than flooding whole points with green.

Local unconfirmed draft moves remain visually distinguishable from authoritative board state until Confirm Turn succeeds.

Dice are physical board objects, not glass controls. Final values are never predicted before authoritative server response.

Result UI uses a glass-strong sheet over the still-visible final board and presents authoritative rating/XP progression.

## Profile progression contract

The Profile screen includes an Account Level progress bar.

The frontend must not duplicate the server XP curve formula.

The profile/progression contract should expose authoritative/shared information sufficient to render:
- current level;
- total XP;
- XP progress within the current level;
- XP required to reach the next level, or equivalent lower/upper level boundaries.

The same progression semantics must power post-match XP animation so Profile and Result cannot disagree.

## Match result reward contract

Per-match XP must be attributed authoritatively by the server. The frontend must not infer `xpGained` from before/after profile snapshots.

Result data must provide enough information to animate:
- XP gained;
- total XP before/after;
- level before/after;
- any crossed level boundaries.

Persisted rewards must exist before the animation begins, and skipping the animation must jump directly to exact authoritative final values.

## Frontend architecture guardrails

The v2 refactor should move away from the current monolithic Mini App entry component toward feature-oriented composition.

Recommended direction:

```text
apps/miniapp/src/
  app/
    App.tsx
    AppShell.tsx
    navigation.ts
    bootstrap.ts
  features/
    play/
    matchmaking/
    challenges/
    match/
    profile/
    history/
    leaderboard/
    learn/
    settings/
    admin/
  ui/
  platform/
  api/
  i18n/
  styles/
    tokens.css
    global.css
```

Do not introduce Redux/Zustand, React Router, Canvas/Pixi or a large UI framework unless a concrete implementation problem later justifies them.

Keep game rules outside UI. Keep realtime/server-authoritative behavior intact.

## Component ownership

A small reusable UI layer is expected for:
- Button;
- IconButton;
- SegmentedControl;
- GlassSurface/material primitive;
- BottomNavigation;
- BottomSheet;
- Confirmation surface;
- ProgressBar;
- PlayerStrip;
- StatusBadge;
- Skeleton/Loading surface;
- Offline/connection banner.

Do not create an abstract design-system package or generic cross-product framework. These components belong to the Mini App unless another real consumer appears.

## Accepted product-screen behavior

The following UX blocks are already accepted and must be implemented consistently with this visual system:

- Play/Home setup directly on Home;
- visible Casual/Ranked and Long Nardy/Backgammon selection;
- focused matchmaking with no second accept step;
- private challenge/rematch focused flows;
- viewport-locked Game Screen;
- authoritative Result progression;
- Rankings with top list and persistent self card;
- Profile account hub with XP progress;
- chronological Match History;
- Public Profile bottom sheet;
- Learn & Rules with production-engine tutorial positions;
- compact Settings;
- utilitarian server-authorized Admin.

Refer to product docs 21–36 for detailed behavior.

## Non-goals for this refactor

Do not add:
- new game rules;
- broad backend redesign;
- speculative Store/Social/Events implementation;
- AI placeholders;
- replay system;
- social graph;
- multiple themes;
- heavy analytics/admin dashboards;
- mandatory fullscreen;
- runtime arbitrary cosmetic HTML/CSS;
- decorative glass on every content row/card.

## Final acceptance criteria

The v2 implementation is acceptable when:

- the Mini App presents one coherent visual identity across all screens;
- Liquid Glass is clearly visible in navigation/controls/overlays without reducing readability;
- a no-backdrop-filter fallback remains fully usable;
- Play stays the fastest path to a match;
- Game Screen has zero document scroll/pan in portrait Telegram usage;
- board geometry does not move across turn phases;
- board remains the largest and clearest interactive surface;
- all authoritative gameplay behavior remains server-controlled;
- selected checker, legal destinations, draft state, dice consumption and timers are unambiguous;
- primary touch targets are approximately 44px or larger;
- RU and EN layouts are both tested;
- Telegram stable viewport and safe-area insets are respected;
- reconnect/control-lost/result states preserve the board instead of replacing it;
- profile XP progress and result XP progression use one authoritative/shared progression model;
- current backend/game-engine tests continue to pass;
- real Telegram E2E is re-tested Android ↔ iPhone;
- natural bearing-off victory is manually completed and verified for both Long Nardy and Classic Backgammon before Season 0 release acceptance.

## Final implementation principle

The frontend refactor should optimize for a polished playable Telegram game, not for framework purity or speculative platform generality.

Where visual ambition conflicts with readability, stable geometry, authoritative gameplay, low-end Android performance or touch usability, gameplay quality wins.

Within those constraints, Liquid Glass may be strengthened iteratively after real-device testing without changing the component architecture because material intensity is token-driven rather than hard-coded into feature screens.
