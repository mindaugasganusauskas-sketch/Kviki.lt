import { authed } from "@/server/api";
import { listMyOffers } from "@/server/services/offers";

export const GET = authed(async (_req, actor) => ({ offers: await listMyOffers(actor) }));
