import { Api, InlineKeyboard } from 'grammy';
import { rows, transaction } from './db.js';
import type pg from 'pg';
import type { Config } from './config.js';
export async function deliverNotifications(pool: pg.Pool, config: Config, present: Set<string>) {
  const api = new Api(config.BOT_TOKEN);
  const pending = await rows<{
    id: string;
    account_id: string;
    subject: string;
    language: string;
    match_id: string;
    kind: string;
  }>(
    pool,
    "SELECT n.*,i.subject,a.language FROM notifications n JOIN account_identities i ON i.account_id=n.account_id AND i.provider='TELEGRAM' JOIN accounts a ON a.id=n.account_id WHERE n.sent_at IS NULL AND n.attempts<3 AND a.status='ACTIVE' ORDER BY n.created_at LIMIT 10",
  );
  for (const n of pending) {
    await pool.query('UPDATE notifications SET attempts=attempts+1 WHERE id=$1', [n.id]);
    if (!present.has(n.account_id)) {
      try {
        await api.sendMessage(
          n.subject,
          n.language === 'ru'
            ? 'Игра готова. Вернитесь в UNDERGAMMON.'
            : 'Your game is ready. Return to UNDERGAMMON.',
          {
            reply_markup: new InlineKeyboard().url(
              n.language === 'ru' ? 'Открыть игру' : 'Open game',
              `https://t.me/${config.BOT_USERNAME}?startapp=match_${n.match_id}`,
            ),
          },
        );
      } catch {
        continue;
      }
    }
    await pool.query('UPDATE notifications SET sent_at=now() WHERE id=$1', [n.id]);
  }
}
export async function anonymizeExpired(pool: pg.Pool) {
  await transaction(pool, async (db) => {
    const expired = await rows<{ id: string }>(
      db,
      "SELECT id FROM accounts WHERE status='PENDING_DELETION' AND deletion_requested_at<now()-interval '30 days'",
    );
    for (const a of expired) {
      await db.query('DELETE FROM sessions WHERE account_id=$1', [a.id]);
      await db.query('DELETE FROM account_identities WHERE account_id=$1', [a.id]);
      await db.query(
        "UPDATE accounts SET status='DELETED',nickname='Deleted player',avatar='fox',language='en',mute_reactions=true WHERE id=$1",
        [a.id],
      );
      await db.query(
        "UPDATE matches SET snapshot=jsonb_set(jsonb_set(snapshot,ARRAY['players',p.seat,'nickname'],'\"Deleted player\"'::jsonb),ARRAY['players',p.seat,'avatar'],'\"fox\"'::jsonb) FROM match_players p WHERE matches.id=p.match_id AND p.account_id=$1",
        [a.id],
      );
    }
  });
}
