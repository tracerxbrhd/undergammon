import type pg from 'pg';
import type {
  CosmeticSlot,
  CosmeticsInventory,
  EquippedCosmetics,
  ProfileFrameId,
  StoreProduct,
  StorePurchaseResult,
} from '@undergammon/protocol';
import { profileFrameIdSchema } from '@undergammon/protocol';
import { rows, transaction, type Db } from './db.js';
import { applyCoins } from './economy.js';
import { cosmeticDefinition, purchasableCosmetics } from './cosmetic-catalog.js';

const SLOT = 'PROFILE_FRAME';
const TESTER_FRAME = 'season0_tester_frame';

export async function equippedCosmetics(
  db: Db | pg.Pool,
  accountId: string,
): Promise<EquippedCosmetics> {
  const equipped = (
    await rows<{ cosmetic_id: string }>(
      db,
      'SELECT cosmetic_id FROM cosmetic_equipment WHERE account_id=$1 AND slot=$2',
      [accountId, SLOT],
    )
  )[0]?.cosmetic_id;
  const parsed = profileFrameIdSchema.safeParse(equipped ?? 'default');
  return { profileFrame: parsed.success ? parsed.data : ('default' satisfies ProfileFrameId) };
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
    'SELECT cosmetic_id,slot,acquired_at,source FROM cosmetic_ownership WHERE account_id=$1 ORDER BY acquired_at,cosmetic_id',
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
    const definition = cosmeticDefinition(cosmeticId);
    if (!definition) throw new Error('COSMETIC_NOT_FOUND');
    if (definition.slot !== slot) throw new Error('COSMETIC_SLOT_MISMATCH');
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
      await rows<{ cosmetic_id: string }>(
        db,
        'SELECT cosmetic_id FROM cosmetic_ownership WHERE account_id=$1',
        [accountId],
      )
    ).map((item) => item.cosmetic_id),
  );
  return purchasableCosmetics.map((item) => ({
    cosmeticId: item.id,
    slot: item.slot,
    priceCoins: item.priceCoins,
    owned: owned.has(item.id),
  }));
}

export async function purchaseCosmetic(
  pool: pg.Pool,
  accountId: string,
  cosmeticId: string,
): Promise<StorePurchaseResult> {
  const product = purchasableCosmetics.find((item) => item.id === cosmeticId);
  if (!product) throw new Error('COSMETIC_NOT_PURCHASABLE');
  return transaction(pool, async (db) => {
    const owned = await rows(
      db,
      'SELECT 1 FROM cosmetic_ownership WHERE account_id=$1 AND slot=$2 AND cosmetic_id=$3',
      [accountId, product.slot, product.id],
    );
    if (owned.length) throw new Error('COSMETIC_ALREADY_OWNED');
    const balance = await applyCoins(
      db,
      accountId,
      -product.priceCoins,
      'COSMETIC_PURCHASE',
      product.id,
    );
    if (balance === null) throw new Error('COSMETIC_ALREADY_OWNED');
    await db.query(
      "INSERT INTO cosmetic_ownership(account_id,slot,cosmetic_id,source,source_reference) VALUES($1,$2,$3,'COSMETIC_PURCHASE',$3)",
      [accountId, product.slot, product.id],
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
    [accountId, SLOT, TESTER_FRAME, matchId],
  );
  if (!granted.length) return false;
  await db.query(
    'INSERT INTO cosmetic_equipment(account_id,slot,cosmetic_id) VALUES($1,$2,$3) ON CONFLICT(account_id,slot) DO NOTHING',
    [accountId, SLOT, TESTER_FRAME],
  );
  return true;
}
