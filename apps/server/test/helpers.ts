import { createHmac } from 'node:crypto';
export function signedInitData(
  subject: number,
  token: string,
  now = Math.floor(Date.now() / 1000),
) {
  const p = new URLSearchParams({
    auth_date: String(now),
    user: JSON.stringify({ id: subject, language_code: 'en' }),
  });
  const data = [...p.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  p.set('hash', createHmac('sha256', secret).update(data).digest('hex'));
  return p.toString();
}
