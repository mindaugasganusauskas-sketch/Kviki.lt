import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;
/** Duomenų bazė arba atidaryta transakcija. */
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

const globalForDb = globalThis as unknown as { kvikiPool?: Pool; kvikiDb?: DB };

function createPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL ?? "postgres://kviki:kviki@localhost:5432/kviki",
    max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
  });
}

export const pool = globalForDb.kvikiPool ?? createPool();
export const db: DB = globalForDb.kvikiDb ?? drizzle(pool, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.kvikiPool = pool;
  globalForDb.kvikiDb = db;
}

export { schema };
