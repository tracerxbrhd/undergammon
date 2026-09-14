import { describe, expect, it } from 'vitest';
import {
  BACKGAMMON_BAR,
  applyBackgammonEvent,
  classifyBackgammonWin,
  createInitialBackgammonState,
  diceValue,
  generateLegalBackgammonTurnSequences,
  legalNextBackgammonMoves,
  pointIndex,
  serializeBackgammonState,
  deserializeBackgammonState,
  validateBackgammonState,
  type BackgammonState,
  type DiceRoll,
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
  readonly bar?: Readonly<Record<PlayerId, number>>;
  readonly roll: DiceRoll;
  readonly activePlayer?: PlayerId;
}): BackgammonState {
  const serialized = JSON.parse(serializeBackgammonState(createInitialBackgammonState())) as {
    phase: string;
    board: { A: number[]; B: number[]; bar: Record<PlayerId, number> };
    activePlayer: PlayerId | null;
    diceRoll: number[] | null;
    remainingDice: number[];
    turnNumber: number;
  };
  serialized.phase = 'AWAITING_MOVE';
  serialized.board = {
    A: checkerArray(input.A),
    B: checkerArray(input.B),
    bar: { A: input.bar?.A ?? 0, B: input.bar?.B ?? 0 },
  };
  serialized.activePlayer = input.activePlayer ?? 'A';
  serialized.diceRoll = [...input.roll];
  serialized.remainingDice =
    input.roll[0] === input.roll[1]
      ? [input.roll[0], input.roll[0], input.roll[0], input.roll[0]]
      : [...input.roll];
  serialized.turnNumber = 5;
  return deserializeBackgammonState(JSON.stringify(serialized));
}

describe('Backgammon v1', () => {
  it('creates the standard mirrored starting position with fifteen checkers each', () => {
    const state = createInitialBackgammonState();

    expect(state.rulesetId).toBe('backgammon');
    expect(state.board.A).toEqual(state.board.B);
    expect(state.board.A[0]).toBe(2);
    expect(state.board.A[11]).toBe(5);
    expect(state.board.A[16]).toBe(3);
    expect(state.board.A[18]).toBe(5);
    expect(validateBackgammonState(state)).toEqual({ valid: true, errors: [] });
  });

  it('rerolls an opening tie and gives both opening dice to the winner', () => {
    expect(() =>
      applyBackgammonEvent(createInitialBackgammonState(), {
        type: 'backgammon.opening.roll',
        sequence: 1,
        dice: { A: diceValue(4), B: diceValue(4) },
      }),
    ).toThrow('rerolled');

    const state = applyBackgammonEvent(createInitialBackgammonState(), {
      type: 'backgammon.opening.roll',
      sequence: 1,
      dice: { A: diceValue(6), B: diceValue(1) },
    });
    expect(state.activePlayer).toBe('A');
    expect(state.remainingDice).toEqual([6, 1]);
  });

  it('blocks points with two opposing checkers and hits a blot', () => {
    const blocked = awaitingMoveState({
      A: { 0: 1, 24: 14 },
      B: { 22: 2, 24: 13 },
      roll: [diceValue(1), diceValue(2)],
    });
    expect(legalNextBackgammonMoves(blocked).some((move) => move.to === pointIndex(1))).toBe(false);

    const blot = awaitingMoveState({
      A: { 0: 1, 24: 14 },
      B: { 22: 1, 24: 14 },
      roll: [diceValue(1), diceValue(2)],
    });
    expect(legalNextBackgammonMoves(blot)).toContainEqual({
      from: pointIndex(0),
      to: pointIndex(1),
      die: diceValue(1),
      hit: true,
    });
  });

  it('requires bar re-entry before any board move', () => {
    const state = awaitingMoveState({
      A: { 5: 1, 24: 13 },
      B: { 24: 15 },
      bar: { A: 1, B: 0 },
      roll: [diceValue(2), diceValue(3)],
    });

    expect(legalNextBackgammonMoves(state).every((move) => move.from === BACKGAMMON_BAR)).toBe(
      true,
    );
  });

  it('plays the higher die when only one die can be used', () => {
    const state = awaitingMoveState({
      A: { 24: 14 },
      B: { 21: 2, 23: 2, 24: 11 },
      bar: { A: 1, B: 0 },
      roll: [diceValue(1), diceValue(2)],
    });

    const sequences = generateLegalBackgammonTurnSequences(state);
    expect(sequences).toHaveLength(1);
    expect(sequences[0]?.moves).toEqual([
      { from: BACKGAMMON_BAR, to: pointIndex(1), die: diceValue(2), hit: false },
    ]);
  });

  it('uses four moves for doubles when four moves are possible', () => {
    const state = awaitingMoveState({
      A: { 0: 15 },
      B: { 24: 15 },
      roll: [diceValue(1), diceValue(1)],
    });

    expect(
      generateLegalBackgammonTurnSequences(state).every((sequence) => sequence.moves.length === 4),
    ).toBe(true);
  });

  it('supports exact and highest-checker oversized bearing off', () => {
    const exact = awaitingMoveState({
      A: { 18: 1, 24: 14 },
      B: { 24: 15 },
      roll: [diceValue(6), diceValue(6)],
    });
    expect(
      legalNextBackgammonMoves(exact).some(
        (move) => move.from === 18 && move.to === 24 && move.die === 6,
      ),
    ).toBe(true);

    const oversized = awaitingMoveState({
      A: { 19: 1, 24: 14 },
      B: { 24: 15 },
      roll: [diceValue(6), diceValue(6)],
    });
    expect(
      legalNextBackgammonMoves(oversized).some(
        (move) => move.from === 19 && move.to === 24 && move.die === 6,
      ),
    ).toBe(true);

    const lowerCheckerRemains = awaitingMoveState({
      A: { 18: 1, 23: 1, 24: 13 },
      B: { 24: 15 },
      roll: [diceValue(6), diceValue(6)],
    });
    expect(
      legalNextBackgammonMoves(lowerCheckerRemains).some(
        (move) => move.from === 23 && move.die === 6,
      ),
    ).toBe(false);
  });

  it('classifies single, gammon, and backgammon victories', () => {
    const single = awaitingMoveState({
      A: { 24: 15 },
      B: { 6: 14, 24: 1 },
      roll: [diceValue(1), diceValue(2)],
    });
    const gammon = awaitingMoveState({
      A: { 24: 15 },
      B: { 6: 15 },
      roll: [diceValue(1), diceValue(2)],
    });
    const backgammon = awaitingMoveState({
      A: { 24: 15 },
      B: { 6: 14 },
      bar: { A: 0, B: 1 },
      roll: [diceValue(1), diceValue(2)],
    });

    expect(classifyBackgammonWin(single.board, 'A')).toBe('NORMAL');
    expect(classifyBackgammonWin(gammon.board, 'A')).toBe('GAMMON');
    expect(classifyBackgammonWin(backgammon.board, 'A')).toBe('BACKGAMMON');
  });
});
