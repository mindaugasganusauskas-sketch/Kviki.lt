import { authResponse } from "../session-response";
import { clientIp, readJson, route } from "@/server/api";
import { register } from "@/server/services/accounts";

export const POST = route(async (req) => {
  const body = (await readJson(req)) as Record<string, unknown>;
  const { userId, mode } = await register(body, clientIp(req));
  return authResponse(userId, body.client === "mobile", mode);
});
