# 32 — Learn and Rules UX

Status: accepted UX/UI v2 decision, implementation pending

## Purpose

This document defines the accepted Learn & Rules experience for the UNDERGAMMON Telegram Mini App.

It complements:

- `11-tutorial-and-rules.md` for product/tutorial behavior;
- `21-miniapp-ux-ui-v2.md` for the overall Mini App v2 direction;
- `29-profile-hub-and-account-progression-ux.md` for the Profile hub entry point.

The goal is to teach rules and interaction using the same authoritative game concepts as production gameplay without creating a second rules implementation.

## Information architecture

Learn & Rules is a secondary destination under Profile.

The baseline structure is:

```text
Learn & Rules

Long Nardy
- Quick Tutorial
- Rules Reference

Backgammon
- Quick Tutorial
- Rules Reference
```

Both rulesets are first-class and visible without hiding one behind a generic mode selector.

## Quick Tutorial

Quick Tutorial is interactive and uses deterministic prepared positions.

Requirements:

- use the production game engine for legality and move semantics;
- do not implement a simplified or duplicated tutorial rules engine;
- tutorial state may orchestrate prepared positions and instructional steps, but must not redefine the game rules;
- tutorial interactions should use the same core board interaction model as normal gameplay where practical;
- explanations teach mechanics and rules, not strategy.

The tutorial must not suggest that there is a uniquely best strategic move unless that behavior later becomes a separately accepted product feature.

## Rules Reference

Rules Reference is a normal scrollable reference surface.

Each ruleset should cover concise sections such as:

- objective;
- starting position;
- dice and turn flow;
- legal movement;
- special restrictions;
- bearing off;
- win conditions.

Backgammon-specific reference content should additionally cover, where applicable:

- hitting and the bar;
- blocked points;
- doubles;
- normal / gammon / backgammon outcomes.

Long Nardy-specific reference content should document the actual rules implemented by the production engine, including any movement/opening/bearing-off constraints relevant to UNDERGAMMON's ruleset.

Rules content must describe implemented product behavior rather than a generic rules article copied from elsewhere.

## In-match help

The active Game Screen may expose `How to Play` / contextual rules help from the match menu.

This in-match help should reuse the same source content/model as Learn & Rules rather than maintaining a second set of rule descriptions.

The presentation may be condensed or contextualized for the active ruleset, but the rule text/data source should remain shared.

Opening help during a match must overlay the locked game surface and must not resize or reflow the Board Scene.

## Tutorial architecture boundary

Tutorial orchestration belongs to the frontend/product layer.

Game legality remains in the production game engine.

Conceptually:

```text
Tutorial Scenario
+ deterministic prepared position
+ instructional step metadata
        ↓
Production Game Engine
        ↓
normal legal sources / destinations / move validation
        ↓
Tutorial presentation
```

Do not fork rule logic into `Tutorial.tsx`, static handcrafted legality tables or duplicated per-ruleset move code.

## Content and localization

Learn & Rules must support both Russian and English.

Content should be structured rather than embedded as large ad-hoc JSX blocks so that:

- the same rule content can be reused by standalone reference screens and in-match help;
- RU/EN stay aligned;
- tutorial steps can reference localized rule concepts consistently.

Exact content storage format is an implementation detail, but it should remain typed and maintainable.

## Scope guard

UX/UI v2 does not introduce:

- strategy coaching;
- AI move recommendations;
- puzzles;
- daily challenges;
- separate tutorial game rules;
- video tutorial dependencies;
- replay-driven lessons.

The Season 0 goal is clear rules education and a short deterministic onboarding path for both supported rulesets.