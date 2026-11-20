import { authed, readJson } from "@/server/api";
import { reportVisitProblem } from "@/server/services/agreements";

export const POST = authed<{ id: string }>(async (req, actor, { id }) => {
  await reportVisitProblem(actor, id, await readJson(req));
  return { ok: true };
});
