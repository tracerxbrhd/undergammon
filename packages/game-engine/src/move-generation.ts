import {
  BEAR_OFF,
  HEAD,
  type BoardState,
  type CheckerMove,
  type DiceValue,
  type LongNardyState,
  type PlayerId,
  type RemainingDice,
  type TurnPreview,
  type TurnSequence,
  pointIndex,
} from './types.js';

const ON_BOARD_POINT_COUNT = BEAR_OFF;
const HOME_START = 18;
const SPECIAL_SECOND_PLAYER_DOUBLES: readonly DiceValue[] = [3, 4, 6];

interface SearchPosition {
  readonly board: BoardState;
  readonly remainingDice: RemainingDice;
  readonly moves: readonly CheckerMove[];
  readonly headMoves: number;
}

export function otherPlayer(playerId: PlayerId): PlayerId {
  return playerId === 'A' ? 'B' : 'A';
}

export function relativeToPhysicalPoint(playerId: PlayerId, relativePoint: number): number {
  if (!Number.isInteger(relativePoint) || relativePoint < HEAD || relativePoint >= BEAR_OFF) {
    throw new RangeError(
      'A physical board point must be derived from a relative point 0 through 23',
    );
  }
  return playerId === 'A' ? relativePoint : (relativePoint + 12) % ON_BOARD_POINT_COUNT;
}

export function physicalToRelativePoint(playerId: PlayerId, physicalPoint: number): number {
  if (!Number.isInteger(physicalPoint) || physicalPoint < HEAD || physicalPoint >= BEAR_OFF) {
    throw new RangeError('Physical point must be an integer from 0 through 23');
  }
  return playerId === 'A' ? physicalPoint : (physicalPoint + 12) % ON_BOARD_POINT_COUNT;
}

export function opponentRelativePoint(relativePoint: number): number {
  if (!Number.isInteger(relativePoint) || relativePoint < HEAD || relativePoint >= BEAR_OFF) {
    throw new RangeError('Relative point must be an integer from 0 through 23');
  }
  return (relativePoint + 12) % ON_BOARD_POINT_COUNT;
}

function freezeBoard(board: BoardState): BoardState {
  return Object.freeze({
    A: Object.freeze([...board.A]),
    B: Object.freeze([...board.B]),
  });
}

function applyUncheckedMove(board: BoardState, playerId: PlayerId, move: CheckerMove): BoardState {
  const checkers = [...board[playerId]];
  const fromCount = checkers[move.from];
  const toCount = checkers[move.to];
  if (fromCount === undefined || fromCount < 1 || toCount === undefined) {
    throw new Error('Cannot apply a move to the supplied board');
  }
  checkers[move.from] = fromCount - 1;
  checkers[move.to] = toCount + 1;
  return freezeBoard(playerId === 'A' ? { A: checkers, B: board.B } : { A: board.A, B: checkers });
}

function removeDie(remainingDice: RemainingDice, die: DiceValue): RemainingDice {
  const index = remainingDice.indexOf(die);
  if (index < 0) throw new Error(`Die ${String(die)} is not available`);
  return Object.freeze([...remainingDice.slice(0, index), ...remainingDice.slice(index + 1)]);
}

function isOpenPoint(board: BoardState, playerId: PlayerId, destination: number): boolean {
  if (destination === BEAR_OFF) return true;
  const opponent = otherPlayer(playerId);
  return (board[opponent][opponentRelativePoint(destination)] ?? 0) === 0;
}

function allCheckersInHome(board: BoardState, playerId: PlayerId): boolean {
  return board[playerId].slice(HEAD, HOME_START).every((count) => count === 0);
}

function canBearOffFrom(
  board: BoardState,
  playerId: PlayerId,
  source: number,
  die: DiceValue,
): boolean {
  if (!allCheckersInHome(board, playerId)) return false;
  const destination = source + die;
  if (destination === BEAR_OFF) return true;
  if (destination < BEAR_OFF) return false;
  return board[playerId].slice(HOME_START, source).every((count) => count === 0);
}

function occupiesPhysicalPoint(
  board: BoardState,
  playerId: PlayerId,
  physicalPoint: number,
): boolean {
  const relativePoint = physicalToRelativePoint(playerId, physicalPoint);
  return (board[playerId][relativePoint] ?? 0) > 0;
}

function createsIllegalSixPrime(board: BoardState, playerId: PlayerId): boolean {
  const opponent = otherPlayer(playerId);
  if ((board[opponent][BEAR_OFF] ?? 0) > 0) return false;

  for (let physicalStart = 0; physicalStart < ON_BOARD_POINT_COUNT; physicalStart += 1) {
    const hasSixPrime = Array.from({ length: 6 }, (_, offset) =>
      occupiesPhysicalPoint(board, playerId, (physicalStart + offset) % ON_BOARD_POINT_COUNT),
    ).every(Boolean);
    if (!hasSixPrime) continue;

    const opponentStart = physicalToRelativePoint(opponent, physicalStart);
    if (opponentStart > HOME_START) continue;

    const allOpponentCheckersAreBehind = board[opponent]
      .slice(HEAD, BEAR_OFF)
      .every((count, point) => count === 0 || point < opponentStart);
    if (allOpponentCheckersAreBehind) return true;
  }
  return false;
}

function headMoveLimit(state: LongNardyState): number {
  const roll = state.diceRoll;
  const isSpecialSecondPlayerOpeningDouble =
    state.turnNumber === 2 &&
    roll !== null &&
    roll[0] === roll[1] &&
    SPECIAL_SECOND_PLAYER_DOUBLES.includes(roll[0]);
  return isSpecialSecondPlayerOpeningDouble ? 2 : 1;
}

function generateMovesForDie(
  board: BoardState,
  state: LongNardyState,
  die: DiceValue,
  headMoves: number,
): readonly CheckerMove[] {
  const playerId = state.activePlayer;
  if (playerId === null) return [];
  const moves: CheckerMove[] = [];

  for (let source = HEAD; source < BEAR_OFF; source += 1) {
    if ((board[playerId][source] ?? 0) === 0) continue;
    if (source === HEAD && headMoves >= headMoveLimit(state)) continue;

    const rawDestination = source + die;
    const destination = rawDestination >= BEAR_OFF ? BEAR_OFF : rawDestination;
    if (destination === BEAR_OFF && !canBearOffFrom(board, playerId, source, die)) continue;
    if (!isOpenPoint(board, playerId, destination)) continue;

    const move: CheckerMove = Object.freeze({
      from: pointIndex(source),
      to: pointIndex(destination),
      die,
    });
    const nextBoard = applyUncheckedMove(board, playerId, move);
    if (createsIllegalSixPrime(nextBoard, playerId)) continue;
    moves.push(move);
  }

  return Object.freeze(moves);
}

function moveKey(move: CheckerMove): string {
  return `${String(move.from)}:${String(move.to)}:${String(move.die)}`;
}

function sequenceKey(moves: readonly CheckerMove[]): string {
  return moves.map(moveKey).join('|');
}

function compareSequence(first: readonly CheckerMove[], second: readonly CheckerMove[]): number {
  return sequenceKey(first).localeCompare(sequenceKey(second));
}

function searchSequences(
  state: LongNardyState,
  position: SearchPosition,
): readonly SearchPosition[] {
  const activePlayer = state.activePlayer;
  if (activePlayer === null) return [position];
  const results: SearchPosition[] = [];
  const uniqueDice = [...new Set(position.remainingDice)];

  for (const die of uniqueDice) {
    const moves = generateMovesForDie(position.board, state, die, position.headMoves);
    for (const move of moves) {
      results.push(
        ...searchSequences(state, {
          board: applyUncheckedMove(position.board, activePlayer, move),
          remainingDice: removeDie(position.remainingDice, die),
          moves: Object.freeze([...position.moves, move]),
          headMoves: position.headMoves + (move.from === HEAD ? 1 : 0),
        }),
      );
    }
  }

  return results.length === 0 ? [position] : results;
}

function optimalSearchPositions(state: LongNardyState): readonly SearchPosition[] {
  if (state.phase !== 'AWAITING_MOVE' || state.activePlayer === null || state.diceRoll === null) {
    return [];
  }

  const candidates = searchSequences(state, {
    board: state.board,
    remainingDice: state.remainingDice,
    moves: [],
    headMoves: 0,
  });
  const maximumMoves = Math.max(...candidates.map((candidate) => candidate.moves.length));
  let optimal = candidates.filter((candidate) => candidate.moves.length === maximumMoves);

  if (maximumMoves === 1 && state.diceRoll[0] !== state.diceRoll[1]) {
    const largestPlayableDie = Math.max(
      ...optimal.map((candidate) => candidate.moves[0]?.die ?? 0),
    );
    optimal = optimal.filter((candidate) => candidate.moves[0]?.die === largestPlayableDie);
  }

  const unique = new Map<string, SearchPosition>();
  for (const candidate of optimal) unique.set(sequenceKey(candidate.moves), candidate);
  return Object.freeze(
    [...unique.values()].sort((first, second) => compareSequence(first.moves, second.moves)),
  );
}

export function generateLegalTurnSequences(state: LongNardyState): readonly TurnSequence[] {
  const activePlayer = state.activePlayer;
  const diceRoll = state.diceRoll;
  if (activePlayer === null || diceRoll === null) return [];
  return Object.freeze(
    optimalSearchPositions(state).map((candidate) =>
      Object.freeze({
        playerId: activePlayer,
        turnNumber: state.turnNumber,
        roll: diceRoll,
        moves: Object.freeze([...candidate.moves]),
      }),
    ),
  );
}

function movesEqual(first: CheckerMove, second: CheckerMove): boolean {
  return first.from === second.from && first.to === second.to && first.die === second.die;
}

function isPrefix(prefix: readonly CheckerMove[], sequence: readonly CheckerMove[]): boolean {
  return (
    prefix.length <= sequence.length &&
    prefix.every((move, index) => {
      const candidate = sequence[index];
      return candidate !== undefined && movesEqual(move, candidate);
    })
  );
}

export function isLegalTurnSequence(state: LongNardyState, moves: readonly CheckerMove[]): boolean {
  return generateLegalTurnSequences(state).some(
    (sequence) => sequence.moves.length === moves.length && isPrefix(moves, sequence.moves),
  );
}

export function legalNextMoves(
  state: LongNardyState,
  prefix: readonly CheckerMove[] = [],
): readonly CheckerMove[] {
  const unique = new Map<string, CheckerMove>();
  for (const sequence of generateLegalTurnSequences(state)) {
    if (!isPrefix(prefix, sequence.moves)) continue;
    const move = sequence.moves[prefix.length];
    if (move !== undefined) unique.set(moveKey(move), move);
  }
  return Object.freeze([...unique.values()]);
}

export function previewLongNardyTurn(
  state: LongNardyState,
  moves: readonly CheckerMove[],
): TurnPreview {
  const sequences = generateLegalTurnSequences(state);
  if (!sequences.some((sequence) => isPrefix(moves, sequence.moves))) {
    throw new Error('Moves are not a prefix of an optimal legal turn sequence');
  }
  if (state.activePlayer === null)
    throw new Error('Cannot preview a turn without an active player');

  let board = state.board;
  let remainingDice = state.remainingDice;
  for (const move of moves) {
    board = applyUncheckedMove(board, state.activePlayer, move);
    remainingDice = removeDie(remainingDice, move.die);
  }

  return Object.freeze({
    board,
    remainingDice,
    moves: Object.freeze([...moves]),
    complete: sequences.some(
      (sequence) => sequence.moves.length === moves.length && isPrefix(moves, sequence.moves),
    ),
  });
}
