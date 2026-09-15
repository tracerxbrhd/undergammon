# 33 — Settings UX

Status: accepted UX/UI v2 decision, implementation pending

## Purpose

This document defines the Season 0 Settings surface for the UNDERGAMMON Telegram Mini App.

It complements:

- `18-settings-and-accessibility.md` for product-level settings scope;
- `21-miniapp-ux-ui-v2.md` for the overall Mini App v2 direction;
- `25-miniapp-navigation-shell.md` for application shell behavior;
- `29-profile-hub-and-account-progression-ux.md` for Profile as the parent account hub.

The goal is to keep Settings compact and limited to real user-facing controls supported by the product.

## Screen structure

Settings is a secondary destination under Profile.

Accepted baseline:

```text
Settings

Language
[ Русский ] [ English ]

Sound                 ON/OFF
Haptics               ON/OFF
Opponent reactions    ON/OFF

Account
Delete account       >
```

Exact visual treatment is defined by the shared visual system, but the information architecture remains intentionally small.

## Language

Language uses a direct two-option selector for Russian / English.

Requirements:

- current language is immediately visible;
- switching language does not require a nested picker;
- labels must remain understandable in both locales;
- the selected language remains authoritative according to the existing account/client settings contract.

## Sound

Sound is a simple boolean setting.

It governs non-essential application/game audio presentation where supported.

The setting must never affect authoritative gameplay timing or rules.

## Haptics

Haptics is a simple boolean setting for supported Telegram/mobile environments.

Haptic feedback is presentation-only and must degrade gracefully when the host/device does not expose the relevant capability.

## Opponent reactions

Opponent reactions is a simple boolean preference controlling whether reactions from the opposing player are presented locally.

Muting reactions does not modify gameplay state and does not notify the opponent.

## Account danger section

Account deletion is separated visually from ordinary preferences.

`Delete account` is not a toggle.

It opens a dedicated danger/confirmation flow that:

- explains the consequence clearly;
- distinguishes deletion from logout/closing the Mini App;
- requires explicit confirmation;
- follows the existing backend deletion/restore semantics;
- does not rely on client-only deletion state.

The destructive action should not be visually adjacent to routine toggles in a way that encourages accidental activation.

## Deferred settings

Do not add speculative settings in Season 0 merely to make the screen appear more complete.

Explicitly deferred unless separately accepted later:

- theme selector;
- quality/performance presets;
- notification center/preferences;
- animation speed;
- reduced-motion toggle beyond platform/accessibility behavior already handled elsewhere;
- board/cosmetic selection;
- matchmaking tuning;
- debug/developer options.

Future settings may be added as product capabilities become real, without changing the basic secondary-screen role of Settings.

## Navigation

Settings is opened from Profile and returns to Profile through the normal secondary-navigation/back behavior.

It uses the standard application shell rather than the viewport-locked Game Screen shell.
