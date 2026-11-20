import { authed, readJson } from "@/server/api";
import { cancelVisit } from "@/server/services/agreements";

export const POST = authed<{ id: string }>(async (req, actor, { id }) => {
  await cancelVisit(actor, id, await readJson(req));
  return { ok: true };
});
