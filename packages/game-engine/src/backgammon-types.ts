import type {
  BACKGAMMON_RULESET_ID,
  BACKGAMMON_RULESET_VERSION,
  DiceRoll,
  DiceValue,
  GamePhase,
  GameResult,
  PlayerId,
  PointIndex,
  RemainingDice,
  TurnNumber,
} from './types.js';

export const BACKGAMMON_BAR = 'BAR' as const;

export type BackgammonMoveSource = PointIndex | typeof BACKGAMMON_BAR;
export type BackgammonWinClass = 'NORMAL' | 'GAMMON' | 'BACKGAMMON';

export interface BackgammonBoardState {
  readonly A: readonly number[];
  readonly B: readonly number[];
  readonly bar: Readonly<Record<PlayerId, number>>;
}

export interface BackgammonCheckerMove {
  readonly from: BackgammonMoveSource;
  readonly to: PointIndex;
  readonly die: DiceValue;
  readonly hit: boolean;
}

export interface BackgammonTurnSequence {
  readonly playerId: PlayerId;
  readonly turnNumber: TurnNumber;
  readonly roll: DiceRoll;
  readonly moves: readonly BackgammonCheckerMove[];
}

export interface BackgammonTurnPreview {
  readonly board: BackgammonBoardState;
  readonly remainingDice: RemainingDice;
  readonly moves: readonly BackgammonCheckerMove[];
  readonly complete: boolean;
}

export interface BackgammonGameResult extends GameResult {
  readonly winClass: BackgammonWinClass;
}

export interface BackgammonState {
  readonly rulesetId: typeof BACKGAMMON_RULESET_ID;
  readonly rulesetVersion: typeof BACKGAMMON_RULESET_VERSION;
  readonly phase: GamePhase;
  readonly board: BackgammonBoardState;
  readonly activePlayer: PlayerId | null;
  readonly diceRoll: DiceRoll | null;
  readonly remainingDice: RemainingDice;
  readonly turnNumber: TurnNumber;
  readonly eventSequence: number;
  readonly result: BackgammonGameResult | null;
}

export type BackgammonAction =
  | { readonly type: 'backgammon.roll.request'; readonly playerId: PlayerId }
  | {
      readonly type: 'backgammon.move.submit';
      readonly playerId: PlayerId;
      readonly moves: readonly BackgammonCheckerMove[];
    }
  | { readonly type: 'backgammon.surrender.request'; readonly playerId: PlayerId };

interface SequencedBackgammonEvent {
  readonly sequence: number;
}

export type BackgammonEvent =
  | (SequencedBackgammonEvent & {
      readonly type: 'backgammon.opening.roll';
      readonly dice: Readonly<Record<PlayerId, DiceValue>>;
    })
  | (SequencedBackgammonEvent & {
      readonly type: 'backgammon.dice.rolled';
      readonly playerId: PlayerId;
      readonly roll: DiceRoll;
    })
  | (SequencedBackgammonEvent & {
      readonly type: 'backgammon.move.applied';
      readonly playerId: PlayerId;
      readonly moves: readonly BackgammonCheckerMove[];
    })
  | (SequencedBackgammonEvent & {
      readonly type: 'backgammon.turn.changed';
      readonly activePlayer: PlayerId;
    })
  | (SequencedBackgammonEvent & {
      readonly type: 'backgammon.match.finished';
      readonly result: BackgammonGameResult;
    });
