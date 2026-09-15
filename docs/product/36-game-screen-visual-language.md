# 36 — Game Screen Visual Language

Status: accepted UX/UI v2 decision, implementation pending

## Purpose

This document defines the visual language of the active match surface for the UNDERGAMMON Telegram Mini App.

It complements:

- `22-board-scene-cosmetics-architecture.md` for board geometry and cosmetic boundaries;
- `23-game-screen-hud-and-turn-states.md` for Game Screen states and controls;
- `24-match-result-and-progression-ux.md` for result presentation;
- `35-visual-system-and-liquid-glass.md` for the application-wide material system.

The core visual invariant is:

> Board and game pieces are physical content. HUD and controls are Liquid Glass interface.

The Game Screen should feel like a premium physical board placed inside a restrained modern digital shell.

## Layer model

The active match scene is visually composed as:

```text
Liquid Glass HUD / controls / overlays
            ↓
Physical board, checkers and dice
            ↓
Dark application environment
```

Do not flatten these three layers into one visual treatment.

The board is the dominant object. Interface chrome must support the game without visually competing with it.

## Board material

The Default Board Theme should use a warm, stylized physical material language rather than flat app-card styling or heavy photorealism.

Recommended direction:

- outer frame: dark walnut / smoked wood character;
- play surface: warm muted leather/felt tone;
- points: alternating restrained warm tones;
- center bar: darker structural board material;
- bearing-off/off-board tray: part of the same physical frame.

The board may use subtle gradients, texture and depth cues, but must remain lightweight and readable on mobile.

Avoid:

- casino-gloss styling;
- excessive faux-3D;
- photographic textures with visual noise;
- geometry encoded into cosmetic imagery.

Cosmetic Board Themes may alter material/color treatment but must never alter board geometry, hit targets or gameplay semantics.

## Default checkers

Default checker identities:

- light player: warm ivory / bone;
- dark player: graphite / near-black.

Checkers should read as physical discs with restrained depth cues such as:

- a thin outer rim;
- subtle internal highlight;
- short soft shadow/elevation.

Avoid glossy poker-chip/casino styling.

### Selected checker

A selected checker should receive a controlled application-owned state treatment:

- thin moss/accent outer ring;
- slight elevation;
- optional very subtle glow.

Do not repaint the entire checker in the accent color.

### Legal destinations

Legal targets should use compact application-controlled target markers.

Preferred direction:

- small moss/accent destination marker;
- clearly visible over both empty points and occupied stacks;
- no large neon point fills;
- no skin-controlled legal-target styling.

## Local draft versus authoritative state

Unconfirmed local movement must remain visually distinguishable from the last authoritative board state without making the board look unstable.

Checkers moved as part of the current local draft may use:

- a subtle accent rim;
- slightly elevated presentation;
- restrained temporary highlight.

After authoritative turn confirmation, the draft highlight clears and the pieces return to ordinary physical presentation.

The presentation must help the player understand that a move is locally drafted but not yet committed.

## PlayerStrip material

Player strips are Liquid Glass UI layered around the physical board.

Use `glass-regular` as the baseline material.

A PlayerStrip permanently reserves stable geometry for:

- avatar;
- nickname;
- relevant ruleset rating;
- timer when the player owns the active turn;
- connection/reconnect state where relevant.

Inactive state:

- neutral glass;
- secondary hierarchy;
- restrained border/highlight.

Active-turn state:

- subtle moss/accent tint;
- slightly stronger specular edge/highlight;
- timer promoted to primary information.

Do not use a large bright full-strip green state or oversized `YOUR TURN` messaging.

## Timer presentation

The authoritative turn timer remains inside the active PlayerStrip.

Use tabular numerals.

Visual states should change color/emphasis without changing typography size or layout geometry.

Suggested hierarchy:

- normal: primary/neutral text;
- warning: warmer warning semantic;
- critical: restrained danger semantic.

Avoid layout jumps, oversized countdowns or aggressive flashing.

A subtle number-only pulse may be explored later but is not required for the baseline.

## Dice material and presentation

Dice are physical Board Scene objects, not Liquid Glass controls.

Default direction:

- warm ivory body;
- dark high-contrast pips;
- soft physical shadow;
- restrained rounded geometry.

Dice skins may change material/color treatment while the application continues to control:

- bounds;
- placement;
- pip geometry;
- value readability;
- hit-free presentation behavior.

### Roll motion

Roll animation should use modest transform-based motion such as rotation/displacement.

After the authoritative value arrives:

```text
rolling
-> authoritative value known
-> settle / small impact easing
-> board becomes interactive
```

Do not simulate complex physics or pre-render a guessed result.

### Consumed dice

Used dice remain visible and become dimmed/desaturated rather than disappearing.

The original roll must remain legible throughout the turn.

For doubles, render the physical dice pair plus four compact use/consumption markers rather than four physical dice.

## ActionDock

ActionDock is the strongest Liquid Glass element on the Game Screen.

Use `glass-strong` as the baseline material.

Characteristics:

- fixed geometry across all turn states;
- content-safe bottom inset handling;
- stronger backdrop separation than PlayerStrips;
- restrained specular/top-edge highlight;
- no board reflow when control state changes.

The dock keeps stable regions for:

- reaction trigger;
- Undo slot;
- primary action/state slot.

The primary action (`Roll Dice`, `Confirm Turn`, etc.) may use a moss-tinted Liquid Glass control while remaining part of the same material family.

Disabled states should remain readable and preserve geometry.

## Match menu

Match overflow actions open as a compact glass popover/sheet over the fixed Game Screen.

Typical items:

- How to play;
- sound-related control where applicable;
- Surrender.

`Surrender` uses danger semantics and requires confirmation.

The menu must not push or resize the board.

## Reactions

The reaction picker is a compact floating glass surface.

Reaction presentation near a PlayerStrip should:

- float above the scene without reflow;
- use a short lifetime;
- disappear through restrained opacity/transform motion.

Future Reaction Packs own reaction art/content, but not container geometry, positioning or safety semantics.

## Reconnect and control-loss overlays

### Local reconnect

Keep the last authoritative board visible and slightly de-emphasized.

Show a compact centered `glass-strong` overlay such as `Reconnecting…`.

Do not replace the entire match with a generic full-screen spinner.

### CONTROL_LOST

Use a blocking glass card over the still-visible board:

```text
Game opened on another device
[ Take control ]
```

The overlay blocks gameplay input but does not destroy or resize the board.

Avoid excessive background blur; the player should still recognize the live match beneath the overlay.

## Result sheet

The Match Result surface uses the strongest celebratory version of the shared sheet system while remaining restrained.

Use `glass-strong` over the still-visible final board.

The result sheet may emphasize:

- Victory / Defeat;
- Ranked rating delta where authoritative;
- Account XP gain/progress;
- level-up state where crossed;
- post-match actions.

Victory uses restrained success/moss emphasis.

Defeat uses neutral structure with restrained danger accents rather than turning the full screen red.

A level-up may use a short specular sweep or equivalent lightweight motion across the progression element. Full-screen confetti is not part of the baseline.

## Liquid Glass intensity on Game Screen

The Game Screen may use slightly stronger glass than ordinary AppShell screens because the physical board provides meaningful visual content behind the material.

However, stronger glass does not mean more blur everywhere.

Material intensity must still preserve:

- text contrast;
- checker/board readability;
- touch affordance clarity;
- Android performance;
- stable geometry.

The same `FULL / REDUCED / FALLBACK` material tiers from the global visual system apply here.

## Motion principles

Prefer transform/opacity-based motion.

Avoid continuously animated backdrop blur, refraction or expensive background effects.

Motion should communicate state transitions rather than decorate idle gameplay.

Examples:

- checker selection/elevation;
- draft-state highlight;
- dice roll and settle;
- sheet/popover entrance;
- reconnect/result overlays;
- XP/rating progression.

## Cosmetics boundary

Cosmetics may change appearance, never gameplay readability or geometry.

Application-owned overlays always win over skin appearance for:

- selection;
- legal targets;
- draft state;
- timer state;
- reconnect/control loss;
- authoritative dice readability;
- result semantics.

If a cosmetic fails to load, the Default visual set is used without board resize or scene reflow.

## Final visual invariant

The intended character of the Game Screen is:

> a warm premium physical backgammon board, surrounded by a dark environment and controlled through restrained Liquid Glass HUD and interaction surfaces.

Any future visual refinement should preserve this separation unless a later product decision explicitly supersedes it.
