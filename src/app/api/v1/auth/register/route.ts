import { authResponse } from "../session-response";
import { clientIp, readJson, route } from "@/server/api";
import { register } from "@/server/services/accounts";
import { getLocale } from "@/i18n/server";

export const POST = route(async (req) => {
  const body = (await readJson(req)) as Record<string, unknown>;
  const { userId, mode } = await register(body, clientIp(req), await getLocale());
  return authResponse(userId, body.client === "mobile", mode);
});
