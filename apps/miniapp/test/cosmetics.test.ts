import { describe, expect, it } from 'vitest';
import {
  resolveBoardTheme,
  resolveCheckerSet,
  resolveDiceSkin,
  resolveMatchCosmetics,
} from '../src/game/cosmetics';

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

  it('keeps player-owned board, checker and dice cosmetics aligned when perspective changes', () => {
    const players = {
      A: {
        cosmetics: {
          profileFrame: 'season0_tester_frame' as const,
          checkerSet: 'marble_checker_set' as const,
          diceSkin: 'obsidian_dice' as const,
          boardTheme: 'midnight_board' as const,
        },
      },
      B: { cosmetics: { profileFrame: 'default' as const } },
    };
    const viewedByA = resolveMatchCosmetics({ localSeat: 'A', players });
    const viewedByB = resolveMatchCosmetics({ localSeat: 'B', players });

    expect(viewedByA.board.localTheme).toMatchObject({
      ownerSeat: 'A',
      presentation: { id: 'midnight_board', className: 'board-theme-midnight' },
    });
    expect(viewedByA.board.opponentTheme.presentation.id).toBe('default');
    expect(viewedByA.checkers.localSet).toMatchObject({
      ownerSeat: 'A',
      presentation: { id: 'marble_checker_set', className: 'checker-set-marble' },
    });
    expect(viewedByA.checkers.opponentSet).toMatchObject({
      ownerSeat: 'B',
      presentation: { id: 'default' },
    });
    expect(viewedByA.dice.localSkin).toMatchObject({
      ownerSeat: 'A',
      presentation: { id: 'obsidian_dice', className: 'dice-skin-obsidian' },
    });
    expect(viewedByA.dice.opponentSkin.presentation.id).toBe('default');
    expect(viewedByB.board.localTheme.presentation.id).toBe('default');
    expect(viewedByB.board.opponentTheme).toMatchObject({
      ownerSeat: 'A',
      presentation: { id: 'midnight_board', className: 'board-theme-midnight' },
    });
    expect(viewedByB.checkers.localSet).toMatchObject({
      ownerSeat: 'B',
      presentation: { id: 'default' },
    });
    expect(viewedByB.checkers.opponentSet).toMatchObject({
      ownerSeat: 'A',
      presentation: { id: 'marble_checker_set', className: 'checker-set-marble' },
    });
    expect(viewedByB.dice.localSkin.presentation.id).toBe('default');
    expect(viewedByB.dice.opponentSkin).toMatchObject({
      ownerSeat: 'A',
      presentation: { id: 'obsidian_dice', className: 'dice-skin-obsidian' },
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
    expect(result.board.localTheme.presentation.id).toBe('default');
    expect(result.board.opponentTheme.presentation.id).toBe('default');
    expect(result.checkers.localSet.presentation.id).toBe('default');
    expect(result.checkers.opponentSet.presentation.id).toBe('default');
    expect(result.dice.localSkin.presentation.id).toBe('default');
    expect(result.dice.opponentSkin.presentation.id).toBe('default');
  });

  it('maps board, checker and dice cosmetics through application-controlled presentation classes', () => {
    expect(resolveBoardTheme('midnight_board')).toEqual({
      id: 'midnight_board',
      className: 'board-theme-midnight',
    });
    expect(resolveCheckerSet('marble_checker_set')).toEqual({
      id: 'marble_checker_set',
      className: 'checker-set-marble',
    });
    expect(resolveDiceSkin('obsidian_dice')).toEqual({
      id: 'obsidian_dice',
      className: 'dice-skin-obsidian',
    });
  });
});
