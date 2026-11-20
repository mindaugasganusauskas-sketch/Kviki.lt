import { authResponse } from "../session-response";
import { clientIp, readJson, route } from "@/server/api";
import { login } from "@/server/services/accounts";

export const POST = route(async (req) => {
  const body = (await readJson(req)) as Record<string, unknown>;
  const { userId } = await login(body, clientIp(req));
  return authResponse(userId, body.client === "mobile");
});
