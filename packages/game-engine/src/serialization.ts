import type { DiceRoll, LongNardyState } from './types.js';
import { validateLongNardyState } from './long-nardy.js';

function canonicalState(state: LongNardyState): object {
  return {
    rulesetId: state.rulesetId,
    rulesetVersion: state.rulesetVersion,
    phase: state.phase,
    board: { A: [...state.board.A], B: [...state.board.B] },
    activePlayer: state.activePlayer,
    diceRoll: state.diceRoll === null ? null : [...state.diceRoll],
    remainingDice: [...state.remainingDice],
    turnNumber: state.turnNumber,
    eventSequence: state.eventSequence,
    result:
      state.result === null
        ? null
        : {
            winner: state.result.winner,
            loser: state.result.loser,
            reason: state.result.reason,
          },
  };
}

function freezeDiceRoll(roll: DiceRoll): DiceRoll {
  return Object.freeze([roll[0], roll[1]]);
}

export function serializeLongNardyState(state: LongNardyState): string {
  const validation = validateLongNardyState(state);
  if (!validation.valid) {
    throw new Error(`Cannot serialize invalid state: ${validation.errors.join('; ')}`);
  }
  return JSON.stringify(canonicalState(state));
}

export function deserializeLongNardyState(serialized: string): LongNardyState {
  const parsed = JSON.parse(serialized) as unknown;
  const validation = validateLongNardyState(parsed);
  if (!validation.valid) {
    throw new Error(`Invalid serialized state: ${validation.errors.join('; ')}`);
  }
  const state = parsed as LongNardyState;
  return Object.freeze({
    ...state,
    board: Object.freeze({
      A: Object.freeze([...state.board.A]),
      B: Object.freeze([...state.board.B]),
    }),
    diceRoll: state.diceRoll === null ? null : freezeDiceRoll(state.diceRoll),
    remainingDice: Object.freeze([...state.remainingDice]),
    result: state.result === null ? null : Object.freeze({ ...state.result }),
  });
}

export function stateHash(state: LongNardyState): string {
  const serialized = serializeLongNardyState(state);
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= BigInt(serialized.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * prime);
  }
  return hash.toString(16).padStart(16, '0');
}
