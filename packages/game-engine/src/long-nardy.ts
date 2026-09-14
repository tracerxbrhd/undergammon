import {
  BEAR_OFF,
  BOARD_POSITION_COUNT,
  CHECKERS_PER_PLAYER,
  HEAD,
  LONG_NARDY_RULESET_ID,
  LONG_NARDY_RULESET_VERSION,
  type BoardState,
  type DiceRoll,
  type DiceValue,
  type LongNardyAction,
  type LongNardyEvent,
  type LongNardyState,
  type PlayerId,
  type Ruleset,
  type ValidationResult,
  pointIndex,
  turnNumber,
} from './types.js';
import {
  isLegalTurnSequence,
  opponentRelativePoint,
  otherPlayer,
  previewLongNardyTurn,
} from './move-generation.js';

const PLAYERS: readonly PlayerId[] = ['A', 'B'];

function createInitialCheckers(): readonly number[] {
  return Object.freeze(
    Array.from({ length: BOARD_POSITION_COUNT }, (_, index) =>
      index === HEAD ? CHECKERS_PER_PLAYER : 0,
    ),
  );
}

function freezeBoard(board: BoardState): BoardState {
  return Object.freeze({
    A: Object.freeze([...board.A]),
    B: Object.freeze([...board.B]),
  });
}

function freezeDiceRoll(roll: DiceRoll): DiceRoll {
  return Object.freeze([roll[0], roll[1]]);
}

function freezeState(state: LongNardyState): LongNardyState {
  return Object.freeze({
    ...state,
    board: freezeBoard(state.board),
    diceRoll: state.diceRoll === null ? null : freezeDiceRoll(state.diceRoll),
    remainingDice: Object.freeze([...state.remainingDice]),
    result: state.result === null ? null : Object.freeze({ ...state.result }),
  });
}

export function createInitialLongNardyState(): LongNardyState {
  return freezeState({
    rulesetId: LONG_NARDY_RULESET_ID,
    rulesetVersion: LONG_NARDY_RULESET_VERSION,
    phase: 'OPENING_ROLL',
    board: { A: createInitialCheckers(), B: createInitialCheckers() },
    activePlayer: null,
    diceRoll: null,
    remainingDice: [],
    turnNumber: turnNumber(0),
    eventSequence: 0,
    result: null,
  });
}

function expandedDice(roll: DiceRoll): readonly DiceValue[] {
  return roll[0] === roll[1]
    ? Object.freeze([roll[0], roll[0], roll[0], roll[0]])
    : Object.freeze([roll[0], roll[1]]);
}

function assertNextSequence(state: LongNardyState, event: LongNardyEvent): void {
  if (event.sequence !== state.eventSequence + 1) {
    throw new Error(
      `Expected event sequence ${String(state.eventSequence + 1)}, received ${String(event.sequence)}`,
    );
  }
  if (state.phase === 'FINISHED') {
    throw new Error('Cannot apply events to a finished game');
  }
}

function applyMoves(
  state: LongNardyState,
  event: Extract<LongNardyEvent, { type: 'move.applied' }>,
): LongNardyState {
  if (state.phase !== 'AWAITING_MOVE' || state.activePlayer !== event.playerId) {
    throw new Error('Moves can only be applied for the active player after a roll');
  }

  if (!isLegalTurnSequence(state, event.moves)) {
    throw new Error('Submitted moves are not an optimal legal turn sequence');
  }
  const preview = previewLongNardyTurn(state, event.moves);
  return freezeState({
    ...state,
    board: preview.board,
    remainingDice: [],
    phase: 'TURN_TRANSITION',
    eventSequence: event.sequence,
  });
}

export function applyLongNardyEvent(state: LongNardyState, event: LongNardyEvent): LongNardyState {
  assertNextSequence(state, event);

  switch (event.type) {
    case 'opening.roll': {
      if (state.phase !== 'OPENING_ROLL') {
        throw new Error('Opening roll can only be applied to a new game');
      }
      if (event.dice.A === event.dice.B) {
        throw new Error('Opening roll must be rerolled on a tie');
      }
      const activePlayer: PlayerId = event.dice.A > event.dice.B ? 'A' : 'B';
      const roll: DiceRoll = [event.dice.A, event.dice.B];
      return freezeState({
        ...state,
        activePlayer,
        diceRoll: roll,
        remainingDice: expandedDice(roll),
        phase: 'AWAITING_MOVE',
        turnNumber: turnNumber(1),
        eventSequence: event.sequence,
      });
    }
    case 'dice.rolled': {
      if (state.phase !== 'WAITING_FOR_ROLL' || state.activePlayer !== event.playerId) {
        throw new Error('Only the active player can receive a dice roll');
      }
      return freezeState({
        ...state,
        diceRoll: event.roll,
        remainingDice: expandedDice(event.roll),
        phase: 'AWAITING_MOVE',
        eventSequence: event.sequence,
      });
    }
    case 'move.applied':
      return applyMoves(state, event);
    case 'turn.changed': {
      if (state.phase !== 'TURN_TRANSITION') {
        throw new Error('Turn can only change after all dice are consumed');
      }
      if (event.activePlayer === state.activePlayer) {
        throw new Error('Turn must change to the other player');
      }
      if (
        state.activePlayer !== null &&
        (state.board[state.activePlayer][BEAR_OFF] ?? 0) === CHECKERS_PER_PLAYER
      ) {
        throw new Error('A player who bore off all checkers must finish the match');
      }
      return freezeState({
        ...state,
        activePlayer: event.activePlayer,
        diceRoll: null,
        remainingDice: [],
        phase: 'WAITING_FOR_ROLL',
        turnNumber: turnNumber(state.turnNumber + 1),
        eventSequence: event.sequence,
      });
    }
    case 'match.finished': {
      if (event.result.winner !== null && event.result.loser !== otherPlayer(event.result.winner)) {
        throw new Error('Winner and loser must be opposing players');
      }
      if (
        event.result.reason === 'BEAR_OFF' &&
        (event.result.winner === null ||
          (state.board[event.result.winner][BEAR_OFF] ?? 0) !== CHECKERS_PER_PLAYER)
      ) {
        throw new Error('Bear-off result requires a winner with all checkers off the board');
      }
      return freezeState({
        ...state,
        phase: 'FINISHED',
        remainingDice: [],
        result: event.result,
        eventSequence: event.sequence,
      });
    }
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateCheckerArray(value: unknown, player: PlayerId): readonly string[] {
  if (!Array.isArray(value) || value.length !== BOARD_POSITION_COUNT) {
    return [`Player ${player} must have exactly ${String(BOARD_POSITION_COUNT)} positions`];
  }
  const positions: readonly unknown[] = value;
  const errors: string[] = [];
  let total = 0;
  for (const [index, count] of positions.entries()) {
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) {
      errors.push(`Player ${player} position ${String(index)} must be a non-negative integer`);
    } else {
      total += count;
    }
  }
  if (total !== CHECKERS_PER_PLAYER) {
    errors.push(`Player ${player} must have exactly ${String(CHECKERS_PER_PLAYER)} checkers`);
  }
  return errors;
}

export function validateLongNardyState(value: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) {
    return { valid: false, errors: ['State must be an object'] };
  }
  if (value.rulesetId !== LONG_NARDY_RULESET_ID) errors.push('Unexpected ruleset ID');
  if (value.rulesetVersion !== LONG_NARDY_RULESET_VERSION) {
    errors.push('Unexpected ruleset version');
  }
  if (!isRecord(value.board)) {
    errors.push('Board must be an object');
  } else {
    for (const player of PLAYERS) errors.push(...validateCheckerArray(value.board[player], player));
    if (Array.isArray(value.board.A) && Array.isArray(value.board.B)) {
      const boardA: readonly unknown[] = value.board.A;
      const boardB: readonly unknown[] = value.board.B;
      for (let point = HEAD; point < BEAR_OFF; point += 1) {
        const aCount = boardA[point];
        const bCount = boardB[opponentRelativePoint(point)];
        if (typeof aCount === 'number' && aCount > 0 && typeof bCount === 'number' && bCount > 0) {
          errors.push(`Both players cannot occupy physical point ${String(point)}`);
        }
      }
    }
  }
  if (!Number.isInteger(value.turnNumber) || Number(value.turnNumber) < 0) {
    errors.push('Turn number must be a non-negative integer');
  }
  if (!Number.isInteger(value.eventSequence) || Number(value.eventSequence) < 0) {
    errors.push('Event sequence must be a non-negative integer');
  }
  if (value.activePlayer !== null && !PLAYERS.includes(value.activePlayer as PlayerId)) {
    errors.push('Active player must be A, B, or null');
  }
  if (
    !Array.isArray(value.remainingDice) ||
    value.remainingDice.some((die) => !Number.isInteger(die) || die < 1 || die > 6)
  ) {
    errors.push('Remaining dice must contain values from 1 to 6');
  }
  if (
    value.diceRoll !== null &&
    (!Array.isArray(value.diceRoll) ||
      value.diceRoll.length !== 2 ||
      value.diceRoll.some((die) => !Number.isInteger(die) || die < 1 || die > 6))
  ) {
    errors.push('Dice roll must be null or contain exactly two values from 1 to 6');
  }
  const phases: readonly string[] = [
    'OPENING_ROLL',
    'WAITING_FOR_ROLL',
    'AWAITING_MOVE',
    'TURN_TRANSITION',
    'FINISHED',
  ];
  if (typeof value.phase !== 'string' || !phases.includes(value.phase)) {
    errors.push('Unexpected game phase');
  }
  if (value.phase === 'OPENING_ROLL' && value.activePlayer !== null) {
    errors.push('Opening-roll phase cannot have an active player');
  }
  if (
    (value.phase === 'WAITING_FOR_ROLL' ||
      value.phase === 'AWAITING_MOVE' ||
      value.phase === 'TURN_TRANSITION') &&
    !PLAYERS.includes(value.activePlayer as PlayerId)
  ) {
    errors.push('An active turn phase requires an active player');
  }
  if (value.phase === 'AWAITING_MOVE' && value.diceRoll === null) {
    errors.push('Awaiting-move phase requires a dice roll');
  }
  if (value.phase === 'FINISHED' && !isRecord(value.result)) {
    errors.push('Finished phase requires a result');
  }
  return { valid: errors.length === 0, errors };
}

export function validateLongNardyAction(
  state: LongNardyState,
  action: LongNardyAction,
): ValidationResult {
  const errors: string[] = [];
  if (state.phase === 'FINISHED') errors.push('Game is already finished');
  if (action.type !== 'surrender.request' && action.playerId !== state.activePlayer) {
    errors.push('Action does not belong to the active player');
  }
  if (action.type === 'roll.request' && state.phase !== 'WAITING_FOR_ROLL') {
    errors.push('Roll is not currently allowed');
  }
  if (action.type === 'move.submit' && state.phase !== 'AWAITING_MOVE') {
    errors.push('Move is not currently allowed');
  }
  if (
    action.type === 'move.submit' &&
    state.phase === 'AWAITING_MOVE' &&
    !isLegalTurnSequence(state, action.moves)
  ) {
    errors.push('Moves are not an optimal legal turn sequence');
  }
  return { valid: errors.length === 0, errors };
}

export const longNardyRuleset: Ruleset<LongNardyState, LongNardyAction, LongNardyEvent> =
  Object.freeze({
    id: LONG_NARDY_RULESET_ID,
    version: LONG_NARDY_RULESET_VERSION,
    createInitialState: createInitialLongNardyState,
    applyEvent: applyLongNardyEvent,
    validateState: validateLongNardyState,
    validateAction: validateLongNardyAction,
  });

export const longNardyCoordinates = Object.freeze({
  head: pointIndex(HEAD),
  route: Object.freeze(Array.from({ length: 17 }, (_, index) => pointIndex(index + 1))),
  home: Object.freeze(Array.from({ length: 6 }, (_, index) => pointIndex(index + 18))),
  bearOff: pointIndex(BEAR_OFF),
});
