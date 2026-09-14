# 27. Mini App and Frontend Architecture

## Status
Accepted for Season 0.

## Decision summary

UNDERGAMMON uses a React + Vite Telegram Mini App as the primary game client. The frontend must remain thin with respect to authoritative game decisions: it renders server state, collects player intent, and manages local presentation state, but it does not decide dice, legal outcomes, match results, rating, economy, or authoritative timers.

Telegram-specific functionality is isolated behind a dedicated adapter boundary so the product can support a browser client later without coupling the rest of the frontend to Telegram APIs.

A direct browser visit to `https://undergammon.tracerxbrhd.ru` in Season 0 shows a small public landing page with an `Open in Telegram` call to action instead of exposing an authentication failure or a partially functional application.

## Frontend responsibilities

The Mini App is responsible for:

- rendering navigation and product screens;
- rendering authoritative match state received from the backend;
- maintaining local turn-draft/presentation state before submission;
- showing legal destinations supplied or derived from the shared deterministic game model where appropriate;
- animating server-confirmed dice and moves;
- reconnecting and replacing local match state from an authoritative snapshot;
- handling localization, sound, haptics, reaction mute and other presentation preferences;
- integrating Telegram-specific UI capabilities through an adapter layer.

The Mini App must not authoritatively determine:

- dice results;
- accepted turns;
- winner or finish reason;
- rating changes;
- XP or Coins rewards;
- match deadlines;
- account sanctions;
- challenge acceptance ownership.

## State model

Frontend state is separated conceptually into three categories.

### 1. Server/domain state

Examples:

- authenticated account/profile;
- ratings and season data;
- match history;
- active challenge/match metadata;
- authoritative match snapshot and `stateVersion`;
- economy and progression balances.

This state originates from the backend and is never treated as authoritative merely because it exists in the browser.

### 2. Realtime connection state

Examples:

- WebSocket connection status;
- reconnect attempts;
- controlling-session status;
- most recently acknowledged `stateVersion`;
- pending command IDs.

### 3. Local UI state

Examples:

- selected checker;
- currently drafted move sequence;
- open modal/menu;
- temporary animation queue;
- local sound/haptic settings;
- transient form state.

Local UI state must be disposable and reconstructable from server state after reconnect where relevant.

## Telegram adapter boundary

Telegram integration should be exposed through a small internal interface instead of being imported throughout the application.

Conceptually:

```text
Mini App UI / application logic
            |
      PlatformAdapter
        /          \
TelegramAdapter   BrowserAdapter (future)
```

The adapter may cover capabilities such as:

- obtaining Telegram launch context and raw `initData`;
- opening Telegram links;
- invoking Telegram sharing flows;
- haptics;
- viewport/theme integration;
- closing or minimizing the Mini App where supported.

Business logic must not depend directly on Telegram global objects.

## Season 0 browser entry

The public origin remains:

```text
https://undergammon.tracerxbrhd.ru
```

When launched outside the supported Telegram Mini App context during Season 0, the user receives a small public landing experience instead of the authenticated game shell.

The landing page should contain at minimum:

- UNDERGAMMON branding;
- a concise description such as `Play Backgammon in Telegram`;
- a primary `Open in Telegram` action;
- basic responsive presentation suitable for desktop and mobile browsers.

It is not a second application and must not grow into a parallel web product during Season 0.

## Future browser client

Browser authentication is explicitly out of scope for Season 0. The architecture only preserves the possibility of adding it later.

When a browser login provider is eventually introduced, it should resolve into the same internal `GameAccount` model and reuse the existing application/backend contracts rather than creating a separate web account model.

## UI implementation principles

- Touch-first portrait UX is the primary target.
- One responsive board implementation is preferred over separate desktop/mobile game implementations.
- Board geometry derives from its container rather than fixed pixel coordinates.
- React components should not contain game-rule business logic.
- Realtime transport details should be hidden behind an application/realtime client layer rather than spread through components.
- Avoid global mutable stores unless state genuinely needs cross-route lifetime.
- Do not add Next.js/SSR merely for the landing page; the same Vite application can provide the lightweight public entry and Telegram application shell.

## Non-goals for Season 0

- browser authentication;
- desktop-specific game UX;
- SSR;
- a second standalone website application;
- native mobile clients;
- offline gameplay;
- trusting client-side state after reconnect without server re-synchronization.
