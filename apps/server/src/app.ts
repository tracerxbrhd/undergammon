import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import websocket from '@fastify/websocket';
import rateLimit from '@fastify/rate-limit';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type pg from 'pg';
import type { WebSocket } from 'ws';
import {
  commandSchema,
  rulesetSchema,
  type ServerEvent,
  type MatchSnapshot,
} from '@undergammon/protocol';
import {
  authenticate,
  sessionAccount,
  profile,
  isAdmin,
  account,
  defaultNickname,
  requireActive,
} from './accounts.js';
import { rows, transaction } from './db.js';
import { MatchService } from './matches.js';
import { avatars, validateNickname, levelFromXp } from './policy.js';
import type { Config } from './config.js';
const uuid = z.uuid();
export async function buildServer(pool: pg.Pool, config: Config) {
  const app = Fastify({
    logger: {
      redact: ['req.headers.cookie', 'req.headers.authorization', 'req.body.initData'],
      level: config.NODE_ENV === 'test' ? 'silent' : 'info',
    },
    bodyLimit: 16384,
    // The production server is reachable only through the single Caddy hop.
    trustProxy: (_address, hop) => hop === 0,
    disableRequestLogging: true,
  });
  await app.register(cookie);
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  await app.register(websocket, { options: { maxPayload: 16384 } });
  const service = new MatchService(pool, config);
  const sockets = new Map<
    string,
    { socket: WebSocket; accountId: string; matchId: string | null; alive: boolean }
  >();
  const send = (socket: WebSocket, event: ServerEvent) => {
    if (socket.readyState === 1) socket.send(JSON.stringify(event));
  };
  const broadcast = (snapshot: MatchSnapshot) => {
    app.log.info(
      {
        matchId: snapshot.id,
        stateVersion: snapshot.stateVersion,
        status: snapshot.status,
        finishReason: snapshot.finishReason,
      },
      'Match updated',
    );
    for (const c of sockets.values())
      if (Object.values(snapshot.players).some((p) => p.accountId === c.accountId))
        send(c.socket, { protocolVersion: 1, type: 'SNAPSHOT', snapshot, serverTime: Date.now() });
  };
  const presence = new Map<string, number>();
  const identity = async (req: { cookies: Record<string, string | undefined> }) => {
    const id = await sessionAccount(pool, req.cookies.ug_session);
    presence.set(id, Date.now());
    return id;
  };
  const requireAdmin = async (id: string) => {
    if (!(await isAdmin(pool, id, config))) throw new Error('FORBIDDEN');
  };
  app.addHook('onRequest', async (req, reply) => {
    if (req.url === '/health') return;
    const expected = new URL(config.PUBLIC_ORIGIN);
    if (req.headers.host !== expected.host) return reply.code(403).send({ code: 'INVALID_HOST' });
    if (req.method !== 'GET' && req.headers.origin !== config.PUBLIC_ORIGIN)
      return reply.code(403).send({ code: 'INVALID_ORIGIN' });
  });
  app.setErrorHandler((error, req, reply) => {
    const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
    const code = /^[A-Z_]+$/.test(message)
      ? message
      : error instanceof z.ZodError
        ? 'INVALID_INPUT'
        : 'INTERNAL_ERROR';
    app.log.warn({ code, path: req.routeOptions.url }, 'Request rejected');
    return reply
      .code(
        code === 'UNAUTHENTICATED'
          ? 401
          : code === 'FORBIDDEN'
            ? 403
            : code === 'INTERNAL_ERROR'
              ? 500
              : 400,
      )
      .send({ code });
  });
  app.get('/health', async () => {
    await pool.query('SELECT 1');
    return { status: 'ok' };
  });
  app.get('/api/config', async () => ({
    botUsername: config.BOT_USERNAME,
    season: 'Season 0 / Open Beta',
  }));
  app.post(
    '/api/auth',
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    async (req, reply) => {
      const body = z
        .object({ initData: z.string().min(1).max(12000), restore: z.boolean().optional() })
        .strict()
        .parse(req.body);
      const result = await authenticate(pool, config, body.initData, body.restore);
      reply.setCookie('ug_session', result.token, {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: config.SESSION_HOURS * 3600,
      });
      return profile(pool, result.id, config);
    },
  );
  app.get('/api/me', async (req) => profile(pool, await identity(req), config));
  app.post('/api/logout', async (req, reply) => {
    const id = await identity(req);
    await pool.query('DELETE FROM sessions WHERE account_id=$1', [id]);
    reply.clearCookie('ug_session', { path: '/' });
    return { ok: true };
  });
  app.patch('/api/profile', async (req) => {
    const id = await identity(req);
    const body = z
      .object({
        nickname: z.string().optional(),
        avatar: z.enum(avatars).optional(),
        language: z.enum(['ru', 'en']).optional(),
        muteOpponentReactions: z.boolean().optional(),
      })
      .strict()
      .parse(req.body);
    await transaction(pool, async (db) => {
      const a = await requireActive(db, id);
      if (body.nickname !== undefined) {
        const nickname = validateNickname(body.nickname);
        if (a.nickname_changed_at && Date.now() - a.nickname_changed_at.getTime() < 7 * 86400000)
          throw new Error('NICKNAME_COOLDOWN');
        await db.query('UPDATE accounts SET nickname=$2,nickname_changed_at=now() WHERE id=$1', [
          id,
          nickname,
        ]);
      }
      await db.query(
        'UPDATE accounts SET avatar=COALESCE($2,avatar),language=COALESCE($3,language),mute_reactions=COALESCE($4,mute_reactions) WHERE id=$1',
        [id, body.avatar ?? null, body.language ?? null, body.muteOpponentReactions ?? null],
      );
    });
    return profile(pool, id, config);
  });
  app.post('/api/account/delete', async (req) => {
    const id = await identity(req);
    await transaction(pool, async (db) => {
      await service.free(db, id);
      await db.query(
        "UPDATE accounts SET status='PENDING_DELETION',deletion_requested_at=now() WHERE id=$1",
        [id],
      );
      await db.query('DELETE FROM sessions WHERE account_id=$1', [id]);
      await db.query('DELETE FROM matchmaking_entries WHERE account_id=$1', [id]);
      await db.query(
        "UPDATE challenges SET status='CANCELLED' WHERE creator=$1 AND status='OPEN'",
        [id],
      );
    });
    return { ok: true };
  });
  app.get('/api/profiles/:id', async (req) => {
    await identity(req);
    const id = uuid.parse((req.params as { id: unknown }).id);
    const a = await account(pool, id);
    const ratings = await rows(
      pool,
      'SELECT ruleset,rating,peak,played,wins FROM ratings WHERE account_id=$1 AND season_id=0',
      [id],
    );
    const stats = (
      await rows<{ played: number; wins: number }>(
        pool,
        "SELECT count(*)::integer AS played,count(*) FILTER(WHERE m.winner=$1)::integer AS wins FROM match_players p JOIN matches m ON m.id=p.match_id WHERE p.account_id=$1 AND m.status='FINISHED' AND m.winner IS NOT NULL",
        [id],
      )
    )[0] ?? { played: 0, wins: 0 };
    return {
      id,
      nickname: a.nickname,
      avatar: a.avatar,
      totalXp: a.total_xp,
      level: levelFromXp(a.total_xp),
      ratings,
      stats,
    };
  });
  app.get('/api/history', async (req) => {
    const id = await identity(req);
    const q = z
      .object({ offset: z.coerce.number().int().min(0).max(1000000).default(0) })
      .parse(req.query);
    return rows(
      pool,
      "SELECT m.id,m.ruleset,m.mode,m.finish_reason,m.finished_at,CASE WHEN m.winner IS NULL THEN 'NO_CONTEST' WHEN m.winner=$1 THEN 'WIN' ELSE 'LOSS' END AS result,p.rating_before,p.rating_after,o.account_id AS opponent_id,a.nickname AS opponent FROM matches m JOIN match_players p ON p.match_id=m.id AND p.account_id=$1 JOIN match_players o ON o.match_id=m.id AND o.account_id<>$1 JOIN accounts a ON a.id=o.account_id WHERE m.status='FINISHED' ORDER BY m.finished_at DESC,m.id LIMIT 25 OFFSET $2",
      [id, q.offset],
    );
  });
  app.get('/api/leaderboard', async (req) => {
    const id = await identity(req);
    const q = z.object({ ruleset: rulesetSchema }).parse(req.query);
    const ranked =
      "SELECT a.id,a.nickname,a.avatar,r.rating,r.peak,row_number() OVER(ORDER BY r.rating DESC,a.id) AS position FROM ratings r JOIN accounts a ON a.id=r.account_id WHERE r.season_id=0 AND r.ruleset=$1 AND r.played>=10 AND a.status='ACTIVE'";
    return {
      top: await rows(pool, `SELECT * FROM (${ranked}) ranked ORDER BY position LIMIT 100`, [
        q.ruleset,
      ]),
      self:
        (await rows(pool, `SELECT * FROM (${ranked}) ranked WHERE id=$2`, [q.ruleset, id]))[0] ??
        null,
    };
  });
  app.post('/api/challenges', async (req) => {
    const id = await identity(req);
    const { ruleset } = z.object({ ruleset: rulesetSchema }).strict().parse(req.body);
    return service.challenge(id, ruleset);
  });
  app.get('/api/challenges', async (req) => {
    const id = await identity(req);
    return (
      (
        await rows(
          pool,
          'SELECT token,ruleset,status,expires_at,match_id FROM challenges WHERE creator=$1 ORDER BY expires_at DESC LIMIT 1',
          [id],
        )
      )[0] ?? null
    );
  });
  app.post('/api/challenges/:token/accept', async (req) => {
    const id = await identity(req);
    const token = z
      .string()
      .regex(/^[A-Za-z0-9_-]{43}$/)
      .parse((req.params as { token: unknown }).token);
    const s = await service.accept(id, token);
    broadcast(s);
    return s;
  });
  app.delete('/api/challenges', async (req) => {
    const id = await identity(req);
    await transaction(pool, (db) =>
      db.query("UPDATE challenges SET status='CANCELLED' WHERE creator=$1 AND status='OPEN'", [id]),
    );
    return { ok: true };
  });
  app.post('/api/matches/:id/rematch', async (req) => {
    const id = await identity(req);
    const s = await service.load(pool, uuid.parse((req.params as { id: unknown }).id), id);
    if (s.status !== 'FINISHED' || s.mode === 'RANKED') throw new Error('REMATCH_NOT_ALLOWED');
    const opponent = Object.values(s.players).find((p) => p.accountId !== id);
    if (!opponent) throw new Error('MATCH_NOT_FOUND');
    return service.challenge(id, s.ruleset, opponent.accountId);
  });
  app.get('/api/rematches', async (req) => {
    const id = await identity(req);
    return rows(
      pool,
      "SELECT c.token,c.ruleset,c.expires_at,a.nickname FROM challenges c JOIN accounts a ON a.id=c.creator WHERE c.target=$1 AND c.status='OPEN' AND c.expires_at>now()",
      [id],
    );
  });
  app.post('/api/queue', async (req) => {
    const id = await identity(req);
    const body = z
      .object({ ruleset: rulesetSchema, mode: z.enum(['CASUAL', 'RANKED']) })
      .strict()
      .parse(req.body);
    await service.queue(id, body.ruleset, body.mode);
    return { ok: true };
  });
  app.get('/api/queue', async (req) => {
    const id = await identity(req);
    await pool.query('UPDATE matchmaking_entries SET heartbeat_at=now() WHERE account_id=$1', [id]);
    return (
      (
        await rows(
          pool,
          'SELECT ruleset,mode,created_at FROM matchmaking_entries WHERE account_id=$1',
          [id],
        )
      )[0] ?? null
    );
  });
  app.delete('/api/queue', async (req) => {
    const id = await identity(req);
    await transaction(pool, (db) =>
      db.query('DELETE FROM matchmaking_entries WHERE account_id=$1', [id]),
    );
    return { ok: true };
  });
  app.get('/api/matches/:id', async (req) =>
    service.load(pool, uuid.parse((req.params as { id: unknown }).id), await identity(req)),
  );
  app.get('/api/admin/account', async (req) => {
    await requireAdmin(await identity(req));
    const q = z.object({ query: z.string().min(1).max(100) }).parse(req.query);
    return rows(
      pool,
      'SELECT a.*,i.subject FROM accounts a LEFT JOIN account_identities i ON i.account_id=a.id WHERE a.id::text=$1 OR i.subject=$1',
      [q.query],
    );
  });
  app.get('/api/admin/audit', async (req) => {
    await requireAdmin(await identity(req));
    return rows(pool, 'SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT 100');
  });
  app.post('/api/admin/adjust', async (req) => {
    const actor = await identity(req);
    await requireAdmin(actor);
    const b = z
      .object({
        operationId: uuid,
        target: uuid,
        action: z.enum([
          'SUSPEND',
          'BAN',
          'UNBAN',
          'RESET_NICKNAME',
          'COINS',
          'RATING_DELTA',
          'RATING_SET',
        ]),
        reason: z.string().trim().min(5).max(500),
        value: z.number().int().min(-1000000).max(1000000).optional(),
        ruleset: rulesetSchema.optional(),
      })
      .strict()
      .parse(req.body);
    return transaction(pool, async (db) => {
      await requireActive(db, actor);
      if ((await rows(db, 'SELECT 1 FROM admin_audit_log WHERE id=$1', [b.operationId])).length)
        return { ok: true };
      const before = await account(db, b.target);
      let after: unknown;
      if (['SUSPEND', 'BAN', 'UNBAN'].includes(b.action)) {
        const status =
          b.action === 'SUSPEND' ? 'SUSPENDED' : b.action === 'BAN' ? 'BANNED' : 'ACTIVE';
        if (['DELETED', 'PENDING_DELETION'].includes(before.status))
          throw new Error('ACCOUNT_DISABLED');
        await db.query('UPDATE accounts SET status=$2 WHERE id=$1', [b.target, status]);
        await db.query('DELETE FROM sessions WHERE account_id=$1', [b.target]);
        after = { status };
      } else if (b.action === 'RESET_NICKNAME') {
        const nickname = defaultNickname();
        await db.query('UPDATE accounts SET nickname=$2 WHERE id=$1', [b.target, nickname]);
        after = { nickname };
      } else if (b.action === 'COINS') {
        if (b.value === undefined) throw new Error('VALUE_REQUIRED');
        await service.coins(db, b.target, b.value, 'ADMIN_ADJUSTMENT', b.operationId);
        after = { coins: before.coins + b.value };
      } else {
        if (b.value === undefined || !b.ruleset) throw new Error('VALUE_REQUIRED');
        const prior = (
          await rows<{ rating: number }>(
            db,
            'SELECT rating FROM ratings WHERE account_id=$1 AND ruleset=$2 AND season_id=0',
            [b.target, b.ruleset],
          )
        )[0];
        if (!prior) throw new Error('RATING_NOT_FOUND');
        const value = b.action === 'RATING_SET' ? b.value : prior.rating + b.value;
        await db.query(
          'UPDATE ratings SET rating=$3,peak=GREATEST(peak,$3) WHERE account_id=$1 AND ruleset=$2 AND season_id=0',
          [b.target, b.ruleset, value],
        );
        after = { ruleset: b.ruleset, ratingBefore: prior.rating, rating: value };
      }
      await db.query(
        'INSERT INTO admin_audit_log(id,actor,target,action,reason,before_value,after_value) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [
          b.operationId,
          actor,
          b.target,
          b.action,
          b.reason,
          JSON.stringify(before),
          JSON.stringify(after),
        ],
      );
      return { ok: true };
    });
  });
  app.post('/api/admin/no-contest', async (req) => {
    const actor = await identity(req);
    await requireAdmin(actor);
    const b = z
      .object({ matchId: uuid, reason: z.string().trim().min(5).max(500) })
      .strict()
      .parse(req.body);
    const s = await transaction(pool, async (db) => {
      await requireActive(db, actor);
      const s = await service.load(db, b.matchId);
      if (s.status === 'FINISHED') throw new Error('MATCH_ALREADY_FINISHED');
      await service.finish(db, s, null, 'NO_CONTEST');
      await service.save(db, s, 'ADMIN_NO_CONTEST', { reason: b.reason }, actor);
      await db.query(
        'INSERT INTO admin_audit_log(id,actor,action,reason,before_value,after_value) VALUES($1,$2,$3,$4,$5,$6)',
        [
          randomUUID(),
          actor,
          'NO_CONTEST',
          b.reason,
          JSON.stringify({ matchId: b.matchId }),
          JSON.stringify(s),
        ],
      );
      return s;
    });
    broadcast(s);
    return s;
  });
  app.get(
    '/ws',
    {
      websocket: true,
      preValidation: async (req) => {
        if (req.headers.origin !== config.PUBLIC_ORIGIN) throw new Error('INVALID_ORIGIN');
        await identity(req);
      },
    },
    (socket, req) => {
      const connectionId = randomUUID();
      let count = 0;
      let window = Date.now();
      let pending = Promise.resolve();
      socket.on('message', (data) => {
        pending = pending
          .then(async () => {
            if (req.headers.origin !== config.PUBLIC_ORIGIN) throw new Error('INVALID_ORIGIN');
            const id = await identity(req);
            if (Date.now() - window > 10000) {
              window = Date.now();
              count = 0;
            }
            if (++count > 30) throw new Error('RATE_LIMIT');
            const c = commandSchema.parse(JSON.parse(data.toString()) as unknown);
            let connection = sockets.get(connectionId);
            if (!connection) {
              connection = { socket, accountId: id, matchId: null, alive: true };
              sockets.set(connectionId, connection);
            }
            if (c.type === 'REACTION') {
              const s = await service.load(pool, c.matchId, id);
              if (s.status !== 'ACTIVE' || !c.reaction) throw new Error('INVALID_COMMAND');
              const control = await rows(
                pool,
                'SELECT 1 FROM match_players WHERE match_id=$1 AND account_id=$2 AND control_id=$3',
                [s.id, id, connectionId],
              );
              if (!control.length) throw new Error('CONTROL_LOST');
              if (Date.now() - (lastReactions.get(id) ?? 0) < 3000) return;
              lastReactions.set(id, Date.now());
              for (const peer of sockets.values())
                if (peer.matchId === s.id && peer.accountId !== id) {
                  const a = await account(pool, peer.accountId);
                  if (!a.mute_reactions)
                    send(peer.socket, {
                      protocolVersion: 1,
                      type: 'REACTION',
                      accountId: id,
                      reaction: c.reaction,
                    });
                }
              return;
            }
            const s = await service.command(id, connectionId, c);
            if (c.type === 'OPEN') {
              for (const [key, peer] of sockets)
                if (key !== connectionId && peer.accountId === id && peer.matchId === s.id)
                  send(peer.socket, { protocolVersion: 1, type: 'CONTROL_LOST' });
              connection.matchId = s.id;
            }
            broadcast(s);
            send(socket, {
              protocolVersion: 1,
              type: 'SNAPSHOT',
              snapshot: s,
              serverTime: Date.now(),
              commandId: c.commandId,
            });
          })
          .catch(async (error: unknown) => {
            const message = error instanceof Error ? error.message : '';
            const code = /^[A-Z_]+$/.test(message) ? message : 'INVALID_COMMAND';
            app.log.warn({ code, connectionId }, 'Realtime command rejected');
            send(socket, { protocolVersion: 1, type: 'ERROR', code });
            if (code === 'UNAUTHENTICATED' || code === 'INVALID_ORIGIN') socket.close(1008);
            if (code === 'STALE_VERSION') {
              const peer = sockets.get(connectionId);
              if (peer?.matchId) {
                try {
                  const snapshot = await service.load(pool, peer.matchId, peer.accountId);
                  send(socket, {
                    protocolVersion: 1,
                    type: 'SNAPSHOT',
                    snapshot,
                    serverTime: Date.now(),
                  });
                } catch {
                  socket.close(1011);
                }
              }
            }
          });
      });
      socket.on('pong', () => {
        const c = sockets.get(connectionId);
        if (c) c.alive = true;
      });
      socket.on('close', () => {
        void pending
          .then(async () => {
            const c = sockets.get(connectionId);
            sockets.delete(connectionId);
            if (c) {
              const s = await service.disconnected(c.accountId, connectionId);
              if (s) broadcast(s);
            }
          })
          .catch(() => app.log.error('Disconnect persistence failed'));
      });
    },
  );
  const lastReactions = new Map<string, number>();
  const heartbeat = setInterval(() => {
    for (const [id, seen] of presence) if (Date.now() - seen > 60000) presence.delete(id);
    for (const [id, seen] of lastReactions) if (Date.now() - seen > 60000) lastReactions.delete(id);
    for (const c of sockets.values()) {
      if (!c.alive) c.socket.terminate();
      else {
        c.alive = false;
        c.socket.ping();
      }
    }
  }, 10000);
  heartbeat.unref();
  app.addHook('onClose', async () => {
    clearInterval(heartbeat);
    for (const c of sockets.values()) c.socket.close(1012);
  });
  return { app, service, broadcast, sockets, presence };
}
