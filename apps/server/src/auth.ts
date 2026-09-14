import { createHmac, timingSafeEqual, createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
const userSchema = z.object({
  id: z.number().int().positive().safe(),
  language_code: z.string().optional(),
});
export function verifyTelegram(raw: string, token: string, nowSeconds: number, maxAge = 300) {
  const params = new URLSearchParams(raw);
  const keys = [...params.keys()];
  if (new Set(keys).size !== keys.length) throw new Error('INVALID_AUTH');
  const hash = params.get('hash');
  if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) throw new Error('INVALID_AUTH');
  params.delete('hash');
  const data = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const key = createHmac('sha256', 'WebAppData').update(token).digest();
  const expected = createHmac('sha256', key).update(data).digest();
  if (!timingSafeEqual(expected, Buffer.from(hash, 'hex'))) throw new Error('INVALID_AUTH');
  const date = Number(params.get('auth_date'));
  if (!Number.isInteger(date) || date > nowSeconds + 30 || nowSeconds - date > maxAge)
    throw new Error('AUTH_EXPIRED');
  const user = userSchema.parse(JSON.parse(params.get('user') ?? 'null') as unknown);
  return {
    subject: String(user.id),
    language: user.language_code?.startsWith('ru') ? ('ru' as const) : ('en' as const),
  };
}
export function opaqueToken() {
  return randomBytes(32).toString('base64url');
}
export function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}
