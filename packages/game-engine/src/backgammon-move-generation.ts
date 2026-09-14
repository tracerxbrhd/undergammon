import {
  BACKGAMMON_BAR,
  type BackgammonBoardState,
  type BackgammonCheckerMove,
  type BackgammonState,
  type BackgammonTurnPreview,
  type BackgammonTurnSequence,
} from './backgammon-types.js';
import {
  BEAR_OFF,
  type DiceValue,
  type PlayerId,
  type RemainingDice,
  pointIndex,
} from './types.js';

const HOME_START = 18;

interface SearchPosition {
  readonly board: BackgammonBoardState;
  readonly remainingDice: RemainingDice;
  readonly moves: readonly BackgammonCheckerMove[];
}

export function backgammonOtherPlayer(playerId: PlayerId): PlayerId {
  return playerId === 'A' ? 'B' : 'A';
}

export function backgammonRelativeToPhysicalPoint(
  playerId: PlayerId,
  relativePoint: number,
): number {
  if (!Number.isInteger(relativePoint) || relativePoint < 0 || relativePoint >= BEAR_OFF) {
    throw new RangeError('Backgammon relative point must be an integer from 0 through 23');
  }
  return playerId === 'A' ? relativePoint : BEAR_OFF - 1 - relativePoint;
}

export function backgammonOpponentRelativePoint(relativePoint: number): number {
  if (!Number.isInteger(relativePoint) || relativePoint < 0 || relativePoint >= BEAR_OFF) {
    throw new RangeError('Backgammon relative point must be an integer from 0 through 23');
  }
  return BEAR_OFF - 1 - relativePoint;
}

function freezeBoard(board: BackgammonBoardState): BackgammonBoardState {
  return Object.freeze({
    A: Object.freeze([...board.A]),
    B: Object.freeze([...board.B]),
    bar: Object.freeze({ ...board.bar }),
  });
}

function removeDie(remainingDice: RemainingDice, die: DiceValue): RemainingDice {
  const index = remainingDice.indexOf(die);
  if (index < 0) throw new Error(`Die ${String(die)} is not available`);
  return Object.freeze([...remainingDice.slice(0, index), ...remainingDice.slice(index + 1)]);
}

function allCheckersInHome(board: BackgammonBoardState, playerId: PlayerId): boolean {
  return (
    board.bar[playerId] === 0 && board[playerId].slice(0, HOME_START).every((count) => count === 0)
  );
}

function canBearOffFrom(
  board: BackgammonBoardState,
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

function destinationIsOpen(
  board: BackgammonBoardState,
  playerId: PlayerId,
  destination: number,
): boolean {
  if (destination === BEAR_OFF) return true;
  const opponent = backgammonOtherPlayer(playerId);
  return (board[opponent][backgammonOpponentRelativePoint(destination)] ?? 0) <= 1;
}

export function applyUncheckedBackgammonMove(
  board: BackgammonBoardState,
  playerId: PlayerId,
  move: BackgammonCheckerMove,
): BackgammonBoardState {
  const player = [...board[playerId]];
  const opponentId = backgammonOtherPlayer(playerId);
  const opponent = [...board[opponentId]];
  const bar = { ...board.bar };

  if (move.from === BACKGAMMON_BAR) {
    if (bar[playerId] < 1) throw new Error('Cannot re-enter when the player bar is empty');
    bar[playerId] -= 1;
  } else {
    const sourceCount = player[move.from];
    if (sourceCount === undefined || sourceCount < 1) {
      throw new Error('Cannot move from an empty point');
    }
    player[move.from] = sourceCount - 1;
  }

  const destinationCount = player[move.to];
  if (destinationCount === undefined) throw new Error('Move destination is outside the board');
  if (move.to !== BEAR_OFF) {
    const opponentPoint = backgammonOpponentRelativePoint(move.to);
    const opponentCount = opponent[opponentPoint] ?? 0;
    if (opponentCount > 1) throw new Error('Cannot move to a blocked point');
    if (opponentCount === 1) {
      opponent[opponentPoint] = 0;
      bar[opponentId] += 1;
    }
  }
  player[move.to] = destinationCount + 1;

  return freezeBoard(
    playerId === 'A' ? { A: player, B: opponent, bar } : { A: opponent, B: player, bar },
  );
}

function generateMovesForDie(
  board: BackgammonBoardState,
  playerId: PlayerId,
  die: DiceValue,
): readonly BackgammonCheckerMove[] {
  const moves: BackgammonCheckerMove[] = [];
  const opponent = backgammonOtherPlayer(playerId);
  if (board.bar[playerId] > 0) {
    const destination = die - 1;
    if (!destinationIsOpen(board, playerId, destination)) return [];
    moves.push(
      Object.freeze({
        from: BACKGAMMON_BAR,
        to: pointIndex(destination),
        die,
        hit: (board[opponent][backgammonOpponentRelativePoint(destination)] ?? 0) === 1,
      }),
    );
    return Object.freeze(moves);
  }

  for (let source = 0; source < BEAR_OFF; source += 1) {
    if ((board[playerId][source] ?? 0) < 1) continue;
    const rawDestination = source + die;
    const destination = rawDestination >= BEAR_OFF ? BEAR_OFF : rawDestination;
    if (destination === BEAR_OFF && !canBearOffFrom(board, playerId, source, die)) continue;
    if (!destinationIsOpen(board, playerId, destination)) continue;
    moves.push(
      Object.freeze({
        from: pointIndex(source),
        to: pointIndex(destination),
        die,
        hit:
          destination !== BEAR_OFF &&
          (board[opponent][backgammonOpponentRelativePoint(destination)] ?? 0) === 1,
      }),
    );
  }
  return Object.freeze(moves);
}

function moveKey(move: BackgammonCheckerMove): string {
  return `${String(move.from)}:${String(move.to)}:${String(move.die)}:${move.hit ? '1' : '0'}`;
}

function sequenceKey(moves: readonly BackgammonCheckerMove[]): string {
  return moves.map(moveKey).join('|');
}

function searchSequences(
  state: BackgammonState,
  position: SearchPosition,
): readonly SearchPosition[] {
  const playerId = state.activePlayer;
  if (playerId === null) return [position];
  const results: SearchPosition[] = [];
  for (const die of new Set(position.remainingDice)) {
    for (const move of generateMovesForDie(position.board, playerId, die)) {
      results.push(
        ...searchSequences(state, {
          board: applyUncheckedBackgammonMove(position.board, playerId, move),
          remainingDice: removeDie(position.remainingDice, die),
          moves: Object.freeze([...position.moves, move]),
        }),
      );
    }
  }
  return results.length === 0 ? [position] : results;
}

function optimalPositions(state: BackgammonState): readonly SearchPosition[] {
  if (state.phase !== 'AWAITING_MOVE' || state.activePlayer === null || state.diceRoll === null) {
    return [];
  }
  const candidates = searchSequences(state, {
    board: state.board,
    remainingDice: state.remainingDice,
    moves: [],
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
    [...unique.values()].sort((a, b) => sequenceKey(a.moves).localeCompare(sequenceKey(b.moves))),
  );
}

export function generateLegalBackgammonTurnSequences(
  state: BackgammonState,
): readonly BackgammonTurnSequence[] {
  const activePlayer = state.activePlayer;
  const diceRoll = state.diceRoll;
  if (activePlayer === null || diceRoll === null) return [];
  return Object.freeze(
    optimalPositions(state).map((position) =>
      Object.freeze({
        playerId: activePlayer,
        turnNumber: state.turnNumber,
        roll: diceRoll,
        moves: Object.freeze([...position.moves]),
      }),
    ),
  );
}

function movesEqual(a: BackgammonCheckerMove, b: BackgammonCheckerMove): boolean {
  return a.from === b.from && a.to === b.to && a.die === b.die && a.hit === b.hit;
}

function isPrefix(
  prefix: readonly BackgammonCheckerMove[],
  sequence: readonly BackgammonCheckerMove[],
): boolean {
  return (
    prefix.length <= sequence.length &&
    prefix.every((move, index) => {
      const candidate = sequence[index];
      return candidate !== undefined && movesEqual(move, candidate);
    })
  );
}

export function isLegalBackgammonTurnSequence(
  state: BackgammonState,
  moves: readonly BackgammonCheckerMove[],
): boolean {
  return generateLegalBackgammonTurnSequences(state).some(
    (sequence) => sequence.moves.length === moves.length && isPrefix(moves, sequence.moves),
  );
}

export function legalNextBackgammonMoves(
  state: BackgammonState,
  prefix: readonly BackgammonCheckerMove[] = [],
): readonly BackgammonCheckerMove[] {
  const unique = new Map<string, BackgammonCheckerMove>();
  for (const sequence of generateLegalBackgammonTurnSequences(state)) {
    if (!isPrefix(prefix, sequence.moves)) continue;
    const move = sequence.moves[prefix.length];
    if (move !== undefined) unique.set(moveKey(move), move);
  }
  return Object.freeze([...unique.values()]);
}

export function previewBackgammonTurn(
  state: BackgammonState,
  moves: readonly BackgammonCheckerMove[],
): BackgammonTurnPreview {
  const sequences = generateLegalBackgammonTurnSequences(state);
  if (!sequences.some((sequence) => isPrefix(moves, sequence.moves))) {
    throw new Error('Moves are not a prefix of an optimal legal Backgammon turn');
  }
  if (state.activePlayer === null)
    throw new Error('Cannot preview a turn without an active player');
  let board = state.board;
  let remainingDice = state.remainingDice;
  for (const move of moves) {
    board = applyUncheckedBackgammonMove(board, state.activePlayer, move);
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
