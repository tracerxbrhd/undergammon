# UNDERGAMMON — Product Foundation

Status: accepted discovery decisions for interview questions 1–2. Later product decisions supersede the original AI-first-release assumption: current Season 0 is PvP-first and AI is intentionally deferred. Later documents also define the concrete rating/economy policies now used by the implementation.

## 1. Product identity and success criteria

UNDERGAMMON is a full-featured backgammon game inside Telegram rather than a reduced bot game. Telegram is the primary platform and should minimize friction between wanting to play and starting a match.

Core value proposition:

- no separate registration flow; Telegram identity is used as the first sign-in method while the product still owns an internal Game Account;
- starting a game with a friend should require no room codes or manual lobby setup;
- the canonical private-play flow is: open UNDERGAMMON -> choose "Play with a friend" -> choose/send the challenge through Telegram -> the recipient opens a direct Mini App link -> the game opens in the correct challenge context;
- the Telegram Bot is the launcher/social layer; the Telegram Mini App is the primary interactive game client;
- group/inline challenges through `@UndergammonBot` are a desirable later extension, but not the canonical MVP flow;
- the Mini App must look and feel like a polished game, not a technical web page embedded in Telegram.

Primary gameplay pillars from discovery:

1. Private games with friends.
2. Competitive PvP matchmaking with player ratings.
3. Single-player against AI as a deferred expansion rather than current Season 0 scope.
4. Tournaments are a post-MVP competitive extension, not an MVP requirement.

The original public-release acceptance criteria were:

- a real match works reliably between Telegram on Android and Telegram on iPhone, including synchronization and reconnect;
- the primary stakeholder who originally requested the product considers it convenient and useful for real play;
- the visual presentation is attractive and feels finished;
- the principal gameplay flows work reliably without critical defects;
- monetization is not a release gate for the first version.

Season 0 has since been deployed and real Telegram PvP has been exercised in production. Broader device/player coverage remains useful; see `IMPLEMENTATION_STATUS.md` for current status rather than treating this discovery document as a release checklist.

Product priority: gameplay quality and UX come before early monetization.

## 2. Canonical rulesets and match format

UNDERGAMMON supports exactly two first-class rulesets initially:

- `LONG_NARDY` — classic Long Nardy;
- `BACKGAMMON` — classic short backgammon / international Backgammon.

The project must not invent simplified house rules merely to make implementation or UI easier. Canonical game rules must be researched, documented, versioned and implemented faithfully. UX should explain complex mechanics contextually rather than deleting them.

Rulesets and match modes are separate concepts. Ranked and casual play do not use different game rules.

Current Season 0 playable modes:

- casual PvP;
- ranked PvP;
- private PvP.

AI remains a separately documented deferred mode.

The preferred Telegram product format is intentionally fast:

- one game is one match/result;
- ranked play does not require a multi-game match-to-N-points flow in the initial product;
- Long Nardy and Backgammon both use this quick single-game session model;
- canonical mechanics belonging to the individual game itself must remain intact rather than being removed for convenience.

## Rating

Ratings are independent per ruleset. Skill in Long Nardy and Backgammon must not be collapsed into one MMR.

Rating changes are skill-based and depend on the relative rating/strength of both players and the result. A win against a stronger opponent should generally award more rating than a win against a weaker opponent, and a loss against a weaker opponent should generally cost more.

Win streaks must never directly multiply or add rating gains. Rating is intended to measure competitive strength, not progression rewards.

The discovery phase intentionally left the algorithm open. `05-matchmaking-rating-seasons.md` and the current server policy define the concrete Season 0 behavior.

## Win streak progression

Competitive win streaks are a separate progression system from MMR.

Current direction:

- ranked PvP wins may advance a competitive win streak;
- AI matches must not farm the competitive streak if AI is introduced later;
- defeat resets the current streak;
- milestone streaks such as 3, 5 and 10 wins may grant guaranteed progression/economy rewards;
- streak rewards do not modify the rating formula.

Reward chests are not intended to be gambling-style loot boxes. Rewards should be deterministic or otherwise clearly guaranteed/understandable to the player. Random paid loot boxes are not part of the product direction.

## Internal currency and future monetization

UNDERGAMMON uses Coins as its internal soft currency, earned through current Season 0 progression/reward flows and spendable on curated permanent cosmetics in the Store.

Hard product rule: purchasable or earnable progression must not provide gameplay advantages in competitive matches.

Real-money monetization remains deferred. There is no paid currency or Telegram Stars integration in Season 0; see `10-economy-and-cosmetics.md` for the current economy contract.

## Architectural consequences already accepted

- Telegram user ID must not be the authoritative domain user ID.
- Each player receives an internal Game Account ID; Telegram is an identity attached to that account.
- Private invitations should be modeled as expiring challenges rather than creating a full match immediately when the sender starts the share flow.
- A match/lobby is created when the challenge is accepted.
- The backend must atomically prevent the same challenge from being accepted multiple times.
- Online gameplay remains server-authoritative: clients never decide authoritative dice, winner, rating or match state.
- Android-to-iPhone real-device interoperability remains an important Telegram Mini App quality target.

## Deferred / later-decision topics from discovery

The original discovery phase deferred detailed decisions about bot/Mini App navigation, timers, profiles/leaderboards, rating, rewards/economy, notifications, AI, history, moderation, localization, infrastructure and tournaments. Those topics now have dedicated product/architecture documents.

Do not use this section as a statement that those systems are absent. Current implementation state is documented in `IMPLEMENTATION_STATUS.md`.
