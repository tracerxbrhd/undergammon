import { describe, expect, it } from 'vitest';
import { initialGame, type BoardState, type GameRuleset } from '@undergammon/game-engine';
import { resolveBoardPointPresentation } from '../src/game/BoardScene';

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
