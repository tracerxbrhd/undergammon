import { describe, expect, it } from 'vitest';
import { resolveMatchCosmetics } from '../src/game/cosmetics';

describe('resolveMatchCosmetics', () => {
  it('deterministically resolves every slot to the Default presentation', () => {
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

  it('keeps local and opponent ownership aligned when perspective changes', () => {
    const players = {
      A: { cosmetics: { profileFrame: 'season0_tester_frame' as const } },
      B: { cosmetics: { profileFrame: 'default' as const } },
    };
    const viewedByA = resolveMatchCosmetics({ localSeat: 'A', players });
    const viewedByB = resolveMatchCosmetics({ localSeat: 'B', players });

    expect(viewedByA.board.localTheme.ownerSeat).toBe('A');
    expect(viewedByA.board.opponentTheme.ownerSeat).toBe('B');
    expect(viewedByA.checkers.localSet.ownerSeat).toBe('A');
    expect(viewedByA.checkers.opponentSet.ownerSeat).toBe('B');
    expect(viewedByB.board.localTheme.ownerSeat).toBe('B');
    expect(viewedByB.board.opponentTheme.ownerSeat).toBe('A');
    expect(viewedByB.checkers.localSet.ownerSeat).toBe('B');
    expect(viewedByB.checkers.opponentSet.ownerSeat).toBe('A');
    expect(viewedByB.profile.localFrame.ownerSeat).toBe('B');
    expect(viewedByB.profile.opponentFrame.ownerSeat).toBe('A');
    expect(viewedByA.profile.localFrame.presentation.id).toBe('season0_tester_frame');
    expect(viewedByB.profile.opponentFrame.presentation.id).toBe('season0_tester_frame');
    expect(viewedByA.profile.opponentFrame.presentation.id).toBe('default');
  });

  it('falls back to Default for legacy players without cosmetic data', () => {
    const result = resolveMatchCosmetics({ localSeat: 'A', players: { A: {}, B: {} } });
    expect(result.profile.localFrame.presentation.id).toBe('default');
    expect(result.profile.opponentFrame.presentation.id).toBe('default');
  });
});
