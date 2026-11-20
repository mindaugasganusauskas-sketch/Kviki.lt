import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { agreements, jobRequests, offers, providerProfiles } from "@/server/db/schema";
import type { Actor } from "@/server/auth/session";
import { AppError, notFound, parseInput } from "@/server/errors";
import { requestHeadline } from "@/shared/categories";
import { formatPriceLabel } from "@/shared/format";
import { municipalityLabel } from "@/shared/municipalities";
import { offerInputSchema } from "@/shared/schemas";
import type { OfferDTO, RequestStatus } from "@/shared/types";
import { toOfferDTO } from "./mappers";
import { dispatchEmailsInBackground, notify } from "./notifications";
import { isUuid } from "./photos";
import { loadRequest } from "./requests";

function requireProvider(actor: Actor) {
  if (!actor.isProvider) throw new AppError("PROVIDER_PROFILE_REQUIRED", "Pirmiausia užpildykite teikėjo profilį");
}

/**
 * Teikėjas pateikia arba pakeičia savo pasiūlymą. Kiekvienas pakeitimas didina versiją,
 * todėl klientas negali priimti senų sąlygų.
 */
export async function submitOffer(actor: Actor, requestId: string, input: unknown): Promise<OfferDTO> {
  requireProvider(actor);
  const data = parseInput(offerInputSchema, input);
  const startAt = new Date(data.startAt);
  if (startAt.getTime() < Date.now() - 10 * 60 * 1000) {
    throw new AppError("VALIDATION", "Pradžios laikas jau praėjo. Pasirinkite vėlesnį.");
  }
  if (startAt.getTime() > Date.now() + 366 * 24 * 3600 * 1000) {
    throw new AppError("VALIDATION", "Pradžia per toli ateityje");
  }

  const result = await db.transaction(async (tx) => {
    const r = await loadRequest(tx, requestId, true);
    if (!r || r.isDemo !== actor.isDemo) throw notFound("Užklausa nerasta");
    if (r.clientId === actor.id) throw new AppError("FORBIDDEN", "Negalite siūlyti savo užklausai");
    if (r.status !== "open") throw new AppError("REQUEST_CLOSED", "Užklausa jau nebeaktyvi");

    const [existing] = await tx
      .select()
      .from(offers)
      .where(and(eq(offers.requestId, r.id), eq(offers.providerId, actor.id)))
      .for("update");

    let row;
    if (!existing) {
      [row] = await tx
        .insert(offers)
        .values({
          requestId: r.id,
          providerId: actor.id,
          priceCents: data.priceCents,
          startAt,
          included: data.included,
          requestVersion: r.version,
        })
        .returning();
    } else {
      if (existing.status === "accepted" || existing.status === "closed") {
        throw new AppError("REQUEST_CLOSED", "Šio pasiūlymo keisti nebegalima");
      }
      [row] = await tx
        .update(offers)
        .set({
          priceCents: data.priceCents,
          startAt,
          included: data.included,
          status: "active",
          version: existing.version + 1,
          requestVersion: r.version,
          updatedAt: new Date(),
        })
        .where(eq(offers.id, existing.id))
        .returning();
    }
    const [profile] = await tx.select().from(providerProfiles).where(eq(providerProfiles.userId, actor.id));
    const isNew = !existing || existing.status === "withdrawn";
    const price = formatPriceLabel(row.priceCents, r.frequency !== null);
    await notify(tx, [
      {
        userId: r.clientId,
        type: isNew ? "new_offer" : "offer_updated",
        title: isNew ? `Naujas pasiūlymas: ${price}` : `Pasiūlymas atnaujintas: ${price}`,
        body: `${profile.displayName} – ${requestHeadline(r.category, r.details)}`,
        link: `/uzklausos/${r.id}`,
        dedupeKey: `offer:${row.id}:v${row.version}`,
        email: true,
      },
    ]);
    return toOfferDTO(row, profile, r);
  });
  dispatchEmailsInBackground();
  return result;
}

export async function withdrawOffer(actor: Actor, offerId: string): Promise<OfferDTO> {
  requireProvider(actor);
  if (!isUuid(offerId)) throw notFound("Pasiūlymas nerastas");
  return db.transaction(async (tx) => {
    const [o] = await tx.select().from(offers).where(eq(offers.id, offerId));
    if (!o || o.providerId !== actor.id) throw notFound("Pasiūlymas nerastas");
    const r = await loadRequest(tx, o.requestId, true);
    if (!r) throw notFound("Užklausa nerasta");
    const [locked] = await tx.select().from(offers).where(eq(offers.id, offerId)).for("update");
    if (locked.status !== "active") {
      throw new AppError("CONFLICT", locked.status === "accepted" ? "Pasiūlymas jau priimtas" : "Pasiūlymas jau neaktyvus");
    }
    const [row] = await tx
      .update(offers)
      .set({ status: "withdrawn", version: locked.version + 1, updatedAt: new Date() })
      .where(eq(offers.id, offerId))
      .returning();
    const [profile] = await tx.select().from(providerProfiles).where(eq(providerProfiles.userId, actor.id));
    await notify(tx, [
      {
        userId: r.clientId,
        type: "offer_withdrawn",
        title: `${profile.displayName} atsiėmė pasiūlymą`,
        body: requestHeadline(r.category, r.details),
        link: `/uzklausos/${r.id}`,
        dedupeKey: `offer_withdrawn:${row.id}:v${row.version}`,
      },
    ]);
    return toOfferDTO(row, profile, r);
  });
}

export interface MyOfferItem {
  offer: OfferDTO;
  requestId: string;
  headline: string;
  locality: string;
  municipalityLabel: string;
  requestStatus: RequestStatus;
}

/** Teikėjo pasiūlymai, dar nevirtę susitarimais (laukia kliento sprendimo arba baigėsi). */
export async function listMyOffers(actor: Actor): Promise<MyOfferItem[]> {
  requireProvider(actor);
  const rows = await db
    .select({ o: offers, r: jobRequests, p: providerProfiles })
    .from(offers)
    .innerJoin(jobRequests, eq(jobRequests.id, offers.requestId))
    .innerJoin(providerProfiles, eq(providerProfiles.userId, offers.providerId))
    // Pasiūlymai, virtę susitarimais, rodomi kaip užsakymai, ne čia.
    .leftJoin(agreements, eq(agreements.offerId, offers.id))
    .where(and(eq(offers.providerId, actor.id), isNull(agreements.id)))
    .orderBy(desc(offers.updatedAt))
    .limit(100);
  return rows
    .map(({ o, r, p }) => ({
      offer: toOfferDTO(o, p, r),
      requestId: r.id,
      headline: requestHeadline(r.category, r.details),
      locality: r.locality,
      municipalityLabel: municipalityLabel(r.municipality),
      requestStatus: r.status,
    }));
}
