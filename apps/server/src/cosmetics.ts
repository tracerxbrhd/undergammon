import type pg from 'pg';
import type {
  CosmeticSlot,
  CosmeticsInventory,
  EquippedCosmetics,
  ProfileFrameId,
  StoreProduct,
  StorePurchaseResult,
} from '@undergammon/protocol';
import { checkerSetIdSchema, diceSkinIdSchema, profileFrameIdSchema } from '@undergammon/protocol';
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

export async function storeProducts(
  db: Db | pg.Pool,
  accountId: string,
  slots: readonly CosmeticSlot[] = ['PROFILE_FRAME', 'CHECKER_SET', 'DICE_SKIN'],
): Promise<StoreProduct[]> {
  const owned = new Set(
    (
      await rows<{ cosmetic_id: string; slot: CosmeticSlot }>(
        db,
        'SELECT cosmetic_id,slot FROM cosmetic_ownership WHERE account_id=$1',
        [accountId],
      )
    ).map((item) => cosmeticKey(item.slot, item.cosmetic_id)),
  );
  return purchasableCosmetics
    .filter((item) => slots.includes(item.slot))
    .map((item) => ({
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
    await db.query('SELECT 1 FROM accounts WHERE id=$1 FOR UPDATE', [accountId]);
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
