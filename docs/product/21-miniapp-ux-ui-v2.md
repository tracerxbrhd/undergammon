# 21 — Telegram Mini App UX/UI v2

Status: accepted baseline, implementation pending

## Purpose

This document defines the accepted UX/UI v2 direction for the UNDERGAMMON Telegram Mini App.

It is a presentation-layer specification. It does not replace the existing product rules, match lifecycle, game-engine rules, realtime protocol or server-authoritative model defined elsewhere.

Relevant source documents remain authoritative for their domains, especially:

- `03-bot-miniapp-navigation.md`;
- `04-private-challenges.md`;
- `05-matchmaking-rating-seasons.md`;
- `06-match-lifecycle-reconnect-timeouts.md`;
- `07-game-board-ux.md`;
- `08-profile-and-match-history.md`;
- `11-tutorial-and-rules.md`;
- `13-moderation-and-admin.md`;
- `18-settings-and-accessibility.md`;
- `19-season-0-release-scope.md`;
- `../architecture/27-miniapp-and-frontend-architecture.md`.

The current `apps/miniapp` implementation is a functional prototype and is not a visual design to preserve. A substantial frontend refactor is allowed where it improves the product without changing authoritative backend/game behavior.

## Non-negotiable constraints

UX/UI v2 must preserve the following architectural properties:

- gameplay remains server-authoritative;
- the client never decides dice results, winners, rating changes or authoritative match state;
- the existing game engine remains the source of deterministic game rules;
- protocol contracts must remain backward-compatible and should remain untouched unless a proven product requirement cannot be met otherwise;
- backend changes are not part of a visual refactor unless a concrete missing contract is identified;
- Telegram is the primary platform;
- the Mini App is touch-first and phone-first;
- Long Nardy and Classic Backgammon use one adaptive board implementation;
- no second gameplay implementation is introduced for portrait/landscape or for different devices.

## Information architecture

Primary application navigation is intentionally small:

```text
UNDERGAMMON
├─ Play
├─ Rankings
└─ Profile
   ├─ Match History
   ├─ Learn & Rules
   ├─ Settings
   └─ Admin (only when authorized)
```

Primary bottom navigation contains exactly:

- Play;
- Rankings;
- Profile.

Match History, Learn & Rules, Settings and Admin are secondary destinations under Profile and must not compete with the primary game flow.

The following are flow screens rather than permanent navigation tabs:

- matchmaking search;
- outgoing private challenge waiting;
- incoming private challenge;
- rematch request;
- active match;
- match recovery;
- match result.

The following are transient overlays/surfaces where appropriate:

- public profile;
- match menu;
- reactions;
- confirmations;
- contextual help.

## Play / Home

Play is the default product surface.

It should contain:

- compact product/Season 0 identity;
- compact account identity with avatar, nickname, level and coins;
- Casual / Ranked segmented mode selector;
- ruleset selector;
- Casual opponent choice: Find Player or Friend;
- relevant ruleset rating context;
- one dominant context-aware primary action;
- unobtrusive access to Learn / How to Play.

Ranked does not expose a Friend option because direct ranked challenges are not supported.

Do not show disabled placeholders for deferred systems such as AI if they are not usable in the current release.

If the account has an unfinished active match, recovery/return to that match takes priority over normal setup UI.

## Matchmaking and challenge flows

Matchmaking search is a focused flow rather than a passive card on the normal Home screen.

It should show the selected mode/ruleset, relevant rating context, search state, elapsed time and a clear Cancel action. The client must not display invented or guessed matchmaking radius values that are not provided by the backend.

An outgoing private challenge uses a dedicated waiting state showing:

- ruleset;
- Private / Unrated context;
- expiry/countdown;
- Share again;
- Cancel.

Closing the Mini App does not implicitly cancel a challenge.

For a generic incoming private challenge deep link, the UI must not invent challenger metadata that the current backend contract does not provide. A generic accept/decline-or-dismiss surface is valid until a dedicated preview contract exists.

Rematch invitations may show the authoritative metadata already provided by the rematch endpoint.

## Active match is a locked game surface

The active Game Screen is not treated as a scrollable web page.

It is a viewport-locked game surface that fills the available Telegram Mini App viewport.

Hard invariants:

- no vertical document scrolling;
- no horizontal document scrolling;
- no user panning of the game surface;
- the board, both player HUDs and the action dock remain visible together;
- the game layout must fit inside the available stable viewport and safe areas;
- phase changes must not change the overall screen geometry;
- the board must not shift because controls appear or disappear;
- responsive behavior is achieved by adapting dimensions, spacing and density, not by adding gameplay scroll.

The active match does not show the application's bottom navigation.

The game screen uses its own layout root rather than inheriting the ordinary page/container layout used by non-game screens.

## Game Screen composition

The accepted portrait composition is conceptually:

```text
┌──────────────────────────────┐
│ Opponent player strip        │
├──────────────────────────────┤
│                              │
│          BOARD SCENE         │
│                              │
├──────────────────────────────┤
│ Local player strip           │
├──────────────────────────────┤
│ Action dock                  │
└──────────────────────────────┘
        safe-area-bottom
```

The board is the dominant interactive surface and receives the largest possible share of the viewport.

Player strips are compact and permanently visible. Together they communicate:

- avatar;
- nickname;
- relevant ruleset rating;
- connection/reconnect state where relevant;
- active-turn state;
- authoritative remaining turn time for the active player.

There is no separate large `YOUR TURN / WAITING` status row consuming board space.

Account Level is intentionally not part of the permanent match HUD.

The match menu is accessed through one compact control such as an overflow button.

## Stable geometry across turn phases

The Game Screen keeps the same structural geometry across at least:

- waiting for both players;
- waiting for roll;
- local move drafting;
- local confirm state;
- opponent turn;
- local reconnecting/offline;
- opponent reconnecting;
- control lost / another device owns control;
- match finished.

Controls may change state, label, visibility or enabled status inside pre-allocated areas, but the board region must not move as a result.

The action dock therefore owns a stable region. Example conceptual states:

```text
WAITING_FOR_ROLL
[ reaction ] [          Roll Dice          ]

AWAITING_MOVE
[ reaction ] [ Undo ] [   Confirm Turn     ]

OPPONENT_TURN
[ reaction ] [       Opponent's turn       ]
```

Exact button widths and compact-height behavior remain an implementation/detail-design concern, but the stable-region principle is accepted.

## Board Scene direction

UX/UI v2 uses the "Board Scene" direction rather than treating the board as only a grid followed by detached controls.

The visual game object should integrate, as appropriate:

- 24 points;
- checker stacks;
- central bar / structural center;
- dice presentation;
- bearing-off/off-board trays;
- recent-move and legal-move presentation.

This must work naturally for both Long Nardy and Classic Backgammon while preserving the same authoritative domain coordinates.

The preferred direction is a slightly taller, more complete board object than the current prototype. The exact aspect ratio is intentionally not frozen yet and may be tuned through implementation experiments on compact phones.

Dice should be rendered as graphical dice/pips rather than Unicode glyphs and should visually belong to the Board Scene.

For Backgammon, the bar is a real gameplay location. For Long Nardy, the same central structure may remain visually useful without creating false gameplay semantics.

Bearing-off areas should visually belong to the board rather than look like unrelated buttons below it.

## Board interaction

The established interaction contract from `07-game-board-ux.md` remains unchanged:

- tap a legal source;
- show legal destinations;
- tap a destination;
- build a local turn draft;
- allow undo;
- explicitly confirm a complete legal turn;
- never auto-move even when one move is available;
- explicitly roll when the rules require a manual roll.

Selection, legal destinations and recent moves must be distinguishable without relying on color alone.

Permanent tiny point numbers are not required in the real match UI and should not compete with checker readability. Point/index labels may be used in tutorial/help contexts when educationally useful.

Committed moves should continue to be presented sequentially. The preferred implementation direction is to retain a DOM/CSS board and add a presentation/animation overlay based on current element geometry rather than introducing a Canvas/Pixi-style rendering engine.

## Dice and action controls

Dice are part of game presentation, not a detached browser control row.

The client may visually dim/mark already-consumed dice while the player builds a local draft, but game legality remains derived from the existing engine and authoritative state.

The main action area is phase-aware:

- before a normal roll: dominant Roll Dice action;
- during a local draft: Undo plus dominant Confirm Turn;
- during opponent turn: passive compact state rather than fake interactive controls;
- during presentation/reconnect/control loss: controls are disabled or replaced with the relevant state.

Roll and Confirm should reuse the same primary-action region so the interface does not jump between phases.

Reactions use one compact trigger that opens the small predefined reaction set instead of permanently showing three reaction buttons.

Surrender is not a permanent gameplay button. It belongs in the match menu and requires confirmation.

## Match menu and overlays

The in-match menu is a bottom sheet/overlay over the fixed game surface. Opening it must not resize or reflow the underlying board.

It includes at minimum:

- ruleset/mode context where useful;
- How to Play / contextual rules access;
- mute opponent reactions;
- destructive Resign action.

Resigning from an active match requires an explicit confirmation communicating the consequence.

Public profiles, reaction pickers, confirmations and contextual help similarly overlay the game instead of turning the Game Screen into a scrollable page.

The current silent home/close control must not allow the user to accidentally leave an active match without clear semantics.

## Reconnect and control states

Local transport loss does not replace the board with a blank screen.

During local reconnect:

- keep the last authoritative board visible;
- lock gameplay input;
- show a compact reconnecting state.

Opponent disconnect/reconnect is primarily represented on the opponent strip, optionally with the authoritative reconnect deadline/countdown when available.

`CONTROL_LOST` is a distinct state from network loss. It should explain that another session owns match control and offer the existing Take control action where permitted.

`WAITING_FOR_PLAYERS` is also a state of the Game Screen. There is no client-side Ready button; the UI waits for the authoritative lifecycle and may show the join deadline.

## Match result

The result is presented after mandatory final move presentation, preferably as a result sheet layered over a still-recognizable final board.

For Ranked matches, the result may show rating before/after/delta only from authoritative persisted data. Ranked does not offer a direct same-opponent rematch.

For Casual/Private matches, the result may offer Request rematch and Home/Play actions according to the existing lifecycle rules.

Classic Backgammon NORMAL / GAMMON / BACKGAMMON classification must come from authoritative game/result data and is presentation-only on the client.

Do not invent per-match XP or Coins rewards from profile differences. Such rewards require an explicit authoritative match-attributed contract before they are displayed as earned-result values.

## Rankings

Rankings is a primary destination.

It uses a ruleset switch/segmented control and shows:

- leaderboard rows;
- public player identity;
- rating and peak where useful;
- a clearly separated own-position card/row.

A player who has not completed calibration does not receive a fabricated official leaderboard position. The UI may use the account's played count to communicate calibration progress.

Tapping another player opens the public game profile.

## Profile hub

Profile is an account hub rather than only an edit form.

Its top section should expose the user's game identity:

- avatar;
- nickname;
- Account Level;
- total XP;
- Coins;
- both ruleset ratings and calibration state.

Do not invent an XP-to-next-level progress bar unless the authoritative/shared level curve is available to the frontend without duplicating server policy.

Secondary rows lead to:

- Match History;
- Learn & Rules;
- Settings;
- Technical/account information if needed;
- Admin when `me.admin` is true.

Raw internal UUID/account identifiers should not dominate the main profile surface.

Nickname editing must respect the existing server cooldown. Until the backend exposes an exact next-change timestamp, the client should explain the rule generally and handle cooldown errors rather than display a guessed countdown.

## Public profile

Public game profiles are presented as a mobile-friendly sheet/surface rather than a desktop-style centered modal where practical.

They may show authoritative/derived public game information such as:

- avatar and nickname;
- Account Level;
- aggregate matches/wins or derived win rate;
- per-ruleset rating and peak.

Telegram identity is not exposed as the domain/public profile identity.

## Match History

History remains concise and private to the account owner.

Rows should expose the useful result context already available from the backend, including opponent, ruleset, mode, date/result/finish context and ranked rating delta when applicable.

Tapping an opponent may open that player's public profile.

No replay, turn timeline or dice history is introduced for UX/UI v2.

Do not add misleading client-only filters over only the currently loaded pagination page if the filter would imply complete historical results.

## Learn & Rules

Learn & Rules is a secondary destination under Profile.

Each ruleset should offer:

- Quick Tutorial;
- Rules Reference.

Tutorials should use deterministic prepared positions and the production game engine. A separate simplified tutorial rules engine must not be created.

In-match contextual help may explain rules but should not become strategic advice.

## Settings

Season 0 settings stay intentionally small:

- language: Russian / English;
- sound;
- haptics;
- opponent reactions;
- account deletion in a danger section.

Do not add speculative settings for notifications, quality presets, themes, animation speed or other deferred systems simply to make the page appear richer.

## Admin

Admin is hidden from normal users and lives below Profile for authorized accounts.

It remains utilitarian and backend-authorized. UX should support the existing account lookup, moderation, rating/coins operations and audit workflow without turning Admin into a primary product surface.

Destructive or economic/admin adjustments require clear confirmation and the existing mandatory reason/audit model.

## Visual-system direction

The current prototype is not a palette contract, but the broad visual direction is reusable:

- dark game environment;
- restrained moss/olive accent;
- warm physical board materials/colors;
- high-contrast ivory/dark checker identities;
- limited decorative noise.

Implementation should replace scattered hard-coded colors with semantic design tokens, including at least:

- application background;
- surfaces;
- subtle borders;
- primary/secondary text;
- accent;
- warning;
- danger;
- board frame/field colors;
- local/opponent checker colors;
- source/target/focus/move presentation states.

Telegram host chrome and safe areas should be integrated, but Telegram theme colors should not automatically erase UNDERGAMMON's own game identity.

The preferred typography baseline is the system mobile stack rather than adding a remote web-font dependency solely for branding.

Use a compact 4-point spacing system and phone gutters around 12–16 px as a baseline. Meaningful touch controls should target approximately 44×44 px or larger where practical.

## Motion

Motion should communicate gameplay, not decorate the app.

Guidance:

- ordinary controls: short, restrained transitions;
- checker movement: readable but fast;
- dice reveal/roll: brief and explicit;
- sheets: short mobile-style entrance/exit;
- reactions: transient and non-blocking;
- no parallax, aggressive zooming or flashing timer effects.

The authoritative turn timer and fairness rules remain defined by the server; client animation timing must not steal playable time.

## Responsive behavior

Portrait phone is the reference experience.

The Game Screen must remain non-scrollable even on compact-height devices. When space is constrained, reduce decorative spacing/density before removing gameplay-critical information.

Typical adaptation order may include:

- smaller vertical gaps/padding;
- smaller avatars;
- compact connection presentation;
- tighter HUD typography;
- compact action dock;
- container-derived board/checker geometry.

Nickname truncation is acceptable; losing essential turn/timer/action information is not.

Wider/landscape layouts use the same board implementation and may reflow the surrounding HUD/action layout around the available board area.

Large Telegram/desktop windows cap board size instead of stretching indefinitely.

## Telegram Mini App integration

The frontend platform adapter should remain the boundary around Telegram-specific APIs.

UX/UI v2 should support the platform capabilities needed for correct mobile layout and navigation, including:

- stable viewport sizing/events;
- safe-area and content-safe-area handling;
- native BackButton semantics for secondary destinations;
- host background/chrome integration where useful.

Fullscreen may be evaluated as progressive enhancement for the active Match Screen after real Android and iPhone verification. It is not a mandatory dependency for UX/UI v2.

Native BackButton behavior should be intentional:

- primary tabs: normally no back action;
- secondary Profile destinations: back to Profile;
- transient sheets: close the sheet;
- active match: never silently abandon/resign the match;
- finished result: return to the appropriate post-match/Play state.

## Loading, error and offline states

UX/UI v2 must explicitly cover non-happy paths rather than falling back to raw error text.

Expected states include:

- bootstrap/auth splash or skeleton;
- local content skeletons for history/rankings/profile refreshes;
- meaningful empty states;
- recoverable inline HTTP error with Retry;
- fatal bootstrap/auth recovery screen;
- persistent compact network/offline indication;
- active-match reconnect with board preserved;
- opponent reconnect state;
- control-loss/takeover state;
- expired/used challenge state;
- account-level error states.

Raw backend error codes may be used internally for routing/handling but should be localized into human-readable presentation.

## Frontend implementation direction

The target is an evolutionary but substantial refactor inside `apps/miniapp`, not a rewrite of the product backend.

A useful feature-oriented shape is:

```text
apps/miniapp/src/
  app/
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
```

Exact filenames are not a product contract, but responsibilities should be separated so the match session, turn draft and presentation logic are not embedded directly into large screen components.

The conceptual match data flow should remain:

```text
authoritative snapshot
→ match session / connection-control state
→ local turn draft
→ presentation model
→ Match Screen / Board
```

Avoid introducing Redux/Zustand, React Router, a large UI framework, Canvas/Pixi or another shared package unless a concrete need appears. UX/UI v2 does not currently justify those abstractions.

## Explicit non-goals for this refactor

UX/UI v2 does not introduce:

- new authoritative backend architecture;
- protocol v2;
- game-engine rewrites;
- AI placeholders as fake available functionality;
- Store as a primary tab before a usable store exists;
- achievements;
- replay/timeline;
- public player search/social graph;
- mandatory fullscreen;
- multiple themes;
- separate board engines for different orientations/rulesets.

## Acceptance baseline

The UX/UI v2 implementation is not complete unless all of the following remain true:

1. Authoritative gameplay behavior is unchanged.
2. Existing protocol compatibility is preserved.
3. The active portrait Match Screen has no document scroll/pan on supported compact phone targets.
4. The board remains the largest interactive surface.
5. Both player identities, relevant rating, turn/timer and connection state remain available without sacrificing the board.
6. Reactions, resign and help do not permanently compete with board space.
7. Tap-to-move, local draft, undo, explicit confirm and manual roll semantics remain intact.
8. One adaptive board serves both Long Nardy and Classic Backgammon.
9. Backgammon bar/hit/bearing-off and Long Nardy movement remain correctly represented.
10. Matchmaking, challenge waiting, waiting-for-players, reconnect, control loss and result are distinct human-readable UX states.
11. Primary navigation remains Play / Rankings / Profile.
12. History / Learn & Rules / Settings / Admin remain secondary.
13. Russian and English layouts are tested for compact mobile widths.
14. Critical controls remain practical touch targets.
15. Telegram stable viewport and safe-area behavior is handled intentionally.
16. Real Telegram E2E is repeated on Android and iPhone-class layouts after the refactor.
17. Existing server-authoritative/integration tests remain green.
18. Full natural bearing-off victory paths for both rulesets are manually accepted before considering Season 0 gameplay UX complete.

## Open design work

The following details are intentionally not frozen by this baseline and should be designed next:

- exact Board Scene anatomy and proportions;
- exact 24-point/bar/off-tray geometry for both rulesets;
- exact dice placement and consumed-die presentation;
- precise checker stack compression/overflow behavior;
- final player-strip/action-dock dimensions across compact devices;
- final visual token values and component styling;
- final motion timings and microinteraction details.
