# 29 — Profile Hub and Account Progression UX

Status: accepted UX/UI v2 decision; Profile hub/progression baseline is substantially implemented, with Update 1 cosmetics presented through dedicated Store/Cosmetics destinations and Profile identity surfaces.

## Purpose

This document defines the accepted Profile experience for the UNDERGAMMON Telegram Mini App.

Profile is an account hub, not primarily an edit form.

It complements:

- `08-profile-and-match-history.md` for profile/history product rules;
- `16-account-level-and-xp.md` for permanent Account Level semantics;
- `21-miniapp-ux-ui-v2.md` for the overall Mini App v2 direction;
- `24-match-result-and-progression-ux.md` for post-match XP/result presentation;
- `25-miniapp-navigation-shell.md` for the shared application shell;
- `28-rankings-ux.md` for rating/leaderboard presentation.

## Profile information hierarchy

The main Profile screen should communicate the player's persistent game identity first, followed by competitive status and secondary account destinations.

Conceptually:

```text
Profile

[ avatar + equipped Profile Frame ]
Nickname
Level 12

XP progression bar
18 420 total XP
840 Coins

Long Nardy
1482 rating · Peak 1531

Backgammon
≈1048 · Calibration 6/10

Match History        >
Learn & Rules        >
Settings             >
Edit profile         >
Technical / Account  >
Admin                >   // authorized accounts only
```

Exact visual composition may continue to evolve, but this hierarchy is accepted.

## Account identity

The main identity block contains:

- avatar;
- equipped Profile Frame presentation;
- nickname;
- Account Level.

Coins and XP are persistent account progression/economy context and should be visible without turning the page into an economy dashboard.

Telegram identity must not replace the internal game-account identity.

Store and Cosmetics are separate primary destinations in the current five-tab shell. Profile presents equipped identity cosmetics but does not duplicate the Store or full equipment UI.

## XP progress bar

The Profile screen includes a visible Account XP progress bar for the current level.

The bar should communicate both current level progress and persistent lifetime XP without implying that Account Level is competitive skill.

A typical presentation may show:

```text
Level 12
[==================------] 72%
620 / 860 XP to Level 13
18 420 total XP
```

Exact copy/units may be tuned, but the underlying values must remain authoritative and consistent with result-screen progression.

### Progression contract

The frontend does not duplicate the server Account Level curve to calculate progress-bar boundaries.

The shared profile contract exposes `totalXp`, derived `level`, and authoritative `LevelProgress` data including:

```text
levelStartTotalXp
nextLevelTotalXp
xpIntoLevel
xpRequiredForNextLevel
```

The same progression semantics are used by `MatchResultProgression` for before/after match result presentation, so Profile and post-match progression do not need independent XP-curve policy.

## Rating cards

Profile shows separate competitive summaries for both first-class rulesets.

Each rating card may contain:

- ruleset name;
- current rating;
- peak rating;
- calibration state when calibration is incomplete.

Preliminary ratings use the accepted approximate/preliminary presentation semantics.

Account Level must remain visually distinct from ruleset rating so users do not confuse lifetime participation with competitive skill.

## Secondary destinations

Profile provides access to:

- Match History;
- Learn & Rules;
- Settings;
- Edit Profile;
- Technical / Account information;
- Admin for authorized accounts only.

These are secondary destinations and should not compete visually with the account identity/progression summary.

## Edit Profile

Editing is not the default Profile state.

`Edit profile` opens a dedicated mobile sheet/subscreen for supported editable identity fields such as:

- nickname;
- avatar.

Nickname changes must respect the existing server cooldown.

Until the backend exposes an exact next-change timestamp, do not invent a countdown. Explain the general cooldown rule and handle the authoritative cooldown error returned by the server.

## Technical / Account information

Raw internal account identifiers and technical/debug information should not dominate the main Profile surface.

When useful, place them in a secondary Technical / Account information screen where the account ID can be inspected/copied for support purposes.

Do not expose private Telegram identity as the public game identity.

## Admin entry

Admin appears only when the authenticated profile is authorized as admin.

It remains a secondary Profile destination, never a permanent navigation tab for ordinary users.

## Navigation behavior

Profile is a normal `AppShell` primary destination and keeps the shared bottom navigation visible.

The Profile item is selected while this screen is active.

Secondary Profile destinations may use normal push/back navigation while retaining the shell conventions established for non-game screens.

## Scope guard

The Profile hub itself does not embed:

- a duplicate Store;
- a duplicate full cosmetic loadout editor;
- achievements inventory;
- social/friends graph;
- seasonal battle-pass presentation;
- gameplay advantages from level;
- duplicated client-side XP policy.

Store and Cosmetics already exist as separate Update 1 primary destinations. Broader cosmetic categories, achievements/social systems and battle-pass features remain separate future product scope.
