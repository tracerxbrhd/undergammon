import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  applyLongNardyEvent,
  createInitialLongNardyState,
  diceValue,
  stateHash,
} from '../src/index.js';

describe('determinism properties', () => {
  it('is deterministic for every non-tied externally supplied opening roll', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 6 }), fc.integer({ min: 1, max: 6 }), (a, b) => {
        fc.pre(a !== b);
        const event = {
          type: 'opening.roll' as const,
          sequence: 1,
          dice: { A: diceValue(a), B: diceValue(b) },
        };
        const first = applyLongNardyEvent(createInitialLongNardyState(), event);
        const second = applyLongNardyEvent(createInitialLongNardyState(), event);
        expect(first).toEqual(second);
        expect(stateHash(first)).toBe(stateHash(second));
      }),
    );
  });
});
