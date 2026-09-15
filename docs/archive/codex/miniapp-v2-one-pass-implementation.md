# UNDERGAMMON — Telegram Mini App UX/UI v2

Status: implementation brief for Codex one-pass execution

You are working in the existing production project `tracerxbrhd/undergammon`.

Your task is to implement the accepted Telegram Mini App UX/UI v2 in one complete implementation pass, bringing it as close to production-ready Season 0 quality as the repository and environment allow.

This is not a greenfield project and not permission to rewrite the repository. Backend, realtime and game-engine already work in production and have been manually tested with two Telegram accounts.

The main work must happen in `apps/miniapp`.

Minimal changes to `packages/protocol` and `apps/server` are allowed only where objectively required by the accepted UX v2, primarily authoritative Account XP progression and match-result data.

Do not redesign or rewrite `packages/game-engine`, and do not change game rules unless a tiny compatible fix is objectively required by the already accepted UI contract. Do not use this task as an excuse to refactor the engine.

---

## Primary goal

Turn the current functional prototype Mini App into a coherent production-quality Telegram game client for Season 0.

Visual direction:

> Dark Liquid Glass game shell floating above a warm physical backgammon board, with restrained moss accents and precise competitive typography.

Priorities, in this order:

1. gameplay correctness;
2. preserve server-authoritative architecture;
3. stable fixed Game Screen;
4. touch-first Telegram UX;
5. coherent visual system;
6. reconnect/recovery reliability;
7. Android/iPhone responsive behavior;
8. Liquid Glass polish;
9. frontend architecture cleanliness.

If a visual effect conflicts with gameplay, readability, performance or stable geometry, gameplay wins.

---

## Read the existing implementation first

Do not edit before inspecting the real code.

Read `apps/miniapp/**`, especially:

- `apps/miniapp/src/main.tsx`
- `apps/miniapp/src/Game.tsx`
- `apps/miniapp/src/PublicProfile.tsx`
- `apps/miniapp/src/Tutorial.tsx`
- `apps/miniapp/src/platform.ts`
- `apps/miniapp/src/realtime.ts`
- `apps/miniapp/src/content.ts`
- `apps/miniapp/src/style.css`
- `apps/miniapp/package.json`

Also inspect:

- `packages/protocol/src/index.ts`

And only the necessary backend files:

- `apps/server/src/accounts.ts`
- `apps/server/src/matches.ts`
- `apps/server/src/app.ts`
- `apps/server/src/policy.ts`
- DB/schema/migrations related to `accounts`, `matches`, `match_players`, ratings and history.

Before implementation, read these product documents as source of truth:

- `docs/product/21-miniapp-ux-ui-v2.md`
- `docs/product/22-board-scene-cosmetics-architecture.md`
- `docs/product/23-game-screen-hud-and-turn-states.md`
- `docs/product/24-match-result-and-progression-ux.md`
- `docs/product/25-miniapp-navigation-shell.md`
- `docs/product/26-play-home-and-match-entry-ux.md`
- `docs/product/27-private-challenge-and-rematch-entry-ux.md`
- `docs/product/28-rankings-ux.md`
- `docs/product/29-profile-hub-and-account-progression-ux.md`
- `docs/product/30-match-history-ux.md`
- `docs/product/31-public-profile-ux.md`
- `docs/product/32-learn-and-rules-ux.md`
- `docs/product/33-settings-ux.md`
- `docs/product/34-admin-ux.md`
- `docs/product/35-visual-system-and-liquid-glass.md`
- `docs/product/36-game-screen-visual-language.md`
- `docs/product/37-miniapp-v2-final-ux-ui-spec.md`

Also account for:

- `docs/architecture/27-miniapp-and-frontend-architecture.md`
- `docs/product/07-game-board-ux.md`
- `docs/product/19-season-0-release-scope.md`
- `docs/product/16-account-level-and-xp.md`

If an older document conflicts with product docs 21–37, the later UX/UI v2 decisions take precedence for presentation/navigation/layout unless that would violate an authoritative backend contract.

Do not stop after producing a plan. After inspection, proceed directly to implementation.

Do not ask for clarification on decisions already defined in the docs. If something remains ambiguous, choose the simplest production-safe solution compatible with the accepted documents.

---

## Preserve the working product core

Production has already verified:

- Telegram authentication;
- Game Account creation;
- Mini App launch;
- casual matchmaking;
- private challenge/invite;
- PvP match creation;
- realtime gameplay;
- server-authoritative dice and moves;
- surrender;
- reconnect/reopen.

These properties must remain intact.

The client must never become authoritative for:

- dice results;
- authoritative move acceptance;
- winner;
- finish reason;
- rating;
- XP;
- Coins;
- match deadlines;
- sanctions;
- challenge or match ownership.

Do not move server policy into the frontend.

Do not make Telegram user ID the domain account ID.

Preserve internal Game Account IDs.

---

## Frontend architecture

The current monolithic `main.tsx` may be substantially decomposed.

Target direction, adapted to the real code rather than created mechanically:

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

Do not create empty architectural shells with no real responsibility.

Keep conceptual separation between:

- server/domain state;
- realtime connection state;
- local UI/presentation state.

Do not add:

- Redux;
- Zustand;
- React Router;
- Next.js;
- Canvas/Pixi;
- a large UI framework;
- a generic cross-product design-system package.

The application is small enough for a typed internal navigation model.

Do not add dependencies merely for architectural aesthetics.

Prefer application-owned SVG icons if the icon set remains small.

Tailwind does not become the new source of truth. If the dependency remains, that is acceptable. Do not spend task scope removing it unless necessary.

---

## AppShell and navigation

Primary destinations:

```text
Rankings      PLAY      Profile
```

`Play` remains the centered primary destination and is visually stronger than the others.

Navigation must be config-driven and structurally able to support up to five future primary destinations without rewriting `AppShell`.

Do not render visible empty future slots.

Bottom navigation must be:

- fixed;
- safe-area aware;
- Liquid Glass;
- non-scrollable horizontally;
- accounted for by page content so content never hides beneath it.

Normal screens use `AppShell`.

Active Game Screen does not show bottom navigation.

Focused matchmaking/challenge flows may also hide bottom navigation.

Preserve the Season 0 browser fallback: direct opening of the production origin outside Telegram must show a lightweight public landing with `Open in Telegram`, not a broken authentication screen.

---

## Play / Home

Home is the setup surface itself, not a dashboard followed by a wizard.

Show compactly:

- avatar;
- nickname;
- Account Level;
- Coins;
- visible `Casual / Ranked` segmented control;
- visible `Long Nardy / Backgammon` selector;
- for Casual: `Find Player / Friend`;
- for Ranked: matchmaking only;
- relevant rating/calibration for selected ruleset;
- one dominant primary CTA.

Do not use a dropdown for two rulesets.

Persist the last-used ruleset locally.

CTA semantics:

- Casual + Find Player → Find Player
- Casual + Friend → Create Challenge
- Ranked → Find Ranked Match

If there is an unfinished active match, `Return to Game` has priority over creating a new flow.

Do not add an AI placeholder.

---

## Matchmaking

After starting matchmaking, open a focused screen without bottom navigation.

Show:

- selected ruleset;
- Casual/Ranked;
- relevant Ranked rating/calibration;
- restrained search activity;
- locally presented elapsed search time;
- Cancel.

Do not invent search radius/tuning UI.

After the server authoritatively creates/finds a match:

```text
searching
→ short transition
→ Game Screen
```

Do not add a second `Accept` or `Ready` confirmation.

Cancel must actually leave the queue and return to Home with the selected setup values preserved.

---

## Private challenge / rematch

Casual + Friend creates a challenge and enters a focused waiting screen.

Show:

- ruleset;
- `Private · Unrated`;
- authoritative expiry/countdown;
- Share Invite;
- Cancel.

Do not expose meaningless token/room ID as normal UX.

Closing the Mini App alone must not cancel the challenge.

On reopen, an active outgoing challenge should be recoverable.

For a generic incoming challenge, do not invent challenger name/avatar/ruleset if the current backend cannot provide those before accept.

Do not expand the challenge-preview backend contract in this task if the accepted generic incoming flow can work correctly without it.

Rematch uses the same reusable challenge-flow family, with opponent/ruleset metadata only when already authoritative.

Do not add direct Ranked rematch.

---

## Rankings

Rankings is a primary AppShell destination.

Provide a visible ruleset selector:

- Long Nardy
- Backgammon

Render a dense, scrollable leaderboard.

Each row contains:

- rank;
- avatar;
- nickname;
- rating.

Top 3 may receive restrained emphasis, not a giant podium/casino treatment.

Tap a player → Public Profile bottom sheet.

Always provide a separate self card even if the player is outside the visible leaderboard portion.

If the player is calibrating, do not show a fake rank. Show calibration progress and preliminary rating semantics supported by the product contract.

Do not add unsupported period/season/friend filters or client-only fake filtering.

---

## Profile

Profile is an account hub, not a giant editing form.

Show:

- avatar;
- nickname;
- Account Level;
- XP progression bar;
- total XP;
- Coins;
- Long Nardy rating/peak/calibration;
- Backgammon rating/peak/calibration.

Navigation rows:

- Match History
- Learn & Rules
- Settings
- Edit Profile
- Technical / Account info
- Admin, only when `me.admin`

Do not make internal UUID/Account ID prominent. Keep it on the technical surface.

Edit Profile opens a sheet.

Do not display a fake exact nickname cooldown countdown if the server does not expose an authoritative next-allowed timestamp. Explain the general 7-day rule and handle server `NICKNAME_COOLDOWN` correctly.

---

## Authoritative level-progress contract

The frontend must not copy the server `levelFromXp()` formula.

Extend the contract minimally so `Profile` gets authoritative data sufficient for an XP progress bar.

Preferred semantics:

```ts
levelProgress: {
  levelStartTotalXp: number;
  nextLevelTotalXp: number;
  xpIntoLevel: number;
  xpRequiredForNextLevel: number;
}
```

Exact field names may follow project conventions, but semantics must remain explicit.

`level` and `totalXp` remain authoritative server values.

Create a server/shared progression helper from the single authoritative progression policy.

Do not copy the formula into Mini App code.

Add tests for:

- level start;
- just before a boundary;
- exactly on a boundary;
- large XP values.

---

## Match-result XP contract

This is the other explicitly allowed small backend/protocol change.

The UI needs XP attributable to the specific completed match.

Never derive it as:

```text
newProfile.totalXp - cachedOldProfile.totalXp
```

That is architecturally unsafe.

Result progression must remain recoverable after reconnect/reopen of a finished match.

Preferred direction:

- persist enough viewer-specific match reward data in match/player persistence, e.g. `xp_before`, `xp_after`, `xp_gained` or an equivalent shape;
- do not blindly put viewer-specific reward data into the shared persisted `MatchSnapshot` if that creates the wrong domain model;
- minimally extend the existing finished-match/history/result read path so the current player can read authoritative result values;
- use the same progression helper for level-before/after and level boundaries.

A small DB migration is allowed if needed.

Do not create a generic reward subsystem, event-sourcing architecture, queue or new service.

The result contract must support:

- XP gained;
- total XP before/after;
- level before/after;
- progression boundaries/progress before and after;
- Ranked rating before/after/delta when applicable.

Use existing persisted `rating_before/rating_after`; do not recalculate rating on the client.

Casual/Private are explicitly `Unrated`.

Do not add Coins to Result unless the existing accepted result contract actually supports them.

Rewards must be persisted before presentation animation begins.

---

## Match History

Render a dense chronological list.

Each entry should communicate:

- Victory/Defeat;
- opponent;
- ruleset;
- mode;
- meaningful finish reason when useful;
- date/time;
- authoritative Ranked rating delta where applicable.

Do not surface raw technical finish codes.

Normal completion does not need to display `BEAR_OFF`.

Classic Backgammon result classification may be shown only when authoritative.

Opponent tap → Public Profile.

Do not add replay.

Do not create fake client-only filters over a limited first page.

If the backend does not currently support real pagination/cursors, do not pretend it does.

---

## Public Profile

Use a reusable mobile bottom sheet.

Show only game identity:

- avatar;
- nickname;
- Account Level;
- ratings;
- peaks;
- match/win aggregates and derived win rate only where supported by authoritative data.

Do not show:

- Telegram username;
- Telegram ID;
- internal identity/provider data.

Do not add Add Friend / Message / Challenge social-graph actions.

---

## Learn & Rules

Structure:

```text
Long Nardy
- Quick Tutorial
- Rules Reference

Backgammon
- Quick Tutorial
- Rules Reference
```

Use the production game engine for tutorial positions/legal move semantics.

Do not create a second simplified tutorial rules engine.

Tutorial teaches mechanics/rules, not strategy or best moves.

Rules Reference is normal scrollable content.

In-match `How to Play` must reuse the same structured content source instead of maintaining a duplicate rules implementation.

---

## Settings

Season 0 Settings contains only:

- Language: RU / EN
- Sound
- Haptics
- Opponent reactions
- Delete account

Do not add:

- themes;
- graphics-quality presets;
- notification center;
- animation-speed settings;
- manual reduced-motion setting.

CSS must still respect `prefers-reduced-motion`.

Delete account uses a separate explicit danger confirmation flow.

If sound/haptic infrastructure exists, preserve and correctly connect it to preferences.

If no meaningful sound system currently exists, do not build a large audio subsystem merely to justify the toggle.

---

## Admin

Render only when `me.admin`.

Admin is a utilitarian internal surface.

Primary flow:

```text
account lookup
→ inspect
→ authorized action
→ mandatory reason
→ confirmation
→ audit
```

The backend remains the security boundary and must re-authorize every admin action.

Never rely on `me.admin` alone for authorization.

Do not add:

- DAU dashboards;
- charts;
- season-management tooling;
- bulk user management;
- live-match inspector;
- analytics platform.

---

## Visual system

Create semantic tokens in `styles/tokens.css`.

Baseline environment:

```text
background       #101411
surface-base     #171C18
surface-raised   #1D241F
surface-strong   #242D27
border-subtle    #2C3630
border-strong    #3A463E

accent           #98A86F
accent-active    #ACBC7D
accent-muted     #66704E
on-accent        #121610

text-primary     #F0F1EC
text-secondary   #AEB5AC
text-muted       #777F78
text-disabled    #555D57

success          #7FA978
danger           #C96F6A
warning          #C9A461
info             #7899AC
```

Avoid hardcoding these repeatedly inside feature components.

---

## Liquid Glass

Liquid Glass is the primary interface material language, not blanket glassmorphism.

Provide reusable material tokens/primitives:

- `glass-soft`
- `glass-regular`
- `glass-strong`

An initial tuning may use approximate backdrop blur values around:

- soft: 10–12px
- regular: 16–18px
- strong: 22–24px

These are tuning values, not rigid product contracts.

Glass may combine:

- dark translucent fill;
- backdrop blur;
- restrained saturation;
- thin edge/specular highlight;
- soft shadow where useful.

Do not make every content row glass.

Liquid Glass is primarily for:

- bottom navigation;
- controls;
- segmented controls;
- PlayerStrips;
- ActionDock;
- sheets;
- popovers;
- match overlays;
- result surface.

Physical game content is not glass.

Implement a usable non-blur fallback through `@supports` or equivalent. Geometry must remain the same when backdrop filtering is unavailable.

Do not continuously animate `backdrop-filter`.

Prefer transform/opacity for motion.

---

## Typography and spacing

Use the system mobile font stack. Do not add a remote font.

Baseline type scale:

```text
28/32 major result/title
22/26 major emphasis
18/22 heading
16/20 primary controls/body
14/18 secondary
12/16 metadata
```

Weights primarily use 400 / 500 / 600. Reserve 700 for major result/critical values.

Dynamic numbers such as rating, timers and XP use tabular numerals.

Spatial grid:

```text
4 8 12 16 20 24 32 40
```

Typical phone gutter: 16px.
Compact gutter: 12px.

Radius:

```text
6px     small
10px    controls
14px    cards
18–20px sheets
```

Do not make everything pill-shaped.

---

## Touch targets

Meaningful interactive controls should generally be at least about 44x44 CSS px.

Primary CTA visual height should normally be around 48px or more.

A 20–24px icon still needs an approximately 44px hit target.

Board point/checker hit areas may be invisibly enlarged, but must not overlap ambiguously.

---

## Game Screen — hard invariant

Game Screen is fully viewport-locked.

No:

- vertical document scroll;
- horizontal scroll;
- page pan;
- layout shift between turn phases.

Portrait composition:

```text
Opponent PlayerStrip
Board Scene
Local PlayerStrip
ActionDock
safe-area-bottom
```

The Game root consumes Telegram stable viewport geometry.

Do not rely only on `100vh`.

Board Scene occupies the largest usable region after HUD and ActionDock.

On compact-height devices, reduce decorative spacing/avatar/padding before compromising gameplay usability.

Board geometry must not move between:

- WAITING_FOR_ROLL;
- ROLLING;
- AWAITING_MOVE;
- partial draft;
- complete draft;
- opponent turn;
- reconnect;
- result.

Overlays/sheets must not reflow or resize the board underneath.

---

## Board Scene

Use one responsive DOM/CSS board for both rulesets.

Do not use Canvas/Pixi.

Board Scene has permanently reserved geometry for:

- 24 points;
- center bar;
- bearing-off/off-board trays;
- checker anchors;
- dice zone;
- hit targets;
- presentation overlays.

The bar structurally exists for both rulesets.

In Backgammon it is real gameplay space.

In Long Nardy it is neutral structural space.

Bearing-off tray is permanent, not dynamically inserted.

Do not permanently show point numbers during a real match.

Board geometry is separate from cosmetics.

---

## Default board material

Default appearance:

```text
wood-dark        #4A3428
wood-mid         #72503A
board-field      #B79B72
point-dark       #48382E
point-light      #D5C39D
checker-ivory    #E8DFCF
checker-dark     #252824
```

The board should feel premium and physical, but stylized rather than photorealistic.

Use lightweight CSS gradients, restrained texture, inner shadow/highlight where useful.

Avoid heavy image assets where CSS is sufficient.

---

## Checkers

Up to five checkers on a point should render as individual physical discs.

For more than five, use a compressed stack with a readable `×N` full count.

A stack is one coherent touch target.

Selected checker:

- thin moss ring;
- slight elevation.

Legal destination:

- small clear moss target marker.

Do not flood an entire point with bright green.

Unconfirmed local draft moves must remain visually distinguishable from authoritative state until successful confirm.

After successful Confirm, draft emphasis disappears and the server-confirmed state becomes normal.

---

## Dice

Dice are physical game content, not glass controls.

Use graphical pips, not Unicode dice characters.

Dice zone is always reserved.

Flow:

```text
our turn
→ Roll
→ neutral rolling presentation
→ authoritative server dice received
→ reveal
→ board becomes interactive
```

Never predict the final value before the server response.

Used dice remain visible in dimmed/consumed state rather than disappearing.

For doubles, show a physical pair plus four compact consumption markers, not four oversized physical dice.

Classic Backgammon opening roll is a distinct server-driven presentation state; do not show a manual Roll button when the opening roll is server-generated.

---

## PlayerStrips

Use permanent stable geometry.

Show:

- avatar;
- nickname;
- relevant rating;
- connection state when relevant;
- authoritative remaining turn time for the active player.

Do not permanently show:

- level;
- Coins;
- XP;
- match ID.

PlayerStrip uses `glass-regular`.

Active player receives restrained moss emphasis.

Timer state moves from normal → warning → critical through semantic color changes without resizing/reflow.

Use tabular numerals.

---

## ActionDock

ActionDock uses `glass-strong` and stable slots.

Conceptually:

```text
BEFORE_ROLL
Reaction | primary Roll Dice

AFTER_ROLL
Reaction | Undo | Confirm Turn

OPPONENT
Reaction | stable opponent-turn state
```

The primary region is reused between Roll and Confirm.

Confirm becomes visible after authoritative dice arrive and remains disabled until the local draft is complete/legal.

Undo occupies a stable slot and may be disabled when there is nothing to undo.

Reaction is a compact icon trigger.

Remove surrender from permanent controls. Keep it in Match Menu with explicit confirmation.

---

## Reconnect / Control Lost

Opponent disconnected:

- do not block the entire local Game Screen if gameplay can continue;
- show `Reconnecting…` and authoritative deadline in the opponent PlayerStrip.

Local reconnect:

- keep the last authoritative board visible;
- lock local gameplay input;
- show a compact `glass-strong` reconnect overlay;
- do not replace the board with a fullscreen spinner.

CONTROL_LOST:

- keep board visible/de-emphasized;
- show a blocking card:

```text
Game opened on another device
Take control
```

---

## Result Screen

After the final committed move, finish the move presentation first.

Then open a `glass-strong` Result Sheet over the still-visible final board.

Sequence:

```text
Victory / Defeat
→ Ranked rating delta when applicable
→ XP gained / progress
→ level-up when a boundary is crossed
→ post-match actions
```

Casual/Private:

```text
Unrated
→ XP
→ actions
```

Ranked has no direct rematch.

Casual/Private may offer Request rematch.

Progress animation is skippable.

Skipping immediately jumps to exact authoritative final values.

Do not make persisted rewards depend on animation callbacks.

Do not block Home/exit behind long animations.

---

## Reusable Mini App UI components

Create a small real reusable UI layer where components repeat:

- Button
- IconButton
- SegmentedControl
- GlassSurface
- BottomNavigation
- BottomSheet
- Confirmation surface
- ProgressBar
- StatusBadge
- Skeleton/loading surface
- Offline/connection banner

PlayerStrip may remain a match feature component.

Do not build a generic design system for hypothetical future applications.

---

## Telegram PlatformAdapter

Do not scatter direct Telegram globals throughout React components.

Extend/clean up the existing PlatformAdapter so the app can obtain centrally:

- Telegram context/initData;
- opening/sharing links;
- haptics;
- stable viewport measurements;
- safe-area/content-safe-area data;
- supported platform behaviors.

Preserve browser fallback.

Game layout uses stable viewport geometry.

Fullscreen is optional future polish, not a mandatory dependency of the baseline design.

---

## Responsive behavior

Phone-first portrait.

Normal AppShell pages may scroll vertically.

Game Screen never scrolls.

Use fluid CSS:

- flex/grid;
- min/max/clamp;
- CSS variables;
- actual viewport measurements.

Do not create separate iPhone and Android layouts.

Support conceptual density tiers:

- regular height;
- compact height;
- very compact height.

On smaller heights, remove or reduce decoration first.

Do not shrink critical touch targets into unusable sizes.

Both RU and EN must fit realistically.

Test realistic long nicknames.

Long nicknames may truncate where the full value remains available in a profile surface.

---

## Motion

Approximate timing baseline:

```text
120–160ms press/selection
180–220ms sheets/screens
250–350ms authoritative dice reveal
300–500ms XP/rating progression
```

Respect `prefers-reduced-motion`.

No flashing.

Avoid decorative infinite animations except minimal activity/search indication.

---

## Loading / error / offline

Do not show blank screens.

Use branded/local skeletons for loading.

Recoverable page errors use inline Retry.

Network/offline may use a compact persistent banner.

Fatal auth/session recovery uses a dedicated clear state.

Challenge expired/used states must be human-readable.

Game reconnect must preserve the board.

---

## Cosmetic-ready, but no Store

Do not implement Store.

Keep Board Scene structurally compatible with accepted future cosmetic categories:

- Board Theme;
- Checker Set;
- Dice Skin;
- Profile Frame;
- Reaction Pack.

Default appearance is an ordinary skin, not a hardcoded special case.

A skin must never alter:

- board geometry;
- hitboxes;
- legal target readability;
- point anchors;
- dice semantics.

Do not support arbitrary runtime HTML/CSS cosmetics.

Do not create a backend cosmetics subsystem in this task.

---

## Code quality

Use strict TypeScript.

Avoid:

- `any`;
- `@ts-ignore`;
- unsafe casts without real justification;
- duplicated business rules;
- duplicated XP curve;
- duplicated realtime command logic;
- hidden authoritative assumptions in UI.

Avoid large unrelated refactors.

Keep blast radius outside Mini App minimal.

Remove obsolete prototype code only after the replacement is actually wired and used.

Do not leave old and new navigation/rendering architectures running in parallel without a concrete reason.

---

## Testing

Add/update tests where the change carries logic risk.

Especially cover:

- authoritative level-progress boundary helper;
- match-attributed XP persistence/result readback;
- Ranked rating result is not client-recomputed;
- Profile XP progress contract;
- navigation/setup pure helpers where extracted;
- Game Screen state/layout helpers where pure;
- reconnect/control-lost presentation logic where testable without adding a heavy UI testing framework.

Do not add a large React testing stack solely for this task if one does not already exist.

Use the existing Vitest/Playwright facilities.

---

## Required final verification

Before finishing, run and fix all applicable repository checks:

- `pnpm lint`
- format the code, then `pnpm format:check`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm test:e2e` if the current environment supports the Playwright requirements; otherwise explicitly report the infrastructure reason it could not run.

Also verify from the implemented code that:

- Mini App has no TypeScript errors;
- server/protocol tests pass after contract additions;
- Home implements direct accepted setup flow;
- Rankings / Profile / History / Learn / Settings / Admin match accepted IA;
- Public Profile is a sheet;
- matchmaking/challenge flows are focused and hide bottom nav;
- Game Screen has no document scroll/pan;
- board geometry remains stable across phases;
- Roll/draft/Undo/Confirm is preserved;
- dice remain server-authoritative;
- reconnect/control-lost is preserved;
- surrender is preserved;
- reactions are preserved;
- result progression uses authoritative result data;
- Profile does not duplicate the XP curve;
- Liquid Glass has a usable non-blur fallback;
- `prefers-reduced-motion` is respected;
- meaningful touch targets are approximately 44px or larger;
- RU/EN layouts remain usable;
- direct browser visit still gets the landing/Open in Telegram flow;
- no Store/Social/AI/replay or other out-of-scope systems were added.

Do not claim the following manual production acceptance items as completed locally:

- real Android Telegram ↔ iPhone Telegram E2E;
- full natural bearing-off victory in Long Nardy;
- full natural bearing-off victory in Classic Backgammon;
- real Liquid Glass/performance verification across multiple Telegram WebView devices.

Report these as manual follow-up rather than implementation failure.

---

## One-pass execution rule

This task is a full implementation pass.

Do not finish with only:

- an architecture plan;
- a TODO list;
- partially created components;
- a proposal for a future implementation pass.

Within the available task execution, complete the accepted feature set as close to production-ready as the repository permits.

If the accepted UX exposes a small mismatch with the real backend contract, solve it with the smallest production-safe blast radius.

Allowed backend changes are only concrete small contract/persistence additions necessary for the already accepted UX, especially progression/result data.

Do not initiate:

- backend rewrite;
- protocol v2;
- speculative infrastructure changes.

Preserve backward compatibility where practical.

If polish competes with correctness, use this order:

```text
gameplay correctness
→ contract correctness
→ Game Screen geometry
→ core flows
→ responsive behavior
→ visual polish
```

---

## Expected final report

At completion, provide a concise engineering report containing:

- what was implemented;
- major files/modules changed;
- minimal backend/protocol contract additions and why they were required;
- migrations added, if any;
- tests added/updated;
- results of `lint`, `format:check`, `typecheck`, `test`, `build`, `test:e2e`;
- items that remain only for manual Telegram/device acceptance.

Explicitly list any deliberate deviations from `docs/product/21–37`.

If there are no known deliberate deviations, say so.

Most importantly: inspect the existing implementation first, then implement the task fully. Do not redesign UX decisions that have already been accepted.