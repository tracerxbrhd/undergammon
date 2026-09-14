# Matchmaking, Rating, Seasons and Leaderboards

## Scope

This document captures product decisions for ranked matchmaking, rating calibration, seasonal resets, leaderboards, and seasonal rewards.

The competitive system is intentionally simple at launch: numerical ratings, separate ladders per ruleset, server-controlled matchmaking, and no rank/league cosmetics yet.

## Rating is separate per ruleset

UNDERGAMMON maintains independent competitive ratings for:

- Long Nardy
- Classic Backgammon

Skill in one ruleset must not affect the rating or calibration state of the other.

A player may therefore be fully rated in Long Nardy while still being uncalibrated in Backgammon.

## Initial rating and first-time calibration

Each ruleset starts from a baseline rating of `1000`.

A new player must complete `10` Ranked PvP matches in that ruleset before the initial calibration period is considered complete.

During calibration:

- the internal rating changes from the first ranked match;
- matchmaking uses the current internal estimate rather than pretending the player is permanently at 1000;
- the player-facing value is shown as preliminary, for example `≈ 1270`;
- rating may move substantially faster than after calibration because uncertainty is high;
- only Ranked PvP matchmaking counts toward calibration;
- AI, casual matchmaking, and private friend matches do not affect calibration.

After the tenth ranked match, the calibration state is removed and the rating is displayed as a normal established rating.

The exact rating algorithm is intentionally not fixed yet. It must support rating uncertainty or an equivalent mechanism so that new players converge toward their real skill level quickly.

## Ranked matchmaking

Matchmaking prioritizes opponents with similar ratings, but equal rating is not a hard requirement.

The search window expands as queue time increases. An initial operational model may resemble:

- 0-10 seconds: approximately ±100 rating;
- 10-20 seconds: approximately ±250;
- 20-30 seconds: approximately ±500;
- 30-45 seconds: approximately ±800;
- after roughly 45 seconds: no strict rating-distance limit.

These values are tuning defaults, not permanent product constants. Real queue data should determine the final ranges.

The product principle is:

> Prefer an even match, but do not require one forever. A difficult opponent is still a legitimate competitive match.

A large rating gap must be handled by the rating formula. A lower-rated player should lose little for an expected defeat and gain significantly more for an upset. Conversely, a much higher-rated player should gain little for an expected win and risk a larger loss for an upset defeat.

Calibration players may be matched more flexibly because their ratings are still uncertain.

## Ranked rematches

Ranked mode has no direct rematch action.

After a ranked game, both players return to the general matchmaking pool. The matchmaking system may naturally pair them again, but neither player can guarantee another rated match against the same opponent.

This is both a UX rule and a lightweight anti-boosting measure.

Private and casual friend matches may use the separate rematch flow defined for private challenges.

## Repeated opponent handling

The system should avoid repeatedly pairing the same two players when reasonable alternatives exist, especially in ranked play.

This is not an absolute prohibition because low concurrency may make repeated opponents unavoidable. It is a matchmaking preference and anti-abuse signal, not a hard rule that prevents finding a match.

## Seasonal competitive model

UNDERGAMMON uses competitive seasons.

The testing/open-beta period is treated as `Season 0` rather than as a normal numbered production season.

### Season 0

Season 0 is a real competitive environment used to validate:

- rating behavior;
- calibration;
- matchmaking;
- leaderboard distribution;
- abuse/exploit resistance;
- competitive UX.

Season 0 results are retained in account history, but the official production season history begins with Season 1.

Season 0 participants receive a permanent commemorative identity/cosmetic marker such as an Open Beta Tester badge, title, frame, or equivalent cosmetic reward.

Season 0 participation must never grant gameplay, dice, rating, matchmaking, or other competitive advantages.

The duration of Season 0 is determined by testing needs rather than by a fixed calendar length.

### Production season duration

Normal production seasons last approximately `3 months`.

The three-month duration is the default product target because it is long enough for rankings to stabilize while still allowing regular competitive resets, rewards, and future seasonal content.

## Soft reset between seasons

Ratings are not fully reset to 1000 between seasons.

A soft reset moves established ratings toward the baseline while preserving useful information about relative player strength.

Example only:

| Previous rating | Example new-season seed |
| ---: | ---: |
| 1000 | 1000 |
| 1200 | 1140 |
| 1500 | 1350 |
| 1800 | 1560 |
| 2000 | 1700 |

The exact reset function is not fixed yet and must be tuned alongside the rating algorithm.

Season 0 also provides the seed for Season 1 through a soft reset. Open-beta participants do not receive a competitive advantage; the system simply does not discard information about their demonstrated skill.

## Seasonal calibration

An established player completes a shorter calibration after each seasonal soft reset.

Per ruleset:

- first-ever calibration: `10` Ranked PvP matches;
- subsequent seasonal calibration: `5` Ranked PvP matches.

During seasonal calibration:

- the soft-reset rating acts as the starting estimate;
- the rating continues to change internally from the first game;
- the player sees a preliminary rating, for example `≈ 1518`;
- the player does not receive an official leaderboard placement until all 5 seasonal calibration games are complete.

Seasonal calibration is independent for each ruleset.

## Leaderboards

Launch competitive UI uses numerical ratings only.

There are separate global leaderboards for:

- Long Nardy;
- Classic Backgammon.

The UI should expose at minimum:

- current rating;
- current seasonal leaderboard position after calibration;
- peak rating;
- historical season results.

The player must be able to find their own position even when they are far outside the visible top entries.

Friend-only leaderboards are a possible post-MVP feature.

## No leagues at launch

Named leagues such as Bronze, Silver, Gold, Diamond, Master, or Grandmaster are intentionally deferred.

The initial competitive product uses only numerical rating and leaderboard placement.

Leagues may be introduced in a later season as a visible product update without changing the underlying rating model.

## Season history

Completed seasons remain visible in the player's competitive history.

Useful retained values include:

- final rating;
- final leaderboard position;
- peak rating;
- best leaderboard position;
- participation and season-specific badges/rewards.

Historical data must not disappear when a new season starts.

## Seasonal rewards

Seasonal rewards begin with Season 1.

Rewards are based on the player's final leaderboard position at the moment the season closes, not on the highest position reached earlier in the season.

Peak rating and best rank are still retained as statistics but do not determine the competitive reward tier.

Rewards may include:

- in-game coins;
- profile badges;
- profile frames or themes;
- board, checker, or dice cosmetics;
- other non-gameplay cosmetic rewards.

Seasonal rewards must never provide a gameplay or rating advantage in the following season.

Reward bands should include meaningful recognition beyond only the absolute top players. Exact tiers such as top 50%, top 10%, top 100, top 10, and #1 remain subject to later economy/content design.

## Competitive invariants

The following are product invariants:

- only Ranked PvP matchmaking changes competitive rating;
- casual, private, and AI games do not change competitive rating;
- ratings are independent per ruleset;
- calibration never freezes the internal rating at 1000;
- matchmaking may eventually permit large rating gaps rather than leaving players in an indefinite queue;
- rating changes account for expected opponent strength;
- ranked direct rematches are not available;
- full seasonal resets to 1000 are avoided;
- seasonal rewards are based on final placement;
- no paid or cosmetic system may grant competitive gameplay advantages.

## Deferred decisions

The following are intentionally not fixed yet:

- exact Elo/Glicko-like rating algorithm;
- numerical uncertainty parameters;
- exact matchmaking expansion intervals after production telemetry is available;
- exact soft-reset formula;
- exact seasonal reward thresholds and amounts;
- future named leagues;
- friends leaderboard.
