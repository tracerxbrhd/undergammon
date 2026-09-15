# Matchmaking, Rating, Seasons and Leaderboards

## Status

Accepted competitive product contract. Season 0 rating, calibration, matchmaking windows and per-ruleset leaderboards are implemented; season rollover/recalibration tooling and recent-opponent avoidance remain future work.

## Scope

This document captures product decisions for ranked matchmaking, rating calibration, seasonal resets, leaderboards, and seasonal rewards.

The competitive system is intentionally simple in Season 0: numerical ratings, separate ladders per ruleset, server-controlled matchmaking, and no rank/league cosmetics.

## Rating is separate per ruleset

UNDERGAMMON maintains independent competitive ratings for:

- Long Nardy;
- Classic Backgammon.

Skill in one ruleset does not affect the rating or calibration state of the other.

A player may therefore be fully rated in Long Nardy while still being uncalibrated in Backgammon.

## Initial rating and first-time calibration

Each ruleset starts from a baseline rating of `1000`.

A new player completes `10` Ranked PvP matches in that ruleset before the initial calibration period is considered complete.

During calibration:

- the internal rating changes from the first ranked match;
- matchmaking uses the current internal estimate rather than pretending the player is permanently at 1000;
- the player-facing value is shown as preliminary, for example `≈ 1270`;
- rating moves faster than after calibration;
- only Ranked PvP matchmaking counts toward calibration;
- casual matchmaking and private friend matches do not affect calibration;
- deferred AI matches must not affect calibration if that mode is introduced later.

After the tenth ranked match, the calibration state is removed and the rating is displayed as a normal established rating.

### Current Season 0 rating policy

The implemented Season 0 rating policy is Elo-style:

```text
expected = 1 / (1 + 10 ^ ((opponentRating - rating) / 400))
delta    = round(K * (score - expected))
```

where:

- `score = 1` for a win and `0` for a loss;
- `K = 64` while the ruleset has fewer than 10 played Ranked matches;
- `K = 32` after initial calibration.

The server owns rating calculation and persistence. Client UI only presents authoritative values.

## Ranked matchmaking

Matchmaking prioritizes opponents with similar ratings, but equal rating is not a hard requirement.

The current Season 0 search window expands with queue time:

- before 10 seconds: ±100 rating;
- 10–20 seconds: ±250;
- 20–30 seconds: ±500;
- 30–45 seconds: ±800;
- after 45 seconds: no strict rating-distance limit.

These are application policy values and may be tuned later from queue telemetry through reviewed server changes.

The product principle is:

> Prefer an even match, but do not require one forever. A difficult opponent is still a legitimate competitive match.

A large rating gap is handled by the rating formula. A lower-rated player loses less for an expected defeat and gains more for an upset; the inverse applies to a much higher-rated player.

Calibration players may be matched more flexibly because their ratings are still converging.

## Ranked rematches

Ranked mode has no direct rematch action.

After a ranked game, both players return to the general matchmaking pool. The matchmaking system may naturally pair them again, but neither player can guarantee another rated match against the same opponent.

This is both a UX rule and a lightweight anti-boosting measure.

Private and casual friend matches may use the separate rematch flow defined for private challenges.

## Repeated opponent handling

Recent-opponent avoidance is intentionally deferred for the current Season 0 implementation.

The current server matches by the active matchmaking policy and may naturally pair the same two players again, especially at low concurrency. A future avoidance preference may be introduced as an anti-abuse/quality improvement when queue population justifies it, but it must not prevent finding a match indefinitely.

## Seasonal competitive model

UNDERGAMMON uses competitive seasons.

The testing/open-beta period is `Season 0` rather than a normal numbered production season.

### Season 0

Season 0 is a real competitive environment used to validate:

- rating behavior;
- calibration;
- matchmaking;
- leaderboard distribution;
- abuse/exploit resistance;
- competitive UX.

Season 0 results are retained in account history, but the official normal-season history begins with Season 1.

Season 0 participants receive the permanent Season 0 Tester Profile Frame. The cosmetic marker provides no gameplay, dice, rating, matchmaking or other competitive advantage.

The duration of Season 0 is determined by testing needs rather than by a fixed calendar length.

### Production season duration

Normal production seasons are planned around approximately `3 months`.

The three-month duration remains the default product target because it is long enough for rankings to stabilize while allowing regular competitive resets, rewards and future seasonal content.

## Soft reset between seasons

Ratings are not intended to fully reset to 1000 between normal seasons.

A future soft reset will move established ratings toward the baseline while preserving useful information about relative player strength.

Example only:

| Previous rating | Example new-season seed |
| ---: | ---: |
| 1000 | 1000 |
| 1200 | 1140 |
| 1500 | 1350 |
| 1800 | 1560 |
| 2000 | 1700 |

The exact reset function is not implemented/frozen yet and must be tuned before Season 1 rollover.

Season 0 is intended to provide the seed for Season 1 through such a soft reset rather than discarding demonstrated skill.

## Seasonal calibration

The accepted future normal-season model uses a shorter calibration after each seasonal soft reset.

Per ruleset:

- first-ever calibration: `10` Ranked PvP matches;
- subsequent seasonal calibration: `5` Ranked PvP matches.

During future seasonal calibration:

- the soft-reset rating acts as the starting estimate;
- the rating continues to change internally from the first game;
- the player sees a preliminary rating, for example `≈ 1518`;
- the player does not receive an official leaderboard placement until all 5 seasonal calibration games are complete.

Seasonal calibration is independent for each ruleset. Season rollover/recalibration tooling is not current Season 0 implementation work.

## Leaderboards

Season 0 competitive UI uses numerical ratings only.

There are separate global leaderboards for:

- Long Nardy;
- Classic Backgammon.

The UI exposes the current ruleset ladder and the player's own relevant position/context after calibration. Profile/history surfaces retain rating and peak information where supported.

A player who has not completed calibration must not receive a fabricated official leaderboard position.

Friend-only leaderboards are a possible post-MVP feature.

## No leagues in Season 0

Named leagues such as Bronze, Silver, Gold, Diamond, Master, or Grandmaster are intentionally deferred.

The current competitive product uses numerical rating and leaderboard placement.

Leagues may be introduced in a later season as a visible product update without changing the underlying rating model.

## Season history

Completed seasons are intended to remain visible in the player's competitive history.

Useful retained values include:

- final rating;
- final leaderboard position;
- peak rating;
- best leaderboard position;
- participation and season-specific badges/rewards.

Historical data must not disappear when a new season starts.

Season 0 is current, so full completed-season rollover/history presentation remains future work.

## Seasonal rewards

Normal seasonal placement rewards begin no earlier than Season 1.

Rewards are intended to be based on the player's final leaderboard position at season close, not the highest position reached earlier in the season.

Peak rating and best rank may remain statistics but do not determine the competitive reward tier.

Future rewards may include:

- in-game Coins;
- profile badges;
- profile frames or themes;
- board, checker, or dice cosmetics;
- other non-gameplay cosmetic rewards.

Seasonal rewards must never provide a gameplay or rating advantage in the following season.

Exact reward bands remain future economy/content design.

## Competitive invariants

The following are product invariants:

- only Ranked PvP matchmaking changes competitive rating;
- casual and private games do not change competitive rating;
- deferred AI games must not change competitive rating;
- ratings are independent per ruleset;
- initial calibration never freezes the internal rating at 1000;
- matchmaking may eventually permit large rating gaps rather than leaving players in an indefinite queue;
- rating changes account for expected opponent strength;
- ranked direct rematches are not available;
- full seasonal resets to 1000 are avoided;
- future seasonal rewards are based on final placement;
- no paid or cosmetic system may grant competitive gameplay advantages.

## Intentionally deferred

The following are not current Season 0 implementation requirements:

- recent-opponent avoidance;
- Season 1 soft-reset tooling and exact formula;
- subsequent-season five-game calibration flow/tooling;
- exact seasonal reward thresholds/amounts;
- named leagues;
- friends leaderboard.
