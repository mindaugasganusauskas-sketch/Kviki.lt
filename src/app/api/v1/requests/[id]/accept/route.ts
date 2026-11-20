import { authed, readJson } from "@/server/api";
import { acceptOffer } from "@/server/services/agreements";

export const POST = authed<{ id: string }>(async (req, actor, { id }) => acceptOffer(actor, id, await readJson(req)));
