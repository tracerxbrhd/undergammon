import { describe, expect, it } from 'vitest';
import {
  commitTurn,
  initialGame,
  legalTurns,
  openGame,
  rollGame,
  type BoardState,
  type GameRuleset,
} from '@undergammon/game-engine';
import {
  resolveBoardPointPresentation,
  resolveBoardThemeRegionClasses,
  resolveDicePresentationClasses,
} from '../src/game/BoardScene';
import { resolveMatchCosmetics } from '../src/game/cosmetics';

describe.each(['LONG_NARDY', 'BACKGAMMON'] satisfies GameRuleset[])(
  '%s Board Scene presentation',
  (ruleset) => {
    it.each(['A', 'B'] as const)(
      'preserves all 24 points and checker ownership for seat %s',
      (seat) => {
        const game = initialGame(ruleset);
        const points = resolveBoardPointPresentation(game, game.board, seat);

        expect(points).toHaveLength(24);
        expect(new Set(points.map(({ physical }) => physical)).size).toBe(24);
        expect([...points.map(({ point }) => point)].sort((a, b) => a - b)).toEqual(
          Array.from({ length: 24 }, (_, point) => point),
        );
        expect(points.reduce((total, { amount }) => total + amount, 0)).toBe(30);
        expect(
          points.reduce((total, point) => total + (point.owner === 'A' ? point.amount : 0), 0),
        ).toBe(15);
        expect(
          points.reduce((total, point) => total + (point.owner === 'B' ? point.amount : 0), 0),
        ).toBe(15);
      },
    );
  },
);

describe.each([
  {
    ruleset: 'LONG_NARDY',
    bPhysical: 19,
    bStackFromA: 19,
    aStackFromB: 14,
  },
  {
    ruleset: 'BACKGAMMON',
    bPhysical: 16,
    bStackFromA: 16,
    aStackFromB: 21,
  },
] satisfies {
  ruleset: GameRuleset;
  bPhysical: number;
  bStackFromA: number;
  aStackFromB: number;
}[])('$ruleset asymmetric Board Scene presentation', (testCase) => {
  it('maps distinct A and B stacks through both player perspectives', () => {
    const game = initialGame(testCase.ruleset);
    const aPoints = Array.from({ length: 25 }, () => 0);
    const bPoints = Array.from({ length: 25 }, () => 0);
    aPoints[2] = 4;
    bPoints[7] = 6;
    const board: BoardState = { A: aPoints, B: bPoints };

    const viewedByA = resolveBoardPointPresentation(game, board, 'A');
    const viewedByB = resolveBoardPointPresentation(game, board, 'B');

    expect(viewedByA.find(({ point }) => point === 2)).toMatchObject({
      owner: 'A',
      amount: 4,
      physical: 2,
    });
    expect(viewedByA.find(({ point }) => point === testCase.bStackFromA)).toMatchObject({
      owner: 'B',
      amount: 6,
      physical: testCase.bPhysical,
    });
    expect(viewedByB.find(({ point }) => point === 7)).toMatchObject({
      owner: 'B',
      amount: 6,
      physical: testCase.bPhysical,
    });
    expect(viewedByB.find(({ point }) => point === testCase.aStackFromB)).toMatchObject({
      owner: 'A',
      amount: 4,
      physical: 2,
    });
  });
});

describe.each(['LONG_NARDY', 'BACKGAMMON'] satisfies GameRuleset[])(
  '%s hybrid Board Theme presentation',
  (ruleset) => {
    const players = {
      A: { cosmetics: { profileFrame: 'default' as const, boardTheme: 'midnight_board' as const } },
      B: { cosmetics: { profileFrame: 'default' as const } },
    };

    it('maps authoritative A/B board regions through both viewer perspectives', () => {
      const game = initialGame(ruleset);

      expect(
        resolveBoardThemeRegionClasses(
          game,
          'A',
          resolveMatchCosmetics({ localSeat: 'A', players }),
        ),
      ).toEqual({ top: 'board-theme-midnight', bottom: 'board-theme-default' });
      expect(
        resolveBoardThemeRegionClasses(
          game,
          'B',
          resolveMatchCosmetics({ localSeat: 'B', players }),
        ),
      ).toEqual({ top: 'board-theme-default', bottom: 'board-theme-midnight' });
    });
  },
);

describe.each(['LONG_NARDY', 'BACKGAMMON'] satisfies GameRuleset[])(
  '%s Board Scene Dice Skin presentation',
  (ruleset) => {
    const players = {
      A: { cosmetics: { profileFrame: 'default' as const, diceSkin: 'obsidian_dice' as const } },
      B: { cosmetics: { profileFrame: 'default' as const } },
    };

    it('keeps opening dice attached to seats A and B in both perspectives', () => {
      const opening = openGame(initialGame(ruleset), [6, 2]);

      expect(
        resolveDicePresentationClasses(
          opening,
          'A',
          resolveMatchCosmetics({ localSeat: 'A', players }),
        ),
      ).toEqual(['dice-skin-obsidian', 'dice-skin-default']);
      expect(
        resolveDicePresentationClasses(
          opening,
          'B',
          resolveMatchCosmetics({ localSeat: 'B', players }),
        ),
      ).toEqual(['dice-skin-obsidian', 'dice-skin-default']);
    });

    it('uses the active player Dice Skin for both dice after the opening turn', () => {
      const opening = openGame(initialGame(ruleset), [2, 6]);
      const openingTurn = legalTurns(opening)[0];
      if (!openingTurn) throw new Error('Expected a legal opening turn');
      const waitingForA = commitTurn(opening, openingTurn);
      const rolledByA = rollGame(waitingForA, [3, 1]);

      expect(rolledByA.activePlayer).toBe('A');
      expect(
        resolveDicePresentationClasses(
          rolledByA,
          'A',
          resolveMatchCosmetics({ localSeat: 'A', players }),
        ),
      ).toEqual(['dice-skin-obsidian', 'dice-skin-obsidian']);
      expect(
        resolveDicePresentationClasses(
          rolledByA,
          'B',
          resolveMatchCosmetics({ localSeat: 'B', players }),
        ),
      ).toEqual(['dice-skin-obsidian', 'dice-skin-obsidian']);
    });

    it('switches both dice to the other active player presentation after the opening turn', () => {
      const opening = openGame(initialGame(ruleset), [6, 2]);
      const openingTurn = legalTurns(opening)[0];
      if (!openingTurn) throw new Error('Expected a legal opening turn');
      const waitingForB = commitTurn(opening, openingTurn);
      const rolledByB = rollGame(waitingForB, [4, 2]);

      expect(rolledByB.activePlayer).toBe('B');
      expect(
        resolveDicePresentationClasses(
          rolledByB,
          'A',
          resolveMatchCosmetics({ localSeat: 'A', players }),
        ),
      ).toEqual(['dice-skin-default', 'dice-skin-default']);
      expect(
        resolveDicePresentationClasses(
          rolledByB,
          'B',
          resolveMatchCosmetics({ localSeat: 'B', players }),
        ),
      ).toEqual(['dice-skin-default', 'dice-skin-default']);
    });
  },
);
