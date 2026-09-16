# Economy and Cosmetics

## Status

Accepted product decisions from interview question 10. The Season 0 soft-currency economy, Daily Reward and the multi-slot Profile Frame / Checker Set Store/equipment vertical slice are now implemented; broader cosmetic categories remain expansion scope.

## Currency

- UNDERGAMMON uses one internal soft currency: `Coins`.
- Do not introduce premium gems, season tokens, or other parallel currencies for the initial product.
- Coins must never provide gameplay advantage.
- Coins and cosmetics are outside the authoritative rules of Long Nardy and Backgammon.
- Coin balance changes are server-authoritative and recorded through the append-only Coin ledger.

## Season 0 / Testing Period

- During Season 0, real-money purchases are disabled.
- There is no Telegram Stars integration or paid currency.
- Players earn Coins through the implemented reward rules and can spend Coins on curated permanent cosmetics in the Store.
- Season 0 remains the period for measuring earning rates, purchase rates, play frequency and inflation before any monetization decision.

## Current Season 0 implementation

The implemented Update 1 vertical slice is:

`Daily Reward / ranked Coins -> Store -> permanent ownership -> equipment -> presentation`

Current content/contracts are intentionally narrow:

- functional cosmetic slots: `PROFILE_FRAME` and `CHECKER_SET`;
- `DICE_SKIN` is reserved in the application contract for the next cosmetic expansion but has only `Default` content;
- non-purchasable `Default` Profile Frame and `Default` Checker Set;
- Season 0 Tester Profile Frame, granted server-side for Season 0 participation;
- Bronze Profile Frame, purchasable for 150 Coins;
- Marble Checker Set, purchasable for 200 Coins;
- Store purchase does not auto-equip;
- equipment is validated against backend ownership and slot compatibility;
- Store ownership, purchase ledger references and equipment use `(slot, cosmeticId)` identity;
- equipped Profile Frames and Checker Sets are exposed through trusted account/match contracts and resolved by owner identity.

Board Themes, non-default Dice Skins, Reaction Packs and a large cosmetic catalog remain future expansion work. The Board Scene already has presentation boundaries for these future slots without requiring gameplay or geometry changes.

## Future Telegram Monetization

- Telegram Stars may be considered after Season 0.
- Preferred direction remains `Stars -> Coins -> cosmetics`, keeping one internal pricing currency if monetization is introduced.
- This is not a Season 0 requirement and must not be implemented until the soft-currency economy has been evaluated.
- No paid gameplay advantages, rerolls, improved dice, hints in Ranked, rating boosts, or other pay-to-win mechanics.

## Reward Sources

Implemented repeatable Coin sources:

- Ranked PvP victories;
- competitive win-streak milestones;
- Daily Reward claims.

Future/optional sources may include:

- seasonal placement rewards;
- achievements and events.

The following modes do not award Coins by default:

- AI matches if AI is implemented later;
- Casual matchmaking;
- Private/friend matches.

This prevents trivial farming through bots or coordinated private games.

## Chests

Chests remain a product-design concept rather than required current content.

- Chests are a presentation layer for rewards, not a paid loot-box system.
- Initial chests, if introduced, contain predetermined or otherwise explicitly transparent rewards.
- Chests are not purchasable random gambling containers.
- This can be revisited only as a separate future product decision.

## Daily Rewards

The implemented Daily Reward uses a 7-day progressive Coin cycle:

```text
Day 1 -> 5 Coins
Day 2 -> 5 Coins
Day 3 -> 10 Coins
Day 4 -> 10 Coins
Day 5 -> 15 Coins
Day 6 -> 20 Coins
Day 7 -> 35 Coins
```

Current rules:

- a player explicitly claims the reward;
- only one reward can be claimed per Game Account per UTC calendar day;
- progress advances through the seven-day cycle and wraps after Day 7;
- missing a day does not reset cycle progress;
- missed rewards are not granted retroactively;
- claim insertion and Coin crediting are server-authoritative and transactional.

## Cosmetic Ownership

Cosmetics are permanently owned once acquired.

Accepted cosmetic categories include:

- Board Theme;
- Checker Set;
- Dice Skin;
- Profile Frame;
- Reaction Pack;
- future visual effects where appropriate.

Profile Frame and Checker Set are functional ownership/equipment slots. Dice Skin is reserved in the current application contract with `Default` as its only accepted content until its dedicated expansion.

Product rules:

- no rentals;
- no durability;
- no marketplace;
- no player-to-player trading;
- no duplicate ownership of the same cosmetic.

If a future reward would grant an already-owned item, the reward system must prevent the duplicate or apply a separately accepted substitution policy.

## Cosmetic Slots

Each implemented cosmetic category is equipped independently.

Buying or receiving a cosmetic does not auto-equip it. The item is added to the player's collection and can then be selected. `Default` remains a valid explicit fallback.

## Hybrid Match Presentation

Match presentation combines owner-scoped cosmetics from both participants instead of treating cosmetics as a fully local-only skin. Profile Frames and Checker Sets resolve from trusted equipment; Board Theme and Dice Skin presentation still use `Default` until their dedicated expansions.

### Board themes

- Each player's board-owned region uses that player's equipped Board Theme.
- Board themes must be designed as composable assets so two different themes can coexist in one match.
- Shared or neutral board elements use a deterministic compatible presentation.
- `Default` is the fallback when a player has no custom board equipped.
- A player's missing cosmetic must not cause the opponent's cosmetic to overwrite that player's identity.

Conceptually:

```text
Opponent-owned region -> opponent Board Theme
Shared center          -> neutral / deterministic composition
Player-owned region   -> player Board Theme
```

Do not model a future Board Theme as one global `board-theme-*` class for the whole match.

### Checker sets

- Each player's checkers use that player's equipped Checker Set.
- If no custom set is equipped, that player's checkers use `Default`.

### Dice skins

- The visible dice pair combines both players' presentation slots: one die represents the local player's Dice Skin and the other the opponent's Dice Skin.
- `Default` is used when a participant has no custom Dice Skin.
- Every Dice Skin must preserve excellent pip/value readability. Cosmetic rarity can never reduce gameplay clarity.

### Profile cosmetics and reactions

- Profile Frame belongs to its owner identity surface, while Checker Set belongs to the owner's physical checkers in a match.
- Future avatar/reaction cosmetics remain personalized to their owner and visible to the opponent only where the product contract permits.

## Cosmetic Loading

- Do not add a separate pre-match cosmetic preview screen.
- Match cosmetics are resolved and rendered automatically while the game scene loads.
- Match start must stay fast and must not require an additional confirmation step.
- Missing/unsupported presentation falls back safely to `Default`.

## Rarity and Exclusivity

Cosmetics may have a visual/economic rarity classification such as Common, Rare, Epic or Legendary. Rarity has no gameplay properties.

Some cosmetics may have exclusive acquisition sources, for example:

- Season 0 Tester Frame;
- Season N placement rewards;
- Top 100 seasonal cosmetics;
- anniversary/event cosmetics.

Exclusive cosmetics do not need to appear in the regular Store and may remain unavailable after their source event ends.

## Store

The implemented Store is a simple persistent server-owned catalog. Current purchasable products are the Bronze Profile Frame for 150 Coins and Marble Checker Set for 200 Coins.

Store principles remain:

- no daily item rotation;
- no countdown-based FOMO;
- no personalized offers;
- no artificial scarcity for ordinary catalog items;
- owned items are clearly marked;
- purchases are authoritative and atomic;
- purchased items are equipped separately from the player's Cosmetics collection;
- exclusive seasonal/event cosmetics may show their acquisition source rather than a Coin price.

The current Store groups implemented content into Profile Frames and Checker Sets. Boards, non-default Dice Skins and Reactions must not be documented as completed Store content before they exist.

## Balancing

Season 0 policy values are now concrete code, not merely placeholders. Current reward and price constants must be changed through normal reviewed application changes rather than duplicated into client-authoritative logic.

Telemetry and tester feedback may still justify tuning. The balancing goal remains to avoid both:

- excessive inflation where cosmetics become trivial to acquire;
- excessive grind where normal players cannot reasonably obtain cosmetic rewards.

## Non-goals

The current economy does not include:

- pay-to-win;
- paid random loot boxes;
- multiple premium currencies;
- AI farming;
- private-match farming;
- marketplace/trading;
- rentals;
- cosmetic durability;
- Store rotation/FOMO;
- real-money purchases during Season 0.
