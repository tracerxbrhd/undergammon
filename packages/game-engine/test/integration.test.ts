import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  initialGame,
  openGame,
  rollGame,
  commitTurn,
  legalTurns,
  diceValue,
  validateBackgammonState,
  validateLongNardyState,
  type GameState,
} from '../src/index.js';
describe('integrated deterministic games', () => {
  it('preserves board invariants through multi-turn games for both rulesets', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(fc.integer({ min: 1, max: 6 }), fc.integer({ min: 1, max: 6 })), {
          minLength: 30,
          maxLength: 50,
        }),
        (rolls) => {
          for (const ruleset of ['LONG_NARDY', 'BACKGAMMON'] as const) {
            let state: GameState = openGame(initialGame(ruleset), [6, 1]);
            for (const [a, b] of rolls) {
              if (state.phase === 'FINISHED') break;
              if (state.phase === 'WAITING_FOR_ROLL')
                state = rollGame(state, [diceValue(a), diceValue(b)]);
              const turn = legalTurns(state)[0];
              expect(turn).toBeDefined();
              const before = JSON.stringify(state);
              const next = commitTurn(state, turn ?? []);
              expect(next).toEqual(commitTurn(state, turn ?? []));
              expect(JSON.stringify(state)).toBe(before);
              expect(
                next.rulesetId === 'long_nardy'
                  ? validateLongNardyState(next).valid
                  : validateBackgammonState(next).valid,
              ).toBe(true);
              state = next;
            }
          }
        },
      ),
      { numRuns: 5 },
    );
  });
  it('rejects illegal full-turn submissions and wrong phases', () => {
    const s = openGame(initialGame('BACKGAMMON'), [6, 1]);
    expect(() => commitTurn(s, [])).toThrow();
    expect(() => rollGame(s, [1, 1])).toThrow();
    expect(() => commitTurn(s, [{ from: 0, to: 24, die: 6 }])).toThrow();
  });
});
