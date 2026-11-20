import { authed, readJson } from "@/server/api";
import { getRequestView } from "@/server/services/requests";
import { submitOffer } from "@/server/services/offers";

type P = { id: string };

/** Klientas mato visus savo užklausos pasiūlymus, teikėjas – tik savo. */
export const GET = authed<P>(async (_req, actor, { id }) => {
  const view = await getRequestView(actor, id);
  if (view.viewer === "owner") return { offers: view.offers };
  return { offers: view.myOffer ? [view.myOffer] : [] };
});

export const POST = authed<P>(async (req, actor, { id }) => ({ offer: await submitOffer(actor, id, await readJson(req)) }));
