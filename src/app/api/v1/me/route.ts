import { authed, readJson } from "@/server/api";
import { toUserDTO, updateAccount } from "@/server/services/accounts";

export const GET = authed(async (_req, actor) => ({ user: toUserDTO(actor) }));

export const PATCH = authed(async (req, actor) => {
  await updateAccount(actor, await readJson(req));
  return { ok: true };
});

export const dynamic = "force-dynamic";
