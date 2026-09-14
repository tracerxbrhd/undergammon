import Fastify from 'fastify';
import { Bot, InlineKeyboard, webhookCallback } from 'grammy';
import { z } from 'zod';
const c = z
  .object({
    BOT_TOKEN: z.string().min(20),
    PUBLIC_ORIGIN: z.url(),
    TELEGRAM_WEBHOOK_SECRET: z.string().regex(/^[A-Za-z0-9_-]{32,256}$/),
    BOT_PORT: z.coerce.number().default(3001),
  })
  .parse(process.env);
const bot = new Bot(c.BOT_TOKEN);
bot.command('start', async (ctx) => {
  const ru = ctx.from?.language_code?.startsWith('ru');
  await ctx.reply(
    ru
      ? 'UNDERGAMMON · Сезон 0\nДлинные и короткие нарды в Telegram.'
      : 'UNDERGAMMON · Season 0\nLong Nardy and Backgammon in Telegram.',
    { reply_markup: new InlineKeyboard().webApp(ru ? 'Играть' : 'Play', c.PUBLIC_ORIGIN) },
  );
});
bot.catch(() => {
  process.stderr.write('Telegram update failed\n');
});
const app = Fastify({ logger: true, bodyLimit: 65536, disableRequestLogging: true });
app.get('/health', async () => ({ status: 'ok' }));
app.post(
  '/telegram/webhook',
  webhookCallback(bot, 'fastify', { secretToken: c.TELEGRAM_WEBHOOK_SECRET }),
);
await app.listen({ host: '0.0.0.0', port: c.BOT_PORT });
