// Paleidžiant serverį: duomenų bazės migracijos (RUN_MIGRATIONS=true) ir periodiniai darbai.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.RUN_MIGRATIONS === "true") {
    const { runMigrations } = await import("./server/db/run-migrations");
    await runMigrations();
    console.log("Kviki: duomenų bazės migracijos pritaikytos");
  }
  if (process.env.KVIKI_DISABLE_MAINTENANCE !== "1") {
    const { startMaintenance } = await import("./server/services/maintenance");
    startMaintenance();
  }
}
