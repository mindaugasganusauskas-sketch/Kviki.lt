import { authed, readJson } from "@/server/api";
import { setMode } from "@/server/services/accounts";

export const POST = authed(async (req, actor) => ({ mode: await setMode(actor, await readJson(req)) }));
