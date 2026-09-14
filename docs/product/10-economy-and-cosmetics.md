# Economy and Cosmetics

## Status

Accepted product decisions from interview question 10.

## Currency

- UNDERGAMMON uses one internal soft currency: `Coins`.
- Do not introduce premium gems, season tokens, or other parallel currencies for the initial product.
- Coins must never provide gameplay advantage.
- Coins and cosmetics are outside the authoritative rules of Long Nardy and Backgammon.

## Season 0 / Testing Period

- During Season 0, real-money purchases are disabled.
- Players can earn and spend Coins on cosmetics.
- Economy constants such as prices and reward amounts are intentionally not fixed before telemetry exists.
- Season 0 is used to measure earning rates, purchase rates, play frequency, and inflation before monetization is enabled.

## Future Telegram Monetization

- Telegram Stars can be introduced after Season 0.
- Preferred direction is `Stars -> Coins -> cosmetics`, keeping one internal pricing currency.
- This is not an MVP requirement and should not be implemented until the soft-currency economy has been tested.
- No paid gameplay advantages, rerolls, improved dice, hints in Ranked, rating boosts, or other pay-to-win mechanics.

## Reward Sources

Primary repeatable Coin sources:

- Ranked PvP victories;
- competitive win-streak milestones;
- seasonal placement rewards;
- daily login rewards;
- future achievements and events.

The following modes do not award Coins by default:

- AI matches;
- Casual matchmaking;
- Private/friend matches.

This prevents trivial farming through bots or coordinated private games.

## Chests

- Chests are a presentation layer for rewards, not a paid loot-box system.
- Initial chests contain predetermined or otherwise explicitly transparent rewards.
- Chests are not purchasable random gambling containers.
- Example use: a win-streak milestone awards a chest containing a known amount of Coins or another known reward.
- This can be revisited only as a separate future product decision.

## Daily Rewards

Use a 7-day progressive reward cycle.

- Day 1 starts with a small reward.
- Rewards increase through the cycle.
- Day 7 provides a large reward or chest.
- After Day 7 the cycle starts again.
- A player must explicitly claim the daily reward.
- Only one reward can be claimed per Game Account per eligible calendar day.
- Missing a day does not reset progress.
- Missed rewards are not granted retroactively.

Example:

```text
Day 1 -> reward
Day 2 -> larger reward
...
Day 7 -> major reward / chest
```

## Cosmetic Ownership

Cosmetics are permanently owned once acquired.

Initial cosmetic categories:

- Board Theme;
- Checker Set;
- Dice Skin;
- Profile Frame;
- Reaction Pack;
- future visual effects where appropriate.

Initial product rules:

- no rentals;
- no durability;
- no marketplace;
- no player-to-player trading;
- no duplicate ownership of the same cosmetic.

If a reward would grant an already-owned item, the reward system must prevent the duplicate or substitute an appropriate alternative such as Coins.

## Cosmetic Slots

Each cosmetic category is independently equipped.

Buying or receiving a cosmetic does not need to auto-equip it. The item is added to the player's collection and can then be selected.

## Hybrid Match Presentation

A match visually combines cosmetics from both participants instead of rendering a fully local-only skin.

### Board themes

- Each player's side of the board uses that player's equipped Board Theme.
- Board themes must be designed as composable assets so two different themes can coexist in one match.
- Shared or neutral board elements should use a deterministic compatible presentation.
- `Default` is a valid full theme and acts as the fallback when a player has no custom board equipped.
- A player's missing cosmetic must not cause the opponent's cosmetic to overwrite that player's identity.

Conceptually:

```text
Opponent side -> opponent Board Theme
Shared center  -> neutral / deterministic composition
Player side   -> player Board Theme
```

### Checker sets

- Each player's checkers use that player's equipped Checker Set.
- If no custom set is equipped, that player's checkers use `Default`.

### Dice skins

- The visible dice pair combines both players' cosmetics: one die represents the local player's Dice Skin and the other represents the opponent's Dice Skin.
- `Default` is used when a participant has no custom Dice Skin.
- Every Dice Skin must preserve excellent pip/value readability. Cosmetic rarity can never reduce gameplay clarity.

### Profile cosmetics and reactions

- Profile Frame, avatar, and reaction cosmetics remain personalized to their owner and are visible to the opponent where applicable.

## Cosmetic Loading

- Do not add a separate pre-match cosmetic preview screen.
- Hybrid cosmetics are resolved and rendered automatically while the game scene loads.
- Match start must stay fast and must not require an additional confirmation step.

## Rarity and Exclusivity

Cosmetics may have a visual/economic rarity classification such as:

- Common;
- Rare;
- Epic;
- Legendary.

Rarity has no gameplay properties.

Some cosmetics may have exclusive acquisition sources, for example:

- Season 0 Tester Frame;
- Season N placement rewards;
- Top 100 seasonal cosmetics;
- anniversary/event cosmetics.

Exclusive cosmetics do not need to appear in the regular store and may remain permanently unavailable after their source event ends.

## Store

The first store is a simple persistent catalog grouped by cosmetic category.

Example sections:

```text
Boards
Checkers
Dice
Frames
Reactions
```

Store principles for the initial release:

- no daily item rotation;
- no countdown-based FOMO;
- no personalized offers;
- no artificial scarcity for ordinary catalog items;
- owned items are clearly marked;
- purchased items can be equipped from the player's collection;
- exclusive seasonal/event cosmetics show their acquisition source instead of a Coin price.

Rotating stores or other advanced merchandising can be considered only after the cosmetic catalog is large enough to justify them.

## Balancing

Exact Coin amounts, item prices, win rewards, streak rewards, daily rewards, and seasonal payouts are not fixed yet.

They should be tuned during Season 0 using real telemetry. The goal is to avoid both:

- excessive inflation where cosmetics become trivial to acquire;
- excessive grind where normal players cannot reasonably obtain cosmetic rewards.

## Non-goals

The initial economy does not include:

- pay-to-win;
- paid random loot boxes;
- multiple premium currencies;
- AI farming;
- private-match farming;
- marketplace/trading;
- rentals;
- cosmetic durability;
- store rotation/FOMO;
- real-money purchases during Season 0.
