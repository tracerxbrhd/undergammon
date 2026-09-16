# Economy and Cosmetics

## Status

Accepted product decisions from interview question 10. The Season 0 soft-currency economy, Daily Reward and the multi-slot Profile Frame / Checker Set / Dice Skin / Board Theme Store and equipment vertical slices are implemented; broader cosmetic catalogs and Reaction Packs remain expansion scope.

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

The implemented economy/cosmetics chain is:

`Daily Reward / ranked Coins -> Store -> permanent ownership -> equipment -> presentation`

Current content/contracts are intentionally narrow:

- functional cosmetic slots: `PROFILE_FRAME`, `CHECKER_SET`, `DICE_SKIN` and `BOARD_THEME`;
- non-purchasable `Default` variants for every implemented slot;
- Season 0 Tester Profile Frame, granted server-side for Season 0 participation;
- Bronze Profile Frame, purchasable for 150 Coins;
- Marble Checker Set, purchasable for 200 Coins;
- Obsidian Dice, purchasable for 250 Coins;
- Midnight Board, purchasable for 300 Coins;
- Store purchase does not auto-equip;
- equipment is validated against backend ownership and slot compatibility;
- Store ownership, purchase ledger references and equipment use `(slot, cosmeticId)` identity;
- equipped Profile Frames, Checker Sets, Dice Skins and Board Themes are exposed through trusted account/match contracts and resolved by owner identity.

Reaction Packs and a large cosmetic catalog remain future expansion work. The Board Scene presentation boundaries are intentionally owner-aware so future cosmetics do not require gameplay or geometry changes.

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

Profile Frame, Checker Set, Dice Skin and Board Theme are functional ownership/equipment slots. Each has an explicit `Default` fallback; the current non-default catalog remains deliberately small.

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

Match presentation combines owner-scoped cosmetics from both participants instead of treating cosmetics as a fully local-only skin. Profile Frames, Checker Sets, Dice Skins and Board Themes resolve from trusted equipment captured by authoritative account/match contracts.

### Board themes

Board Theme composition is implemented as an owner-aware hybrid rather than one global skin:

- Each player's board-owned physical region uses that player's equipped Board Theme.
- Region ownership is derived from authoritative seat/physical-board identity and then mapped through the current viewer perspective.
- The client must not hard-code `top = opponent`, `bottom = player`, or any other screen-coordinate shortcut that can become wrong after perspective rotation.
- Board themes are composable application-controlled presentations so two different themes can coexist in one match.
- The shared center remains deterministic and application-controlled rather than being claimed by either participant's theme.
- `Default` is the fallback when a player has no custom board equipped or when loading a legacy snapshot without `boardTheme`.
- A player's missing cosmetic must not cause the opponent's cosmetic to overwrite that player's region.
- Midnight Board is the first non-default implementation and changes presentation only.
- Board Themes must never alter point geometry, hitboxes, move targeting, board coordinates or game-engine state.
- Arbitrary runtime CSS, remote theme code and untrusted style injection are not allowed; trusted theme IDs resolve to application-owned presentation classes/tokens.

Conceptually:

```text
Owner A region -> owner A Board Theme
Shared center  -> neutral / deterministic composition
Owner B region -> owner B Board Theme
```

Do not model a Board Theme as one global `board-theme-*` class for the whole match.

### Checker sets

- Each player's checkers use that player's equipped Checker Set.
- If no custom set is equipped, that player's checkers use `Default`.

### Dice skins

- Dice Skin presentation follows authoritative dice ownership rather than fixed screen position.
- During the opening roll, the first die belongs to seat A and the second die belongs to seat B, so each die uses that player's equipped Dice Skin.
- During normal turns, both visible dice belong to the authoritative `activePlayer` and therefore both use that player's equipped Dice Skin.
- `Default` is used when the relevant die owner has no custom Dice Skin.
- Obsidian Dice is the first non-default implementation and changes presentation only.
- Every Dice Skin must preserve excellent pip/value readability. Cosmetic rarity can never reduce gameplay clarity.
- Dice Skin selection never changes authoritative roll generation, rolled values, move legality or any game-engine state.

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

The implemented Store is a simple persistent server-owned catalog. Current purchasable products are:

- Bronze Profile Frame for 150 Coins;
- Marble Checker Set for 200 Coins;
- Obsidian Dice for 250 Coins;
- Midnight Board for 300 Coins.

Store principles remain:

- no daily item rotation;
- no countdown-based FOMO;
- no personalized offers;
- no artificial scarcity for ordinary catalog items;
- owned items are clearly marked;
- purchases are authoritative and atomic;
- purchased items are equipped separately from the player's Cosmetics collection;
- exclusive seasonal/event cosmetics may show their acquisition source rather than a Coin price.

The current Store groups implemented content into Profile Frames, Checker Sets, Dice Skins and Board Themes. Reactions must not be documented as completed Store content before they exist.

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
