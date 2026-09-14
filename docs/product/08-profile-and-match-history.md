# 08 — Player Profile and Match History

## Status
Accepted product decisions for UNDERGAMMON.

## Default identity model

UNDERGAMMON is pseudonymous by default.

On first launch the backend creates an internal Game Account and assigns:

- a random display name generated from a controlled word pool, using compatible templates such as `<adjective> + <noun>`;
- a random game avatar selected from an approved built-in avatar pool;
- no public Telegram identity by default.

Telegram username, Telegram profile link, Telegram display name, and Telegram avatar are not automatically exposed to other players.

The internal Game Account ID remains the domain identity. Telegram identity is only an authentication/provider binding.

## Display names

Display names are not unique and are never used as account identifiers.

Repeated generated or manually chosen names are allowed. Account uniqueness is provided by the internal Game Account ID.

No public `@handle` system is planned for the first release.

Players may change their display name for free, with a cooldown of 7 days between changes.

Free-form names require validation and moderation safeguards to prevent impersonation, abuse, offensive content, and misleading names.

## Avatars

Players can use:

- an avatar from the built-in UNDERGAMMON pool;
- their Telegram profile avatar if they explicitly choose to use it.

Arbitrary user-uploaded avatar images are not planned for MVP because they would immediately create additional moderation and safety requirements.

Built-in avatar changes do not require the same strict cooldown as nickname changes.

## Public Telegram identity

Users may explicitly opt in to exposing their Telegram identity from their UNDERGAMMON profile.

This setting is:

- disabled by default;
- global rather than dependent on match type;
- fully controlled by the user.

If enabled, another player opening the user's UNDERGAMMON profile may see the public Telegram identity/link supported by the product.

A random Ranked, Casual, or Private opponent never receives Telegram identity merely because a match took place.

## Public UNDERGAMMON profile

A player's UNDERGAMMON profile itself is public and can be opened from relevant places in the UI, including:

- an opponent identity in a match;
- match result screens;
- leaderboard entries;
- the owner's own private match history when opening an opponent.

The public profile shows aggregated game information such as:

- display name and game avatar;
- current rating for Long Nardy;
- current rating for Backgammon;
- peak ratings;
- match counts;
- win rates;
- seasonal participation and achievements;
- optional public Telegram identity if the user has opted in.

Exact presentation can evolve, but Telegram identity is never implied by the public game profile.

## Match-history privacy

Aggregated competitive statistics are public.

The detailed list of matches and specific opponents is private to the owner of the account.

Other users do not receive a public activity feed or a public per-match history.

## Owner match history

The owner can review completed matches with concise result metadata.

Useful fields include:

- result: win, loss, or no contest;
- ruleset;
- mode: Ranked, Casual, Private, or AI as applicable;
- opponent's UNDERGAMMON identity;
- completion timestamp;
- completion reason, such as normal result, timeout, surrender, abandon, or server-side no contest;
- rating before and after a Ranked match;
- Ranked rating delta.

Casual and Private matches show no rating delta.

History should be backed by normal persistent match records and loaded with pagination rather than being limited to a small fixed number of recent matches.

## No replay feature

Match replay is not part of the planned product scope.

Do not build or pre-commit to:

- a replay UI;
- a move timeline for users;
- a replay viewer;
- a second replay-specific game engine.

The backend may still retain technical match/event information required for authoritative gameplay, reconnect, diagnostics, incident investigation, or integrity checks. Internal server data must not be treated as a promise of a future user-facing replay feature.

## User discovery

There is no global user search in the initial product.

Because display names are intentionally non-unique, searching players by nickname would add little value and would require unnecessary identity/disambiguation UX.

Users reach another player's profile through an existing product relationship or surface, such as a match, result, history entry, or leaderboard.

## Product principles

- Pseudonymity is the default.
- Revealing Telegram identity is explicit opt-in.
- Telegram identity is not the domain account identity.
- Display names are presentation data, not identifiers.
- Avoid building a social network around player discovery before it is needed.
- Avoid moderation-heavy arbitrary image uploads in MVP.
- Keep match history useful without making player activity publicly traceable.
