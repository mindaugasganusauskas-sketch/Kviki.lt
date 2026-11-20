import { randomUUID } from "node:crypto";
import { and, count, desc, eq, gt, inArray, isNull, ne, notInArray, or } from "drizzle-orm";
import { db, type Tx } from "@/server/db";
import {
  agreements,
  jobPhotos,
  jobRequestPrivate,
  jobRequestRevisions,
  jobRequests,
  offers,
  providerAreas,
  providerCategories,
  providerProfiles,
  users,
} from "@/server/db/schema";
import type { Actor } from "@/server/auth/session";
import { AppError, notFound, parseInput } from "@/server/errors";
import { allow } from "@/server/auth/rate-limit";
import { requestHeadline } from "@/shared/categories";
import { municipalityLabel } from "@/shared/municipalities";
import { requestInputSchema, type RequestParsed } from "@/shared/schemas";
import { addDaysToKey, vilniusDateKey, vilniusToDate } from "@/shared/time";
import type {
  NearbyJobDTO,
  OfferDTO,
  RequestListItem,
  RequestOwnerView,
  RequestProviderView,
  RequestView,
} from "@/shared/types";
import { photosFor, privateFor, toOfferDTO, toPublicRequest, type RequestRow } from "./mappers";
import { notify, dispatchEmailsInBackground } from "./notifications";
import { deletePhotoFiles, isUuid, MAX_PHOTOS, storePhotos, type ProcessedPhoto } from "./photos";

type Conn = typeof db | Tx;

function columnsFromInput(data: RequestParsed) {
  const t = data.timing;
  const r = data.recurrence;
  const recurring = r.type === "recurring";
  return {
    category: data.category,
    description: data.description,
    details: data.details,
    municipality: data.municipality,
    locality: data.locality,
    timingType: recurring ? ("flexible" as const) : t.type,
    windowStart: !recurring && t.type === "window" ? vilniusToDate(t.startDate, t.startTime) : null,
    windowEnd: !recurring && t.type === "window" ? vilniusToDate(t.endDate, t.endTime) : null,
    frequency: recurring ? r.frequency : null,
    seriesStart: recurring ? r.startDate : null,
    seriesEnd: recurring ? r.endDate : null,
  };
}

function checkAgainstNow(cols: ReturnType<typeof columnsFromInput>) {
  const now = new Date();
  if (cols.windowEnd && cols.windowEnd.getTime() < now.getTime()) {
    throw new AppError("VALIDATION", "Pasirinktas laikas jau praėjo. Pasirinkite vėlesnį.");
  }
  if (cols.seriesStart && cols.seriesStart < addDaysToKey(vilniusDateKey(now), -1)) {
    throw new AppError("VALIDATION", "Periodinio darbo pradžia negali būti praeityje");
  }
}

async function matchingProviderIds(
  conn: Conn,
  r: { category: RequestRow["category"]; municipality: string; isDemo: boolean; clientId: string },
): Promise<string[]> {
  const rows = await conn
    .select({ id: providerCategories.userId })
    .from(providerCategories)
    .innerJoin(
      providerAreas,
      and(eq(providerAreas.userId, providerCategories.userId), eq(providerAreas.municipality, r.municipality)),
    )
    .innerJoin(users, eq(users.id, providerCategories.userId))
    .where(
      and(
        eq(providerCategories.category, r.category),
        eq(users.isDemo, r.isDemo),
        ne(providerCategories.userId, r.clientId),
      ),
    );
  return rows.map((x) => x.id);
}

async function notifyNearbyProviders(tx: Tx, r: RequestRow, excludeIds: string[] = []) {
  const ids = (await matchingProviderIds(tx, r)).filter((id) => !excludeIds.includes(id));
  const headline = requestHeadline(r.category, r.details);
  await notify(
    tx,
    ids.map((userId) => ({
      userId,
      type: "new_job",
      title: `Naujas darbas šalia: ${headline}`,
      body: `${r.locality}, ${municipalityLabel(r.municipality)}`,
      link: `/darbai-salia/${r.id}`,
      dedupeKey: `new_job:${r.id}:v${r.version}:${userId}`,
      email: true,
    })),
  );
}

// --- Kūrimas ------------------------------------------------------------------

/** Kiek naujų užklausų vienas naudotojas gali paskelbti per parą. */
export const MAX_REQUESTS_PER_DAY = 10;

function checkDemoPhotos(actor: Actor, photos: ProcessedPhoto[]) {
  if (actor.isDemo && photos.length) {
    throw new AppError("VALIDATION", "Demonstracijoje nuotraukų įkelti negalima");
  }
}

export async function createRequest(actor: Actor, input: unknown, photos: ProcessedPhoto[] = []): Promise<{ id: string }> {
  checkDemoPhotos(actor, photos);
  const [{ n }] = await db
    .select({ n: count() })
    .from(jobRequests)
    .where(and(eq(jobRequests.clientId, actor.id), gt(jobRequests.createdAt, new Date(Date.now() - 24 * 3600 * 1000))));
  if (n >= MAX_REQUESTS_PER_DAY) {
    throw new AppError("RATE_LIMITED", `Per parą galima paskelbti iki ${MAX_REQUESTS_PER_DAY} užklausų. Pabandykite rytoj.`);
  }
  const data = parseInput(requestInputSchema, input);
  const cols = columnsFromInput(data);
  checkAgainstNow(cols);
  const id = randomUUID();
  await storePhotos(id, photos);
  try {
    await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(jobRequests)
        .values({ id, clientId: actor.id, isDemo: actor.isDemo, ...cols })
        .returning();
      await tx.insert(jobRequestPrivate).values({
        requestId: id,
        address: data.address,
        contactPhone: data.contactPhone,
        lat: data.lat,
        lng: data.lng,
      });
      if (photos.length) {
        await tx.insert(jobPhotos).values(
          photos.map((p, i) => ({ id: p.id, requestId: id, fileName: p.fileName, width: p.width, height: p.height, position: i })),
        );
      }
      if (!actor.phone) await tx.update(users).set({ phone: data.contactPhone }).where(eq(users.id, actor.id));
      await notifyNearbyProviders(tx, row);
    });
  } catch (err) {
    await deletePhotoFiles(id).catch(() => undefined);
    throw err;
  }
  dispatchEmailsInBackground();
  return { id };
}

// --- Peržiūra -----------------------------------------------------------------

async function loadRequest(conn: Conn, id: string, lock = false): Promise<RequestRow | null> {
  if (!isUuid(id)) return null;
  const q = conn.select().from(jobRequests).where(eq(jobRequests.id, id));
  const [row] = lock ? await q.for("update") : await q;
  return row ?? null;
}

async function ownerOffers(conn: Conn, r: RequestRow): Promise<OfferDTO[]> {
  const rows = await conn
    .select({ o: offers, p: providerProfiles })
    .from(offers)
    .innerJoin(providerProfiles, eq(providerProfiles.userId, offers.providerId))
    .where(and(eq(offers.requestId, r.id), inArray(offers.status, ["active", "accepted"])))
    .orderBy(offers.priceCents);
  return rows.map(({ o, p }) => toOfferDTO(o, p, r));
}

export async function getRequestView(actor: Actor, id: string): Promise<RequestView> {
  const r = await loadRequest(db, id);
  if (!r || r.isDemo !== actor.isDemo) throw notFound("Užklausa nerasta");
  const photos = (await photosFor(db, [r.id])).get(r.id) ?? [];
  const base = toPublicRequest(r, photos);

  if (r.clientId === actor.id) {
    const [offerList, agreementRows] = await Promise.all([
      ownerOffers(db, r),
      db
        .select({ id: agreements.id, status: agreements.status, cancelledBy: agreements.cancelledBy })
        .from(agreements)
        .where(eq(agreements.requestId, r.id))
        .orderBy(desc(agreements.createdAt)),
    ]);
    const live = agreementRows.find((a) => a.status === "active" || a.status === "completed");
    const view: RequestOwnerView = {
      ...base,
      viewer: "owner",
      private: await privateFor(db, r.id),
      offers: offerList,
      activeAgreementId: live?.id ?? null,
      lastAgreement: agreementRows[0] ?? null,
    };
    return view;
  }

  if (!actor.isProvider) throw notFound("Užklausa nerasta");

  const [mine] = await db
    .select({ o: offers, p: providerProfiles })
    .from(offers)
    .innerJoin(providerProfiles, eq(providerProfiles.userId, offers.providerId))
    .where(and(eq(offers.requestId, r.id), eq(offers.providerId, actor.id)));
  const myAgreements = await db
    .select({ id: agreements.id, status: agreements.status, cancelledBy: agreements.cancelledBy })
    .from(agreements)
    .where(and(eq(agreements.requestId, r.id), eq(agreements.providerId, actor.id)))
    .orderBy(desc(agreements.createdAt));
  const myAgreement = myAgreements.find((a) => a.status === "active" || a.status === "completed");

  // Kitų klientų užklausas teikėjas mato tik kol jos atviros arba jei jose dalyvavo.
  if (r.status !== "open" && !mine && !myAgreement) throw notFound("Užklausa nerasta");

  const view: RequestProviderView = {
    ...base,
    viewer: "provider",
    myOffer: mine ? toOfferDTO(mine.o, mine.p, r) : null,
    private: myAgreement ? await privateFor(db, r.id) : null,
    myAgreementId: myAgreement?.id ?? null,
    myLastAgreement: myAgreements[0] ?? null,
  };
  return view;
}

export async function listMyRequests(actor: Actor): Promise<RequestListItem[]> {
  const rows = await db
    .select()
    .from(jobRequests)
    .where(eq(jobRequests.clientId, actor.id))
    .orderBy(desc(jobRequests.createdAt))
    .limit(200);
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [counts, live] = await Promise.all([
    db
      .select({ requestId: offers.requestId, n: count() })
      .from(offers)
      .where(and(inArray(offers.requestId, ids), eq(offers.status, "active")))
      .groupBy(offers.requestId),
    db
      .select({ id: agreements.id, requestId: agreements.requestId })
      .from(agreements)
      .where(and(inArray(agreements.requestId, ids), inArray(agreements.status, ["active", "completed"]))),
  ]);
  const countMap = new Map(counts.map((c) => [c.requestId, c.n]));
  const liveMap = new Map(live.map((a) => [a.requestId, a.id]));
  return rows.map((r) => {
    const pub = toPublicRequest(r, []);
    return {
      id: r.id,
      headline: pub.headline,
      category: pub.category,
      municipalityLabel: pub.municipalityLabel,
      locality: r.locality,
      timing: pub.timing,
      recurrence: pub.recurrence,
      status: r.status,
      offerCount: countMap.get(r.id) ?? 0,
      activeAgreementId: liveMap.get(r.id) ?? null,
      isDemo: r.isDemo,
      createdAt: r.createdAt.toISOString(),
    };
  });
}

/** „Darbai šalia“: atviros užklausos, kurių kategorija ir savivaldybė sutampa su teikėjo pasirinkimais. */
export async function nearbyJobs(actor: Actor): Promise<NearbyJobDTO[]> {
  if (!actor.isProvider) throw new AppError("PROVIDER_PROFILE_REQUIRED", "Pirmiausia užpildykite teikėjo profilį");
  const myCats = db.select({ c: providerCategories.category }).from(providerCategories).where(eq(providerCategories.userId, actor.id));
  const myAreas = db.select({ m: providerAreas.municipality }).from(providerAreas).where(eq(providerAreas.userId, actor.id));
  const rows = await db
    .select()
    .from(jobRequests)
    .where(
      and(
        eq(jobRequests.status, "open"),
        eq(jobRequests.isDemo, actor.isDemo),
        ne(jobRequests.clientId, actor.id),
        inArray(jobRequests.category, myCats),
        inArray(jobRequests.municipality, myAreas),
        or(isNull(jobRequests.windowEnd), gt(jobRequests.windowEnd, new Date())),
      ),
    )
    .orderBy(desc(jobRequests.createdAt))
    .limit(100);
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [photos, mine] = await Promise.all([
    photosFor(db, ids),
    db
      .select({ o: offers, p: providerProfiles })
      .from(offers)
      .innerJoin(providerProfiles, eq(providerProfiles.userId, offers.providerId))
      .where(and(inArray(offers.requestId, ids), eq(offers.providerId, actor.id))),
  ]);
  const mineMap = new Map(mine.map((m) => [m.o.requestId, m]));
  return rows.map((r) => {
    const m = mineMap.get(r.id);
    return { ...toPublicRequest(r, photos.get(r.id) ?? []), myOffer: m ? toOfferDTO(m.o, m.p, r) : null };
  });
}

// --- Keitimas -------------------------------------------------------------------

async function snapshot(tx: Tx, r: RequestRow) {
  const priv = await privateFor(tx, r.id);
  const photoRows = await tx.select({ id: jobPhotos.id }).from(jobPhotos).where(eq(jobPhotos.requestId, r.id));
  await tx
    .insert(jobRequestRevisions)
    .values({
      requestId: r.id,
      version: r.version,
      snapshot: {
        category: r.category,
        description: r.description,
        details: r.details,
        municipality: r.municipality,
        locality: r.locality,
        timingType: r.timingType,
        windowStart: r.windowStart?.toISOString() ?? null,
        windowEnd: r.windowEnd?.toISOString() ?? null,
        frequency: r.frequency,
        seriesStart: r.seriesStart,
        seriesEnd: r.seriesEnd,
        address: priv.address,
        lat: priv.lat,
        lng: priv.lng,
        photoIds: photoRows.map((p) => p.id),
      },
    })
    .onConflictDoNothing();
}

async function activeOfferProviderIds(tx: Tx, requestId: string): Promise<string[]> {
  const rows = await tx
    .select({ id: offers.providerId })
    .from(offers)
    .where(and(eq(offers.requestId, requestId), eq(offers.status, "active")));
  return rows.map((r) => r.id);
}

/**
 * Klientas keičia užklausą. Išsaugoma ankstesnė versija, o jau pateiktos kainos
 * tampa nebepriimamos, kol teikėjas jų nepatvirtina iš naujo.
 */
export async function updateRequest(
  actor: Actor,
  id: string,
  input: unknown,
  newPhotos: ProcessedPhoto[] = [],
  removePhotoIds: string[] = [],
): Promise<{ id: string; version: number }> {
  if (!isUuid(id)) throw notFound("Užklausa nerasta");
  checkDemoPhotos(actor, newPhotos);
  if (!allow(`edit:${actor.id}`, 30, 3600 * 1000)) {
    throw new AppError("RATE_LIMITED", "Per daug pakeitimų per valandą. Pabandykite vėliau.");
  }
  const data = parseInput(requestInputSchema, input);
  const cols = columnsFromInput(data);
  checkAgainstNow(cols);
  await storePhotos(id, newPhotos);
  let removedFiles: string[] = [];
  let version = 0;
  try {
    await db.transaction(async (tx) => {
      const r = await loadRequest(tx, id, true);
      if (!r || r.clientId !== actor.id) throw notFound("Užklausa nerasta");
      if (r.status !== "open" && r.status !== "expired") throw new AppError("REQUEST_CLOSED", "Keisti galima tik atvirą užklausą");
      const reopening = r.status === "expired";

      const existingPhotos = await tx.select().from(jobPhotos).where(eq(jobPhotos.requestId, id));
      const toRemove = existingPhotos.filter((p) => removePhotoIds.includes(p.id));
      if (existingPhotos.length - toRemove.length + newPhotos.length > MAX_PHOTOS) {
        throw new AppError("VALIDATION", `Galima pridėti iki ${MAX_PHOTOS} nuotraukų`);
      }
      await snapshot(tx, r);
      version = r.version + 1;
      const [updated] = await tx
        .update(jobRequests)
        .set({ ...cols, version, status: "open", updatedAt: new Date() })
        .where(eq(jobRequests.id, id))
        .returning();
      await tx
        .update(jobRequestPrivate)
        .set({ address: data.address, contactPhone: data.contactPhone, lat: data.lat, lng: data.lng })
        .where(eq(jobRequestPrivate.requestId, id));
      if (toRemove.length) {
        await tx.delete(jobPhotos).where(inArray(jobPhotos.id, toRemove.map((p) => p.id)));
        removedFiles = toRemove.map((p) => p.fileName);
      }
      if (newPhotos.length) {
        const start = existingPhotos.length;
        await tx.insert(jobPhotos).values(
          newPhotos.map((p, i) => ({ id: p.id, requestId: id, fileName: p.fileName, width: p.width, height: p.height, position: start + i })),
        );
      }
      const providerIds = await activeOfferProviderIds(tx, id);
      const headline = requestHeadline(cols.category, cols.details);
      await notify(
        tx,
        providerIds.map((userId) => ({
          userId,
          type: "request_changed",
          title: `Klientas pakeitė užklausą: ${headline}`,
          body: "Peržiūrėkite pakeitimus ir patvirtinkite savo kainą iš naujo.",
          link: `/darbai-salia/${id}`,
          dedupeKey: `request_changed:${id}:v${version}:${userId}`,
          email: true,
        })),
      );
      // Pasibaigusi užklausa paskelbiama iš naujo – teikėjai šalia vėl gauna pranešimą.
      if (reopening) await notifyNearbyProviders(tx, updated);
    });
  } catch (err) {
    await deletePhotoFiles(id, newPhotos.map((p) => p.fileName)).catch(() => undefined);
    throw err;
  }
  if (removedFiles.length) await deletePhotoFiles(id, removedFiles).catch(() => undefined);
  dispatchEmailsInBackground();
  return { id, version };
}

export async function cancelRequest(actor: Actor, id: string): Promise<void> {
  await db.transaction(async (tx) => {
    const r = await loadRequest(tx, id, true);
    if (!r || r.clientId !== actor.id) throw notFound("Užklausa nerasta");
    if (r.status === "cancelled") return;
    if (r.status === "agreed") {
      throw new AppError("CONFLICT", "Dėl šios užklausos jau susitarta. Atšaukite užsakymą jo kortelėje.");
    }
    if (r.status === "completed") throw new AppError("REQUEST_CLOSED", "Užklausa jau užbaigta");
    const providerIds = await activeOfferProviderIds(tx, id);
    await tx.update(offers).set({ status: "closed", updatedAt: new Date() }).where(and(eq(offers.requestId, id), eq(offers.status, "active")));
    await tx.update(jobRequests).set({ status: "cancelled", updatedAt: new Date() }).where(eq(jobRequests.id, id));
    const headline = requestHeadline(r.category, r.details);
    await notify(
      tx,
      providerIds.map((userId) => ({
        userId,
        type: "request_cancelled",
        title: `Klientas atšaukė užklausą: ${headline}`,
        link: `/darbai-salia/${id}`,
        dedupeKey: `request_cancelled:${id}:${userId}`,
      })),
    );
  });
}

/**
 * Po atšaukto susitarimo klientas vėl ieško teikėjo. Ankstesni kitų teikėjų pasiūlymai
 * atgaivinami, bet juos priimti galima tik teikėjui patvirtinus iš naujo.
 */
export async function reopenRequest(actor: Actor, id: string): Promise<void> {
  await db.transaction(async (tx) => {
    const r = await loadRequest(tx, id, true);
    if (!r || r.clientId !== actor.id) throw notFound("Užklausa nerasta");
    if (r.status === "open") return;
    if (r.status !== "on_hold") throw new AppError("REQUEST_CLOSED", "Šios užklausos atnaujinti nebegalima");
    await snapshot(tx, r);
    const version = r.version + 1;
    const [updated] = await tx
      .update(jobRequests)
      .set({ status: "open", version, updatedAt: new Date() })
      .where(eq(jobRequests.id, id))
      .returning();
    const usedOffers = tx.select({ id: agreements.offerId }).from(agreements).where(eq(agreements.requestId, id));
    const revived = await tx
      .update(offers)
      .set({ status: "active", updatedAt: new Date() })
      .where(and(eq(offers.requestId, id), eq(offers.status, "closed"), notInArray(offers.id, usedOffers)))
      .returning({ providerId: offers.providerId });
    const headline = requestHeadline(r.category, r.details);
    await notify(
      tx,
      revived.map(({ providerId }) => ({
        userId: providerId,
        type: "request_reopened",
        title: `Užklausa vėl atvira: ${headline}`,
        body: "Klientas ieško kito teikėjo. Patvirtinkite savo pasiūlymą, jei jis vis dar galioja.",
        link: `/darbai-salia/${id}`,
        dedupeKey: `request_reopened:${id}:v${version}:${providerId}`,
        email: true,
      })),
    );
    const usedProviders = await tx.select({ id: agreements.providerId }).from(agreements).where(eq(agreements.requestId, id));
    await notifyNearbyProviders(tx, updated, [...revived.map((x) => x.providerId), ...usedProviders.map((x) => x.id)]);
  });
  dispatchEmailsInBackground();
}

/** Ar naudotojas gali matyti šios užklausos nuotraukas (tos pačios taisyklės kaip užklausai). */
export async function canViewRequest(actor: Actor, requestId: string): Promise<boolean> {
  try {
    await getRequestView(actor, requestId);
    return true;
  } catch {
    return false;
  }
}

export { loadRequest };
