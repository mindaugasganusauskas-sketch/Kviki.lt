import { authed } from "@/server/api";
import { markAllRead } from "@/server/services/notifications";

export const POST = authed(async (_req, actor) => {
  await markAllRead(actor);
  return { ok: true };
});
