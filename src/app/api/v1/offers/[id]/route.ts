import { authed, readJson } from "@/server/api";
import { db } from "@/server/db";
import { offers } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "@/server/errors";
import { submitOffer } from "@/server/services/offers";
import { isUuid } from "@/server/services/photos";

/** Teikėjas keičia savo pasiūlymą (arba patvirtina tą pačią kainą po užklausos pakeitimų). */
export const PATCH = authed<{ id: string }>(async (req, actor, { id }) => {
  if (!isUuid(id)) throw notFound("Pasiūlymas nerastas");
  const [o] = await db.select({ requestId: offers.requestId, providerId: offers.providerId }).from(offers).where(eq(offers.id, id));
  if (!o || o.providerId !== actor.id) throw notFound("Pasiūlymas nerastas");
  return { offer: await submitOffer(actor, o.requestId, await readJson(req)) };
});
