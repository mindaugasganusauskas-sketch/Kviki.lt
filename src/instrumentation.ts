// Paleidžiant serverį automatiškai pritaikomos duomenų bazės migracijos (įjungiama RUN_MIGRATIONS=true).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.RUN_MIGRATIONS === "true") {
    const { runMigrations } = await import("./server/db/run-migrations");
    await runMigrations();
    console.log("Kviki: duomenų bazės migracijos pritaikytos");
  }
}
