import { loadConfig } from './config.js';
import { createPool, migrateDatabase } from './db.js';
import { buildServer } from './app.js';
import { deliverNotifications, anonymizeExpired } from './maintenance.js';
const config = loadConfig(process.env);
const pool = createPool(config.DATABASE_URL);
await migrateDatabase(pool);
const { app, service, broadcast, sockets, presence } = await buildServer(pool, config);
await service.recover();
let ticking = false;
const timer = setInterval(() => {
  if (ticking) return;
  ticking = true;
  void service
    .tick()
    .then((changed) => {
      for (const s of changed) broadcast(s);
    })
    .catch(() => app.log.error('Match maintenance failed'))
    .finally(() => {
      ticking = false;
    });
}, 1000);
let maintaining = false;
const maintenance = setInterval(() => {
  if (maintaining) return;
  maintaining = true;
  void (async () => {
    await deliverNotifications(
      pool,
      config,
      new Set(
        [...sockets.values()]
          .map((s) => s.accountId)
          .concat(
            [...presence.entries()]
              .filter(([, seen]) => Date.now() - seen < 10000)
              .map(([id]) => id),
          ),
      ),
    );
    await anonymizeExpired(pool);
  })()
    .catch(() => app.log.error('Account/notification maintenance failed'))
    .finally(() => {
      maintaining = false;
    });
}, 10000);
timer.unref();
maintenance.unref();
await app.listen({ host: '0.0.0.0', port: config.PORT });
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    clearInterval(timer);
    clearInterval(maintenance);
    void app.close().then(() => pool.end());
  });
