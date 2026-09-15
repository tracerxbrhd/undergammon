import { randomUUID } from 'node:crypto';
import type { Db } from './db.js';
import { rows } from './db.js';

/** Applies a balance change and its append-only ledger entry as one transaction-local operation. */
export async function applyCoins(
  db: Db,
  accountId: string,
  delta: number,
  source: string,
  reference: string,
): Promise<number | null> {
  const existing = await rows<{ balance_after: number }>(
    db,
    'SELECT balance_after FROM coin_ledger WHERE account_id=$1 AND source=$2 AND reference=$3',
    [accountId, source, reference],
  );
  if (existing[0]) return null;
  const account = (
    await rows<{ coins: number }>(
      db,
      'UPDATE accounts SET coins=coins+$2 WHERE id=$1 AND coins+$2>=0 RETURNING coins',
      [accountId, delta],
    )
  )[0];
  if (!account) throw new Error('INSUFFICIENT_COINS');
  await db.query(
    'INSERT INTO coin_ledger(id,account_id,delta,balance_after,source,reference) VALUES($1,$2,$3,$4,$5,$6)',
    [randomUUID(), accountId, delta, account.coins, source, reference],
  );
  return account.coins;
}
