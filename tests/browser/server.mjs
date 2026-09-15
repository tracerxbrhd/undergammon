import { buildServer } from '../../apps/server/dist/app.js';
import { createPool, migrateDatabase } from '../../apps/server/dist/db.js';
import { loadConfig } from '../../apps/server/dist/config.js';
if (!process.env.TEST_DATABASE_URL)
  throw new Error('TEST_DATABASE_URL required; use an isolated disposable database');
const pool = createPool(process.env.TEST_DATABASE_URL);
await migrateDatabase(pool);
const config = loadConfig({
  DATABASE_URL: process.env.TEST_DATABASE_URL,
  PUBLIC_ORIGIN: 'http://localhost:5173',
  BOT_TOKEN: '123456:testing-token-no-real-secret',
  BOT_USERNAME: 'TestBot',
  ADMIN_TELEGRAM_IDS: '1',
  NODE_ENV: 'test',
});
const { app, service, broadcast } = await buildServer(pool, config);
await service.recover();
await app.listen({ host: '127.0.0.1', port: 3000 });
let busy = false;
const timer = setInterval(() => {
  if (busy) return;
  busy = true;
  void service
    .tick()
    .then((ss) => ss.forEach(broadcast))
    .finally(() => {
      busy = false;
    });
}, 300);
process.on('SIGTERM', () => {
  clearInterval(timer);
  void app.close().then(() => pool.end());
});
