import { authed } from "@/server/api";
import { markRead } from "@/server/services/notifications";

export const POST = authed<{ id: string }>(async (_req, actor, { id }) => {
  await markRead(actor, id);
  return { ok: true };
});
