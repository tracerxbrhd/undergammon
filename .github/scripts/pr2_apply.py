from pathlib import Path


def write(path: str, content: str) -> None:
    Path(path).write_text(content.rstrip() + "\n", encoding="utf-8")


def replace(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    if old not in text:
        raise RuntimeError(f"expected text not found in {path}: {old[:120]!r}")
    file.write_text(text.replace(old, new, 1), encoding="utf-8")


write(
    "packages/protocol/src/index.ts",
    r'''import { z } from 'zod';
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
export const diceSkinIdSchema = z.enum(['default']);
export type DiceSkinId = z.infer<typeof diceSkinIdSchema>;
export type CosmeticId = ProfileFrameId | CheckerSetId | DiceSkinId;
export interface EquippedCosmetics {
  profileFrame: ProfileFrameId;
  /** Missing means Default, including snapshots written before Checker Sets existed. */
  checkerSet?: CheckerSetId;
  /** Missing means Default until Dice Skin content is introduced. */
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
''',
)

write(
    "apps/server/src/cosmetic-catalog.ts",
    r'''import type { CosmeticId, CosmeticSlot } from '@undergammon/protocol';

export interface CosmeticDefinition {
  readonly id: CosmeticId;
  readonly slot: CosmeticSlot;
  readonly priceCoins?: number;
  readonly purchasable: boolean;
}

export type PurchasableCosmeticDefinition = CosmeticDefinition & { readonly priceCoins: number };

export const cosmeticDefinitions: readonly CosmeticDefinition[] = [
  { id: 'default', slot: 'PROFILE_FRAME', purchasable: false },
  { id: 'season0_tester_frame', slot: 'PROFILE_FRAME', purchasable: false },
  {
    id: 'bronze_profile_frame',
    slot: 'PROFILE_FRAME',
    priceCoins: 150,
    purchasable: true,
  },
  { id: 'default', slot: 'CHECKER_SET', purchasable: false },
  {
    id: 'marble_checker_set',
    slot: 'CHECKER_SET',
    priceCoins: 200,
    purchasable: true,
  },
  { id: 'default', slot: 'DICE_SKIN', purchasable: false },
];

export const purchasableCosmetics: readonly PurchasableCosmeticDefinition[] =
  cosmeticDefinitions.filter(
    (item): item is PurchasableCosmeticDefinition =>
      item.purchasable && item.priceCoins !== undefined,
  );

export function cosmeticKey(slot: CosmeticSlot, cosmeticId: string): string {
  return `${slot}:${cosmeticId}`;
}

export function cosmeticDefinition(slot: CosmeticSlot, cosmeticId: string) {
  return cosmeticDefinitions.find((item) => item.slot === slot && item.id === cosmeticId);
}

export function purchasableCosmeticDefinition(slot: CosmeticSlot, cosmeticId: string) {
  return purchasableCosmetics.find((item) => item.slot === slot && item.id === cosmeticId);
}

/** Compatibility path for a cached pre-PR2 client that did not send a slot. */
export function legacyPurchasableCosmeticDefinition(cosmeticId: string) {
  const matches = purchasableCosmetics.filter((item) => item.id === cosmeticId);
  if (matches.length > 1) throw new Error('COSMETIC_SLOT_REQUIRED');
  return matches[0];
}
''',
)

write(
    "apps/server/src/cosmetics.ts",
    r'''import type pg from 'pg';
import type {
  CosmeticSlot,
  CosmeticsInventory,
  EquippedCosmetics,
  ProfileFrameId,
  StoreProduct,
  StorePurchaseResult,
} from '@undergammon/protocol';
import {
  checkerSetIdSchema,
  diceSkinIdSchema,
  profileFrameIdSchema,
} from '@undergammon/protocol';
import { rows, transaction, type Db } from './db.js';
import { applyCoins } from './economy.js';
import {
  cosmeticDefinition,
  cosmeticDefinitions,
  cosmeticKey,
  legacyPurchasableCosmeticDefinition,
  purchasableCosmeticDefinition,
  purchasableCosmetics,
} from './cosmetic-catalog.js';

const PROFILE_FRAME: CosmeticSlot = 'PROFILE_FRAME';
const TESTER_FRAME = 'season0_tester_frame';

export async function equippedCosmetics(
  db: Db | pg.Pool,
  accountId: string,
): Promise<EquippedCosmetics> {
  const equipped = await rows<{ slot: CosmeticSlot; cosmetic_id: string }>(
    db,
    'SELECT slot,cosmetic_id FROM cosmetic_equipment WHERE account_id=$1 AND slot=ANY($2::text[])',
    [accountId, ['PROFILE_FRAME', 'CHECKER_SET', 'DICE_SKIN']],
  );
  const bySlot = new Map(equipped.map((item) => [item.slot, item.cosmetic_id]));
  const profileFrame = profileFrameIdSchema.safeParse(bySlot.get('PROFILE_FRAME') ?? 'default');
  const checkerSet = checkerSetIdSchema.safeParse(bySlot.get('CHECKER_SET'));
  const diceSkin = diceSkinIdSchema.safeParse(bySlot.get('DICE_SKIN'));
  return {
    profileFrame: profileFrame.success ? profileFrame.data : ('default' satisfies ProfileFrameId),
    ...(checkerSet.success && checkerSet.data !== 'default' ? { checkerSet: checkerSet.data } : {}),
    ...(diceSkin.success && diceSkin.data !== 'default' ? { diceSkin: diceSkin.data } : {}),
  };
}

export async function cosmeticsInventory(
  db: Db | pg.Pool,
  accountId: string,
): Promise<CosmeticsInventory> {
  const owned = await rows<{
    cosmetic_id: string;
    slot: CosmeticSlot;
    acquired_at: Date;
    source: string;
  }>(
    db,
    'SELECT cosmetic_id,slot,acquired_at,source FROM cosmetic_ownership WHERE account_id=$1 ORDER BY slot,acquired_at,cosmetic_id',
    [accountId],
  );
  return {
    owned: owned.map((item) => ({
      cosmeticId: item.cosmetic_id,
      slot: item.slot,
      acquiredAt: item.acquired_at.toISOString(),
      source: item.source,
    })),
    equipped: await equippedCosmetics(db, accountId),
  };
}

export async function equipCosmetic(
  pool: pg.Pool,
  accountId: string,
  slot: CosmeticSlot,
  cosmeticId: string,
): Promise<EquippedCosmetics> {
  return transaction(pool, async (db) => {
    const definition = cosmeticDefinition(slot, cosmeticId);
    if (!definition) {
      if (cosmeticDefinitions.some((item) => item.id === cosmeticId))
        throw new Error('COSMETIC_SLOT_MISMATCH');
      throw new Error('COSMETIC_NOT_FOUND');
    }
    if (cosmeticId === 'default') {
      await db.query('DELETE FROM cosmetic_equipment WHERE account_id=$1 AND slot=$2', [
        accountId,
        slot,
      ]);
    } else {
      const owned = await rows(
        db,
        'SELECT 1 FROM cosmetic_ownership WHERE account_id=$1 AND slot=$2 AND cosmetic_id=$3',
        [accountId, slot, cosmeticId],
      );
      if (!owned.length) throw new Error('COSMETIC_NOT_OWNED');
      await db.query(
        'INSERT INTO cosmetic_equipment(account_id,slot,cosmetic_id) VALUES($1,$2,$3) ON CONFLICT(account_id,slot) DO UPDATE SET cosmetic_id=excluded.cosmetic_id,updated_at=now()',
        [accountId, slot, cosmeticId],
      );
    }
    return equippedCosmetics(db, accountId);
  });
}

export async function storeProducts(db: Db | pg.Pool, accountId: string): Promise<StoreProduct[]> {
  const owned = new Set(
    (
      await rows<{ cosmetic_id: string; slot: CosmeticSlot }>(
        db,
        'SELECT cosmetic_id,slot FROM cosmetic_ownership WHERE account_id=$1',
        [accountId],
      )
    ).map((item) => cosmeticKey(item.slot, item.cosmetic_id)),
  );
  return purchasableCosmetics.map((item) => ({
    cosmeticId: item.id,
    slot: item.slot,
    priceCoins: item.priceCoins,
    owned: owned.has(cosmeticKey(item.slot, item.id)),
  }));
}

export async function purchaseCosmetic(
  pool: pg.Pool,
  accountId: string,
  cosmeticId: string,
  slot?: CosmeticSlot,
): Promise<StorePurchaseResult> {
  const product = slot
    ? purchasableCosmeticDefinition(slot, cosmeticId)
    : legacyPurchasableCosmeticDefinition(cosmeticId);
  if (!product) throw new Error('COSMETIC_NOT_PURCHASABLE');
  return transaction(pool, async (db) => {
    const owned = await rows(
      db,
      'SELECT 1 FROM cosmetic_ownership WHERE account_id=$1 AND slot=$2 AND cosmetic_id=$3',
      [accountId, product.slot, product.id],
    );
    if (owned.length) throw new Error('COSMETIC_ALREADY_OWNED');
    const reference = cosmeticKey(product.slot, product.id);
    const balance = await applyCoins(
      db,
      accountId,
      -product.priceCoins,
      'COSMETIC_PURCHASE',
      reference,
    );
    if (balance === null) throw new Error('COSMETIC_ALREADY_OWNED');
    await db.query(
      "INSERT INTO cosmetic_ownership(account_id,slot,cosmetic_id,source,source_reference) VALUES($1,$2,$3,'COSMETIC_PURCHASE',$4)",
      [accountId, product.slot, product.id, reference],
    );
    return {
      balance,
      product: {
        cosmeticId: product.id,
        slot: product.slot,
        priceCoins: product.priceCoins,
        owned: true,
      },
    };
  });
}

export async function grantSeason0TesterFrame(db: Db, accountId: string, matchId: string) {
  const active = await rows(db, 'SELECT 1 FROM seasons WHERE id=0 AND ended_at IS NULL');
  if (!active.length) return false;
  const granted = await rows<{ cosmetic_id: string }>(
    db,
    "INSERT INTO cosmetic_ownership(account_id,slot,cosmetic_id,source,source_reference) VALUES($1,$2,$3,'SEASON_0_PARTICIPATION',$4) ON CONFLICT DO NOTHING RETURNING cosmetic_id",
    [accountId, PROFILE_FRAME, TESTER_FRAME, matchId],
  );
  if (!granted.length) return false;
  await db.query(
    'INSERT INTO cosmetic_equipment(account_id,slot,cosmetic_id) VALUES($1,$2,$3) ON CONFLICT(account_id,slot) DO NOTHING',
    [accountId, PROFILE_FRAME, TESTER_FRAME],
  );
  return true;
}
''',
)

replace(
    "apps/server/src/app.ts",
    """    const body = z\n      .object({ cosmeticId: z.string().min(1).max(80) })\n      .strict()\n      .parse(req.body);\n    return purchaseCosmetic(pool, accountId, body.cosmeticId);\n""",
    """    const body = z\n      .object({\n        slot: cosmeticSlotSchema.optional(),\n        cosmeticId: z.string().min(1).max(80),\n      })\n      .strict()\n      .parse(req.body);\n    return purchaseCosmetic(pool, accountId, body.cosmeticId, body.slot);\n""",
)

write(
    "apps/miniapp/src/game/cosmetics.ts",
    r'''import type { PlayerId } from '@undergammon/game-engine';
import type {
  CheckerSetId,
  EquippedCosmetics,
  ProfileFrameId,
} from '@undergammon/protocol';

export type DefaultCosmeticId = 'default';

interface CosmeticPresentation {
  readonly id: string;
  readonly className: string;
}

export type BoardThemePresentation = CosmeticPresentation;
export type CheckerSetPresentation = CosmeticPresentation;
export type DiceSkinPresentation = CosmeticPresentation;
export type ProfileFramePresentation = CosmeticPresentation;
export type ReactionPackPresentation = CosmeticPresentation;

export interface PlayerCosmeticPresentation<T extends CosmeticPresentation> {
  readonly ownerSeat: PlayerId;
  readonly presentation: T;
}

export interface ResolvedMatchCosmetics {
  readonly board: {
    readonly localTheme: PlayerCosmeticPresentation<BoardThemePresentation>;
    readonly opponentTheme: PlayerCosmeticPresentation<BoardThemePresentation>;
  };
  readonly checkers: {
    readonly localSet: PlayerCosmeticPresentation<CheckerSetPresentation>;
    readonly opponentSet: PlayerCosmeticPresentation<CheckerSetPresentation>;
  };
  readonly dice: {
    readonly localSkin: PlayerCosmeticPresentation<DiceSkinPresentation>;
    readonly opponentSkin: PlayerCosmeticPresentation<DiceSkinPresentation>;
  };
  readonly profile: {
    readonly localFrame: PlayerCosmeticPresentation<ProfileFramePresentation>;
    readonly opponentFrame: PlayerCosmeticPresentation<ProfileFramePresentation>;
  };
  readonly reactions: {
    readonly localPack: PlayerCosmeticPresentation<ReactionPackPresentation>;
  };
}

const defaultPresentations = {
  boardTheme: { id: 'default', className: 'board-theme-default' },
  checkerSet: { id: 'default', className: 'checker-set-default' },
  diceSkin: { id: 'default', className: 'dice-skin-default' },
  profileFrame: { id: 'default', className: 'profile-frame-default' },
  reactionPack: { id: 'default', className: 'reaction-pack-default' },
} as const;

const checkerSets: Record<CheckerSetId, CheckerSetPresentation> = {
  default: defaultPresentations.checkerSet,
  marble_checker_set: {
    id: 'marble_checker_set',
    className: 'checker-set-marble',
  },
};

const profileFrames: Record<ProfileFrameId, ProfileFramePresentation> = {
  default: defaultPresentations.profileFrame,
  season0_tester_frame: {
    id: 'season0_tester_frame',
    className: 'profile-frame-season0-tester',
  },
  bronze_profile_frame: {
    id: 'bronze_profile_frame',
    className: 'profile-frame-bronze',
  },
};

export function resolveCheckerSet(id: CheckerSetId): CheckerSetPresentation {
  return checkerSets[id];
}

export function resolveProfileFrame(id: ProfileFrameId): ProfileFramePresentation {
  return profileFrames[id];
}

function withOwner<T extends CosmeticPresentation>(
  ownerSeat: PlayerId,
  presentation: T,
): PlayerCosmeticPresentation<T> {
  return { ownerSeat, presentation };
}

/**
 * Resolves trusted match presentation into fixed application-controlled cosmetic
 * specifications. Missing fields deliberately fall back to Default so legacy
 * match snapshots remain renderable.
 */
export function resolveMatchCosmetics({
  localSeat,
  players,
}: {
  readonly localSeat: PlayerId;
  readonly players?: Partial<
    Record<PlayerId, { cosmetics?: Partial<EquippedCosmetics> }>
  >;
}): ResolvedMatchCosmetics {
  const opponentSeat: PlayerId = localSeat === 'A' ? 'B' : 'A';
  return {
    board: {
      localTheme: withOwner(localSeat, defaultPresentations.boardTheme),
      opponentTheme: withOwner(opponentSeat, defaultPresentations.boardTheme),
    },
    checkers: {
      localSet: withOwner(
        localSeat,
        resolveCheckerSet(players?.[localSeat]?.cosmetics?.checkerSet ?? 'default'),
      ),
      opponentSet: withOwner(
        opponentSeat,
        resolveCheckerSet(players?.[opponentSeat]?.cosmetics?.checkerSet ?? 'default'),
      ),
    },
    dice: {
      localSkin: withOwner(localSeat, defaultPresentations.diceSkin),
      opponentSkin: withOwner(opponentSeat, defaultPresentations.diceSkin),
    },
    profile: {
      localFrame: withOwner(
        localSeat,
        resolveProfileFrame(players?.[localSeat]?.cosmetics?.profileFrame ?? 'default'),
      ),
      opponentFrame: withOwner(
        opponentSeat,
        resolveProfileFrame(players?.[opponentSeat]?.cosmetics?.profileFrame ?? 'default'),
      ),
    },
    reactions: {
      localPack: withOwner(localSeat, defaultPresentations.reactionPack),
    },
  };
}
''',
)

write(
    "apps/miniapp/src/cosmetic-content.ts",
    r'''import type { CosmeticSlot } from '@undergammon/protocol';
import type { Language } from './content';

interface CosmeticCopy {
  readonly name: readonly [english: string, russian: string];
  readonly description: readonly [english: string, russian: string];
}

const copy: Readonly<Record<string, CosmeticCopy>> = {
  'PROFILE_FRAME:default': {
    name: ['Default', 'По умолчанию'],
    description: ['Standard profile appearance.', 'Стандартный вид профиля.'],
  },
  'PROFILE_FRAME:season0_tester_frame': {
    name: ['Season 0 Tester', 'Тестер Сезона 0'],
    description: ['Season 0 participant reward.', 'Награда участника Сезона 0.'],
  },
  'PROFILE_FRAME:bronze_profile_frame': {
    name: ['Bronze Frame', 'Бронзовая рамка'],
    description: ['Permanent Store profile frame.', 'Постоянная рамка из Магазина.'],
  },
  'CHECKER_SET:default': {
    name: ['Default Checkers', 'Стандартные шашки'],
    description: ['Standard competitive checker appearance.', 'Стандартный вид игровых шашек.'],
  },
  'CHECKER_SET:marble_checker_set': {
    name: ['Marble Checkers', 'Мраморные шашки'],
    description: [
      'Polished light and graphite marble checker set.',
      'Набор шашек из светлого и графитового мрамора.',
    ],
  },
};

function key(slot: CosmeticSlot, cosmeticId: string): string {
  return `${slot}:${cosmeticId}`;
}

export function cosmeticName(slot: CosmeticSlot, cosmeticId: string, language: Language): string {
  const value = copy[key(slot, cosmeticId)];
  return value?.name[language === 'ru' ? 1 : 0] ?? cosmeticId;
}

export function cosmeticDescription(
  slot: CosmeticSlot,
  cosmeticId: string,
  language: Language,
): string {
  const value = copy[key(slot, cosmeticId)];
  return value?.description[language === 'ru' ? 1 : 0] ?? '';
}

export function cosmeticSlotLabel(slot: CosmeticSlot, language: Language): string {
  if (slot === 'PROFILE_FRAME') return language === 'ru' ? 'Рамки профиля' : 'Profile Frames';
  if (slot === 'CHECKER_SET') return language === 'ru' ? 'Наборы шашек' : 'Checker Sets';
  return language === 'ru' ? 'Кости' : 'Dice Skins';
}
''',
)

write(
    "apps/miniapp/src/ui/CheckerSetPreview.tsx",
    r'''import type { CheckerSetId } from '@undergammon/protocol';
import { resolveCheckerSet } from '../game/cosmetics';

export function CheckerSetPreview({ cosmeticId }: { cosmeticId: CheckerSetId }) {
  const presentation = resolveCheckerSet(cosmeticId);
  return (
    <span className="checker-set-preview" aria-hidden="true">
      <i className={`checker-preview own ${presentation.className}`} />
      <i className={`checker-preview enemy ${presentation.className}`} />
    </span>
  );
}
''',
)

write(
    "apps/miniapp/src/ui/CosmeticPreview.tsx",
    r'''import {
  checkerSetIdSchema,
  profileFrameIdSchema,
  type CosmeticSlot,
} from '@undergammon/protocol';
import { CheckerSetPreview } from './CheckerSetPreview';
import { ProfileFramePreview } from './ProfileFramePreview';

export function CosmeticPreview({
  slot,
  cosmeticId,
}: {
  slot: CosmeticSlot;
  cosmeticId: string;
}) {
  if (slot === 'PROFILE_FRAME') {
    const parsed = profileFrameIdSchema.safeParse(cosmeticId);
    if (parsed.success) return <ProfileFramePreview cosmeticId={parsed.data} />;
  }
  if (slot === 'CHECKER_SET') {
    const parsed = checkerSetIdSchema.safeParse(cosmeticId);
    if (parsed.success) return <CheckerSetPreview cosmeticId={parsed.data} />;
  }
  return (
    <span className="cosmetic-preview" aria-hidden="true">
      ?
    </span>
  );
}
''',
)

write(
    "apps/miniapp/src/Store.tsx",
    r'''import { useEffect, useState } from 'react';
import type { CosmeticSlot, StoreProduct, StorePurchaseResult } from '@undergammon/protocol';
import { api, platform } from './platform';
import type { Language } from './content';
import { cosmeticDescription, cosmeticName, cosmeticSlotLabel } from './cosmetic-content';
import { EmptyStateIcon, RetryIcon } from './ui/icons';
import { CosmeticPreview } from './ui/CosmeticPreview';

interface Notice {
  readonly kind: 'success' | 'error';
  readonly text: string;
}

const storeSlots: readonly CosmeticSlot[] = ['PROFILE_FRAME', 'CHECKER_SET'];

function productKey(product: Pick<StoreProduct, 'slot' | 'cosmeticId'>): string {
  return `${product.slot}:${product.cosmeticId}`;
}

export function Store({
  language,
  coins,
  onBalance,
}: {
  language: Language;
  coins: number;
  onBalance: (coins: number) => void;
}) {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(false);
    void api<StoreProduct[]>('/store')
      .then((items) => {
        if (active) setProducts(items);
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const buy = async (product: StoreProduct) => {
    const key = productKey(product);
    setPending(key);
    setNotice(null);
    try {
      const result = await api<StorePurchaseResult>('/store/purchase', 'POST', {
        slot: product.slot,
        cosmeticId: product.cosmeticId,
      });
      onBalance(result.balance);
      setProducts((current) =>
        current.map((item) => (productKey(item) === key ? result.product : item)),
      );
      platform.haptic();
      setNotice({
        kind: 'success',
        text: language === 'ru' ? 'Покупка завершена' : 'Purchase complete',
      });
    } catch (error) {
      setNotice({
        kind: 'error',
        text:
          error instanceof Error && error.message === 'INSUFFICIENT_COINS'
            ? language === 'ru'
              ? 'Недостаточно монет'
              : 'Insufficient Coins'
            : language === 'ru'
              ? 'Не удалось купить'
              : 'Purchase failed',
      });
    } finally {
      setPending(null);
    }
  };

  return (
    <section aria-labelledby="store-title">
      <div className="page-title commerce-title">
        <div>
          <p className="eyebrow">SEASON 0</p>
          <h1 id="store-title">{language === 'ru' ? 'Магазин' : 'Store'}</h1>
        </div>
        <strong>
          {coins} {language === 'ru' ? 'Монет' : 'Coins'}
        </strong>
      </div>

      {loading ? (
        <div className="cosmetic-grid" aria-label={language === 'ru' ? 'Загрузка' : 'Loading'}>
          <CosmeticSkeleton />
          <CosmeticSkeleton />
        </div>
      ) : loadError ? (
        <div className="commerce-state-card" role="alert">
          <RetryIcon />
          <h3>{language === 'ru' ? 'Магазин недоступен' : 'Store unavailable'}</h3>
          <p>
            {language === 'ru'
              ? 'Не удалось загрузить каталог. Попробуйте ещё раз.'
              : 'The catalog could not be loaded. Try again.'}
          </p>
          <button onClick={() => setReloadKey((value) => value + 1)}>
            {language === 'ru' ? 'Повторить' : 'Retry'}
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className="commerce-state-card">
          <EmptyStateIcon />
          <h3>{language === 'ru' ? 'Пока пусто' : 'Nothing here yet'}</h3>
          <p>
            {language === 'ru'
              ? 'Доступные предметы появятся здесь.'
              : 'Available items will appear here.'}
          </p>
        </div>
      ) : (
        storeSlots.map((slot) => {
          const items = products.filter((product) => product.slot === slot);
          if (!items.length) return null;
          return (
            <div className="cosmetic-section" key={slot}>
              <h2 className="section-label">{cosmeticSlotLabel(slot, language)}</h2>
              <div className="cosmetic-grid">
                {items.map((product) => {
                  const key = productKey(product);
                  return (
                    <article
                      className={`cosmetic-card polished-card ${product.owned ? 'owned' : ''}`}
                      key={key}
                    >
                      <CosmeticPreview slot={product.slot} cosmeticId={product.cosmeticId} />
                      <div className="cosmetic-card-copy">
                        <h3>{cosmeticName(product.slot, product.cosmeticId, language)}</h3>
                        <small>
                          {product.priceCoins} {language === 'ru' ? 'Монет' : 'Coins'}
                        </small>
                        <p>{cosmeticDescription(product.slot, product.cosmeticId, language)}</p>
                      </div>
                      {product.owned ? (
                        <button className="cosmetic-state owned" disabled>
                          {language === 'ru' ? 'Куплено' : 'Owned'}
                        </button>
                      ) : (
                        <button disabled={pending !== null} onClick={() => void buy(product)}>
                          {pending === key
                            ? language === 'ru'
                              ? 'Покупка…'
                              : 'Buying…'
                            : language === 'ru'
                              ? 'Купить'
                              : 'Buy'}
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {notice && (
        <p className={`commerce-notice ${notice.kind}`} role="status">
          {notice.text}
        </p>
      )}
    </section>
  );
}

function CosmeticSkeleton() {
  return (
    <div className="cosmetic-skeleton" aria-hidden="true">
      <span />
      <div />
      <i />
    </div>
  );
}
''',
)

write(
    "apps/miniapp/src/Cosmetics.tsx",
    r'''import { useEffect, useState } from 'react';
import {
  checkerSetIdSchema,
  profileFrameIdSchema,
  type CosmeticId,
  type CosmeticSlot,
  type CosmeticsInventory,
  type Profile,
} from '@undergammon/protocol';
import { api, platform } from './platform';
import type { Language } from './content';
import { cosmeticDescription, cosmeticName, cosmeticSlotLabel } from './cosmetic-content';
import { RetryIcon } from './ui/icons';
import { CosmeticPreview } from './ui/CosmeticPreview';

interface CosmeticItem {
  readonly slot: CosmeticSlot;
  readonly cosmeticId: CosmeticId;
}

function itemKey(item: CosmeticItem): string {
  return `${item.slot}:${item.cosmeticId}`;
}

export function Cosmetics({
  language,
  onEquipment,
}: {
  language: Language;
  onEquipment: (cosmetics: Profile['cosmetics']) => void;
}) {
  const [inventory, setInventory] = useState<CosmeticsInventory | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setInventory(null);
    setLoadError(false);
    void api<CosmeticsInventory>('/cosmetics')
      .then((value) => {
        if (active) setInventory(value);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const equip = async (item: CosmeticItem) => {
    const key = itemKey(item);
    setPending(key);
    try {
      const equipped = await api<Profile['cosmetics']>('/cosmetics/equipment', 'PUT', item);
      setInventory((current) => (current ? { ...current, equipped } : current));
      onEquipment(equipped);
      platform.haptic();
    } finally {
      setPending(null);
    }
  };

  const ownedIds = (slot: CosmeticSlot): string[] =>
    inventory?.owned.filter((item) => item.slot === slot).map((item) => item.cosmeticId) ?? [];

  const frameItems: CosmeticItem[] = inventory
    ? [
        { slot: 'PROFILE_FRAME', cosmeticId: 'default' },
        ...ownedIds('PROFILE_FRAME').flatMap((id) => {
          const parsed = profileFrameIdSchema.safeParse(id);
          return parsed.success && parsed.data !== 'default'
            ? [{ slot: 'PROFILE_FRAME' as const, cosmeticId: parsed.data }]
            : [];
        }),
      ]
    : [];
  const checkerItems: CosmeticItem[] = inventory
    ? [
        { slot: 'CHECKER_SET', cosmeticId: 'default' },
        ...ownedIds('CHECKER_SET').flatMap((id) => {
          const parsed = checkerSetIdSchema.safeParse(id);
          return parsed.success && parsed.data !== 'default'
            ? [{ slot: 'CHECKER_SET' as const, cosmeticId: parsed.data }]
            : [];
        }),
      ]
    : [];

  const equippedId = (slot: CosmeticSlot): CosmeticId => {
    if (!inventory) return 'default';
    if (slot === 'PROFILE_FRAME') return inventory.equipped.profileFrame;
    if (slot === 'CHECKER_SET') return inventory.equipped.checkerSet ?? 'default';
    return inventory.equipped.diceSkin ?? 'default';
  };

  const renderSection = (slot: CosmeticSlot, items: readonly CosmeticItem[]) => (
    <div className="cosmetic-section" key={slot}>
      <h2 className="section-label">{cosmeticSlotLabel(slot, language)}</h2>
      <div className="cosmetic-grid">
        {items.map((item) => {
          const key = itemKey(item);
          const equipped = equippedId(slot) === item.cosmeticId;
          return (
            <article
              className={`cosmetic-card polished-card owned ${equipped ? 'equipped' : ''}`}
              key={key}
            >
              <CosmeticPreview slot={slot} cosmeticId={item.cosmeticId} />
              <div className="cosmetic-card-copy">
                <h3>{cosmeticName(slot, item.cosmeticId, language)}</h3>
                <p>{cosmeticDescription(slot, item.cosmeticId, language)}</p>
              </div>
              {equipped ? (
                <button className="cosmetic-state equipped" disabled>
                  {language === 'ru' ? 'Выбрано' : 'Equipped'}
                </button>
              ) : (
                <button disabled={pending !== null} onClick={() => void equip(item)}>
                  {pending === key
                    ? language === 'ru'
                      ? 'Выбор…'
                      : 'Equipping…'
                    : language === 'ru'
                      ? 'Выбрать'
                      : 'Equip'}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );

  return (
    <section aria-labelledby="cosmetics-title">
      <div className="page-title">
        <p className="eyebrow">SEASON 0</p>
        <h1 id="cosmetics-title">{language === 'ru' ? 'Экипировка' : 'Cosmetics'}</h1>
      </div>

      {loadError ? (
        <div className="commerce-state-card" role="alert">
          <RetryIcon />
          <h3>{language === 'ru' ? 'Коллекция недоступна' : 'Collection unavailable'}</h3>
          <p>
            {language === 'ru'
              ? 'Не удалось загрузить экипировку. Попробуйте ещё раз.'
              : 'Your cosmetics could not be loaded. Try again.'}
          </p>
          <button onClick={() => setReloadKey((value) => value + 1)}>
            {language === 'ru' ? 'Повторить' : 'Retry'}
          </button>
        </div>
      ) : inventory === null ? (
        <div className="cosmetic-grid" aria-label={language === 'ru' ? 'Загрузка' : 'Loading'}>
          <CosmeticSkeleton />
          <CosmeticSkeleton />
        </div>
      ) : (
        <>
          {renderSection('PROFILE_FRAME', frameItems)}
          {renderSection('CHECKER_SET', checkerItems)}
        </>
      )}
    </section>
  );
}

function CosmeticSkeleton() {
  return (
    <div className="cosmetic-skeleton" aria-hidden="true">
      <span />
      <div />
      <i />
    </div>
  );
}
''',
)

write(
    "apps/miniapp/src/styles/checker-sets.css",
    r'''.checker-set-preview {
  position: relative;
  width: 48px;
  height: 48px;
  display: block;
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  background: var(--surface-strong);
}

.checker-preview {
  position: absolute;
  width: 31px;
  height: 31px;
  border-radius: 50%;
  box-shadow:
    inset 0 0 0 2px #ffffff24,
    0 2px 4px #0008;
}

.checker-preview.own {
  top: 5px;
  left: 5px;
  border: 1px solid #a99b82;
  background: radial-gradient(circle at 35% 28%, #fff, var(--checker-ivory) 60%, #b9ad98);
}

.checker-preview.enemy {
  right: 5px;
  bottom: 5px;
  border: 1px solid #111;
  background: radial-gradient(circle at 35% 28%, #4a4f48, var(--checker-dark) 65%, #111);
}

.checker.checker-set-marble.own,
.checker-preview.checker-set-marble.own {
  border-color: #a7aaa4;
  background:
    linear-gradient(125deg, transparent 22%, #777d7628 24% 27%, transparent 29% 56%, #8b918b2e 58% 61%, transparent 63%),
    radial-gradient(circle at 34% 26%, #fff, #e2e4df 58%, #aeb2aa 78%, #858a83);
  box-shadow:
    inset 0 0 0 2px #ffffff50,
    inset -3px -4px 7px #51565025,
    0 2px 3px #0008;
}

.checker.checker-set-marble.enemy,
.checker-preview.checker-set-marble.enemy {
  border-color: #171a18;
  background:
    linear-gradient(130deg, transparent 18%, #c7cbc42b 20% 23%, transparent 25% 54%, #d9ddd42b 56% 59%, transparent 61%),
    radial-gradient(circle at 34% 26%, #666b65, #343936 58%, #202421 80%, #111411);
  box-shadow:
    inset 0 0 0 2px #ffffff1c,
    inset -3px -4px 8px #0007,
    0 2px 3px #0009;
}
''',
)

replace(
    "apps/miniapp/src/main.tsx",
    """import './style.css';\nimport './styles/polish.css';\n""",
    """import './style.css';\nimport './styles/polish.css';\nimport './styles/checker-sets.css';\n""",
)

write(
    "apps/miniapp/test/cosmetics.test.ts",
    r'''import { describe, expect, it } from 'vitest';
import { resolveCheckerSet, resolveMatchCosmetics } from '../src/game/cosmetics';

describe('resolveMatchCosmetics', () => {
  it('deterministically resolves every absent slot to the Default presentation', () => {
    const first = resolveMatchCosmetics({ localSeat: 'A' });
    const second = resolveMatchCosmetics({ localSeat: 'A' });

    expect(first).toEqual(second);
    expect([
      first.board.localTheme.presentation.id,
      first.board.opponentTheme.presentation.id,
      first.checkers.localSet.presentation.id,
      first.checkers.opponentSet.presentation.id,
      first.dice.localSkin.presentation.id,
      first.dice.opponentSkin.presentation.id,
      first.profile.localFrame.presentation.id,
      first.profile.opponentFrame.presentation.id,
      first.reactions.localPack.presentation.id,
    ]).toEqual(Array.from({ length: 9 }, () => 'default'));
  });

  it('keeps player-owned checker sets aligned when perspective changes', () => {
    const players = {
      A: {
        cosmetics: {
          profileFrame: 'season0_tester_frame' as const,
          checkerSet: 'marble_checker_set' as const,
        },
      },
      B: { cosmetics: { profileFrame: 'default' as const } },
    };
    const viewedByA = resolveMatchCosmetics({ localSeat: 'A', players });
    const viewedByB = resolveMatchCosmetics({ localSeat: 'B', players });

    expect(viewedByA.checkers.localSet).toMatchObject({
      ownerSeat: 'A',
      presentation: { id: 'marble_checker_set', className: 'checker-set-marble' },
    });
    expect(viewedByA.checkers.opponentSet).toMatchObject({
      ownerSeat: 'B',
      presentation: { id: 'default' },
    });
    expect(viewedByB.checkers.localSet).toMatchObject({
      ownerSeat: 'B',
      presentation: { id: 'default' },
    });
    expect(viewedByB.checkers.opponentSet).toMatchObject({
      ownerSeat: 'A',
      presentation: { id: 'marble_checker_set', className: 'checker-set-marble' },
    });
    expect(viewedByB.profile.opponentFrame.presentation.id).toBe('season0_tester_frame');
  });

  it('falls back to Default for legacy profile-only cosmetic snapshots', () => {
    const result = resolveMatchCosmetics({
      localSeat: 'A',
      players: {
        A: { cosmetics: { profileFrame: 'bronze_profile_frame' } },
        B: {},
      },
    });
    expect(result.profile.localFrame.presentation.id).toBe('bronze_profile_frame');
    expect(result.checkers.localSet.presentation.id).toBe('default');
    expect(result.checkers.opponentSet.presentation.id).toBe('default');
  });

  it('maps checker cosmetics through application-controlled presentation classes', () => {
    expect(resolveCheckerSet('marble_checker_set')).toEqual({
      id: 'marble_checker_set',
      className: 'checker-set-marble',
    });
  });
});
''',
)

write(
    "apps/server/test/cosmetic-catalog.test.ts",
    r'''import { describe, expect, it } from 'vitest';
import {
  cosmeticDefinition,
  cosmeticKey,
  purchasableCosmeticDefinition,
} from '../src/cosmetic-catalog.js';

describe('cosmetic catalog identity', () => {
  it('scopes repeated cosmetic ids by slot', () => {
    expect(cosmeticDefinition('PROFILE_FRAME', 'default')?.slot).toBe('PROFILE_FRAME');
    expect(cosmeticDefinition('CHECKER_SET', 'default')?.slot).toBe('CHECKER_SET');
    expect(cosmeticDefinition('DICE_SKIN', 'default')?.slot).toBe('DICE_SKIN');
    expect(cosmeticKey('PROFILE_FRAME', 'default')).not.toBe(
      cosmeticKey('CHECKER_SET', 'default'),
    );
  });

  it('requires the exact slot for purchasable checker content', () => {
    expect(purchasableCosmeticDefinition('CHECKER_SET', 'marble_checker_set')).toMatchObject({
      slot: 'CHECKER_SET',
      id: 'marble_checker_set',
      priceCoins: 200,
    });
    expect(purchasableCosmeticDefinition('PROFILE_FRAME', 'marble_checker_set')).toBeUndefined();
  });
});
''',
)

replace(
    "apps/server/test/integration.test.ts",
    """    expect(await storeProducts(pool, user(0))).toEqual([\n      {\n        cosmeticId: 'bronze_profile_frame',\n        slot: 'PROFILE_FRAME',\n        priceCoins: 150,\n        owned: false,\n      },\n    ]);\n""",
    """    expect(await storeProducts(pool, user(0))).toEqual([\n      {\n        cosmeticId: 'bronze_profile_frame',\n        slot: 'PROFILE_FRAME',\n        priceCoins: 150,\n        owned: false,\n      },\n      {\n        cosmeticId: 'marble_checker_set',\n        slot: 'CHECKER_SET',\n        priceCoins: 200,\n        owned: false,\n      },\n    ]);\n""",
)

replace(
    "apps/server/test/integration.test.ts",
    """  it('serializes concurrent purchases and rolls back insufficient purchases', async () => {\n""",
    """  it('purchases and equips Checker Sets independently and snapshots trusted equipment', async () => {\n    await transaction(pool, (db) => service.coins(db, user(0), 250, 'ADMIN_ADJUSTMENT', 'checker-seed'));\n    const purchased = await purchaseCosmetic(\n      pool,\n      user(0),\n      'marble_checker_set',\n      'CHECKER_SET',\n    );\n    expect(purchased.balance).toBe(50);\n    expect((await cosmeticsInventory(pool, user(0))).equipped.checkerSet).toBeUndefined();\n\n    const equipped = await equipCosmetic(pool, user(0), 'CHECKER_SET', 'marble_checker_set');\n    expect(equipped.profileFrame).toBe('default');\n    expect(equipped.checkerSet).toBe('marble_checker_set');\n\n    const snapshot = await transaction(pool, (db) =>\n      service.create(db, user(0), user(1), 'LONG_NARDY', 'CASUAL'),\n    );\n    expect(snapshot.players.A.cosmetics?.checkerSet).toBe('marble_checker_set');\n    expect(snapshot.players.B.cosmetics?.checkerSet).toBeUndefined();\n\n    const ledger = await rows<{ reference: string }>(\n      pool,\n      \"SELECT reference FROM coin_ledger WHERE account_id=$1 AND source='COSMETIC_PURCHASE'\",\n      [user(0)],\n    );\n    expect(ledger).toEqual([{ reference: 'CHECKER_SET:marble_checker_set' }]);\n    expect((await equipCosmetic(pool, user(0), 'CHECKER_SET', 'default')).checkerSet).toBeUndefined();\n  });\n  it('allows the same cosmetic id to exist in different ownership slots', async () => {\n    await pool.query(\n      \"INSERT INTO cosmetic_ownership(account_id,slot,cosmetic_id,source,source_reference) VALUES($1,'PROFILE_FRAME','shared_test_cosmetic','TEST','frame'),($1,'CHECKER_SET','shared_test_cosmetic','TEST','checker')\",\n      [user(0)],\n    );\n    const owned = await rows<{ slot: string; cosmetic_id: string }>(\n      pool,\n      'SELECT slot,cosmetic_id FROM cosmetic_ownership WHERE account_id=$1 ORDER BY slot',\n      [user(0)],\n    );\n    expect(owned).toEqual([\n      { slot: 'CHECKER_SET', cosmetic_id: 'shared_test_cosmetic' },\n      { slot: 'PROFILE_FRAME', cosmetic_id: 'shared_test_cosmetic' },\n    ]);\n  });\n  it('serializes concurrent purchases and rolls back insufficient purchases', async () => {\n""",
)

print("PR 2 implementation applied")
