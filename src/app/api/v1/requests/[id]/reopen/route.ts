import { authed } from "@/server/api";
import { reopenRequest } from "@/server/services/requests";

export const POST = authed<{ id: string }>(async (_req, actor, { id }) => {
  await reopenRequest(actor, id);
  return { ok: true };
});
