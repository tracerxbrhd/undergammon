import { randomInt, randomUUID } from 'node:crypto';
import type pg from 'pg';
import {
  initialGame,
  openGame,
  rollGame,
  commitTurn,
  legalTurns,
  diceValue,
  otherPlayer,
  type PlayerId,
} from '@undergammon/game-engine';
import type { MatchSnapshot, Ruleset, Mode, Command } from '@undergammon/protocol';
import { rows, transaction, type Db } from './db.js';
import { requireActive } from './accounts.js';
import { opaqueToken } from './auth.js';
import { matchXp, rankedCoins, ratingDelta, ratingWindow } from './policy.js';
import type { Config } from './config.js';
import { equippedCosmetics, grantSeason0TesterFrame } from './cosmetics.js';
interface Rating {
  rating: number;
  played: number;
  streak: number;
}
export class MatchService {
  constructor(
    readonly pool: pg.Pool,
    readonly config: Config,
  ) {}
  async free(db: Db, id: string) {
    await requireActive(db, id);
    if (
      (await rows(db, 'SELECT 1 FROM match_players WHERE account_id=$1 AND unfinished', [id]))
        .length
    )
      throw new Error('ACTIVE_MATCH_EXISTS');
  }
  async load(db: Db | pg.Pool, id: string, accountId?: string): Promise<MatchSnapshot> {
    const row = (
      await rows<{ snapshot: MatchSnapshot }>(db, 'SELECT snapshot FROM matches WHERE id=$1', [id])
    )[0];
    if (!row) throw new Error('MATCH_NOT_FOUND');
    if (accountId && !Object.values(row.snapshot.players).some((p) => p.accountId === accountId))
      throw new Error('FORBIDDEN');
    return row.snapshot;
  }
  async save(
    db: Db,
    s: MatchSnapshot,
    kind: string,
    payload: unknown = {},
    actor: string | null = null,
    commandId: string | null = null,
  ) {
    s.stateVersion++;
    await db.query(
      "UPDATE matches SET snapshot=$2,state_version=$3,status=$4,finish_reason=$5,winner=$6,finished_at=CASE WHEN $4='FINISHED' THEN now() ELSE NULL END WHERE id=$1",
      [
        s.id,
        JSON.stringify(s),
        s.stateVersion,
        s.status,
        s.finishReason,
        s.winner ? s.players[s.winner].accountId : null,
      ],
    );
    await db.query(
      'INSERT INTO match_events(match_id,account_id,command_id,state_version,kind,payload) VALUES($1,$2,$3,$4,$5,$6)',
      [s.id, actor, commandId, s.stateVersion, kind, JSON.stringify(payload)],
    );
  }
  async create(db: Db, a: string, b: string, ruleset: Ruleset, mode: Mode) {
    if (a === b) throw new Error('SELF_ACCEPT');
    await this.free(db, a);
    await this.free(db, b);
    const players = {} as MatchSnapshot['players'];
    for (const [seat, id] of [
      ['A', a],
      ['B', b],
    ] as const) {
      const p = await requireActive(db, id);
      const r = (
        await rows<Rating>(
          db,
          'SELECT * FROM ratings WHERE account_id=$1 AND ruleset=$2 AND season_id=0',
          [id, ruleset],
        )
      )[0];
      if (!r) throw new Error('RATING_NOT_FOUND');
      players[seat] = {
        accountId: id,
        nickname: p.nickname,
        avatar: p.avatar,
        rating: r.rating,
        preliminary: r.played < 10,
        connected: false,
        cosmetics: await equippedCosmetics(db, id),
      };
    }
    const s: MatchSnapshot = {
      id: randomUUID(),
      ruleset,
      mode,
      status: 'WAITING_FOR_PLAYERS',
      stateVersion: 0,
      game: initialGame(ruleset),
      players,
      turnStartsAt: null,
      turnDeadlineAt: null,
      joinDeadlineAt: Date.now() + 120000,
      reconnectDeadlines: { A: null, B: null },
      winner: null,
      finishReason: null,
      lastMoves: [],
    };
    await db.query('INSERT INTO matches(id,ruleset,mode,status,snapshot) VALUES($1,$2,$3,$4,$5)', [
      s.id,
      ruleset,
      mode,
      s.status,
      JSON.stringify(s),
    ]);
    for (const [seat, id] of [
      ['A', a],
      ['B', b],
    ])
      await db.query('INSERT INTO match_players(match_id,account_id,seat) VALUES($1,$2,$3)', [
        s.id,
        id,
        seat,
      ]);
    await db.query('DELETE FROM matchmaking_entries WHERE account_id=ANY($1::uuid[])', [[a, b]]);
    await db.query(
      "UPDATE challenges SET status='CANCELLED' WHERE creator=ANY($1::uuid[]) AND status='OPEN'",
      [[a, b]],
    );
    await this.save(db, s, 'CREATED');
    return s;
  }
  async challenge(id: string, ruleset: Ruleset, target: string | null = null) {
    return transaction(this.pool, async (db) => {
      await this.free(db, id);
      await db.query(
        "UPDATE challenges SET status='EXPIRED' WHERE expires_at<=now() AND status='OPEN'",
      );
      if (
        (await rows(db, "SELECT 1 FROM challenges WHERE creator=$1 AND status='OPEN'", [id])).length
      )
        throw new Error('CHALLENGE_EXISTS');
      await db.query('DELETE FROM matchmaking_entries WHERE account_id=$1', [id]);
      const token = opaqueToken();
      await db.query(
        "INSERT INTO challenges(token,creator,ruleset,target,expires_at) VALUES($1,$2,$3,$4,now()+interval '10 minutes')",
        [token, id, ruleset, target],
      );
      return { token, expiresAt: Date.now() + 600000 };
    });
  }
  async accept(id: string, token: string) {
    return transaction(this.pool, async (db) => {
      await requireActive(db, id);
      const c = (
        await rows<{
          creator: string;
          ruleset: Ruleset;
          status: string;
          expires_at: Date;
          target: string | null;
        }>(db, 'SELECT * FROM challenges WHERE token=$1 FOR UPDATE', [token])
      )[0];
      if (!c || c.status !== 'OPEN' || c.expires_at.getTime() <= Date.now())
        throw new Error('CHALLENGE_UNAVAILABLE');
      if (c.target && c.target !== id) throw new Error('FORBIDDEN');
      const s = await this.create(db, c.creator, id, c.ruleset, 'PRIVATE');
      await db.query("UPDATE challenges SET status='ACCEPTED',match_id=$2 WHERE token=$1", [
        token,
        s.id,
      ]);
      await db.query(
        "INSERT INTO notifications(id,account_id,kind,match_id) VALUES($1,$2,'CHALLENGE_ACCEPTED',$3)",
        [randomUUID(), c.creator, s.id],
      );
      return s;
    });
  }
  async queue(id: string, ruleset: Ruleset, mode: 'CASUAL' | 'RANKED') {
    return transaction(this.pool, async (db) => {
      await this.free(db, id);
      await db.query(
        "UPDATE challenges SET status='CANCELLED' WHERE creator=$1 AND status='OPEN'",
        [id],
      );
      await db.query(
        'INSERT INTO matchmaking_entries(account_id,ruleset,mode) VALUES($1,$2,$3) ON CONFLICT(account_id) DO UPDATE SET heartbeat_at=now()',
        [id, ruleset, mode],
      );
    });
  }
  async pair(db: Db) {
    await db.query(
      "DELETE FROM matchmaking_entries WHERE heartbeat_at<now()-interval '15 seconds'",
    );
    const entries = await rows<{
      account_id: string;
      ruleset: Ruleset;
      mode: 'CASUAL' | 'RANKED';
      created_at: Date;
      rating: number;
    }>(
      db,
      "SELECT q.*,r.rating FROM matchmaking_entries q JOIN ratings r ON r.account_id=q.account_id AND r.ruleset=q.ruleset AND r.season_id=0 JOIN accounts a ON a.id=q.account_id WHERE a.status='ACTIVE' ORDER BY q.created_at",
    );
    const used = new Set<string>();
    const matches: MatchSnapshot[] = [];
    for (const a of entries) {
      if (used.has(a.account_id)) continue;
      const candidates = entries.filter(
        (b) =>
          b.account_id !== a.account_id &&
          !used.has(b.account_id) &&
          b.ruleset === a.ruleset &&
          b.mode === a.mode &&
          (a.mode === 'CASUAL' ||
            Math.abs(a.rating - b.rating) <=
              Math.max(
                ratingWindow((Date.now() - a.created_at.getTime()) / 1000),
                ratingWindow((Date.now() - b.created_at.getTime()) / 1000),
              )),
      );
      candidates.sort((x, y) => Math.abs(x.rating - a.rating) - Math.abs(y.rating - a.rating));
      const b = candidates[0];
      if (!b) continue;
      matches.push(await this.create(db, a.account_id, b.account_id, a.ruleset, a.mode));
      used.add(a.account_id);
      used.add(b.account_id);
    }
    return matches;
  }
  turnClock(s: MatchSnapshot, delay = 0) {
    s.turnStartsAt = Date.now() + delay;
    s.turnDeadlineAt = s.turnStartsAt + this.config.TURN_SECONDS * 1000;
  }
  dice() {
    return [diceValue(randomInt(1, 7)), diceValue(randomInt(1, 7))] as const;
  }
  async finish(db: Db, s: MatchSnapshot, winner: PlayerId | null, reason: string) {
    if (s.status === 'FINISHED') return;
    s.status = 'FINISHED';
    s.winner = winner;
    s.finishReason = reason;
    s.turnDeadlineAt = null;
    s.turnStartsAt = null;
    if (winner) {
      for (const seat of ['A', 'B'] as const) {
        const id = s.players[seat].accountId;
        const won = seat === winner;
        const xpGained = matchXp(s.mode, reason, won);
        const xp = (
          await rows<{ before: number; after: number }>(
            db,
            'UPDATE accounts SET total_xp=total_xp+$2 WHERE id=$1 RETURNING total_xp-$2 AS before,total_xp AS after',
            [id, xpGained],
          )
        )[0];
        if (!xp) throw new Error('ACCOUNT_NOT_FOUND');
        await db.query(
          'UPDATE match_players SET xp_before=$3,xp_after=$4,xp_gained=$5 WHERE match_id=$1 AND account_id=$2',
          [s.id, id, xp.before, xp.after, xpGained],
        );
        if (s.mode === 'RANKED') {
          const r = (
            await rows<Rating>(
              db,
              'SELECT rating,played,streak FROM ratings WHERE account_id=$1 AND ruleset=$2 AND season_id=0',
              [id, s.ruleset],
            )
          )[0];
          if (!r) throw new Error('RATING_NOT_FOUND');
          const delta = ratingDelta(
            s.players[seat].rating,
            s.players[otherPlayer(seat)].rating,
            r.played,
            won,
          );
          const next = r.rating + delta;
          await db.query(
            'UPDATE ratings SET rating=$3,peak=GREATEST(peak,$3),played=played+1,wins=wins+$4,streak=$5 WHERE account_id=$1 AND ruleset=$2 AND season_id=0',
            [id, s.ruleset, next, won ? 1 : 0, won ? r.streak + 1 : 0],
          );
          await db.query(
            'UPDATE match_players SET rating_before=$3,rating_after=$4 WHERE match_id=$1 AND account_id=$2',
            [s.id, id, r.rating, next],
          );
          if (won) await this.coins(db, id, rankedCoins(r.streak + 1), 'RANKED_REWARD', s.id);
        }
      }
      for (const seat of ['A', 'B'] as const)
        await grantSeason0TesterFrame(db, s.players[seat].accountId, s.id);
    }
    await db.query('UPDATE match_players SET unfinished=false,control_id=NULL WHERE match_id=$1', [
      s.id,
    ]);
  }
  async coins(db: Db, id: string, delta: number, source: string, reference: string) {
    const existing = await rows(
      db,
      'SELECT 1 FROM coin_ledger WHERE account_id=$1 AND source=$2 AND reference=$3',
      [id, source, reference],
    );
    if (existing.length) return;
    const a = (
      await rows<{ coins: number }>(
        db,
        'UPDATE accounts SET coins=coins+$2 WHERE id=$1 AND coins+$2>=0 RETURNING coins',
        [id, delta],
      )
    )[0];
    if (!a) throw new Error('INSUFFICIENT_COINS');
    await db.query(
      'INSERT INTO coin_ledger(id,account_id,delta,balance_after,source,reference) VALUES($1,$2,$3,$4,$5,$6)',
      [randomUUID(), id, delta, a.coins, source, reference],
    );
  }
  async expire(db: Db, s: MatchSnapshot) {
    const now = Date.now();
    const heartbeat = (
      await rows<{ seen_at: Date }>(db, 'SELECT seen_at FROM service_heartbeat WHERE id=1')
    )[0];
    const lastSeen = heartbeat?.seen_at.getTime();
    const pendingDeadlines = [
      s.turnDeadlineAt,
      ...Object.values(s.reconnectDeadlines),
      s.status === 'WAITING_FOR_PLAYERS' ? s.joinDeadlineAt : null,
    ];
    if (
      s.status !== 'FINISHED' &&
      lastSeen !== undefined &&
      now - lastSeen > 5000 &&
      pendingDeadlines.some((d) => d !== null && d > lastSeen && d <= now)
    ) {
      await this.finish(db, s, null, 'NO_CONTEST');
      return true;
    }
    if (s.status === 'WAITING_FOR_PLAYERS' && now >= s.joinDeadlineAt) {
      await this.finish(db, s, null, 'START_TIMEOUT');
      return true;
    }
    if (s.status !== 'ACTIVE') return false;
    const deadlines: { at: number; loser: PlayerId; reason: string }[] = [];
    if (s.turnDeadlineAt && s.game.activePlayer)
      deadlines.push({ at: s.turnDeadlineAt, loser: s.game.activePlayer, reason: 'TIMEOUT' });
    for (const seat of ['A', 'B'] as const) {
      const at = s.reconnectDeadlines[seat];
      if (at) deadlines.push({ at, loser: seat, reason: 'ABANDON' });
    }
    deadlines.sort((a, b) => a.at - b.at || a.loser.localeCompare(b.loser));
    const first = deadlines[0];
    if (first && first.at <= now) {
      await this.finish(db, s, otherPlayer(first.loser), first.reason);
      return true;
    }
    return false;
  }
  async command(id: string, connectionId: string, c: Command) {
    return transaction(this.pool, async (db) => {
      await requireActive(db, id);
      const s = await this.load(db, c.matchId, id);
      const seat = s.players.A.accountId === id ? 'A' : 'B';
      const previous = await rows(
        db,
        'SELECT 1 FROM match_events WHERE match_id=$1 AND account_id=$2 AND command_id=$3',
        [s.id, id, c.commandId],
      );
      if (previous.length) return s;
      if (await this.expire(db, s)) {
        await this.save(db, s, 'EXPIRED');
        return s;
      }
      if (c.type === 'OPEN') {
        if (s.status === 'FINISHED') return s;
        await db.query(
          'UPDATE match_players SET control_id=$3 WHERE match_id=$1 AND account_id=$2',
          [s.id, id, connectionId],
        );
        s.players[seat].connected = true;
        s.reconnectDeadlines[seat] = null;
        if (s.status === 'WAITING_FOR_PLAYERS' && s.players.A.connected && s.players.B.connected) {
          s.status = 'ACTIVE';
          const attempts = [];
          let roll = this.dice();
          attempts.push(roll);
          while (roll[0] === roll[1]) {
            roll = this.dice();
            attempts.push(roll);
          }
          s.game = openGame(s.game, roll);
          this.turnClock(s, 600);
          await this.save(db, s, 'OPENING_ROLL', { attempts });
        }
        await this.save(db, s, 'OPEN', {}, id, c.commandId);
        return s;
      }
      const player = (
        await rows<{ control_id: string | null }>(
          db,
          'SELECT control_id FROM match_players WHERE match_id=$1 AND account_id=$2',
          [s.id, id],
        )
      )[0];
      if (player?.control_id !== connectionId) throw new Error('CONTROL_LOST');
      if (c.stateVersion !== s.stateVersion) throw new Error('STALE_VERSION');
      if (s.status !== 'ACTIVE') throw new Error('MATCH_NOT_ACTIVE');
      if (c.type === 'SURRENDER') {
        await this.finish(db, s, otherPlayer(seat), 'SURRENDER');
      } else {
        if (s.game.activePlayer !== seat) throw new Error('NOT_YOUR_TURN');
        if (s.turnStartsAt && Date.now() < s.turnStartsAt) throw new Error('TURN_NOT_STARTED');
        if (c.type === 'ROLL') {
          s.game = rollGame(s.game, this.dice());
          if (legalTurns(s.game).every((t) => t.length === 0)) {
            s.game = commitTurn(s.game, []);
            s.lastMoves = [];
            this.turnClock(s, 600);
          }
        } else if (c.type === 'TURN') {
          if (!c.moves) throw new Error('MOVES_REQUIRED');
          s.game = commitTurn(s.game, c.moves);
          s.lastMoves = c.moves;
          if (s.game.result?.winner) await this.finish(db, s, s.game.result.winner, 'BEAR_OFF');
          else this.turnClock(s, c.moves.length * 250 + 300);
        } else throw new Error('INVALID_COMMAND');
      }
      await this.save(db, s, c.type, { command: c, game: s.game }, id, c.commandId);
      return s;
    });
  }
  async disconnected(id: string, connectionId: string) {
    return transaction(this.pool, async (db) => {
      const found = (
        await rows<{ match_id: string }>(
          db,
          'SELECT match_id FROM match_players WHERE account_id=$1 AND control_id=$2 AND unfinished',
          [id, connectionId],
        )
      )[0];
      if (!found) return null;
      const s = await this.load(db, found.match_id);
      const seat = s.players.A.accountId === id ? 'A' : 'B';
      await db.query(
        'UPDATE match_players SET control_id=NULL WHERE match_id=$1 AND account_id=$2',
        [s.id, id],
      );
      s.players[seat].connected = false;
      if (s.status === 'ACTIVE') {
        s.reconnectDeadlines[seat] = Date.now() + 60000;
        await db.query(
          "INSERT INTO notifications(id,account_id,kind,match_id) VALUES($1,$2,'MATCH_RECOVERY',$3) ON CONFLICT(account_id,kind,match_id) DO NOTHING",
          [randomUUID(), id, s.id],
        );
      }
      await this.save(db, s, 'DISCONNECTED', {}, id);
      return s;
    });
  }
  async tick() {
    return transaction(this.pool, async (db) => {
      const changed = await this.pair(db);
      for (const { snapshot: s } of await rows<{ snapshot: MatchSnapshot }>(
        db,
        "SELECT snapshot FROM matches WHERE status<>'FINISHED'",
      )) {
        if (await this.expire(db, s)) {
          await this.save(db, s, 'EXPIRED');
          changed.push(s);
        }
      }
      await db.query(
        'INSERT INTO service_heartbeat(id,seen_at) VALUES(1,now()) ON CONFLICT(id) DO UPDATE SET seen_at=now()',
      );
      await db.query('DELETE FROM sessions WHERE expires_at<=now()');
      return changed;
    });
  }
  async recover() {
    return transaction(this.pool, async (db) => {
      const h = (
        await rows<{ seen_at: Date }>(db, 'SELECT seen_at FROM service_heartbeat WHERE id=1')
      )[0];
      for (const { snapshot: s } of await rows<{ snapshot: MatchSnapshot }>(
        db,
        "SELECT snapshot FROM matches WHERE status<>'FINISHED'",
      )) {
        const incidentStart = h?.seen_at.getTime() ?? Date.now();
        const deadlines = [
          s.turnDeadlineAt,
          ...Object.values(s.reconnectDeadlines),
          s.status === 'WAITING_FOR_PLAYERS' ? s.joinDeadlineAt : null,
        ].filter((x): x is number => x !== null);
        if (deadlines.some((d) => d > incidentStart && d <= Date.now()))
          await this.finish(db, s, null, 'NO_CONTEST');
        else {
          for (const seat of ['A', 'B'] as const) {
            if (s.players[seat].connected && s.status === 'ACTIVE')
              s.reconnectDeadlines[seat] = incidentStart + 60000;
            s.players[seat].connected = false;
          }
          await db.query('UPDATE match_players SET control_id=NULL WHERE match_id=$1', [s.id]);
        }
        await this.save(db, s, 'SERVER_RECOVERY');
      }
      await db.query('DELETE FROM matchmaking_entries');
    });
  }
}
