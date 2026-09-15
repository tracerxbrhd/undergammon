import type pg from 'pg';
import type { EquippedCosmetics, ProfileFrameId } from '@undergammon/protocol';
import { profileFrameIdSchema } from '@undergammon/protocol';
import { rows, type Db } from './db.js';

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
