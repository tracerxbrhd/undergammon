# UNDERGAMMON — Product Foundation

Status: accepted discovery decisions for interview questions 1–2.

## 1. Product identity and success criteria

UNDERGAMMON is a full-featured backgammon game inside Telegram rather than a reduced bot game. Telegram is the primary platform and should minimize friction between wanting to play and starting a match.

Core value proposition:

- no separate registration flow; Telegram identity is used as the first sign-in method while the product still owns an internal Game Account;
- starting a game with a friend should require no room codes or manual lobby setup;
- the canonical private-play flow is: open UNDERGAMMON -> choose "Play with a friend" -> choose/send the challenge through Telegram -> the recipient opens a direct Mini App link -> the game opens in the correct challenge context;
- the Telegram Bot is the launcher/social layer; the Telegram Mini App is the primary interactive game client;
- group/inline challenges through `@UndergammonBot` are a desirable later extension, but not the canonical MVP flow;
- the Mini App must look and feel like a polished game, not a technical web page embedded in Telegram.

Primary gameplay pillars:

1. Single-player against AI.
2. Private games with friends.
3. Competitive PvP matchmaking with player ratings.
4. Tournaments are a post-MVP competitive extension, not an MVP requirement.

The product is considered ready for a first public release when:

- a real match works reliably between Telegram on Android and Telegram on iPhone, including synchronization and reconnect;
- the primary stakeholder who originally requested the product considers it convenient and useful for real play;
- the visual presentation is attractive and feels finished;
- the principal gameplay flows work reliably without critical defects;
- monetization is not a release gate for the first version.

Product priority: gameplay quality and UX come before early monetization.

## 2. Canonical rulesets and match format

UNDERGAMMON supports exactly two first-class rulesets initially:

- `LONG_NARDY` — classic Long Nardy;
- `BACKGAMMON` — classic short backgammon / international Backgammon.

The project must not invent simplified house rules merely to make implementation or UI easier. Canonical game rules must be researched, documented, versioned and implemented faithfully. UX should explain complex mechanics contextually rather than deleting them.

Rulesets and match modes are separate concepts. Ranked and casual play do not use different game rules.

Initial modes:

- AI;
- casual PvP;
- ranked PvP;
- private PvP.

The preferred Telegram product format is intentionally fast:

- one game is one match/result;
- ranked play does not require a multi-game match-to-N-points flow in the initial product;
- Long Nardy and Backgammon both use this quick single-game session model;
- canonical mechanics belonging to the individual game itself must remain intact rather than being removed for convenience.

## Rating

Ratings are independent per ruleset. Skill in Long Nardy and Backgammon must not be collapsed into one MMR.

Rating changes are skill-based and depend on the relative rating/strength of both players and the result. A win against a stronger opponent should generally award more rating than a win against a weaker opponent, and a loss against a weaker opponent should generally cost more.

Win streaks must never directly multiply or add rating gains. Rating is intended to measure competitive strength, not progression rewards.

The exact rating algorithm is intentionally not selected yet; Elo/Glicko-like approaches will be evaluated later.

## Win streak progression

Competitive win streaks are a separate progression system from MMR.

Current direction:

- ranked PvP wins may advance a competitive win streak;
- AI matches must not farm the competitive streak;
- defeat resets the current streak;
- milestone streaks such as 3, 5 and 10 wins may grant guaranteed chests and/or internal currency;
- streak rewards do not modify the rating formula.

Reward chests are not intended to be gambling-style loot boxes. Rewards should be deterministic or otherwise clearly guaranteed/understandable to the player. Random paid loot boxes are not part of the product direction.

## Internal currency and future monetization

UNDERGAMMON may introduce an internal soft currency (for example, coins) earned through gameplay and progression. Potential future uses include cosmetic boards, checkers, dice, profile presentation and other non-competitive customization.

Hard product rule: purchasable or earnable progression must not provide gameplay advantages in competitive matches.

Monetization is deliberately deferred from the first release gate. Its detailed model will be designed in the dedicated monetization discovery block, with Telegram-native payment constraints considered at that time.

## Architectural consequences already accepted

- Telegram user ID must not be the authoritative domain user ID.
- Each player receives an internal Game Account ID; Telegram is an identity attached to that account.
- Private invitations should be modeled as expiring challenges rather than creating a full match immediately when the sender starts the share flow.
- A match/lobby is created when the challenge is accepted.
- The backend must atomically prevent the same challenge from being accepted multiple times.
- Online gameplay remains server-authoritative: clients never decide authoritative dice, winner, rating or match state.
- Android-to-iPhone real-device interoperability is a release acceptance criterion for the Telegram Mini App.

## Deferred decisions

The following are intentionally unresolved and will be addressed in later interview blocks:

- detailed bot vs Mini App navigation;
- timers and disconnect policy;
- social profiles and leaderboards;
- exact rating algorithm;
- exact streak reward economy;
- shop/cosmetic catalog and Telegram Stars monetization;
- notifications;
- AI strength/difficulties;
- replay/history retention;
- moderation/admin tooling;
- localization;
- infrastructure and deployment;
- tournaments.
