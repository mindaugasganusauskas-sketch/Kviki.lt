import { route } from "@/server/api";
import { clearSessionCookie, currentSessionToken, deleteSession } from "@/server/auth/session";

export const POST = route(async () => {
  const token = await currentSessionToken();
  if (token) await deleteSession(token);
  await clearSessionCookie();
  return { ok: true };
});
