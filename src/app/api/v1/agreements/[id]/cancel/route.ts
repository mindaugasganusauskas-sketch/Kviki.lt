import { authed, readJson } from "@/server/api";
import { cancelAgreement } from "@/server/services/agreements";

export const POST = authed<{ id: string }>(async (req, actor, { id }) => {
  await cancelAgreement(actor, id, await readJson(req));
  return { ok: true };
});
