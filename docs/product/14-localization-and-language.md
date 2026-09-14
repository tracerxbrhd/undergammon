# Localization and language

## Supported languages for the first release

UNDERGAMMON ships with two fully supported interface languages:

- Russian (`ru`)
- English (`en`)

On first launch, the initial locale is selected from Telegram `language_code`:

- Russian Telegram locale -> Russian
- any other locale -> English

The player can change the interface language manually later. The selected locale is stored on the internal Game Account and becomes the source of truth for UNDERGAMMON UI language.

## Localization boundary

User-facing strings are localized in presentation layers. Domain and protocol data must use stable machine-readable codes rather than localized text.

Examples include match termination reasons, notification types, game modes, rulesets, validation errors, tutorial steps, and other system states.

Bot notifications, Mini App UI, tutorials, rules reference, errors, and system messages must all respect the same account locale.

## Nickname language

Automatically generated default nicknames use one controlled English-only nickname pool for all players, regardless of UI language.

The generator uses compatible controlled word categories such as adjective + noun. Generated names are display names only and do not need to be unique.

Changing the UI language never translates or regenerates an existing nickname.

Players may later replace the generated nickname under the profile rules defined elsewhere; nickname changes still pass server-side validation and cooldown rules.

## Non-goals for the first release

- No additional interface languages beyond Russian and English.
- No locale-specific nickname pools.
- No runtime translation of player-created or generated nicknames.
- No localized strings embedded in game-engine or protocol contracts.

Additional languages should be introduced only when there is actual product demand.