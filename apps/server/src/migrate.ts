import { createPool, migrateDatabase } from './db.js';
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL_REQUIRED');
const pool = createPool(url);
try {
  await migrateDatabase(pool);
} finally {
  await pool.end();
}
