export const LONG_NARDY_RULESET_ID = 'long_nardy' as const;
export const LONG_NARDY_RULESET_VERSION = 1 as const;
export const BACKGAMMON_RULESET_ID = 'backgammon' as const;
export const BACKGAMMON_RULESET_VERSION = 1 as const;
export const CHECKERS_PER_PLAYER = 15;
export const BOARD_POSITION_COUNT = 25;
export const HEAD = 0;
export const BEAR_OFF = 24;

export type PlayerId = 'A' | 'B';
export type RulesetId =
  | typeof LONG_NARDY_RULESET_ID
  | typeof BACKGAMMON_RULESET_ID;
export type BotDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
export type PointIndex = number & { readonly __pointIndex: unique symbol };
export type CheckerPosition = PointIndex;
export type DiceValue = 1 | 2 | 3 | 4 | 5 | 6;
export type DiceRoll = readonly [DiceValue, DiceValue];
export type RemainingDice = readonly DiceValue[];
export type TurnNumber = number & { readonly __turnNumber: unique symbol };
export type GamePhase =
  | 'OPENING_ROLL'
  | 'WAITING_FOR_ROLL'
  | 'AWAITING_MOVE'
  | 'TURN_TRANSITION'
  | 'FINISHED';

export interface BoardState {
  readonly A: readonly number[];
  readonly B: readonly number[];
}

export interface PlayerState {
  readonly id: PlayerId;
  readonly checkers: readonly number[];
}

export type GameResultReason =
  | 'BEAR_OFF'
  | 'SURRENDER'
  | 'TIMEOUT'
  | 'SERVER_CANCELLED'
  | 'ADMIN_CANCELLED'
  | 'SERVER_ERROR'
  | 'INFRASTRUCTURE_FAILURE';

export interface GameResult {
  readonly winner: PlayerId | null;
  readonly loser: PlayerId | null;
  readonly reason: GameResultReason;
}

export interface CheckerMove {
  readonly from: PointIndex;
  readonly to: PointIndex;
  readonly die: DiceValue;
}

export interface TurnSequence {
  readonly playerId: PlayerId;
  readonly turnNumber: TurnNumber;
  readonly roll: DiceRoll;
  readonly moves: readonly CheckerMove[];
}

export interface TurnPreview {
  readonly board: BoardState;
  readonly remainingDice: RemainingDice;
  readonly moves: readonly CheckerMove[];
  readonly complete: boolean;
}

export interface LongNardyState {
  readonly rulesetId: typeof LONG_NARDY_RULESET_ID;
  readonly rulesetVersion: typeof LONG_NARDY_RULESET_VERSION;
  readonly phase: GamePhase;
  readonly board: BoardState;
  readonly activePlayer: PlayerId | null;
  readonly diceRoll: DiceRoll | null;
  readonly remainingDice: RemainingDice;
  readonly turnNumber: TurnNumber;
  readonly eventSequence: number;
  readonly result: GameResult | null;
}

export type LongNardyAction =
  | { readonly type: 'roll.request'; readonly playerId: PlayerId }
  | {
      readonly type: 'move.submit';
      readonly playerId: PlayerId;
      readonly moves: readonly CheckerMove[];
    }
  | { readonly type: 'surrender.request'; readonly playerId: PlayerId };

interface SequencedEvent {
  readonly sequence: number;
}

export type LongNardyEvent =
  | (SequencedEvent & {
      readonly type: 'opening.roll';
      readonly dice: Readonly<Record<PlayerId, DiceValue>>;
    })
  | (SequencedEvent & {
      readonly type: 'dice.rolled';
      readonly playerId: PlayerId;
      readonly roll: DiceRoll;
    })
  | (SequencedEvent & {
      readonly type: 'move.applied';
      readonly playerId: PlayerId;
      readonly moves: readonly CheckerMove[];
    })
  | (SequencedEvent & {
      readonly type: 'turn.changed';
      readonly activePlayer: PlayerId;
    })
  | (SequencedEvent & {
      readonly type: 'match.finished';
      readonly result: GameResult;
    });

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export interface Ruleset<State, Action, Event> {
  readonly id: string;
  readonly version: number;
  createInitialState(): State;
  applyEvent(state: State, event: Event): State;
  validateState(state: unknown): ValidationResult;
  validateAction(state: State, action: Action): ValidationResult;
}

export function pointIndex(value: number): PointIndex {
  if (!Number.isInteger(value) || value < HEAD || value > BEAR_OFF) {
    throw new RangeError(
      `Point index must be an integer between ${String(HEAD)} and ${String(BEAR_OFF)}`,
    );
  }
  return value as PointIndex;
}

export function diceValue(value: number): DiceValue {
  if (!Number.isInteger(value) || value < 1 || value > 6) {
    throw new RangeError('Dice value must be an integer between 1 and 6');
  }
  return value as DiceValue;
}

export function turnNumber(value: number): TurnNumber {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError('Turn number must be a non-negative integer');
  }
  return value as TurnNumber;
}
