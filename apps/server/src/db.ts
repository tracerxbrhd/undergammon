import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';
export type Db = pg.PoolClient;
export async function rows<T extends pg.QueryResultRow>(
  db: Db | pg.Pool,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  return (await db.query<T>(sql, params)).rows;
}
export async function transaction<T>(pool: pg.Pool, run: (db: Db) => Promise<T>): Promise<T> {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    await db.query('SELECT pg_advisory_xact_lock(79420301)');
    const result = await run(db);
    await db.query('COMMIT');
    return result;
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally {
    db.release();
  }
}
export async function migrateDatabase(pool: pg.Pool) {
  await migrate(drizzle(pool), {
    migrationsFolder: fileURLToPath(new URL('../migrations', import.meta.url)),
  });
}
export function createPool(url: string) {
  return new pg.Pool({
    connectionString: url,
    max: 10,
    connectionTimeoutMillis: 5000,
    statement_timeout: 15000,
  });
}
