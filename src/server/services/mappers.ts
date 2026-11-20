import { asc, eq, inArray } from "drizzle-orm";
import { db, type Tx } from "@/server/db";
import { jobPhotos, jobRequestPrivate, jobRequests, offers, providerProfiles } from "@/server/db/schema";
import { describeDetails, requestHeadline, type CategoryId } from "@/shared/categories";
import { municipalityLabel } from "@/shared/municipalities";
import type { Frequency } from "@/shared/time";
import type { OfferDTO, PhotoDTO, ProviderCardDTO, RequestPrivateDTO, RequestPublicDTO } from "@/shared/types";

export type RequestRow = typeof jobRequests.$inferSelect;
export type OfferRow = typeof offers.$inferSelect;
export type ProviderRow = typeof providerProfiles.$inferSelect;
type Conn = typeof db | Tx;

export function photoUrl(photoId: string): string {
  return `/api/photos/${photoId}`;
}

export async function photosFor(conn: Conn, requestIds: string[]): Promise<Map<string, PhotoDTO[]>> {
  const map = new Map<string, PhotoDTO[]>();
  if (!requestIds.length) return map;
  const rows = await conn
    .select({ id: jobPhotos.id, requestId: jobPhotos.requestId })
    .from(jobPhotos)
    .where(inArray(jobPhotos.requestId, requestIds))
    .orderBy(asc(jobPhotos.position), asc(jobPhotos.createdAt));
  for (const r of rows) {
    const list = map.get(r.requestId) ?? [];
    list.push({ id: r.id, url: photoUrl(r.id) });
    map.set(r.requestId, list);
  }
  return map;
}

export function toPublicRequest(r: RequestRow, photos: PhotoDTO[]): RequestPublicDTO {
  return {
    id: r.id,
    category: r.category as CategoryId,
    headline: requestHeadline(r.category, r.details),
    description: r.description,
    details: r.details,
    detailLines: describeDetails(r.category, r.details),
    municipality: r.municipality,
    municipalityLabel: municipalityLabel(r.municipality),
    locality: r.locality,
    timing: {
      type: r.timingType,
      windowStart: r.windowStart?.toISOString() ?? null,
      windowEnd: r.windowEnd?.toISOString() ?? null,
    },
    recurrence: {
      frequency: (r.frequency as Frequency | null) ?? null,
      startDate: r.seriesStart,
      endDate: r.seriesEnd,
    },
    status: r.status,
    version: r.version,
    isDemo: r.isDemo,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    photos,
  };
}

export async function privateFor(conn: Conn, requestId: string): Promise<RequestPrivateDTO> {
  const [p] = await conn.select().from(jobRequestPrivate).where(eq(jobRequestPrivate.requestId, requestId));
  return { address: p?.address ?? "", contactPhone: p?.contactPhone ?? "", lat: p?.lat ?? null, lng: p?.lng ?? null };
}

export function toProviderCard(p: ProviderRow): ProviderCardDTO {
  return {
    id: p.userId,
    displayName: p.displayName,
    businessForm: p.businessForm,
    verified: p.verifiedAt !== null,
    description: p.description,
  };
}

export function toOfferDTO(o: OfferRow, provider: ProviderRow, request: Pick<RequestRow, "version" | "frequency">): OfferDTO {
  return {
    id: o.id,
    requestId: o.requestId,
    provider: toProviderCard(provider),
    priceCents: o.priceCents,
    perVisit: request.frequency !== null,
    startAt: o.startAt.toISOString(),
    included: o.included,
    status: o.status,
    version: o.version,
    needsReconfirmation: o.status === "active" && o.requestVersion < request.version,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}
