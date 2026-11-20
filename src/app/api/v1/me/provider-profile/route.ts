import { authed, readJson } from "@/server/api";
import { getProviderProfile, saveProviderProfile } from "@/server/services/accounts";

export const GET = authed(async (_req, actor) => ({ profile: await getProviderProfile(actor.id) }));

export const PUT = authed(async (req, actor) => ({ profile: await saveProviderProfile(actor, await readJson(req)) }));
