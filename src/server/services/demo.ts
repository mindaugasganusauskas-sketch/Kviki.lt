// Demonstraciniai duomenys pagal aprašo Paantvardžio pavyzdį.
// Visi įrašai pažymėti is_demo = true ir tikriems naudotojams nematomi.
import { randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import {
  agreements,
  jobRequestPrivate,
  jobRequests,
  notifications,
  offers,
  providerAreas,
  providerCategories,
  providerProfiles,
  users,
} from "@/server/db/schema";
import { hashPassword } from "@/server/auth/password";
import { AppError } from "@/server/errors";
import { addDaysToKey, vilniusDateKey, vilniusTimeKey, vilniusToDate } from "@/shared/time";

export const DEMO_ACCOUNTS = {
  client: { email: "demo-klientas@kviki.lt", name: "Rūta (demo klientė)" },
  tomas: { email: "demo-tomas@kviki.lt", name: "Tomas (demo)" },
  company: { email: "demo-imone@kviki.lt", name: "Žalias kiemas (demo įmonė)" },
} as const;
export type DemoAccount = keyof typeof DEMO_ACCOUNTS;

export function demoEnabled(): boolean {
  return (process.env.DEMO_ENABLED ?? "true") === "true";
}

async function upsertDemoUser(key: DemoAccount): Promise<string> {
  const acc = DEMO_ACCOUNTS[key];
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, acc.email));
  if (existing) return existing.id;
  // Atsitiktinis slaptažodis: į demonstracines paskyras patenkama tik mygtuku „Išbandyti“.
  const passwordHash = await hashPassword(randomBytes(24).toString("base64url"));
  const [row] = await db
    .insert(users)
    .values({ email: acc.email, name: acc.name, passwordHash, isDemo: true, phone: "+37060000000" })
    .returning({ id: users.id });
  return row.id;
}

/** Ištrina visus demonstracinius užsakymus ir sukuria pradinį Paantvardžio scenarijų iš naujo. */
export async function resetDemo(): Promise<{ clientId: string; tomasId: string; companyId: string; requestId: string }> {
  const clientId = await upsertDemoUser("client");
  const tomasId = await upsertDemoUser("tomas");
  const companyId = await upsertDemoUser("company");
  const demoUsers = await db.select({ id: users.id }).from(users).where(eq(users.isDemo, true));
  const demoIds = demoUsers.map((u) => u.id);

  const now = new Date();
  // Jei šiandien jau vėlu, scenarijų perkeliame viena diena vėliau.
  const today = vilniusDateKey(now);
  const baseDay = vilniusTimeKey(now) < "16:00" ? today : addDaysToKey(today, 1);

  const requestId = await db.transaction(async (tx) => {
    const demoRequests = await tx.select({ id: jobRequests.id }).from(jobRequests).where(eq(jobRequests.isDemo, true));
    const reqIds = demoRequests.map((r) => r.id);
    if (reqIds.length) {
      await tx.delete(agreements).where(inArray(agreements.requestId, reqIds));
      await tx.delete(offers).where(inArray(offers.requestId, reqIds));
      await tx.delete(jobRequests).where(inArray(jobRequests.id, reqIds));
    }
    await tx.delete(notifications).where(inArray(notifications.userId, demoIds));

    for (const [id, p] of [
      [tomasId, { businessForm: "individual" as const, displayName: "Tomas (demo)", description: "Demonstracinis teikėjas. Pjaunu žolę savo traktoriuku Jurbarko apylinkėse." }],
      [companyId, { businessForm: "company" as const, displayName: "Žalias kiemas, UAB (demo)", description: "Demonstracinė aplinkos tvarkymo įmonė." }],
    ] as const) {
      await tx
        .insert(providerProfiles)
        .values({ userId: id, phone: "+37060000000", ...p })
        .onConflictDoUpdate({ target: providerProfiles.userId, set: { ...p, updatedAt: new Date() } });
      await tx.delete(providerCategories).where(eq(providerCategories.userId, id));
      await tx.delete(providerAreas).where(eq(providerAreas.userId, id));
      await tx.insert(providerCategories).values([
        { userId: id, category: "mowing" },
        { userId: id, category: "yard" },
      ]);
      await tx.insert(providerAreas).values([
        { userId: id, municipality: "jurbarko-r" },
        { userId: id, municipality: "taurages-r" },
        { userId: id, municipality: "raseiniu-r" },
      ]);
    }
    await tx.update(users).set({ activeMode: "provider" }).where(inArray(users.id, [tomasId, companyId]));
    await tx.update(users).set({ activeMode: "client" }).where(eq(users.id, clientId));

    const [req] = await tx
      .insert(jobRequests)
      .values({
        clientId,
        isDemo: true,
        category: "mowing",
        description:
          "Reikia nupjauti apie 40 arų pievos. Žolė iki kelių, žolės surinkti nereikia. Traktoriukas gali įvažiuoti pro vartus. Tiktų šiandien arba rytoj.",
        details: { areaAres: 40, grassHeight: "knee", collectGrass: false, equipment: "provider", tractorAccess: true },
        municipality: "jurbarko-r",
        locality: "Paantvardys",
        timingType: "window",
        windowStart: vilniusToDate(baseDay, "08:00"),
        windowEnd: vilniusToDate(addDaysToKey(baseDay, 1), "20:00"),
        createdAt: new Date(now.getTime() - 40 * 60 * 1000),
        updatedAt: new Date(now.getTime() - 40 * 60 * 1000),
      })
      .returning();
    await tx.insert(jobRequestPrivate).values({
      requestId: req.id,
      address: "Paantvardys, Jurbarko r. (demonstracinis adresas)",
      contactPhone: "+37060000000",
      lat: 55.0716,
      lng: 22.7656,
    });
    await tx.insert(offers).values([
      {
        requestId: req.id,
        providerId: tomasId,
        priceCents: 9000,
        startAt: vilniusToDate(baseDay, "17:00"),
        included: "Atvykimas ir pjovimas savo technika",
        requestVersion: 1,
      },
      {
        requestId: req.id,
        providerId: companyId,
        priceCents: 7500,
        startAt: vilniusToDate(addDaysToKey(baseDay, 1), "09:00"),
        included: "Atvykimas ir pjovimas savo technika",
        requestVersion: 1,
      },
    ]);
    await tx.insert(notifications).values([
      {
        userId: clientId,
        type: "new_offer",
        title: "Naujas pasiūlymas: 90 €",
        body: "Tomas (demo) – Žolės pjovimas · apie 40 a",
        params: { category: "mowing", details: req.details, priceCents: 9000, perVisit: false, providerName: "Tomas (demo)" },
        link: `/uzklausos/${req.id}`,
      },
      {
        userId: clientId,
        type: "new_offer",
        title: "Naujas pasiūlymas: 75 €",
        body: "Žalias kiemas, UAB (demo) – Žolės pjovimas · apie 40 a",
        params: { category: "mowing", details: req.details, priceCents: 7500, perVisit: false, providerName: "Žalias kiemas, UAB (demo)" },
        link: `/uzklausos/${req.id}`,
      },
    ]);
    return req.id;
  });
  return { clientId, tomasId, companyId, requestId };
}

/** Prisijungimas prie demonstracinės paskyros. Jei scenarijus jau „išnaudotas“, jis atkuriamas. */
export async function demoUserId(account: DemoAccount): Promise<string> {
  if (!demoEnabled()) throw new AppError("FORBIDDEN", "Demonstracija išjungta");
  const [client] = await db.select({ id: users.id }).from(users).where(eq(users.email, DEMO_ACCOUNTS.client.email));
  let fresh = false;
  if (client) {
    const reqs = await db
      .select({ status: jobRequests.status, createdAt: jobRequests.createdAt })
      .from(jobRequests)
      .where(eq(jobRequests.clientId, client.id));
    const stale = reqs.length === 0 || reqs.every((r) => Date.now() - r.createdAt.getTime() > 6 * 3600 * 1000);
    fresh = !stale;
  }
  if (!fresh) await resetDemo();
  const [u] = await db.select({ id: users.id }).from(users).where(eq(users.email, DEMO_ACCOUNTS[account].email));
  return u.id;
}
