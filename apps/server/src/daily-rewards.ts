import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import type { DailyRewardClaimResult, DailyRewardStatus } from '@undergammon/protocol';
import type { Db } from './db.js';
import { rows, transaction } from './db.js';
import { applyCoins } from './economy.js';
import { dailyRewardCoins } from './policy.js';

export type DailyRewardClock = () => Date;

interface ClaimRecord {
  claim_date: string;
  cycle_day: number;
}

async function utcDate(db: Db | pg.Pool, clock?: DailyRewardClock): Promise<string> {
  const instant = clock?.() ?? null;
  const result = await rows<{ claim_date: string }>(
    db,
    "SELECT (COALESCE($1::timestamptz, now()) AT TIME ZONE 'UTC')::date::text AS claim_date",
    [instant?.toISOString() ?? null],
  );
  const claimDate = result[0]?.claim_date;
  if (!claimDate) throw new Error('INTERNAL_ERROR');
  return claimDate;
}

async function latestClaim(db: Db | pg.Pool, accountId: string): Promise<ClaimRecord | undefined> {
  return (
    await rows<ClaimRecord>(
      db,
      'SELECT claim_date::text,cycle_day FROM daily_reward_claims WHERE account_id=$1 ORDER BY claim_date DESC,created_at DESC,id DESC LIMIT 1',
      [accountId],
    )
  )[0];
}

async function statusForDate(
  db: Db | pg.Pool,
  accountId: string,
  today: string,
): Promise<DailyRewardStatus> {
  const last = await latestClaim(db, accountId);
  const claimedToday = last?.claim_date === today;
  const currentDay = claimedToday ? last.cycle_day : ((last?.cycle_day ?? 0) % 7) + 1;
  return {
    rewards: dailyRewardCoins.map((coins, index) => ({ day: index + 1, coins })),
    currentDay,
    claimedToday,
    lastClaimDate: last?.claim_date ?? null,
    nextClaimAt: claimedToday
      ? new Date(new Date(`${today}T00:00:00.000Z`).getTime() + 86_400_000).toISOString()
      : null,
  };
}

export async function dailyRewardStatus(
  db: Db | pg.Pool,
  accountId: string,
  clock?: DailyRewardClock,
): Promise<DailyRewardStatus> {
  return statusForDate(db, accountId, await utcDate(db, clock));
}

export async function claimDailyRewardInTransaction(
  db: Db,
  accountId: string,
  clock?: DailyRewardClock,
): Promise<DailyRewardClaimResult> {
  const today = await utcDate(db, clock);
  const last = await latestClaim(db, accountId);
  if (last?.claim_date === today) throw new Error('DAILY_REWARD_ALREADY_CLAIMED');
  const cycleDay = ((last?.cycle_day ?? 0) % 7) + 1;
  const rewardCoins = dailyRewardCoins[cycleDay - 1];
  if (rewardCoins === undefined) throw new Error('INTERNAL_ERROR');
  const claimId = randomUUID();
  const inserted = await db.query(
    'INSERT INTO daily_reward_claims(id,account_id,claim_date,cycle_day,reward_coins) VALUES($1,$2,$3,$4,$5) ON CONFLICT(account_id,claim_date) DO NOTHING RETURNING id',
    [claimId, accountId, today, cycleDay, rewardCoins],
  );
  if (inserted.rowCount !== 1) throw new Error('DAILY_REWARD_ALREADY_CLAIMED');
  const balance = await applyCoins(db, accountId, rewardCoins, 'DAILY_REWARD', claimId);
  if (balance === null) throw new Error('INTERNAL_ERROR');
  return { rewardCoins, balance, status: await statusForDate(db, accountId, today) };
}

export function claimDailyReward(
  pool: pg.Pool,
  accountId: string,
  clock?: DailyRewardClock,
): Promise<DailyRewardClaimResult> {
  return transaction(pool, (db) => claimDailyRewardInTransaction(db, accountId, clock));
}
