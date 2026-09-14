# 07 — Game Board UX

Status: accepted product decisions

## Scope

This document defines the first-release interaction model and presentation rules for the UNDERGAMMON game board in the Telegram Mini App.

The game UI must remain touch-first, readable on phones and fully compatible with the server-authoritative gameplay model.

## Primary interaction model

The primary checker control is tap-to-move:

1. The player taps a checker or stack that can legally move.
2. The client highlights legal destination points.
3. The player taps a destination.
4. The move is added to the current local turn draft.

Drag-and-drop is not required for the first release. It may be added later as an additional input method, but tap-to-move remains the baseline interaction model.

The UI must clearly distinguish selectable checkers, legal destinations and non-interactive points.

## No automatic gameplay actions

The client must not automatically move a checker, even when only one legal move exists.

When only one move is available, the UI may strongly highlight the only valid checker and destination, but the player still performs the action explicitly.

Likewise, dice are never auto-rolled. The player explicitly presses the roll control at the start of the turn.

The actual dice result is generated authoritatively by the backend. The client only animates and presents the server-provided result.

## Draft turn and confirmation

Checker movements within the current turn are assembled as a local draft before the turn is committed.

The player may:

- perform the required checker movements;
- undo the latest draft movement;
- rebuild the intended move sequence before confirmation.

The opponent must not see local draft experimentation.

Once the player confirms the turn, the client submits the complete intended move sequence together with the expected authoritative state/version. The backend validates the complete sequence against the authoritative game state and game rules before committing it.

A turn can only be confirmed when the submitted sequence satisfies all mandatory move rules for the current ruleset and dice result.

## Move animation and presentation

A committed move must never appear as an unexplained instant teleport of pieces.

After server validation and commit:

1. both clients receive the committed turn;
2. the UI visually replays the committed checker movements in order;
3. movement animations make the source and destination understandable;
4. the most recent move receives a short-lived visual highlight after completion;
5. only then does the presentation advance to the next playable turn.

The server state is authoritative immediately after commit, while the UI may maintain a short presentation queue so the player can understand what happened.

If several server events arrive while an animation is playing, the client must not silently jump over committed gameplay events. They are queued for presentation where practical.

Reconnect is different: after reconnect, the client receives the current authoritative snapshot and does not need to replay a long backlog of missed animations. A short summary/highlight of the last relevant move may be shown instead.

## Animation timing and fairness

The first release uses one standard animation speed for all players. User-configurable animation speed or animation disabling is not required for MVP.

Mandatory presentation animations must not consume the next player's usable turn time.

The transition is conceptually:

```text
previous turn committed
→ mandatory move presentation
→ next turn becomes interactable
→ authoritative turn timer starts
→ roll control becomes available
```

The server must define the authoritative `turnStartsAt` / turn deadline. Fairness must not depend on a browser callback indicating that a CSS or client-side animation has finished.

The player must receive the full configured playable turn duration once interaction becomes available.

## Board perspective

Each player sees the board from their own perspective. Their own side is presented consistently relative to the device orientation.

Both clients still represent the same authoritative domain coordinates. Board rotation is a presentation concern only and must not leak into game-engine rules or server state.

A spectator mode is not part of the current product scope and should not influence the architecture or UI design.

## Match HUD

The board should preserve as much screen space as possible while keeping essential match information permanently visible.

The first-release HUD should expose:

- both players' names and avatars;
- the relevant ruleset rating for both players;
- whose turn it is;
- remaining turn time;
- current dice result after the roll;
- opponent connection/reconnecting state when relevant;
- access to reactions;
- a compact match menu.

Detailed match analytics, large history panels or secondary statistics must not compete with board space during play.

Casual/private matches may display player ratings as identity/context, but their result does not change rating.

## In-match menu

The in-match menu is intentionally small.

It includes at minimum:

- resign / leave match;
- mute opponent reactions.

Leaving an already active match is semantically a resignation and uses the match-lifecycle rules defined elsewhere. The UI must clearly communicate that consequence before confirmation.

The in-match menu must not become a second general application settings screen.

## Reactions

The first release supports lightweight predefined in-match reactions inspired by quick-emote systems rather than a full text chat.

Requirements:

- a small free baseline reaction set is available to every player;
- reactions are sent explicitly by the player;
- a short cooldown prevents reaction spam;
- the opponent can mute reactions for the current experience;
- reactions appear briefly near the sender identity or board without obstructing gameplay;
- unrestricted text chat is not included in MVP.

Additional reaction packs may later become cosmetic rewards or monetized cosmetics. They must never affect gameplay.

## Responsive layout

The game is portrait-first but responsive by design from the beginning.

The application must use a single adaptive board implementation rather than separate gameplay implementations for portrait and landscape.

Expected behavior:

- portrait phone: maximize useful board width with HUD above/below;
- wider phone / landscape: reflow HUD around the larger available board area;
- desktop / large Telegram window: cap board dimensions to preserve readability rather than stretching indefinitely.

Board geometry, hit targets, legal-move highlights and animations must derive from the current container geometry rather than fixed pixel coordinates.

Landscape is supported naturally by the adaptive layout, but users are not required to rotate their phones to play.

## Sound and haptics

The first release includes restrained feedback:

- dice-roll sound;
- checker movement sound;
- end-of-turn / victory feedback where appropriate;
- light haptic feedback for important actions where the Telegram/WebView environment supports it.

Sound and haptic feedback are enabled by default and can be disabled through simple application settings.

A complex audio mixer or many independent sound toggles are not required for the first release.

## Product principles

The board UX follows these rules:

- the player explicitly performs meaningful gameplay actions;
- legal actions are obvious without automating strategic decisions;
- server authority is never compromised by client convenience;
- committed gameplay is visually understandable to both players;
- animations must never steal playable clock time;
- touch interaction and readability take precedence over desktop-specific complexity;
- cosmetic/social features must not interfere with the competitive game state.

## Deferred features

Explicitly deferred from the first release:

- drag-and-drop as a required control scheme;
- user-selectable animation speeds;
- spectator mode;
- unrestricted text chat;
- detailed in-match analytics/history panels;
- separate portrait and landscape gameplay implementations.
