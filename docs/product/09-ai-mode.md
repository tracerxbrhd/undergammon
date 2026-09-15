# 09 — AI Mode

## Status
Deferred product design. The rules below remain the accepted direction if AI is implemented later; AI is not a current Season 0 selectable opponent and is not an Update 1 feature.

## Purpose
AI matches are a planned training and single-player mode. They must use the same canonical rules and game engine as PvP, but they are not part of the competitive ecosystem.

## Rules and fairness
- AI uses the same deterministic game rules as human players.
- Dice remain server-authoritative.
- AI never receives manipulated dice or hidden gameplay advantages.
- Difficulty affects only move selection quality.
- AI may only choose legal moves produced/validated by the game engine.

## Difficulty levels
If the deferred mode is implemented, the accepted initial design supports exactly three difficulty levels:
- Easy
- Normal
- Hard

Difficulty is selected before the match starts and is immutable for that match.

Do not add mid-match difficulty changes. This provides little user value and unnecessarily complicates match state and testing.

## Competitive isolation
AI matches do not affect or appear in player competitive statistics.

They do not change:
- rating;
- calibration;
- seasonal standings;
- PvP win rate;
- competitive win streak;
- seasonal rewards;
- chests or competitive economy rewards.

AI matches are intentionally excluded from the public match count and PvP statistics.

## Match pacing
AI decision computation may complete immediately, but the UI should provide a short natural presentation delay so the opponent does not feel like a purely technical state transition.

Expected presentation flow:
1. Human turn is committed.
2. Human move animation completes.
3. Short AI pacing delay, approximately 0.5–1.5 seconds.
4. AI performs its server-authoritative dice roll.
5. Dice animation is shown.
6. AI moves are animated sequentially using the same committed-turn presentation rules as PvP.

Do not simulate long fake thinking delays.

## Human turn timer
AI matches do not use the PvP 60-second turn timer.

The player may think for as long as needed. This reinforces the role of AI mode as training and relaxed single-player play.

## Leaving and reconnecting
AI matches still use the normal 60-second reconnect grace period so a temporary Telegram/WebView/network interruption does not instantly destroy the session.

However, AI matches have no competitive result:
- explicit leave ends the training session without a recorded loss;
- disconnect exceeding 60 seconds ends the AI session without a recorded loss;
- no rating, statistics, streaks or rewards are changed.

The normal project invariant still applies:

> One Game Account may have at most one unfinished match at a time, including an AI match.

## Explicit non-goals for the initial AI implementation
- No more than three difficulty levels.
- No mid-match difficulty switching.
- No manipulated RNG by difficulty.
- No AI-derived rating or separate bot ladder.
- No AI farming of coins, streak rewards, chests or seasonal progression.
- No AI matches in player PvP statistics.
