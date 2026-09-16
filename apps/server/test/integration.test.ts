import { beforeAll, afterAll, beforeEach, describe, it, expect, vi } from 'vitest';
import { legalTurns } from '@undergammon/game-engine';
import { randomUUID } from 'node:crypto';
import { createPool, migrateDatabase, rows, transaction } from '../src/db.js';
import { loadConfig } from '../src/config.js';
import { authenticate } from '../src/accounts.js';
import { MatchService } from '../src/matches.js';
import { buildServer } from '../src/app.js';
import { signedInitData } from './helpers.js';
import type { Command, MatchSnapshot } from '@undergammon/protocol';
import {
  cosmeticsInventory,
  equipCosmetic,
  grantSeason0TesterFrame,
  purchaseCosmetic,
  storeProducts,
} from '../src/cosmetics.js';
import {
  claimDailyReward,
  claimDailyRewardInTransaction,
  dailyRewardStatus,
} from '../src/daily-rewards.js';
import { dailyRewardCoins } from '../src/policy.js';
const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url)('PostgreSQL integration', () => {
  const pool = createPool(url ?? 'postgresql://unused');
  const config = loadConfig({
    DATABASE_URL: url ?? 'postgresql://unused',
    PUBLIC_ORIGIN: 'http://localhost:5173',
    BOT_TOKEN: '123456:testing-token-no-real-secret',
    BOT_USERNAME: 'TestBot',
    ADMIN_TELEGRAM_IDS: '1',
    NODE_ENV: 'test',
  });
  const service = new MatchService(pool, config);
  let users: string[] = [];
  beforeAll(async () => {
    await migrateDatabase(pool);
  });
  afterAll(async () => pool.end());
  beforeEach(async () => {
    await pool.query('TRUNCATE accounts CASCADE');
    await pool.query('DELETE FROM service_heartbeat');
    users = [];
    for (let i = 1; i <= 4; i++) {
      const { id } = await authenticate(pool, config, signedInitData(i, config.BOT_TOKEN));
      users.push(id);
    }
  });
  const user = (n: number) => {
    const id = users[n];
    if (!id) throw new Error('MISSING_TEST_USER');
    return id;
  };
  const make = () =>
    transaction(pool, (db) => service.create(db, user(0), user(1), 'BACKGAMMON', 'RANKED'));
  function command(s: MatchSnapshot, type: Command['type']): Command {
    return {
      protocolVersion: 1,
      commandId: randomUUID(),
      matchId: s.id,
      stateVersion: s.stateVersion,
      type,
    };
  }
  it('makes challenge acceptance first-valid-wins and prevents self acceptance', async () => {
    const c = await service.challenge(user(0), 'LONG_NARDY');
    await expect(service.accept(user(0), c.token)).rejects.toThrow('SELF_ACCEPT');
    const results = await Promise.allSettled([
      service.accept(user(1), c.token),
      service.accept(user(2), c.token),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await rows(pool, 'SELECT * FROM matches')).toHaveLength(1);
    await expect(service.queue(user(0), 'BACKGAMMON', 'RANKED')).rejects.toThrow(
      'ACTIVE_MATCH_EXISTS',
    );
  });
  it('pairs queued accounts only once', async () => {
    await service.queue(user(0), 'LONG_NARDY', 'RANKED');
    await service.queue(user(1), 'LONG_NARDY', 'RANKED');
    await Promise.all([service.tick(), service.tick()]);
    expect(await rows(pool, 'SELECT * FROM matches')).toHaveLength(1);
    expect(await rows(pool, 'SELECT * FROM matchmaking_entries')).toHaveLength(0);
  });
  it('handles command retry, stale versions, control takeover and reconnect snapshots', async () => {
    let s = await make();
    const ca = randomUUID(),
      cb = randomUUID();
    s = await service.command(user(0), ca, command(s, 'OPEN'));
    s = await service.command(user(1), cb, command(s, 'OPEN'));
    expect(s.status).toBe('ACTIVE');
    const active = s.game.activePlayer === 'A' ? user(0) : user(1);
    const connection = active === user(0) ? ca : cb;
    const surrender = command(s, 'SURRENDER');
    const done = await service.command(active, connection, surrender);
    const again = await service.command(active, connection, surrender);
    expect(again).toEqual(done);
    expect(await rows(pool, 'SELECT * FROM coin_ledger')).toHaveLength(1);
    expect(
      (
        await rows<{ played: number }>(
          pool,
          "SELECT played FROM ratings WHERE ruleset='BACKGAMMON' AND account_id=$1",
          [active],
        )
      )[0]?.played,
    ).toBe(1);
  });
  it('rejects stale commands and old controlling connections', async () => {
    let s = await make();
    const a = randomUUID(),
      b = randomUUID();
    s = await service.command(user(0), a, command(s, 'OPEN'));
    s = await service.command(user(1), b, command(s, 'OPEN'));
    const stale = { ...command(s, 'SURRENDER'), stateVersion: 0 };
    await expect(service.command(user(0), a, stale)).rejects.toThrow('STALE_VERSION');
    const newer = randomUUID();
    s = await service.command(user(0), newer, command(s, 'OPEN'));
    await expect(service.command(user(0), a, command(s, 'SURRENDER'))).rejects.toThrow(
      'CONTROL_LOST',
    );
    await service.disconnected(user(0), a);
    expect((await service.load(pool, s.id)).players.A.connected).toBe(true);
    await service.disconnected(user(0), newer);
    const disconnected = await service.load(pool, s.id);
    expect(disconnected.reconnectDeadlines.A).not.toBeNull();
    const restored = await service.command(user(0), randomUUID(), command(disconnected, 'OPEN'));
    expect(restored.game).toEqual(s.game);
    expect(restored.reconnectDeadlines.A).toBeNull();
  });
  it('finalizes no-contest without changing progression or competitive records', async () => {
    const s = await make();
    await transaction(pool, async (db) => {
      await service.finish(db, s, null, 'NO_CONTEST');
      await service.save(db, s, 'NO_CONTEST');
    });
    expect(await rows(pool, 'SELECT * FROM coin_ledger')).toHaveLength(0);
    expect(
      (await rows<{ played: number }>(pool, 'SELECT played FROM ratings')).every(
        (r) => r.played === 0,
      ),
    ).toBe(true);
    expect(
      (await rows<{ total_xp: number }>(pool, 'SELECT total_xp FROM accounts')).every(
        (r) => r.total_xp === 0,
      ),
    ).toBe(true);
    expect(await rows(pool, 'SELECT * FROM match_players WHERE unfinished')).toHaveLength(0);
    expect(await rows(pool, 'SELECT * FROM cosmetic_ownership')).toHaveLength(0);
  });
  it('grants and auto-equips the Season 0 frame for both participants idempotently', async () => {
    const s = await make();
    expect(s.players.A.cosmetics?.profileFrame).toBe('default');
    expect(s.players.B.cosmetics?.profileFrame).toBe('default');
    await transaction(pool, async (db) => {
      await service.finish(db, s, 'A', 'BEAR_OFF');
      await service.save(db, s, 'FINISHED');
    });
    await transaction(pool, async (db) => {
      const persisted = await service.load(db, s.id);
      await service.finish(db, persisted, 'A', 'BEAR_OFF');
    });
    const ownership = await rows<{ account_id: string; source_reference: string }>(
      pool,
      "SELECT account_id,source_reference FROM cosmetic_ownership WHERE cosmetic_id='season0_tester_frame' ORDER BY account_id",
    );
    expect(ownership).toHaveLength(2);
    expect(ownership.map((row) => row.account_id).sort()).toEqual([user(0), user(1)].sort());
    expect(ownership.every((row) => row.source_reference === s.id)).toBe(true);
    expect(await rows(pool, 'SELECT * FROM cosmetic_equipment')).toHaveLength(2);
  });
  it('does not re-equip an already-owned frame after it is intentionally unequipped', async () => {
    const firstGrant = await transaction(pool, (db) =>
      grantSeason0TesterFrame(db, user(0), randomUUID()),
    );
    expect(firstGrant).toBe(true);
    expect(
      await rows(pool, 'SELECT * FROM cosmetic_equipment WHERE account_id=$1', [user(0)]),
    ).toHaveLength(1);

    await pool.query(
      "DELETE FROM cosmetic_equipment WHERE account_id=$1 AND slot='PROFILE_FRAME'",
      [user(0)],
    );
    const repeatedGrant = await transaction(pool, (db) =>
      grantSeason0TesterFrame(db, user(0), randomUUID()),
    );

    expect(repeatedGrant).toBe(false);
    expect(
      await rows(pool, 'SELECT * FROM cosmetic_ownership WHERE account_id=$1', [user(0)]),
    ).toHaveLength(1);
    expect(
      await rows(pool, 'SELECT * FROM cosmetic_equipment WHERE account_id=$1', [user(0)]),
    ).toHaveLength(0);
  });
  it('captures trusted equipped cosmetics in each newly created match snapshot', async () => {
    const qualifying = await make();
    await transaction(pool, async (db) => {
      await service.finish(db, qualifying, 'A', 'BEAR_OFF');
      await service.save(db, qualifying, 'FINISHED');
    });

    const subsequent = await transaction(pool, (db) =>
      service.create(db, user(0), user(2), 'LONG_NARDY', 'CASUAL'),
    );
    expect(subsequent.players.A.cosmetics?.profileFrame).toBe('season0_tester_frame');
    expect(subsequent.players.B.cosmetics?.profileFrame).toBe('default');
    expect(qualifying.players.A.cosmetics?.profileFrame).toBe('default');
  });
  it('purchases and equips a server-defined cosmetic without auto-equipping it', async () => {
    await transaction(pool, (db) => service.coins(db, user(0), 200, 'ADMIN_ADJUSTMENT', 'seed'));
    expect(await storeProducts(pool, user(0))).toEqual([
      {
        cosmeticId: 'bronze_profile_frame',
        slot: 'PROFILE_FRAME',
        priceCoins: 150,
        owned: false,
      },
      {
        cosmeticId: 'marble_checker_set',
        slot: 'CHECKER_SET',
        priceCoins: 200,
        owned: false,
      },
    ]);
    expect(await storeProducts(pool, user(0), ['PROFILE_FRAME'])).toEqual([
      {
        cosmeticId: 'bronze_profile_frame',
        slot: 'PROFILE_FRAME',
        priceCoins: 150,
        owned: false,
      },
    ]);

    const purchased = await purchaseCosmetic(pool, user(0), 'bronze_profile_frame');
    expect(purchased.balance).toBe(50);
    expect((await cosmeticsInventory(pool, user(0))).equipped.profileFrame).toBe('default');
    expect(
      await rows(pool, "SELECT 1 FROM coin_ledger WHERE source='COSMETIC_PURCHASE'"),
    ).toHaveLength(1);
    expect(
      await rows(pool, 'SELECT 1 FROM cosmetic_ownership WHERE account_id=$1', [user(0)]),
    ).toHaveLength(1);

    await expect(purchaseCosmetic(pool, user(0), 'bronze_profile_frame')).rejects.toThrow(
      'COSMETIC_ALREADY_OWNED',
    );
    expect(
      await rows(pool, "SELECT 1 FROM coin_ledger WHERE source='COSMETIC_PURCHASE'"),
    ).toHaveLength(1);
    expect(
      (await equipCosmetic(pool, user(0), 'PROFILE_FRAME', 'bronze_profile_frame')).profileFrame,
    ).toBe('bronze_profile_frame');
    expect((await equipCosmetic(pool, user(0), 'PROFILE_FRAME', 'default')).profileFrame).toBe(
      'default',
    );
  });
  it('purchases and equips Checker Sets independently and snapshots trusted equipment', async () => {
    await transaction(pool, (db) =>
      service.coins(db, user(0), 250, 'ADMIN_ADJUSTMENT', 'checker-seed'),
    );
    const purchased = await purchaseCosmetic(pool, user(0), 'marble_checker_set', 'CHECKER_SET');
    expect(purchased.balance).toBe(50);
    expect((await cosmeticsInventory(pool, user(0))).equipped.checkerSet).toBeUndefined();

    const equipped = await equipCosmetic(pool, user(0), 'CHECKER_SET', 'marble_checker_set');
    expect(equipped.profileFrame).toBe('default');
    expect(equipped.checkerSet).toBe('marble_checker_set');

    const snapshot = await transaction(pool, (db) =>
      service.create(db, user(0), user(1), 'LONG_NARDY', 'CASUAL'),
    );
    expect(snapshot.players.A.cosmetics?.checkerSet).toBe('marble_checker_set');
    expect(snapshot.players.B.cosmetics?.checkerSet).toBeUndefined();

    const ledger = await rows<{ reference: string }>(
      pool,
      "SELECT reference FROM coin_ledger WHERE account_id=$1 AND source='COSMETIC_PURCHASE'",
      [user(0)],
    );
    expect(ledger).toEqual([{ reference: 'CHECKER_SET:marble_checker_set' }]);
    expect(
      (await equipCosmetic(pool, user(0), 'CHECKER_SET', 'default')).checkerSet,
    ).toBeUndefined();
  });
  it('allows the same cosmetic id to exist in different ownership slots', async () => {
    await pool.query(
      "INSERT INTO cosmetic_ownership(account_id,slot,cosmetic_id,source,source_reference) VALUES($1,'PROFILE_FRAME','shared_test_cosmetic','TEST','frame'),($1,'CHECKER_SET','shared_test_cosmetic','TEST','checker')",
      [user(0)],
    );
    const owned = await rows<{ slot: string; cosmetic_id: string }>(
      pool,
      'SELECT slot,cosmetic_id FROM cosmetic_ownership WHERE account_id=$1 ORDER BY slot',
      [user(0)],
    );
    expect(owned).toEqual([
      { slot: 'CHECKER_SET', cosmetic_id: 'shared_test_cosmetic' },
      { slot: 'PROFILE_FRAME', cosmetic_id: 'shared_test_cosmetic' },
    ]);
  });
  it('serializes concurrent purchases and rolls back insufficient purchases', async () => {
    await transaction(pool, (db) => service.coins(db, user(0), 200, 'ADMIN_ADJUSTMENT', 'seed'));
    const attempts = await Promise.allSettled([
      purchaseCosmetic(pool, user(0), 'bronze_profile_frame'),
      purchaseCosmetic(pool, user(0), 'bronze_profile_frame'),
    ]);
    expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
    expect(
      (await rows<{ coins: number }>(pool, 'SELECT coins FROM accounts WHERE id=$1', [user(0)]))[0]
        ?.coins,
    ).toBe(50);

    await expect(purchaseCosmetic(pool, user(1), 'bronze_profile_frame')).rejects.toThrow(
      'INSUFFICIENT_COINS',
    );
    expect(
      await rows(pool, 'SELECT 1 FROM cosmetic_ownership WHERE account_id=$1', [user(1)]),
    ).toHaveLength(0);
    expect(
      await rows(
        pool,
        "SELECT 1 FROM coin_ledger WHERE account_id=$1 AND source='COSMETIC_PURCHASE'",
        [user(1)],
      ),
    ).toHaveLength(0);
    await expect(
      equipCosmetic(pool, user(1), 'PROFILE_FRAME', 'bronze_profile_frame'),
    ).rejects.toThrow('COSMETIC_NOT_OWNED');
  });
  it('preserves existing equipment and stops runtime grants after Season 0', async () => {
    await pool.query(
      "INSERT INTO cosmetic_ownership(account_id,slot,cosmetic_id,source,source_reference) VALUES($1,'PROFILE_FRAME','future_frame','TEST','test')",
      [user(0)],
    );
    await pool.query(
      "INSERT INTO cosmetic_equipment(account_id,slot,cosmetic_id) VALUES($1,'PROFILE_FRAME','future_frame')",
      [user(0)],
    );
    const first = await make();
    await transaction(pool, async (db) => {
      await service.finish(db, first, 'A', 'SURRENDER');
      await service.save(db, first, 'FINISHED');
    });
    expect(
      (
        await rows<{ cosmetic_id: string }>(
          pool,
          'SELECT cosmetic_id FROM cosmetic_equipment WHERE account_id=$1',
          [user(0)],
        )
      )[0]?.cosmetic_id,
    ).toBe('future_frame');
    await pool.query('UPDATE seasons SET ended_at=now() WHERE id=0');
    const second = await transaction(pool, (db) =>
      service.create(db, user(2), user(3), 'BACKGAMMON', 'CASUAL'),
    );
    await transaction(pool, async (db) => {
      await service.finish(db, second, 'B', 'TIMEOUT');
      await service.save(db, second, 'FINISHED');
    });
    expect(
      await rows(pool, 'SELECT 1 FROM cosmetic_ownership WHERE account_id=ANY($1::uuid[])', [
        [user(2), user(3)],
      ]),
    ).toHaveLength(0);
    await pool.query('UPDATE seasons SET ended_at=NULL WHERE id=0');
  });
  it('rolls back result and all rewards on transaction failure', async () => {
    const s = await make();
    await expect(
      transaction(pool, async (db) => {
        await service.finish(db, s, 'A', 'BEAR_OFF');
        await service.save(db, s, 'FINISHED');
        throw new Error('SIMULATED_DATABASE_FAILURE');
      }),
    ).rejects.toThrow();
    expect((await service.load(pool, s.id)).status).toBe('WAITING_FOR_PLAYERS');
    expect(await rows(pool, 'SELECT * FROM coin_ledger')).toHaveLength(0);
    expect(await rows(pool, 'SELECT * FROM cosmetic_ownership')).toHaveLength(0);
    expect(await rows(pool, 'SELECT * FROM cosmetic_equipment')).toHaveLength(0);
    expect(
      (await rows<{ played: number }>(pool, 'SELECT played FROM ratings')).every(
        (r) => r.played === 0,
      ),
    ).toBe(true);
  });
  it('persists viewer-specific XP and authoritative ranked rating results', async () => {
    const s = await make();
    await transaction(pool, async (db) => {
      await service.finish(db, s, 'A', 'BEAR_OFF');
      await service.save(db, s, 'FINISHED');
    });
    const result = await rows<{
      xp_before: number;
      xp_after: number;
      xp_gained: number;
      rating_before: number;
      rating_after: number;
    }>(
      pool,
      'SELECT xp_before,xp_after,xp_gained,rating_before,rating_after FROM match_players WHERE match_id=$1 AND account_id=$2',
      [s.id, user(0)],
    );
    const playerResult = result[0];
    expect(playerResult).toBeDefined();
    if (!playerResult) throw new Error('MISSING_MATCH_RESULT');
    expect(playerResult.xp_after - playerResult.xp_before).toBe(playerResult.xp_gained);
    expect(playerResult.rating_after).not.toBe(playerResult.rating_before);
  });
  it('makes Coin ledger adjustments idempotent and rejects negative balances', async () => {
    await transaction(pool, async (db) => {
      await service.coins(db, user(0), 100, 'ADMIN_ADJUSTMENT', 'test');
      await service.coins(db, user(0), 100, 'ADMIN_ADJUSTMENT', 'test');
    });
    expect(
      (await rows<{ coins: number }>(pool, 'SELECT coins FROM accounts WHERE id=$1', [user(0)]))[0]
        ?.coins,
    ).toBe(100);
    await expect(
      transaction(pool, (db) => service.coins(db, user(0), -101, 'ADMIN_ADJUSTMENT', 'negative')),
    ).rejects.toThrow('INSUFFICIENT_COINS');
    await expect(pool.query('DELETE FROM coin_ledger')).rejects.toThrow('append-only');
  });
  it('claims the seven-day UTC reward cycle through the Coin ledger and wraps', async () => {
    expect(dailyRewardCoins).toEqual([5, 5, 10, 10, 15, 20, 35]);
    expect(dailyRewardCoins.reduce((total, coins) => total + coins, 0)).toBe(100);
    const dates = [
      '2026-01-01',
      '2026-01-02',
      '2026-01-06', // Missing days do not create claims or reset the cycle.
      '2026-01-07',
      '2026-01-08',
      '2026-01-09',
      '2026-01-10',
      '2026-01-11',
    ];
    for (const [index, date] of dates.entries()) {
      const result = await claimDailyReward(pool, user(0), () => new Date(`${date}T15:00:00Z`));
      expect(result.rewardCoins).toBe(dailyRewardCoins[index % 7]);
      expect(result.status.currentDay).toBe((index % 7) + 1);
      expect(result.status.claimedToday).toBe(true);
      expect(result.status.nextClaimAt).toBe(
        new Date(new Date(`${date}T00:00:00Z`).getTime() + 86_400_000).toISOString(),
      );
    }
    const claims = await rows<{ cycle_day: number; reward_coins: number }>(
      pool,
      'SELECT cycle_day,reward_coins FROM daily_reward_claims WHERE account_id=$1 ORDER BY claim_date',
      [user(0)],
    );
    expect(claims).toHaveLength(8);
    expect(claims.map(({ cycle_day }) => cycle_day)).toEqual([1, 2, 3, 4, 5, 6, 7, 1]);
    expect(claims.map(({ reward_coins }) => reward_coins)).toEqual([5, 5, 10, 10, 15, 20, 35, 5]);
    const ledger = await rows<{ source: string; reference: string }>(
      pool,
      "SELECT source,reference FROM coin_ledger WHERE account_id=$1 AND source='DAILY_REWARD'",
      [user(0)],
    );
    expect(ledger).toHaveLength(8);
    expect(new Set(ledger.map(({ reference }) => reference)).size).toBe(8);
    expect(
      (await rows<{ coins: number }>(pool, 'SELECT coins FROM accounts WHERE id=$1', [user(0)]))[0]
        ?.coins,
    ).toBe(105);
  });
  it('keeps repeated and concurrent daily claims idempotent', async () => {
    const clock = () => new Date('2026-02-03T23:59:59Z');
    const attempts = await Promise.allSettled([
      claimDailyReward(pool, user(0), clock),
      claimDailyReward(pool, user(0), clock),
    ]);
    expect(attempts.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
    const rejected = attempts.find(({ status }) => status === 'rejected');
    expect(rejected).toMatchObject({ reason: new Error('DAILY_REWARD_ALREADY_CLAIMED') });
    await expect(claimDailyReward(pool, user(0), clock)).rejects.toThrow(
      'DAILY_REWARD_ALREADY_CLAIMED',
    );
    expect(await rows(pool, 'SELECT * FROM daily_reward_claims')).toHaveLength(1);
    expect(await rows(pool, "SELECT * FROM coin_ledger WHERE source='DAILY_REWARD'")).toHaveLength(
      1,
    );
    expect(
      (await rows<{ coins: number }>(pool, 'SELECT coins FROM accounts WHERE id=$1', [user(0)]))[0]
        ?.coins,
    ).toBe(5);
  });
  it('rolls claim, balance, and ledger back together on transaction failure', async () => {
    await expect(
      transaction(pool, async (db) => {
        await claimDailyRewardInTransaction(db, user(0), () => new Date('2026-03-01T00:00:00Z'));
        throw new Error('SIMULATED_DATABASE_FAILURE');
      }),
    ).rejects.toThrow('SIMULATED_DATABASE_FAILURE');
    expect(await rows(pool, 'SELECT * FROM daily_reward_claims')).toHaveLength(0);
    expect(await rows(pool, "SELECT * FROM coin_ledger WHERE source='DAILY_REWARD'")).toHaveLength(
      0,
    );
    expect(
      (await rows<{ coins: number }>(pool, 'SELECT coins FROM accounts WHERE id=$1', [user(0)]))[0]
        ?.coins,
    ).toBe(0);
  });
  it('reports read-only daily reward status and exposes claim results through authenticated APIs', async () => {
    const initial = await dailyRewardStatus(pool, user(0), () => new Date('2026-04-01T12:00:00Z'));
    expect(initial).toEqual({
      rewards: [
        { day: 1, coins: 5 },
        { day: 2, coins: 5 },
        { day: 3, coins: 10 },
        { day: 4, coins: 10 },
        { day: 5, coins: 15 },
        { day: 6, coins: 20 },
        { day: 7, coins: 35 },
      ],
      currentDay: 1,
      claimedToday: false,
      lastClaimDate: null,
      nextClaimAt: null,
    });
    expect(await rows(pool, 'SELECT * FROM daily_reward_claims')).toHaveLength(0);
    expect(await rows(pool, 'SELECT * FROM coin_ledger')).toHaveLength(0);

    const { app } = await buildServer(pool, config);
    await app.ready();
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth',
      headers: { host: 'localhost:5173', origin: config.PUBLIC_ORIGIN },
      payload: { initData: signedInitData(1, config.BOT_TOKEN) },
    });
    const cookie = login.cookies[0];
    expect(cookie).toBeDefined();
    const headers = { host: 'localhost:5173', cookie: `ug_session=${cookie?.value}` };
    const status = await app.inject({ method: 'GET', url: '/api/daily-reward', headers });
    expect(status.statusCode).toBe(200);
    expect(status.json().rewards).toEqual(initial.rewards);
    expect(await rows(pool, 'SELECT * FROM daily_reward_claims')).toHaveLength(0);
    const claim = await app.inject({
      method: 'POST',
      url: '/api/daily-reward/claim',
      headers: { ...headers, origin: config.PUBLIC_ORIGIN },
    });
    expect(claim.statusCode).toBe(200);
    expect(claim.json()).toMatchObject({ rewardCoins: 5, balance: 5 });
    const repeated = await app.inject({
      method: 'POST',
      url: '/api/daily-reward/claim',
      headers: { ...headers, origin: config.PUBLIC_ORIGIN },
    });
    expect(repeated.statusCode).toBe(400);
    expect(repeated.json()).toEqual({ code: 'DAILY_REWARD_ALREADY_CLAIMED' });
    await app.close();
  });
  it('enforces authenticated admin and HTTP origin boundaries', async () => {
    const { app } = await buildServer(pool, config);
    await app.ready();
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth',
      headers: { host: 'localhost:5173', origin: config.PUBLIC_ORIGIN },
      payload: { initData: signedInitData(2, config.BOT_TOKEN) },
    });
    expect(login.statusCode).toBe(200);
    const cookie = login.cookies[0];
    expect(cookie).toBeDefined();
    const denied = await app.inject({
      method: 'GET',
      url: '/api/admin/audit',
      headers: { host: 'localhost:5173', cookie: `ug_session=${cookie?.value}` },
    });
    expect(denied.statusCode).toBe(403);
    const cross = await app.inject({
      method: 'POST',
      url: '/api/queue',
      headers: {
        host: 'localhost:5173',
        origin: 'https://evil.test',
        cookie: `ug_session=${cookie?.value}`,
      },
      payload: { ruleset: 'BACKGAMMON', mode: 'RANKED' },
    });
    expect(cross.statusCode).toBe(403);
    await app.close();
  });
  it('returns trusted equipped cosmetics from own and public profiles', async () => {
    const s = await make();
    await transaction(pool, async (db) => {
      await service.finish(db, s, 'A', 'BEAR_OFF');
      await service.save(db, s, 'FINISHED');
    });
    const { app } = await buildServer(pool, config);
    await app.ready();
    const login = await app.inject({
      method: 'POST',
      url: '/api/auth',
      headers: { host: 'localhost:5173', origin: config.PUBLIC_ORIGIN },
      payload: { initData: signedInitData(1, config.BOT_TOKEN) },
    });
    const cookie = login.cookies[0];
    expect(cookie).toBeDefined();
    const headers = { host: 'localhost:5173', cookie: `ug_session=${cookie?.value}` };
    const own = await app.inject({ method: 'GET', url: '/api/me', headers });
    const publicProfile = await app.inject({
      method: 'GET',
      url: `/api/profiles/${user(1)}`,
      headers,
    });
    expect(own.json().cosmetics).toEqual({ profileFrame: 'season0_tester_frame' });
    expect(publicProfile.json().cosmetics).toEqual({ profileFrame: 'season0_tester_frame' });
    await app.close();
  });
  it('recovers short restarts without resetting turn clocks', async () => {
    let s = await make();
    s = await service.command(user(0), randomUUID(), command(s, 'OPEN'));
    s = await service.command(user(1), randomUUID(), command(s, 'OPEN'));
    await service.tick();
    await service.recover();
    const recovered = await service.load(pool, s.id);
    expect(recovered.game).toEqual(s.game);
    expect(recovered.turnDeadlineAt).toBe(s.turnDeadlineAt);
    expect(recovered.players.A.connected).toBe(false);
  });
  it('plays both rulesets through complete authoritative PvP games', async () => {
    const clock = vi.spyOn(service, 'turnClock').mockImplementation((snapshot) => {
      snapshot.turnStartsAt = Date.now() - 1;
      snapshot.turnDeadlineAt = Date.now() + 60000;
    });
    try {
      for (const ruleset of ['LONG_NARDY', 'BACKGAMMON'] as const) {
        let snapshot = await transaction(pool, (db) =>
          service.create(db, user(0), user(1), ruleset, 'RANKED'),
        );
        const connections = { A: randomUUID(), B: randomUUID() };
        snapshot = await service.command(user(0), connections.A, command(snapshot, 'OPEN'));
        snapshot = await service.command(user(1), connections.B, command(snapshot, 'OPEN'));
        let turns = 0;
        while (snapshot.status === 'ACTIVE' && turns++ < 1000) {
          const seat = snapshot.game.activePlayer;
          if (!seat) throw new Error('NO_ACTIVE_PLAYER');
          const id = snapshot.players[seat].accountId;
          if (snapshot.game.phase === 'WAITING_FOR_ROLL')
            snapshot = await service.command(id, connections[seat], command(snapshot, 'ROLL'));
          else {
            const moves = legalTurns(snapshot.game)[0];
            if (!moves) throw new Error('NO_LEGAL_TURN');
            snapshot = await service.command(id, connections[seat], {
              ...command(snapshot, 'TURN'),
              moves: [...moves],
            });
          }
        }
        expect(snapshot.status).toBe('FINISHED');
        expect(snapshot.finishReason).toBe('BEAR_OFF');
        expect(snapshot.winner).not.toBeNull();
      }
    } finally {
      clock.mockRestore();
    }
  }, 60000);
  it('applies initial join timeout without a winner', async () => {
    const snapshot = await make();
    snapshot.joinDeadlineAt = Date.now() - 1;
    await transaction(pool, async (db) => {
      await service.save(db, snapshot, 'TEST_DEADLINE');
    });
    await service.tick();
    const ended = await service.load(pool, snapshot.id);
    expect(ended.finishReason).toBe('START_TIMEOUT');
    expect(ended.winner).toBeNull();
  });
  it('uses the earliest independent deadline for timeout versus abandon', async () => {
    let snapshot = await make();
    snapshot = await service.command(user(0), randomUUID(), command(snapshot, 'OPEN'));
    snapshot = await service.command(user(1), randomUUID(), command(snapshot, 'OPEN'));
    snapshot.turnDeadlineAt = Date.now() - 100;
    snapshot.reconnectDeadlines.A = Date.now() - 200;
    await transaction(pool, (db) => service.save(db, snapshot, 'TEST_DEADLINES'));
    await service.tick();
    const ended = await service.load(pool, snapshot.id);
    expect(ended.finishReason).toBe('ABANDON');
    expect(ended.winner).toBe('B');
  });
  it('invalidates deadlines crossed during confirmed service unavailability', async () => {
    const snapshot = await make();
    snapshot.joinDeadlineAt = Date.now() - 1000;
    await transaction(pool, async (db) => {
      await service.save(db, snapshot, 'TEST_DEADLINE');
      await db.query(
        "INSERT INTO service_heartbeat(id,seen_at) VALUES(1,now()-interval '10 seconds')",
      );
    });
    await service.tick();
    const ended = await service.load(pool, snapshot.id);
    expect(ended.finishReason).toBe('NO_CONTEST');
    expect(ended.winner).toBeNull();
    expect(await rows(pool, 'SELECT * FROM coin_ledger')).toHaveLength(0);
  });
  it('keeps sanctioned Telegram identities attached to the blocked account', async () => {
    await pool.query("UPDATE accounts SET status='BANNED' WHERE id=$1", [user(0)]);
    await expect(authenticate(pool, config, signedInitData(1, config.BOT_TOKEN))).rejects.toThrow(
      'ACCOUNT_DISABLED',
    );
    expect(await rows(pool, 'SELECT * FROM accounts')).toHaveLength(4);
  });
});
