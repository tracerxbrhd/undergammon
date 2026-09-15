import { describe, expect, it } from 'vitest';
import { initialGame, type GameRuleset } from '@undergammon/game-engine';
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
