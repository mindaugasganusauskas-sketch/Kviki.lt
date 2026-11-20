import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./index";

export async function runMigrations() {
  const migrationsFolder = process.env.MIGRATIONS_DIR ?? path.join(process.cwd(), "drizzle");
  await migrate(db, { migrationsFolder });
}
