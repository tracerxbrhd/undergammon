import { describe, expect, it } from 'vitest';
import { resolveCheckerSet, resolveMatchCosmetics } from '../src/game/cosmetics';

describe('resolveMatchCosmetics', () => {
  it('deterministically resolves every absent slot to the Default presentation', () => {
    const first = resolveMatchCosmetics({ localSeat: 'A' });
    const second = resolveMatchCosmetics({ localSeat: 'A' });

    expect(first).toEqual(second);
    expect([
      first.board.localTheme.presentation.id,
      first.board.opponentTheme.presentation.id,
      first.checkers.localSet.presentation.id,
      first.checkers.opponentSet.presentation.id,
      first.dice.localSkin.presentation.id,
      first.dice.opponentSkin.presentation.id,
      first.profile.localFrame.presentation.id,
      first.profile.opponentFrame.presentation.id,
      first.reactions.localPack.presentation.id,
    ]).toEqual(Array.from({ length: 9 }, () => 'default'));
  });

  it('keeps player-owned checker sets aligned when perspective changes', () => {
    const players = {
      A: {
        cosmetics: {
          profileFrame: 'season0_tester_frame' as const,
          checkerSet: 'marble_checker_set' as const,
        },
      },
      B: { cosmetics: { profileFrame: 'default' as const } },
    };
    const viewedByA = resolveMatchCosmetics({ localSeat: 'A', players });
    const viewedByB = resolveMatchCosmetics({ localSeat: 'B', players });

    expect(viewedByA.checkers.localSet).toMatchObject({
      ownerSeat: 'A',
      presentation: { id: 'marble_checker_set', className: 'checker-set-marble' },
    });
    expect(viewedByA.checkers.opponentSet).toMatchObject({
      ownerSeat: 'B',
      presentation: { id: 'default' },
    });
    expect(viewedByB.checkers.localSet).toMatchObject({
      ownerSeat: 'B',
      presentation: { id: 'default' },
    });
    expect(viewedByB.checkers.opponentSet).toMatchObject({
      ownerSeat: 'A',
      presentation: { id: 'marble_checker_set', className: 'checker-set-marble' },
    });
    expect(viewedByB.profile.opponentFrame.presentation.id).toBe('season0_tester_frame');
  });

  it('falls back to Default for legacy profile-only cosmetic snapshots', () => {
    const result = resolveMatchCosmetics({
      localSeat: 'A',
      players: {
        A: { cosmetics: { profileFrame: 'bronze_profile_frame' } },
        B: {},
      },
    });
    expect(result.profile.localFrame.presentation.id).toBe('bronze_profile_frame');
    expect(result.checkers.localSet.presentation.id).toBe('default');
    expect(result.checkers.opponentSet.presentation.id).toBe('default');
  });

  it('maps checker cosmetics through application-controlled presentation classes', () => {
    expect(resolveCheckerSet('marble_checker_set')).toEqual({
      id: 'marble_checker_set',
      className: 'checker-set-marble',
    });
  });
});
