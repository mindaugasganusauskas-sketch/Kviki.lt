// Naudojimas: npm run db:migrate
import { pool } from "./index";
import { runMigrations } from "./run-migrations";

runMigrations()
  .then(() => {
    console.log("Migracijos pritaikytos");
    return pool.end();
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
