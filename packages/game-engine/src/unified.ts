import { applyLongNardyEvent, createInitialLongNardyState } from './long-nardy.js';
import {
  applyBackgammonEvent,
  createInitialBackgammonState,
  createBackgammonBearOffResult,
  validateBackgammonState,
} from './backgammon.js';
import {
  generateLegalTurnSequences,
  previewLongNardyTurn,
  otherPlayer,
} from './move-generation.js';
import {
  generateLegalBackgammonTurnSequences,
  previewBackgammonTurn,
} from './backgammon-move-generation.js';
import type {
  BackgammonState,
  BackgammonCheckerMove,
  BackgammonBoardState,
} from './backgammon-types.js';
import {
  pointIndex,
  diceValue,
  type BoardState,
  type LongNardyState,
  type DiceRoll,
  type PlayerId,
  type CheckerMove,
} from './types.js';

export type GameState = LongNardyState | BackgammonState;
export type Move = { readonly from: number | 'BAR'; readonly to: number; readonly die: number };
export type GameRuleset = 'LONG_NARDY' | 'BACKGAMMON';
export function initialGame(ruleset: GameRuleset): GameState {
  return ruleset === 'LONG_NARDY' ? createInitialLongNardyState() : createInitialBackgammonState();
}
export function openGame(state: GameState, dice: DiceRoll): GameState {
  const data = { sequence: state.eventSequence + 1, dice: { A: dice[0], B: dice[1] } };
  return state.rulesetId === 'long_nardy'
    ? applyLongNardyEvent(state, { type: 'opening.roll', ...data })
    : applyBackgammonEvent(state, { type: 'backgammon.opening.roll', ...data });
}
export function rollGame(state: GameState, roll: DiceRoll): GameState {
  if (!state.activePlayer) throw new Error('NO_ACTIVE_PLAYER');
  const data = { sequence: state.eventSequence + 1, playerId: state.activePlayer, roll };
  return state.rulesetId === 'long_nardy'
    ? applyLongNardyEvent(state, { type: 'dice.rolled', ...data })
    : applyBackgammonEvent(state, { type: 'backgammon.dice.rolled', ...data });
}
export function legalTurns(state: GameState): readonly (readonly Move[])[] {
  return state.rulesetId === 'long_nardy'
    ? generateLegalTurnSequences(state).map((s) => s.moves)
    : generateLegalBackgammonTurnSequences(state).map((s) =>
        s.moves.map(({ from, to, die }) => ({ from, to, die })),
      );
}
export function sameMove(a: Move, b: Move): boolean {
  return a.from === b.from && a.to === b.to && a.die === b.die;
}
export function matchingTurns(state: GameState, draft: readonly Move[]) {
  return legalTurns(state).filter(
    (turn) =>
      draft.length <= turn.length &&
      draft.every((move, i) => {
        const candidate = turn[i];
        return candidate !== undefined && sameMove(move, candidate);
      }),
  );
}
function nardyMoves(moves: readonly Move[]): CheckerMove[] {
  return moves.map((m) => {
    if (m.from === 'BAR') throw new Error('INVALID_SOURCE');
    return { from: pointIndex(m.from), to: pointIndex(m.to), die: diceValue(m.die) };
  });
}
function backgammonMoves(
  state: BackgammonState,
  moves: readonly Move[],
): readonly BackgammonCheckerMove[] {
  const turn = generateLegalBackgammonTurnSequences(state).find((s) =>
    moves.every((m, i) => {
      const candidate = s.moves[i];
      return candidate !== undefined && sameMove(m, candidate);
    }),
  );
  if (!turn) throw new Error('ILLEGAL_TURN');
  return turn.moves.slice(0, moves.length);
}
export function previewGame(
  state: GameState,
  moves: readonly Move[],
): BoardState | BackgammonBoardState {
  return state.rulesetId === 'long_nardy'
    ? previewLongNardyTurn(state, nardyMoves(moves)).board
    : previewBackgammonTurn(state, backgammonMoves(state, moves)).board;
}
export function commitTurn(state: GameState, moves: readonly Move[]): GameState {
  if (!state.activePlayer || !matchingTurns(state, moves).some((t) => t.length === moves.length))
    throw new Error('ILLEGAL_TURN');
  const playerId = state.activePlayer;
  if (state.rulesetId === 'long_nardy') {
    const next = applyLongNardyEvent(state, {
      type: 'move.applied',
      sequence: state.eventSequence + 1,
      playerId,
      moves: nardyMoves(moves),
    });
    return next.board[playerId][24] === 15
      ? applyLongNardyEvent(next, {
          type: 'match.finished',
          sequence: next.eventSequence + 1,
          result: { winner: playerId, loser: otherPlayer(playerId), reason: 'BEAR_OFF' },
        })
      : applyLongNardyEvent(next, {
          type: 'turn.changed',
          sequence: next.eventSequence + 1,
          activePlayer: otherPlayer(playerId),
        });
  }
  const next = applyBackgammonEvent(state, {
    type: 'backgammon.move.applied',
    sequence: state.eventSequence + 1,
    playerId,
    moves: backgammonMoves(state, moves),
  });
  return next.board[playerId][24] === 15
    ? applyBackgammonEvent(next, {
        type: 'backgammon.match.finished',
        sequence: next.eventSequence + 1,
        result: createBackgammonBearOffResult(next, playerId),
      })
    : applyBackgammonEvent(next, {
        type: 'backgammon.turn.changed',
        sequence: next.eventSequence + 1,
        activePlayer: otherPlayer(playerId),
      });
}
export function physicalPoint(state: GameState, player: PlayerId, point: number): number {
  return player === 'A' ? point : state.rulesetId === 'long_nardy' ? (point + 12) % 24 : 23 - point;
}
export function serializeBackgammonState(state: BackgammonState): string {
  if (!validateBackgammonState(state).valid) throw new Error('INVALID_STATE');
  return JSON.stringify(state);
}

export function deserializeBackgammonState(serialized: string): BackgammonState {
  const value: unknown = JSON.parse(serialized);
  if (!validateBackgammonState(value).valid) throw new Error('INVALID_STATE');
  return value as BackgammonState;
}
