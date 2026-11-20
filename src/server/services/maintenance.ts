// Periodiniai darbai serveryje: pasenusių užklausų uždarymas.
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { jobRequests, offers } from "@/server/db/schema";
import { requestHeadline } from "@/shared/categories";
import { dispatchEmailsInBackground, notify } from "./notifications";

/** „Kuo greičiau“ užklausa galioja 14 d., kitos – iki nurodyto laiko pabaigos arba 30 d. be pakeitimų. */
export const ASAP_DAYS = 14;
export const MAX_DAYS = 30;

const staleCondition = sql`(
  (${jobRequests.frequency} is null and ${jobRequests.timingType} = 'window' and ${jobRequests.windowEnd} < now())
  or (${jobRequests.frequency} is not null and ${jobRequests.seriesEnd} is not null
      and ${jobRequests.seriesEnd} < (now() at time zone 'Europe/Vilnius')::date)
  or (${jobRequests.frequency} is null and ${jobRequests.timingType} = 'asap'
      and ${jobRequests.updatedAt} < now() - make_interval(days => ${ASAP_DAYS}))
  or ${jobRequests.updatedAt} < now() - make_interval(days => ${MAX_DAYS})
)`;

/** Uždaro pasenusias atviras užklausas ir praneša klientui bei pasiūlymus pateikusiems teikėjams. */
export async function expireStaleRequests(): Promise<number> {
  const expired = await db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: jobRequests.id, clientId: jobRequests.clientId, category: jobRequests.category, details: jobRequests.details })
      .from(jobRequests)
      .where(and(eq(jobRequests.status, "open"), staleCondition))
      .limit(200)
      .for("update", { skipLocked: true });
    if (!rows.length) return 0;
    const ids = rows.map((r) => r.id);
    await tx.update(jobRequests).set({ status: "expired", updatedAt: new Date() }).where(inArray(jobRequests.id, ids));
    const closed = await tx
      .update(offers)
      .set({ status: "closed", updatedAt: new Date() })
      .where(and(inArray(offers.requestId, ids), eq(offers.status, "active")))
      .returning({ requestId: offers.requestId, providerId: offers.providerId });
    const byId = new Map(rows.map((r) => [r.id, r]));
    await notify(tx, [
      ...rows.map((r) => ({
        userId: r.clientId,
        type: "request_expired",
        params: { category: r.category, details: r.details, audience: "client" as const },
        link: `/uzklausos/${r.id}`,
        dedupeKey: `request_expired:${r.id}:${Date.now()}`,
        email: true,
      })),
      ...closed.map((c) => {
        const r = byId.get(c.requestId)!;
        return {
          userId: c.providerId,
          type: "request_expired",
          params: { category: r.category, details: r.details, audience: "provider" as const },
          link: `/darbai-salia/${r.id}`,
          dedupeKey: `request_expired:${r.id}:${c.providerId}:${Date.now()}`,
        };
      }),
    ]);
    return rows.length;
  });
  if (expired) dispatchEmailsInBackground();
  return expired;
}

const globalForMaintenance = globalThis as unknown as { kvikiMaintenance?: NodeJS.Timeout };

/** Paleidžiama vieną kartą serverio starte (instrumentation.ts). */
export function startMaintenance() {
  if (globalForMaintenance.kvikiMaintenance) return;
  const run = () =>
    expireStaleRequests()
      .then((n) => n && console.log(`Kviki: uždaryta pasenusių užklausų: ${n}`))
      .catch((err) => console.error("Kviki: periodinio darbo klaida", err));
  setTimeout(run, 15_000).unref();
  globalForMaintenance.kvikiMaintenance = setInterval(run, 10 * 60 * 1000);
  globalForMaintenance.kvikiMaintenance.unref();
}
