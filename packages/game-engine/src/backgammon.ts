import {
  type BackgammonAction,
  type BackgammonBoardState,
  type BackgammonEvent,
  type BackgammonGameResult,
  type BackgammonState,
  type BackgammonWinClass,
} from './backgammon-types.js';
import {
  backgammonOpponentRelativePoint,
  backgammonOtherPlayer,
  isLegalBackgammonTurnSequence,
  previewBackgammonTurn,
} from './backgammon-move-generation.js';
import {
  BACKGAMMON_RULESET_ID,
  BACKGAMMON_RULESET_VERSION,
  BEAR_OFF,
  BOARD_POSITION_COUNT,
  CHECKERS_PER_PLAYER,
  type DiceRoll,
  type DiceValue,
  type PlayerId,
  type Ruleset,
  type ValidationResult,
  pointIndex,
  turnNumber,
} from './types.js';

const PLAYERS: readonly PlayerId[] = ['A', 'B'];

function initialCheckers(): readonly number[] {
  const points = Array.from({ length: BOARD_POSITION_COUNT }, () => 0);
  points[0] = 2;
  points[11] = 5;
  points[16] = 3;
  points[18] = 5;
  return Object.freeze(points);
}

function freezeBoard(board: BackgammonBoardState): BackgammonBoardState {
  return Object.freeze({
    A: Object.freeze([...board.A]),
    B: Object.freeze([...board.B]),
    bar: Object.freeze({ ...board.bar }),
  });
}

function freezeDiceRoll(roll: DiceRoll): DiceRoll {
  return Object.freeze([roll[0], roll[1]]);
}

function freezeState(state: BackgammonState): BackgammonState {
  return Object.freeze({
    ...state,
    board: freezeBoard(state.board),
    diceRoll: state.diceRoll === null ? null : freezeDiceRoll(state.diceRoll),
    remainingDice: Object.freeze([...state.remainingDice]),
    result: state.result === null ? null : Object.freeze({ ...state.result }),
  });
}

export function createInitialBackgammonState(): BackgammonState {
  return freezeState({
    rulesetId: BACKGAMMON_RULESET_ID,
    rulesetVersion: BACKGAMMON_RULESET_VERSION,
    phase: 'OPENING_ROLL',
    board: { A: initialCheckers(), B: initialCheckers(), bar: { A: 0, B: 0 } },
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

export function classifyBackgammonWin(
  board: BackgammonBoardState,
  winner: PlayerId,
): BackgammonWinClass {
  const loser = backgammonOtherPlayer(winner);
  if ((board[loser][BEAR_OFF] ?? 0) > 0) return 'NORMAL';
  const loserInWinnersHome = board[loser].slice(0, 6).some((count) => count > 0);
  return board.bar[loser] > 0 || loserInWinnersHome ? 'BACKGAMMON' : 'GAMMON';
}

function assertNextEvent(state: BackgammonState, event: BackgammonEvent): void {
  if (event.sequence !== state.eventSequence + 1) {
    throw new Error(
      `Expected event sequence ${String(state.eventSequence + 1)}, received ${String(event.sequence)}`,
    );
  }
  if (state.phase === 'FINISHED') throw new Error('Cannot apply events to a finished game');
}

export function applyBackgammonEvent(
  state: BackgammonState,
  event: BackgammonEvent,
): BackgammonState {
  assertNextEvent(state, event);
  switch (event.type) {
    case 'backgammon.opening.roll': {
      if (state.phase !== 'OPENING_ROLL') {
        throw new Error('Opening roll can only be applied to a new Backgammon game');
      }
      if (event.dice.A === event.dice.B) throw new Error('Opening roll must be rerolled on a tie');
      const activePlayer: PlayerId = event.dice.A > event.dice.B ? 'A' : 'B';
      const roll: DiceRoll = Object.freeze([event.dice.A, event.dice.B]);
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
    case 'backgammon.dice.rolled':
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
    case 'backgammon.move.applied': {
      if (state.phase !== 'AWAITING_MOVE' || state.activePlayer !== event.playerId) {
        throw new Error('Moves can only be applied for the active player after a roll');
      }
      if (!isLegalBackgammonTurnSequence(state, event.moves)) {
        throw new Error('Submitted moves are not an optimal legal Backgammon turn sequence');
      }
      const preview = previewBackgammonTurn(state, event.moves);
      return freezeState({
        ...state,
        board: preview.board,
        remainingDice: [],
        phase: 'TURN_TRANSITION',
        eventSequence: event.sequence,
      });
    }
    case 'backgammon.turn.changed':
      if (state.phase !== 'TURN_TRANSITION') throw new Error('Turn can only change after a move');
      if (event.activePlayer === state.activePlayer) throw new Error('Turn must change players');
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
    case 'backgammon.match.finished': {
      const { result } = event;
      if (result.winner !== null && result.loser !== backgammonOtherPlayer(result.winner)) {
        throw new Error('Winner and loser must be opposing players');
      }
      if (result.reason === 'BEAR_OFF') {
        if (
          result.winner === null ||
          (state.board[result.winner][BEAR_OFF] ?? 0) !== CHECKERS_PER_PLAYER
        ) {
          throw new Error('Bear-off result requires a winner with all checkers off the board');
        }
        if (result.winClass !== classifyBackgammonWin(state.board, result.winner)) {
          throw new Error('Backgammon win classification does not match the final position');
        }
      }
      return freezeState({
        ...state,
        phase: 'FINISHED',
        remainingDice: [],
        result,
        eventSequence: event.sequence,
      });
    }
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateCheckerArray(value: unknown, player: PlayerId, bar: unknown): readonly string[] {
  if (!Array.isArray(value) || value.length !== BOARD_POSITION_COUNT) {
    return [`Player ${player} must have exactly ${String(BOARD_POSITION_COUNT)} positions`];
  }
  const errors: string[] = [];
  let total = 0;
  for (const [index, count] of value.entries()) {
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) {
      errors.push(`Player ${player} position ${String(index)} must be a non-negative integer`);
    } else {
      total += count;
    }
  }
  if (typeof bar !== 'number' || !Number.isInteger(bar) || bar < 0) {
    errors.push(`Player ${player} bar must be a non-negative integer`);
  } else {
    total += bar;
  }
  if (total !== CHECKERS_PER_PLAYER) {
    errors.push(`Player ${player} must have exactly ${String(CHECKERS_PER_PLAYER)} checkers`);
  }
  return errors;
}

export function validateBackgammonState(value: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isRecord(value)) return { valid: false, errors: ['State must be an object'] };
  if (value.rulesetId !== BACKGAMMON_RULESET_ID) errors.push('Unexpected ruleset ID');
  if (value.rulesetVersion !== BACKGAMMON_RULESET_VERSION)
    errors.push('Unexpected ruleset version');
  if (!isRecord(value.board) || !isRecord(value.board.bar)) {
    errors.push('Board and bar must be objects');
  } else {
    for (const player of PLAYERS) {
      errors.push(...validateCheckerArray(value.board[player], player, value.board.bar[player]));
    }
    if (Array.isArray(value.board.A) && Array.isArray(value.board.B)) {
      for (let point = 0; point < BEAR_OFF; point += 1) {
        if (
          Number(value.board.A[point] ?? 0) > 0 &&
          Number(value.board.B[backgammonOpponentRelativePoint(point)] ?? 0) > 0
        ) {
          errors.push(`Both players cannot occupy physical point ${String(point)}`);
        }
      }
    }
  }
  const phases: readonly string[] = [
    'OPENING_ROLL',
    'WAITING_FOR_ROLL',
    'AWAITING_MOVE',
    'TURN_TRANSITION',
    'FINISHED',
  ];
  if (typeof value.phase !== 'string' || !phases.includes(value.phase))
    errors.push('Unexpected game phase');
  if (!Number.isInteger(value.turnNumber) || Number(value.turnNumber) < 0)
    errors.push('Invalid turn number');
  if (!Number.isInteger(value.eventSequence) || Number(value.eventSequence) < 0)
    errors.push('Invalid event sequence');
  if (value.activePlayer !== null && !PLAYERS.includes(value.activePlayer as PlayerId))
    errors.push('Invalid active player');
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
    errors.push('Dice roll must be null or contain two dice');
  }
  if (value.phase === 'OPENING_ROLL' && value.activePlayer !== null)
    errors.push('Opening roll cannot have an active player');
  if (value.phase === 'AWAITING_MOVE' && value.diceRoll === null)
    errors.push('Awaiting move requires dice');
  if (value.phase === 'FINISHED' && !isRecord(value.result))
    errors.push('Finished game requires a result');
  return { valid: errors.length === 0, errors };
}

export function validateBackgammonAction(
  state: BackgammonState,
  action: BackgammonAction,
): ValidationResult {
  const errors: string[] = [];
  if (state.phase === 'FINISHED') errors.push('Game is already finished');
  if (action.type !== 'backgammon.surrender.request' && action.playerId !== state.activePlayer) {
    errors.push('Action does not belong to the active player');
  }
  if (action.type === 'backgammon.roll.request' && state.phase !== 'WAITING_FOR_ROLL')
    errors.push('Roll is not allowed');
  if (action.type === 'backgammon.move.submit') {
    if (state.phase !== 'AWAITING_MOVE') errors.push('Move is not allowed');
    else if (!isLegalBackgammonTurnSequence(state, action.moves))
      errors.push('Illegal Backgammon turn');
  }
  return { valid: errors.length === 0, errors };
}

export const backgammonRuleset: Ruleset<BackgammonState, BackgammonAction, BackgammonEvent> =
  Object.freeze({
    id: BACKGAMMON_RULESET_ID,
    version: BACKGAMMON_RULESET_VERSION,
    createInitialState: createInitialBackgammonState,
    applyEvent: applyBackgammonEvent,
    validateState: validateBackgammonState,
    validateAction: validateBackgammonAction,
  });

export const backgammonCoordinates = Object.freeze({
  entry: Object.freeze(Array.from({ length: 6 }, (_, index) => pointIndex(index))),
  home: Object.freeze(Array.from({ length: 6 }, (_, index) => pointIndex(index + 18))),
  bearOff: pointIndex(BEAR_OFF),
});

export function createBackgammonBearOffResult(
  state: BackgammonState,
  winner: PlayerId,
): BackgammonGameResult {
  return Object.freeze({
    winner,
    loser: backgammonOtherPlayer(winner),
    reason: 'BEAR_OFF',
    winClass: classifyBackgammonWin(state.board, winner),
  });
}
