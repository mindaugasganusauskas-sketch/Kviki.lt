import { authed } from "@/server/api";
import { cancelRequest } from "@/server/services/requests";

export const POST = authed<{ id: string }>(async (_req, actor, { id }) => {
  await cancelRequest(actor, id);
  return { ok: true };
});
