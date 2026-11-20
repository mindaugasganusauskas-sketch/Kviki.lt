import { authed } from "@/server/api";
import { markVisitDone } from "@/server/services/agreements";

export const POST = authed<{ id: string }>(async (_req, actor, { id }) => {
  await markVisitDone(actor, id);
  return { ok: true };
});
