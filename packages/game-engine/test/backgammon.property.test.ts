import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  applyBackgammonEvent,
  createInitialBackgammonState,
  diceValue,
  generateLegalBackgammonTurnSequences,
  previewBackgammonTurn,
  serializeBackgammonState,
  type DiceValue,
} from '../src/index.js';

const die = fc.integer({ min: 1, max: 6 }).map(diceValue);

describe('Backgammon properties', () => {
  it('preserves checker totals and never overlaps physical points after every legal opening turn', () => {
    fc.assert(
      fc.property(die, die, (a: DiceValue, b: DiceValue) => {
        fc.pre(a !== b);
        const state = applyBackgammonEvent(createInitialBackgammonState(), {
          type: 'backgammon.opening.roll',
          sequence: 1,
          dice: { A: a, B: b },
        });
        for (const sequence of generateLegalBackgammonTurnSequences(state)) {
          const preview = previewBackgammonTurn(state, sequence.moves);
          for (const player of ['A', 'B'] as const) {
            expect(
              preview.board[player].reduce((total, count) => total + count, 0) +
                preview.board.bar[player],
            ).toBe(15);
          }
          for (let point = 0; point < 24; point += 1) {
            expect(
              (preview.board.A[point] ?? 0) > 0 && (preview.board.B[23 - point] ?? 0) > 0,
            ).toBe(false);
          }
        }
      }),
      { numRuns: 60 },
    );
  });

  it('produces byte-identical serialization for identical event inputs', () => {
    fc.assert(
      fc.property(die, die, (a: DiceValue, b: DiceValue) => {
        fc.pre(a !== b);
        const event = {
          type: 'backgammon.opening.roll' as const,
          sequence: 1,
          dice: { A: a, B: b },
        };
        expect(
          serializeBackgammonState(applyBackgammonEvent(createInitialBackgammonState(), event)),
        ).toBe(
          serializeBackgammonState(applyBackgammonEvent(createInitialBackgammonState(), event)),
        );
      }),
      { numRuns: 60 },
    );
  });
});
