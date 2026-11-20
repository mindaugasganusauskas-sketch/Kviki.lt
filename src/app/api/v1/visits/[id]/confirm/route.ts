import { authed } from "@/server/api";
import { confirmVisit } from "@/server/services/agreements";

export const POST = authed<{ id: string }>(async (_req, actor, { id }) => {
  await confirmVisit(actor, id);
  return { ok: true };
});
