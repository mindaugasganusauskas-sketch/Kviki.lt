import { authed } from "@/server/api";
import { withdrawOffer } from "@/server/services/offers";

export const POST = authed<{ id: string }>(async (_req, actor, { id }) => ({ offer: await withdrawOffer(actor, id) }));
