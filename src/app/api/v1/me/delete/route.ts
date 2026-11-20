import { authed, readJson } from "@/server/api";
import { clearSessionCookie } from "@/server/auth/session";
import { deleteAccount } from "@/server/services/account-deletion";

/** Ištrina (nuasmenina) prisijungusio naudotojo paskyrą. Reikia slaptažodžio. */
export const POST = authed(async (req, actor) => {
  await deleteAccount(actor, await readJson(req));
  await clearSessionCookie();
  return { ok: true };
});
