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
export const cosmeticSlotSchema = z.enum(['PROFILE_FRAME', 'CHECKER_SET', 'DICE_SKIN']);
export type CosmeticSlot = z.infer<typeof cosmeticSlotSchema>;
export const profileFrameIdSchema = z.enum([
  'default',
  'season0_tester_frame',
  'bronze_profile_frame',
]);
export type ProfileFrameId = z.infer<typeof profileFrameIdSchema>;
export const checkerSetIdSchema = z.enum(['default', 'marble_checker_set']);
export type CheckerSetId = z.infer<typeof checkerSetIdSchema>;
export const diceSkinIdSchema = z.enum(['default', 'obsidian_dice']);
export type DiceSkinId = z.infer<typeof diceSkinIdSchema>;
export type CosmeticId = ProfileFrameId | CheckerSetId | DiceSkinId;
export interface EquippedCosmetics {
  profileFrame: ProfileFrameId;
  /** Missing means Default, including snapshots written before Checker Sets existed. */
  checkerSet?: CheckerSetId;
  /** Missing means Default, including snapshots written before Dice Skins existed. */
  diceSkin?: DiceSkinId;
}
export interface OwnedCosmetic {
  cosmeticId: string;
  slot: CosmeticSlot;
  acquiredAt: string;
  source: string;
}
export interface CosmeticsInventory {
  owned: OwnedCosmetic[];
  equipped: EquippedCosmetics;
}
export interface StoreProduct {
  cosmeticId: CosmeticId;
  slot: CosmeticSlot;
  priceCoins: number;
  owned: boolean;
}
export interface StorePurchaseResult {
  balance: number;
  product: StoreProduct;
}
export interface Player {
  accountId: string;
  nickname: string;
  avatar: string;
  rating: number;
  preliminary: boolean;
  connected: boolean;
  /** Optional so active snapshots written before cosmetic support remain valid. */
  cosmetics?: EquippedCosmetics;
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
  cosmetics: EquippedCosmetics;
}
export interface PublicProfile {
  id: string;
  nickname: string;
  avatar: string;
  totalXp: number;
  level: number;
  ratings: { ruleset: Ruleset; rating: number; peak: number; played: number; wins: number }[];
  stats: { played: number; wins: number };
  cosmetics: EquippedCosmetics;
}
export interface LevelProgress {
  levelStartTotalXp: number;
  nextLevelTotalXp: number;
  xpIntoLevel: number;
  xpRequiredForNextLevel: number;
}
export interface DailyRewardDay {
  day: number;
  coins: number;
}
export interface DailyRewardStatus {
  rewards: DailyRewardDay[];
  /** Available cycle day, or the cycle day claimed today when claimedToday is true. */
  currentDay: number;
  claimedToday: boolean;
  lastClaimDate: string | null;
  nextClaimAt: string | null;
}
export interface DailyRewardClaimResult {
  rewardCoins: number;
  balance: number;
  status: DailyRewardStatus;
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
