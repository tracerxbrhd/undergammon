# Question 3 — Bot, Mini App and match setup UX

Status: accepted product decision; current Season 0 implementation reflects the PvP flows below, while AI remains deferred.

## Product boundary

UNDERGAMMON uses a thin Telegram Bot + rich Telegram Mini App model.

The bot is not a second full UI for the product. It exists primarily as:

- the entry point into UNDERGAMMON;
- the launcher for the Mini App;
- the social/share layer for friend challenges;
- the notification and recovery channel for active or pending matches.

Profile, rating, history, rewards, Store/Cosmetics, settings and the game itself belong primarily to the Mini App.

## First launch

The bot should keep `/start` intentionally short and game-first. The preferred surface is a concise introduction plus a primary action that opens the Mini App. Friend challenge entry may also be exposed from the bot, but the bot must not duplicate the Mini App with a large command tree such as `/profile`, `/rating`, `/history`, etc.

Telegram Main Mini App / menu-button launch should be used when configured so returning users can open UNDERGAMMON with minimal friction.

## Main Mini App setup screen

The main game entry screen behaves like a compact match setup surface rather than a nested menu tree.

### Ruleset selector

The user chooses between:

- Long Nardy;
- Backgammon.

The ruleset is presented as a dropdown/select control.

The last selected ruleset should be persisted for the user so returning users do not have to reselect their usual game every time.

The rating displayed in the UI is ruleset-specific. Switching from Long Nardy to Backgammon also switches the rating context shown to the player.

### Competitive mode selector

The user chooses between:

- Casual;
- Ranked.

This should use a prominent segmented control / paired-button UI rather than another dropdown.

The selected state must be visually explicit. Gesture/swipe interaction may be added as convenience but must never be the only way to switch modes.

Ranked state should be treated more carefully than the ruleset preference; persistence is optional and should not create accidental ranked queue entry.

### Opponent selector

For the current Season 0 implementation, Casual supports:

- Friend;
- Find Player.

Ranked supports only server matchmaking:

- Find Player.

Ranked games with a specifically selected friend are forbidden to reduce boosting/rating-transfer abuse.

AI/Bot opponent mode is intentionally deferred. If implemented later, AI games remain unranked and must not be exposed as a selectable current option before the mode is functional.

## Rating visibility

Rating is part of the player's persistent identity and UI, not merely a control used inside Ranked mode.

A player's relevant ruleset rating may be displayed in casual/private matches and profile surfaces even though the result of those matches does not change rating.

Example:

```text
Zakhar
1542 • Long Nardy

vs

Opponent
1478 • Long Nardy
```

A private match remains explicitly non-rated even when both players' ratings are visible.

## Primary action

The main action changes according to the selected opponent flow.

### Matchmaking

For `Find Player`:

```text
[ INTO BATTLE ]
```

Working label only; final copy will be decided later.

Pressing it starts casual or ranked matchmaking according to the selected competitive mode.

### Future AI/Bot mode

AI is not part of the current Season 0 selectable opponent flow. If the deferred mode is implemented later, its primary action may start an AI match immediately, but that future design does not imply a current implementation.

### Friend

For `Friend`, the primary action changes semantically:

```text
[ INVITE FRIEND ]
```

The friend flow does not pretend that the match has started before another player accepts the challenge.

## Friend challenge UX

Canonical private-play flow:

1. User selects Casual mode.
2. User selects the ruleset.
3. User selects Friend.
4. User presses `Invite Friend`.
5. UNDERGAMMON creates a short-lived challenge, not a full authoritative match.
6. Telegram opens a native chat-selection/share flow where possible.
7. The user selects a friend/chat and sends a prepared UNDERGAMMON challenge message.
8. The recipient receives a challenge card with an action to accept/open UNDERGAMMON.
9. The action opens the Mini App with challenge context via Telegram start/deep-link data.
10. The authoritative match/lobby is created only when the challenge is accepted.
11. The challenger sees a waiting state until acceptance, cancellation or expiration.

Challenges should expire and should not create durable abandoned matches simply because an invitation was generated.

The first valid acceptance consumes the challenge atomically. Further attempts receive an explicit already-accepted/expired state.

For MVP, a challenge does not need to be cryptographically bound to one preselected Telegram user. It may be shareable, with the first valid recipient to accept becoming the opponent. Targeted challenges may be added later if product requirements justify them.

## Telegram implementation feasibility

The chosen UX maps to supported Telegram capabilities:

- Main Mini Apps and Mini App launch buttons provide the primary application entry point.
- Direct Mini App links support a `startapp` parameter that can carry challenge context into the Mini App.
- Mini Apps / bot inline flows can ask the user to choose a target chat and continue through inline mode.
- Telegram supports prepared inline messages that can be shown to the user and sent to a selected destination chat.

The exact share mechanism should be selected during implementation based on the cleanest supported Bot API / Mini App API flow at that time, but the product requirement remains: no manual room codes and no requirement to copy/paste opaque identifiers.

## Non-goals

The following are deliberately not part of this product decision:

- ranked play with a chosen friend;
- ranked AI matches;
- large command-based bot UI duplicating the Mini App;
- manual lobby codes as the canonical friend flow;
- creating durable matches before another player accepts a challenge.

## Product principle

The current setup flow should feel like configuring one immediate PvP game, not navigating through an application hierarchy:

```text
Mode       [ Casual | Ranked ]
Ruleset    [ Long Nardy ▼ ]
Opponent   [ Friend | Find Player ]

            [ Primary action ]
```

Invalid combinations must be disabled or removed from the UI rather than accepted and rejected after submission.
