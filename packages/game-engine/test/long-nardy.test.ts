import { describe, expect, it } from 'vitest';
import {
  CHECKERS_PER_PLAYER,
  LONG_NARDY_RULESET_ID,
  LONG_NARDY_RULESET_VERSION,
  applyLongNardyEvent,
  createInitialLongNardyState,
  deserializeLongNardyState,
  diceValue,
  pointIndex,
  serializeLongNardyState,
  stateHash,
  validateLongNardyState,
} from '../src/index.js';

describe('Long Nardy initial state', () => {
  it('places 15 checkers for both players on their relative head', () => {
    const state = createInitialLongNardyState();

    expect(state.rulesetId).toBe(LONG_NARDY_RULESET_ID);
    expect(state.rulesetVersion).toBe(LONG_NARDY_RULESET_VERSION);
    expect(state.board.A[0]).toBe(CHECKERS_PER_PLAYER);
    expect(state.board.B[0]).toBe(CHECKERS_PER_PLAYER);
    expect(state.board.A.reduce((sum, count) => sum + count, 0)).toBe(CHECKERS_PER_PLAYER);
    expect(state.board.B.reduce((sum, count) => sum + count, 0)).toBe(CHECKERS_PER_PLAYER);
    expect(validateLongNardyState(state)).toEqual({ valid: true, errors: [] });
  });

  it('rejects out-of-range domain primitives', () => {
    expect(() => pointIndex(25)).toThrow(RangeError);
    expect(() => diceValue(0)).toThrow(RangeError);
  });
});

describe('state persistence and determinism', () => {
  it('round-trips canonical serialization and keeps the same hash', () => {
    const initial = createInitialLongNardyState();
    const restored = deserializeLongNardyState(serializeLongNardyState(initial));

    expect(restored).toEqual(initial);
    expect(stateHash(restored)).toBe(stateHash(initial));
  });

  it('rejects invalid checker totals during deserialization', () => {
    const invalid = JSON.parse(serializeLongNardyState(createInitialLongNardyState())) as {
      board: { A: number[] };
    };
    invalid.board.A[0] = 14;

    expect(() => deserializeLongNardyState(JSON.stringify(invalid))).toThrow(
      'Player A must have exactly 15 checkers',
    );
  });

  it('does not mutate the previous state while applying events', () => {
    const initial = createInitialLongNardyState();
    const before = serializeLongNardyState(initial);
    const next = applyLongNardyEvent(initial, {
      type: 'opening.roll',
      sequence: 1,
      dice: { A: diceValue(6), B: diceValue(2) },
    });

    expect(serializeLongNardyState(initial)).toBe(before);
    expect(next).not.toBe(initial);
    expect(Object.isFrozen(next)).toBe(true);
    expect(Object.isFrozen(next.board.A)).toBe(true);
  });

  it('produces equal state and hash from equal initial state and ordered events', () => {
    const event = {
      type: 'opening.roll' as const,
      sequence: 1,
      dice: { A: diceValue(5), B: diceValue(3) },
    };
    const first = applyLongNardyEvent(createInitialLongNardyState(), event);
    const second = applyLongNardyEvent(createInitialLongNardyState(), event);

    expect(first).toEqual(second);
    expect(stateHash(first)).toBe(stateHash(second));
  });
});
