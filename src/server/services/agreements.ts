import { and, asc, desc, eq, gt, inArray, max, ne } from "drizzle-orm";
import { db, type Tx } from "@/server/db";
import { agreements, jobRequests, offers, providerProfiles, users, visits } from "@/server/db/schema";
import type { Actor } from "@/server/auth/session";
import { AppError, notFound, parseInput } from "@/server/errors";
import { describeDetails, requestHeadline, type CategoryId } from "@/shared/categories";
import { formatDateTime, formatPriceLabel } from "@/shared/format";
import { municipalityLabel } from "@/shared/municipalities";
import { acceptOfferSchema, cancelSchema, problemSchema } from "@/shared/schemas";
import { nthOccurrence, vilniusDateKey, type Frequency } from "@/shared/time";
import type { AgreementDTO, AgreementListItem, PartyRole, VisitDTO } from "@/shared/types";
import { privateFor, toOfferDTO } from "./mappers";
import { dispatchEmailsInBackground, notify } from "./notifications";
import { isUuid } from "./photos";
import { loadRequest } from "./requests";

type AgreementRow = typeof agreements.$inferSelect;
type VisitRow = typeof visits.$inferSelect;

/** Kiek į priekį planuojami periodiniai vizitai. */
const HORIZON_DAYS = 120;
const MAX_NEW_VISITS = 40;

// --- Vizitų planavimas ------------------------------------------------------------

async function ensureVisitHorizon(tx: Tx, a: AgreementRow): Promise<void> {
  if (a.status !== "active" || !a.frequency) return;
  const now = Date.now();
  const horizon = now + HORIZON_DAYS * 24 * 3600 * 1000;
  const [{ last }] = await tx.select({ last: max(visits.seq) }).from(visits).where(eq(visits.agreementId, a.id));
  const upcoming = await tx
    .select({ id: visits.id })
    .from(visits)
    .where(and(eq(visits.agreementId, a.id), eq(visits.status, "scheduled"), gt(visits.scheduledAt, new Date(now))))
    .limit(1);
  let hasUpcoming = upcoming.length > 0;
  const values: { agreementId: string; seq: number; scheduledAt: Date }[] = [];
  let n = last === null ? 0 : last + 1;
  while (values.length < MAX_NEW_VISITS) {
    const at = nthOccurrence(a.startAt, a.frequency as Frequency, n);
    if (a.seriesEnd && vilniusDateKey(at) > a.seriesEnd) break;
    // Planuojame iki horizonto, bet visada paliekame bent vieną būsimą vizitą.
    if (at.getTime() > horizon && hasUpcoming) break;
    values.push({ agreementId: a.id, seq: n, scheduledAt: at });
    if (at.getTime() > now) hasUpcoming = true;
    n += 1;
  }
  if (values.length) await tx.insert(visits).values(values).onConflictDoNothing();
}

async function maybeComplete(tx: Tx, a: AgreementRow): Promise<void> {
  if (a.status !== "active") return;
  const all = await tx.select().from(visits).where(eq(visits.agreementId, a.id));
  const open = all.filter((v) => v.status === "scheduled" || v.status === "done" || v.status === "problem");
  if (open.length) return;
  const finishedSeries = !a.frequency || a.seriesEnd !== null;
  if (!finishedSeries) return;
  const anyConfirmed = all.some((v) => v.status === "confirmed");
  if (!anyConfirmed) return;
  await tx.update(agreements).set({ status: "completed", updatedAt: new Date() }).where(eq(agreements.id, a.id));
  await tx.update(jobRequests).set({ status: "completed", updatedAt: new Date() }).where(eq(jobRequests.id, a.requestId));
}

// --- Priėmimas -----------------------------------------------------------------------

/**
 * Klientas priima pasiūlymą. Viskas vyksta vienoje transakcijoje, užrakinus užklausą:
 * sukuriamas susitarimas, kiti pasiūlymai uždaromi, suplanuojami vizitai.
 * Pakartotinis to paties pasiūlymo priėmimas grąžina tą patį susitarimą.
 */
export async function acceptOffer(
  actor: Actor,
  requestId: string,
  input: unknown,
): Promise<{ agreementId: string; created: boolean }> {
  const { offerId, offerVersion } = parseInput(acceptOfferSchema, input);
  const result = await db.transaction(async (tx) => {
    const r = await loadRequest(tx, requestId, true);
    if (!r || r.clientId !== actor.id) throw notFound("Užklausa nerasta");

    const [live] = await tx
      .select()
      .from(agreements)
      .where(and(eq(agreements.requestId, r.id), inArray(agreements.status, ["active", "completed"])));
    if (live) {
      if (live.offerId === offerId) return { agreementId: live.id, created: false };
      throw new AppError("ALREADY_AGREED", "Dėl šios užklausos jau susitarta su kitu teikėju", { agreementId: live.id });
    }
    if (r.status !== "open") throw new AppError("REQUEST_CLOSED", "Užklausa nebeaktyvi");

    const [o] = await tx
      .select()
      .from(offers)
      .where(and(eq(offers.id, offerId), eq(offers.requestId, r.id)))
      .for("update");
    if (!o) throw notFound("Pasiūlymas nerastas");
    const [profile] = await tx.select().from(providerProfiles).where(eq(providerProfiles.userId, o.providerId));
    const fresh = toOfferDTO(o, profile, r);
    if (o.status !== "active") {
      throw new AppError("OFFER_CHANGED", "Teikėjas atsiėmė šį pasiūlymą", { offer: fresh });
    }
    if (o.version !== offerVersion) {
      throw new AppError("OFFER_CHANGED", "Teikėjas ką tik pakeitė pasiūlymą. Peržiūrėkite naujas sąlygas ir pasirinkite iš naujo.", {
        offer: fresh,
      });
    }
    if (o.requestVersion !== r.version) {
      throw new AppError("OFFER_CHANGED", "Po jūsų užklausos pakeitimų teikėjas dar nepatvirtino šios kainos.", { offer: fresh });
    }

    const [a] = await tx
      .insert(agreements)
      .values({
        requestId: r.id,
        offerId: o.id,
        clientId: r.clientId,
        providerId: o.providerId,
        requestVersion: r.version,
        offerVersion: o.version,
        category: r.category,
        description: r.description,
        details: r.details,
        municipality: r.municipality,
        locality: r.locality,
        frequency: r.frequency,
        seriesEnd: r.seriesEnd,
        priceCents: o.priceCents,
        startAt: o.startAt,
        included: o.included,
      })
      .returning();

    await tx.update(offers).set({ status: "accepted", updatedAt: new Date() }).where(eq(offers.id, o.id));
    const closed = await tx
      .update(offers)
      .set({ status: "closed", updatedAt: new Date() })
      .where(and(eq(offers.requestId, r.id), eq(offers.status, "active"), ne(offers.id, o.id)))
      .returning({ providerId: offers.providerId });
    await tx.update(jobRequests).set({ status: "agreed", updatedAt: new Date() }).where(eq(jobRequests.id, r.id));

    if (a.frequency) await ensureVisitHorizon(tx, a);
    else await tx.insert(visits).values({ agreementId: a.id, seq: 0, scheduledAt: a.startAt });

    const headline = requestHeadline(r.category, r.details);
    await notify(tx, [
      {
        userId: o.providerId,
        type: "offer_accepted",
        params: { category: r.category, details: r.details, priceCents: a.priceCents, perVisit: a.frequency !== null, startAt: a.startAt.toISOString() },
        link: `/susitarimai/${a.id}`,
        dedupeKey: `offer_accepted:${a.id}`,
        email: true,
      },
      ...closed.map(({ providerId }) => ({
        userId: providerId,
        type: "request_closed",
        params: { category: r.category, details: r.details },
        link: `/darbai-salia/${r.id}`,
        dedupeKey: `request_closed:${a.id}:${providerId}`,
      })),
    ]);
    return { agreementId: a.id, created: true };
  });
  if (result.created) dispatchEmailsInBackground();
  return result;
}

// --- Peržiūra -----------------------------------------------------------------------

function toVisitDTO(v: VisitRow): VisitDTO {
  return {
    id: v.id,
    seq: v.seq,
    scheduledAt: v.scheduledAt.toISOString(),
    status: v.status,
    doneAt: v.doneAt?.toISOString() ?? null,
    confirmedAt: v.confirmedAt?.toISOString() ?? null,
    problemNote: v.problemNote,
    cancelledBy: v.cancelledBy,
    cancelledAt: v.cancelledAt?.toISOString() ?? null,
    cancelReason: v.cancelReason,
  };
}

function roleOf(actor: Actor, a: AgreementRow): PartyRole | null {
  if (a.clientId === actor.id) return "client";
  if (a.providerId === actor.id) return "provider";
  return null;
}

/** Užrakina užklausą, tada susitarimą – visada ta pačia tvarka, kad transakcijos neužstrigtų. */
async function lockAgreementForParty(tx: Tx, actor: Actor, id: string) {
  if (!isUuid(id)) throw notFound("Užsakymas nerastas");
  const [ref] = await tx.select({ requestId: agreements.requestId }).from(agreements).where(eq(agreements.id, id));
  if (!ref) throw notFound("Užsakymas nerastas");
  await loadRequest(tx, ref.requestId, true);
  return loadAgreementForParty(tx, actor, id, true);
}

async function loadAgreementForParty(tx: Tx | typeof db, actor: Actor, id: string, lock = false) {
  if (!isUuid(id)) throw notFound("Užsakymas nerastas");
  const q = tx.select().from(agreements).where(eq(agreements.id, id));
  const [a] = lock ? await q.for("update") : await q;
  if (!a) throw notFound("Užsakymas nerastas");
  const role = roleOf(actor, a);
  if (!role) throw notFound("Užsakymas nerastas");
  return { a, role };
}

export async function getAgreement(actor: Actor, id: string): Promise<AgreementDTO> {
  const { a, role } = await loadAgreementForParty(db, actor, id);
  if (a.status === "active" && a.frequency) {
    await db.transaction(async (tx) => ensureVisitHorizon(tx, a));
  }
  const [[client], [provider], [providerUser], [request], visitRows, location] = await Promise.all([
    db.select().from(users).where(eq(users.id, a.clientId)),
    db.select().from(providerProfiles).where(eq(providerProfiles.userId, a.providerId)),
    db.select().from(users).where(eq(users.id, a.providerId)),
    db.select({ isDemo: jobRequests.isDemo }).from(jobRequests).where(eq(jobRequests.id, a.requestId)),
    db.select().from(visits).where(eq(visits.agreementId, a.id)).orderBy(asc(visits.seq)),
    privateFor(db, a.requestId),
  ]);
  return {
    id: a.id,
    requestId: a.requestId,
    viewerRole: role,
    status: a.status,
    category: a.category as CategoryId,
    headline: requestHeadline(a.category, a.details),
    description: a.description,
    details: a.details,
    detailLines: describeDetails(a.category, a.details),
    municipalityLabel: municipalityLabel(a.municipality),
    locality: a.locality,
    priceCents: a.priceCents,
    perVisit: a.frequency !== null,
    frequency: (a.frequency as Frequency | null) ?? null,
    seriesEnd: a.seriesEnd,
    startAt: a.startAt.toISOString(),
    included: a.included,
    client: {
      name: client.name,
      phone: client.deletedAt ? null : location.contactPhone || client.phone,
      email: client.deletedAt ? "" : client.email,
    },
    provider: {
      name: provider.displayName,
      phone: providerUser.deletedAt ? null : provider.phone,
      email: providerUser.deletedAt ? "" : providerUser.email,
      businessForm: provider.businessForm,
      verified: provider.verifiedAt !== null,
    },
    location,
    visits: visitRows.map(toVisitDTO),
    cancelledBy: a.cancelledBy,
    cancelReason: a.cancelReason,
    cancelledAt: a.cancelledAt?.toISOString() ?? null,
    isDemo: request?.isDemo ?? false,
    createdAt: a.createdAt.toISOString(),
  };
}

export async function listAgreements(actor: Actor, as: PartyRole): Promise<AgreementListItem[]> {
  const rows = await db
    .select()
    .from(agreements)
    .where(as === "client" ? eq(agreements.clientId, actor.id) : eq(agreements.providerId, actor.id))
    .orderBy(desc(agreements.createdAt))
    .limit(200);
  if (!rows.length) return [];
  const ids = rows.map((a) => a.id);
  const counterpartIds = rows.map((a) => (as === "client" ? a.providerId : a.clientId));
  const [visitRows, names] = await Promise.all([
    db.select().from(visits).where(inArray(visits.agreementId, ids)).orderBy(asc(visits.seq)),
    as === "client"
      ? db
          .select({ id: providerProfiles.userId, name: providerProfiles.displayName })
          .from(providerProfiles)
          .where(inArray(providerProfiles.userId, counterpartIds))
      : db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, counterpartIds)),
  ]);
  const nameMap = new Map(names.map((n) => [n.id, n.name]));
  return rows.map((a) => {
    const vs = visitRows.filter((v) => v.agreementId === a.id);
    const next = vs.find((v) => v.status === "scheduled" || v.status === "done" || v.status === "problem") ?? null;
    return {
      id: a.id,
      requestId: a.requestId,
      viewerRole: as,
      status: a.status,
      headline: requestHeadline(a.category, a.details),
      category: a.category as CategoryId,
      details: a.details,
      counterpartName: nameMap.get(as === "client" ? a.providerId : a.clientId) ?? "",
      locality: a.locality,
      municipalityLabel: municipalityLabel(a.municipality),
      priceCents: a.priceCents,
      perVisit: a.frequency !== null,
      frequency: (a.frequency as Frequency | null) ?? null,
      nextVisit: next ? toVisitDTO(next) : null,
      pendingConfirmation: vs.some((v) => v.status === "done"),
      createdAt: a.createdAt.toISOString(),
    };
  });
}

// --- Atšaukimas ir vizitų būsenos ------------------------------------------------------

const ROLE_LABEL: Record<PartyRole, string> = { client: "Klientas", provider: "Teikėjas" };

/**
 * Atšaukia vienkartinį užsakymą arba nutraukia būsimus periodinio darbo vizitus.
 * Istorija lieka, užklausa pereina į „laukia kliento sprendimo“.
 */
export async function cancelAgreement(actor: Actor, id: string, input: unknown): Promise<void> {
  const { reason } = parseInput(cancelSchema, input ?? {});
  await db.transaction(async (tx) => {
    const { a, role } = await lockAgreementForParty(tx, actor, id);
    if (a.status !== "active") throw new AppError("CONFLICT", "Užsakymas jau nebeaktyvus");
    const now = new Date();
    const vs = await tx.select().from(visits).where(eq(visits.agreementId, a.id));
    const hadWork = vs.some((v) => v.status === "confirmed" || v.status === "done" || v.status === "problem");
    const status = a.frequency && hadWork ? "ended" : "cancelled";
    await tx
      .update(visits)
      .set({ status: "cancelled", cancelledBy: role, cancelledAt: now, cancelReason: reason || null, updatedAt: now })
      .where(and(eq(visits.agreementId, a.id), eq(visits.status, "scheduled")));
    await tx
      .update(agreements)
      .set({ status, cancelledBy: role, cancelReason: reason || null, cancelledAt: now, updatedAt: now })
      .where(eq(agreements.id, a.id));
    // Atšaukto susitarimo pasiūlymas nebegalioja ir nebus atgaivintas ieškant kito teikėjo.
    await tx.update(offers).set({ status: "closed", updatedAt: now }).where(eq(offers.id, a.offerId));
    await tx.update(jobRequests).set({ status: "on_hold", updatedAt: now }).where(eq(jobRequests.id, a.requestId));
    const other = role === "client" ? a.providerId : a.clientId;
    const headline = requestHeadline(a.category, a.details);
    await notify(tx, [
      {
        userId: other,
        type: status === "ended" ? "series_ended" : "agreement_cancelled",
        params: { category: a.category, details: a.details, role, reason: reason || null },
        link: `/susitarimai/${a.id}`,
        dedupeKey: `agreement_cancelled:${a.id}`,
        email: true,
      },
    ]);
  });
  dispatchEmailsInBackground();
}

async function loadVisitForParty(tx: Tx, actor: Actor, visitId: string) {
  if (!isUuid(visitId)) throw notFound("Vizitas nerastas");
  const [v0] = await tx.select({ agreementId: visits.agreementId }).from(visits).where(eq(visits.id, visitId));
  if (!v0) throw notFound("Vizitas nerastas");
  const { a, role } = await lockAgreementForParty(tx, actor, v0.agreementId);
  const [v] = await tx.select().from(visits).where(eq(visits.id, visitId)).for("update");
  return { a, role, v };
}

export async function markVisitDone(actor: Actor, visitId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const { a, role, v } = await loadVisitForParty(tx, actor, visitId);
    if (role !== "provider") throw new AppError("FORBIDDEN", "Atliktu darbą pažymi teikėjas");
    if (a.status !== "active") throw new AppError("CONFLICT", "Užsakymas nebeaktyvus");
    if (v.status === "done") return;
    if (v.status !== "scheduled" && v.status !== "problem") throw new AppError("CONFLICT", "Šio vizito pažymėti nebegalima");
    const now = new Date();
    await tx.update(visits).set({ status: "done", doneAt: now, updatedAt: now }).where(eq(visits.id, v.id));
    await notify(tx, [
      {
        userId: a.clientId,
        type: "visit_done",
        params: { category: a.category, details: a.details },
        link: `/susitarimai/${a.id}`,
        dedupeKey: `visit_done:${v.id}:${now.getTime()}`,
        email: true,
      },
    ]);
  });
  dispatchEmailsInBackground();
}

export async function confirmVisit(actor: Actor, visitId: string): Promise<void> {
  await db.transaction(async (tx) => {
    const { a, role, v } = await loadVisitForParty(tx, actor, visitId);
    if (role !== "client") throw new AppError("FORBIDDEN", "Rezultatą patvirtina klientas");
    if (v.status === "confirmed") return;
    if (v.status !== "done" && v.status !== "problem") throw new AppError("CONFLICT", "Teikėjas dar nepažymėjo darbo atliktu");
    const now = new Date();
    await tx.update(visits).set({ status: "confirmed", confirmedAt: now, updatedAt: now }).where(eq(visits.id, v.id));
    await ensureVisitHorizon(tx, a);
    await maybeComplete(tx, a);
    await notify(tx, [
      {
        userId: a.providerId,
        type: "visit_confirmed",
        params: { category: a.category, details: a.details },
        link: `/susitarimai/${a.id}`,
        dedupeKey: `visit_confirmed:${v.id}`,
      },
    ]);
  });
}

export async function reportVisitProblem(actor: Actor, visitId: string, input: unknown): Promise<void> {
  const { note } = parseInput(problemSchema, input);
  await db.transaction(async (tx) => {
    const { a, role, v } = await loadVisitForParty(tx, actor, visitId);
    if (role !== "client") throw new AppError("FORBIDDEN", "Problemą pažymi klientas");
    if (v.status !== "done") throw new AppError("CONFLICT", "Problemą galima pažymėti, kai teikėjas pažymi darbą atliktu");
    const now = new Date();
    await tx.update(visits).set({ status: "problem", problemNote: note, updatedAt: now }).where(eq(visits.id, v.id));
    await notify(tx, [
      {
        userId: a.providerId,
        type: "visit_problem",
        params: { category: a.category, details: a.details, note },
        link: `/susitarimai/${a.id}`,
        dedupeKey: `visit_problem:${v.id}:${now.getTime()}`,
        email: true,
      },
    ]);
  });
  dispatchEmailsInBackground();
}

/** Atšaukia vieną periodinio darbo vizitą. Kiti vizitai lieka. Vienkartiniam darbui – atšaukiamas užsakymas. */
export async function cancelVisit(actor: Actor, visitId: string, input: unknown): Promise<void> {
  const { reason } = parseInput(cancelSchema, input ?? {});
  const oneTimeAgreement = await db.transaction(async (tx) => {
    const { a, role, v } = await loadVisitForParty(tx, actor, visitId);
    if (a.status !== "active") throw new AppError("CONFLICT", "Užsakymas nebeaktyvus");
    if (!a.frequency) return a.id;
    if (v.status !== "scheduled") throw new AppError("CONFLICT", "Atšaukti galima tik suplanuotą vizitą");
    const now = new Date();
    await tx
      .update(visits)
      .set({ status: "cancelled", cancelledBy: role, cancelledAt: now, cancelReason: reason || null, updatedAt: now })
      .where(eq(visits.id, v.id));
    await ensureVisitHorizon(tx, a);
    await maybeComplete(tx, a);
    await notify(tx, [
      {
        userId: role === "client" ? a.providerId : a.clientId,
        type: "visit_cancelled",
        params: { category: a.category, details: a.details, role, scheduledAt: v.scheduledAt.toISOString(), reason: reason || null },
        link: `/susitarimai/${a.id}`,
        dedupeKey: `visit_cancelled:${v.id}`,
        email: true,
      },
    ]);
    return null;
  });
  if (oneTimeAgreement) {
    await cancelAgreement(actor, oneTimeAgreement, { reason });
    return;
  }
  dispatchEmailsInBackground();
}

