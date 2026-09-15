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
