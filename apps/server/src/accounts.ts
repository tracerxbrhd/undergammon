import type { Profile, Ruleset } from '@undergammon/protocol';
import { randomInt, randomUUID } from 'node:crypto';
import type pg from 'pg';
import { rows, transaction, type Db } from './db.js';
import { opaqueToken, tokenHash, verifyTelegram } from './auth.js';
import { adjectives, nouns, avatars, levelFromXp } from './policy.js';
import type { Config } from './config.js';
export interface Account {
  id: string;
  status: string;
  nickname: string;
  avatar: string;
  language: 'ru' | 'en';
  mute_reactions: boolean;
  total_xp: number;
  coins: number;
  nickname_changed_at: Date | null;
  deletion_requested_at: Date | null;
}
export async function account(db: Db | pg.Pool, id: string) {
  const a = (await rows<Account>(db, 'SELECT * FROM accounts WHERE id=$1', [id]))[0];
  if (!a) throw new Error('ACCOUNT_NOT_FOUND');
  return a;
}
export async function requireActive(db: Db | pg.Pool, id: string) {
  const a = await account(db, id);
  if (a.status !== 'ACTIVE') throw new Error('ACCOUNT_DISABLED');
  return a;
}
export function defaultNickname() {
  return `${adjectives[randomInt(adjectives.length)]} ${nouns[randomInt(nouns.length)]}`;
}
export async function authenticate(pool: pg.Pool, config: Config, raw: string, restore = false) {
  const identity = verifyTelegram(
    raw,
    config.BOT_TOKEN,
    Math.floor(Date.now() / 1000),
    config.TELEGRAM_AUTH_MAX_AGE_SECONDS,
  );
  return transaction(pool, async (db) => {
    let id = (
      await rows<{ account_id: string }>(
        db,
        "SELECT account_id FROM account_identities WHERE provider='TELEGRAM' AND subject=$1",
        [identity.subject],
      )
    )[0]?.account_id;
    if (!id) {
      id = randomUUID();
      await db.query('INSERT INTO accounts(id,nickname,avatar,language) VALUES($1,$2,$3,$4)', [
        id,
        defaultNickname(),
        avatars[randomInt(avatars.length)],
        identity.language,
      ]);
      await db.query('INSERT INTO account_identities(account_id,subject) VALUES($1,$2)', [
        id,
        identity.subject,
      ]);
      await db.query(
        "INSERT INTO ratings(account_id,ruleset,season_id) VALUES($1,'LONG_NARDY',0),($1,'BACKGAMMON',0)",
        [id],
      );
    }
    const a = await account(db, id);
    if (
      restore &&
      a.status === 'PENDING_DELETION' &&
      a.deletion_requested_at &&
      Date.now() - a.deletion_requested_at.getTime() < 30 * 86400000
    )
      await db.query("UPDATE accounts SET status='ACTIVE',deletion_requested_at=NULL WHERE id=$1", [
        id,
      ]);
    await requireActive(db, id);
    const token = opaqueToken();
    await db.query('INSERT INTO sessions(hash,account_id,expires_at) VALUES($1,$2,$3)', [
      tokenHash(token),
      id,
      new Date(Date.now() + config.SESSION_HOURS * 3600000),
    ]);
    return { id, token };
  });
}
export async function sessionAccount(pool: pg.Pool, token: string | undefined) {
  if (!token) throw new Error('UNAUTHENTICATED');
  const found = (
    await rows<{ account_id: string }>(
      pool,
      "SELECT s.account_id FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.hash=$1 AND s.expires_at>now() AND a.status='ACTIVE'",
      [tokenHash(token)],
    )
  )[0];
  if (!found) throw new Error('UNAUTHENTICATED');
  return found.account_id;
}
export async function isAdmin(db: Db | pg.Pool, id: string, config: Config) {
  const identities = await rows<{ subject: string }>(
    db,
    "SELECT subject FROM account_identities WHERE account_id=$1 AND provider='TELEGRAM'",
    [id],
  );
  return identities.some((i) => config.adminIds.has(i.subject));
}
export async function profile(pool: pg.Pool, id: string, config: Config): Promise<Profile> {
  const a = await requireActive(pool, id);
  const ratings = await rows<{ ruleset: Ruleset; rating: number; played: number; peak: number }>(
    pool,
    'SELECT ruleset,rating,played,peak FROM ratings WHERE account_id=$1 AND season_id=0',
    [id],
  );
  const active = (
    await rows<{ match_id: string }>(
      pool,
      'SELECT match_id FROM match_players WHERE account_id=$1 AND unfinished',
      [id],
    )
  )[0];
  return {
    id,
    nickname: a.nickname,
    avatar: a.avatar,
    language: a.language,
    muteOpponentReactions: a.mute_reactions,
    totalXp: a.total_xp,
    level: levelFromXp(a.total_xp),
    coins: a.coins,
    admin: await isAdmin(pool, id, config),
    ratings,
    activeMatchId: active?.match_id ?? null,
  };
}
