import { z } from 'zod';
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  PUBLIC_ORIGIN: z.url(),
  BOT_TOKEN: z.string().min(20),
  BOT_USERNAME: z.string().regex(/^[A-Za-z0-9_]+bot$/i),
  ADMIN_TELEGRAM_IDS: z.string().default(''),
  PORT: z.coerce.number().int().default(3000),
  TURN_SECONDS: z.coerce.number().int().min(10).max(300).default(60),
  TELEGRAM_AUTH_MAX_AGE_SECONDS: z.coerce.number().int().min(30).max(3600).default(300),
  SESSION_HOURS: z.coerce.number().int().min(1).max(168).default(24),
});
export function loadConfig(env: NodeJS.ProcessEnv) {
  const c = schema.parse(env);
  if (c.NODE_ENV === 'production' && !c.PUBLIC_ORIGIN.startsWith('https://'))
    throw new Error('HTTPS_REQUIRED');
  return {
    ...c,
    adminIds: new Set(
      c.ADMIN_TELEGRAM_IDS.split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  };
}
export type Config = ReturnType<typeof loadConfig>;
