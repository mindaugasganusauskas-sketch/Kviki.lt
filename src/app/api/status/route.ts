// Viešai matoma diegimo būsena: kuri versija veikia ir ar paskutinis automatinis atnaujinimas pavyko.
// Duomenis rašo scripts/auto-update.sh (katalogas .deploy-status, prijungtas prie konteinerio tik skaitymui).
import { readFile } from "node:fs/promises";
import path from "node:path";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

const startedAt = new Date().toISOString();

function statusDir(): string {
  return path.resolve(/*turbopackIgnore: true*/ process.env.DEPLOY_STATUS_DIR ?? "./.deploy-status");
}

async function readText(name: string): Promise<string | null> {
  try {
    return await readFile(/*turbopackIgnore: true*/ path.join(statusDir(), name), "utf8");
  } catch {
    return null;
  }
}

/** Paskutinės surinkimo žurnalo eilutės be galimai jautrių reikšmių. */
function errorLines(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/((?:pass(?:word)?|secret|token|key)[^=:\s]*\s*[=:]\s*)\S+/gi, "$1***").slice(0, 300))
    .filter((l) => l.trim())
    .slice(-20);
}

export async function GET() {
  let database = true;
  try {
    await db.execute(sql`select 1`);
  } catch {
    database = false;
  }
  let deploy: Record<string, unknown> | null = null;
  const raw = await readText("status.json");
  if (raw) {
    try {
      deploy = JSON.parse(raw);
    } catch {
      deploy = null;
    }
  }
  if (deploy?.state === "failed") {
    const err = await readText("last-error.txt");
    if (err) deploy.error = errorLines(err);
  }
  return NextResponse.json(
    { ok: database, database, startedAt, deploy },
    { headers: { "Cache-Control": "no-store" } },
  );
}
