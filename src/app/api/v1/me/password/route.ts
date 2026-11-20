import { authed, readJson } from "@/server/api";
import { currentSessionToken } from "@/server/auth/session";
import { changePassword } from "@/server/services/accounts";

export const POST = authed(async (req, actor) => {
  await changePassword(actor, await readJson(req), await currentSessionToken());
  return { ok: true };
});
