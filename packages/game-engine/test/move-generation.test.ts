import { describe, expect, it } from 'vitest';
import {
  applyLongNardyEvent,
  createInitialLongNardyState,
  deserializeLongNardyState,
  diceValue,
  generateLegalTurnSequences,
  isLegalTurnSequence,
  legalNextMoves,
  pointIndex,
  serializeLongNardyState,
  validateLongNardyAction,
  type DiceRoll,
  type LongNardyState,
  type PlayerId,
} from '../src/index.js';

function checkerArray(entries: Readonly<Record<number, number>>): number[] {
  const checkers = Array.from({ length: 25 }, () => 0);
  for (const [point, count] of Object.entries(entries)) checkers[Number(point)] = count;
  return checkers;
}

function awaitingMoveState(input: {
  readonly A: Readonly<Record<number, number>>;
  readonly B: Readonly<Record<number, number>>;
  readonly roll: DiceRoll;
  readonly activePlayer?: PlayerId;
  readonly turnNumber?: number;
}): LongNardyState {
  const serialized = JSON.parse(serializeLongNardyState(createInitialLongNardyState())) as {
    phase: string;
    board: { A: number[]; B: number[] };
    activePlayer: PlayerId | null;
    diceRoll: number[] | null;
    remainingDice: number[];
    turnNumber: number;
  };
  serialized.phase = 'AWAITING_MOVE';
  serialized.board = { A: checkerArray(input.A), B: checkerArray(input.B) };
  serialized.activePlayer = input.activePlayer ?? 'A';
  serialized.diceRoll = [...input.roll];
  serialized.remainingDice =
    input.roll[0] === input.roll[1]
      ? [input.roll[0], input.roll[0], input.roll[0], input.roll[0]]
      : [...input.roll];
  serialized.turnNumber = input.turnNumber ?? 5;
  return deserializeLongNardyState(JSON.stringify(serialized));
}

describe('Long Nardy legal turn generation', () => {
  it('uses both opening dice while allowing only one checker off the head', () => {
    const state = applyLongNardyEvent(createInitialLongNardyState(), {
      type: 'opening.roll',
      sequence: 1,
      dice: { A: diceValue(6), B: diceValue(2) },
    });

    const sequences = generateLegalTurnSequences(state);

    expect(sequences).toHaveLength(2);
    expect(sequences.every((sequence) => sequence.moves.length === 2)).toBe(true);
    expect(
      sequences.every(
        (sequence) => sequence.moves.filter((move) => move.from === pointIndex(0)).length === 1,
      ),
    ).toBe(true);
    expect(sequences.map((sequence) => sequence.moves.map((move) => move.die))).toEqual([
      [diceValue(2), diceValue(6)],
      [diceValue(6), diceValue(2)],
    ]);
  });

  it('rejects a legal-looking prefix when a fuller turn is available', () => {
    const state = applyLongNardyEvent(createInitialLongNardyState(), {
      type: 'opening.roll',
      sequence: 1,
      dice: { A: diceValue(6), B: diceValue(2) },
    });
    const prefix = [{ from: pointIndex(0), to: pointIndex(6), die: diceValue(6) }] as const;

    expect(isLegalTurnSequence(state, prefix)).toBe(false);
    expect(
      validateLongNardyAction(state, { type: 'move.submit', playerId: 'A', moves: prefix }),
    ).toEqual({ valid: false, errors: ['Moves are not an optimal legal turn sequence'] });
  });

  it('allows the second player to take two checkers from the head on the first 3-3', () => {
    let state = applyLongNardyEvent(createInitialLongNardyState(), {
      type: 'opening.roll',
      sequence: 1,
      dice: { A: diceValue(6), B: diceValue(2) },
    });
    state = applyLongNardyEvent(state, {
      type: 'move.applied',
      sequence: 2,
      playerId: 'A',
      moves: generateLegalTurnSequences(state)[0]?.moves ?? [],
    });
    state = applyLongNardyEvent(state, {
      type: 'turn.changed',
      sequence: 3,
      activePlayer: 'B',
    });
    state = applyLongNardyEvent(state, {
      type: 'dice.rolled',
      sequence: 4,
      playerId: 'B',
      roll: [diceValue(3), diceValue(3)],
    });

    expect(
      generateLegalTurnSequences(state).some(
        (sequence) => sequence.moves.filter((move) => move.from === pointIndex(0)).length === 2,
      ),
    ).toBe(true);
  });

  it('maps opponent occupancy onto the same physical point', () => {
    const state = awaitingMoveState({
      A: { 0: 15 },
      B: { 0: 14, 18: 1 },
      roll: [diceValue(6), diceValue(2)],
    });

    expect(legalNextMoves(state)).not.toContainEqual({
      from: pointIndex(0),
      to: pointIndex(6),
      die: diceValue(6),
    });
  });

  it('plays the larger die when either die is possible but both cannot be used', () => {
    const state = awaitingMoveState({
      A: { 0: 15 },
      B: { 0: 14, 17: 1 },
      roll: [diceValue(2), diceValue(3)],
    });

    const sequences = generateLegalTurnSequences(state);

    expect(sequences).toHaveLength(1);
    expect(sequences[0]?.moves).toEqual([
      { from: pointIndex(0), to: pointIndex(3), die: diceValue(3) },
    ]);
  });

  it('returns an empty legal sequence when no die can be played', () => {
    const state = awaitingMoveState({
      A: { 0: 15 },
      B: { 0: 13, 13: 1, 14: 1 },
      roll: [diceValue(1), diceValue(2)],
    });

    expect(generateLegalTurnSequences(state).map((sequence) => sequence.moves)).toEqual([[]]);
  });

  it('requires lower home points to clear before an oversized bear-off', () => {
    const state = awaitingMoveState({
      A: { 18: 1, 23: 1, 24: 13 },
      B: { 0: 15 },
      roll: [diceValue(6), diceValue(2)],
    });

    expect(legalNextMoves(state)).not.toContainEqual({
      from: pointIndex(23),
      to: pointIndex(24),
      die: diceValue(6),
    });
    expect(generateLegalTurnSequences(state).some((sequence) => sequence.moves.length === 2)).toBe(
      true,
    );
  });

  it('forbids a six-prime that traps all opposing checkers, including transiently', () => {
    const trapped = awaitingMoveState({
      A: { 0: 9, 6: 1, 7: 1, 8: 1, 9: 1, 10: 2 },
      B: { 0: 15 },
      roll: [diceValue(1), diceValue(1)],
    });
    const passed = awaitingMoveState({
      A: { 0: 9, 6: 1, 7: 1, 8: 1, 9: 1, 10: 2 },
      B: { 0: 14, 24: 1 },
      roll: [diceValue(1), diceValue(1)],
    });
    const completingMove = {
      from: pointIndex(10),
      to: pointIndex(11),
      die: diceValue(1),
    };

    expect(legalNextMoves(trapped)).not.toContainEqual(completingMove);
    expect(legalNextMoves(passed)).toContainEqual(completingMove);
  });
});
