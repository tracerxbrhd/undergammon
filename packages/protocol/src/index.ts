import { z } from 'zod';
import type { GameState, Move } from '@undergammon/game-engine';
export const rulesetSchema = z.enum(['LONG_NARDY', 'BACKGAMMON']);
export const modeSchema = z.enum(['CASUAL', 'RANKED', 'PRIVATE']);
export const moveSchema = z
  .object({
    from: z.union([z.number().int().min(0).max(23), z.literal('BAR')]),
    to: z.number().int().min(0).max(24),
    die: z.number().int().min(1).max(6),
  })
  .strict();
export const commandSchema = z
  .object({
    protocolVersion: z.literal(1),
    commandId: z.uuid(),
    matchId: z.uuid(),
    stateVersion: z.number().int().nonnegative(),
    type: z.enum(['OPEN', 'ROLL', 'TURN', 'SURRENDER', 'REACTION']),
    moves: z.array(moveSchema).max(4).optional(),
    reaction: z.enum(['WAVE', 'NICE', 'GG']).optional(),
  })
  .strict();
export type Command = z.infer<typeof commandSchema>;
export type Ruleset = z.infer<typeof rulesetSchema>;
export type Mode = z.infer<typeof modeSchema>;
export interface Player {
  accountId: string;
  nickname: string;
  avatar: string;
  rating: number;
  preliminary: boolean;
  connected: boolean;
}
export interface MatchSnapshot {
  id: string;
  ruleset: Ruleset;
  mode: Mode;
  status: 'WAITING_FOR_PLAYERS' | 'ACTIVE' | 'FINISHED';
  stateVersion: number;
  game: GameState;
  players: Record<'A' | 'B', Player>;
  turnStartsAt: number | null;
  turnDeadlineAt: number | null;
  joinDeadlineAt: number;
  reconnectDeadlines: Record<'A' | 'B', number | null>;
  winner: 'A' | 'B' | null;
  finishReason: string | null;
  lastMoves: readonly Move[];
}
export type ServerEvent =
  | {
      protocolVersion: 1;
      type: 'SNAPSHOT';
      snapshot: MatchSnapshot;
      serverTime: number;
      commandId?: string;
    }
  | { protocolVersion: 1; type: 'ERROR'; code: string; commandId?: string }
  | { protocolVersion: 1; type: 'CONTROL_LOST' }
  | { protocolVersion: 1; type: 'REACTION'; accountId: string; reaction: string }
  | { protocolVersion: 1; type: 'REFRESH' };
export interface Profile {
  id: string;
  nickname: string;
  avatar: string;
  language: 'ru' | 'en';
  muteOpponentReactions: boolean;
  totalXp: number;
  level: number;
  levelProgress: LevelProgress;
  coins: number;
  admin: boolean;
  ratings: { ruleset: Ruleset; rating: number; played: number; peak: number }[];
  activeMatchId: string | null;
}
export interface LevelProgress {
  levelStartTotalXp: number;
  nextLevelTotalXp: number;
  xpIntoLevel: number;
  xpRequiredForNextLevel: number;
}
export interface MatchResultProgression {
  xpGained: number;
  totalXpBefore: number;
  totalXpAfter: number;
  levelBefore: number;
  levelAfter: number;
  progressBefore: LevelProgress;
  progressAfter: LevelProgress;
  ratingBefore: number | null;
  ratingAfter: number | null;
  ratingDelta: number | null;
}
