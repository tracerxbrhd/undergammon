# Notifications and Bot Fallback

## Scope

This document defines how UNDERGAMMON uses Telegram bot messages outside the Mini App.

## Notification policy

The first public release uses transactional notifications only.

Allowed notification categories include:

- a private challenge was accepted while the challenger is no longer in the relevant Mini App session;
- recovery/open-game notifications for an already created match when the user is outside the relevant session;
- critical system notices that materially affect a challenge or match.

The first release does not send retention or promotional messages such as:

- "you have not played recently";
- daily-login reminders;
- season countdown reminders;
- win-streak reminders;
- marketing or promotional broadcasts.

The bot also does not send a notification for every turn. UNDERGAMMON PvP is synchronous, with a short turn timer, so per-turn Telegram notifications would create the wrong product expectation.

## In-app first, bot as fallback

When the user is currently connected to the relevant Mini App session, events are presented in-app and are not duplicated in the Telegram chat.

When the user is no longer in that relevant session, the bot may deliver the corresponding transactional notification as a recovery/fallback channel.

Example:

- challenge accepted while challenger is waiting in-app: update the waiting screen in-app, no bot message;
- challenge accepted after challenger closed the Mini App: send a bot message with an action to open the created match.

This keeps the bot as a thin social, recovery, and notification layer instead of a second gameplay UI.

## Contextual deep links

Notification actions should open the exact relevant context rather than the generic Mini App home screen.

Examples:

- "Open game" resolves directly to the relevant match;
- challenge-related actions resolve directly to the relevant challenge state.

Identifiers exposed in links must not be trusted as authorization. The backend validates the authenticated Game Account, target challenge/match, current lifecycle state, expiration, and permissions before returning or mutating state.

## Notification settings

The first release does not include a dedicated notification-settings screen inside UNDERGAMMON.

Telegram already provides users with platform-level notification controls for the bot, and the product intentionally sends only a small set of necessary transactional messages.

Internally, notification events must still be explicitly typed, for example:

- `CHALLENGE_ACCEPTED`;
- `MATCH_RECOVERY`;
- `SYSTEM_NOTICE`.

This keeps the architecture ready for granular notification preferences later without requiring a redesign.

## Product principle

Telegram bot notifications exist to recover or complete an active user flow, not to manufacture engagement. In-app state is preferred whenever the user is already present, and bot messages are the fallback when they are not.
