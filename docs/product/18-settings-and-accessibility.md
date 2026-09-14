# Settings and Accessibility

## Status

Accepted product decisions for the first public release / Season 0.

## Settings scope

Keep the first-release settings surface intentionally small. Only settings that materially affect the immediate game experience should be exposed.

Initial settings:

- Language: Russian / English.
- Sound: enabled / disabled.
- Haptics: enabled / disabled.
- Opponent reactions: enabled / muted.

Do not build a broad settings system before concrete product needs exist.

## Reduced motion

Season 0 does not include a dedicated Reduced Motion toggle.

Instead, the default motion design must already be restrained:

- short and predictable transitions;
- no aggressive zooming or flashing;
- no unnecessary parallax;
- no decorative animation that delays gameplay;
- committed move animations remain clear enough to understand the opponent's actions.

A dedicated accessibility motion mode may be added later if there is real demand.

## Persistence model

Settings are stored according to their semantic scope.

### Game Account settings

Persist across devices:

- `language`;
- `muteOpponentReactions`.

### Device-local settings

Remain local to the specific client/device:

- `soundEnabled`;
- `hapticsEnabled`.

This avoids synchronizing preferences that may legitimately differ between a phone, tablet, desktop client, or other future device.

## Reactions mute semantics

There is one canonical `muteOpponentReactions` preference.

The toggle exposed inside a match and the toggle exposed in Settings control the same account-level value. Muting reactions during a match therefore remains active for subsequent matches until the user explicitly enables them again.

Do not create separate per-screen mute states that can diverge.

## Defaults

Sound and light haptics are enabled by default, consistent with the game-board UX decision. Users can disable them locally.

## Future compatibility

The settings model should allow later additions such as:

- reduced motion;
- animation-speed preferences;
- additional accessibility controls;
- future notification preferences;
- further localization options.

These are extension points, not Season 0 scope.