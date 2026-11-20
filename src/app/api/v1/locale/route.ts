import { cookies } from "next/headers";
import { z } from "zod";
import { readJson, route } from "@/server/api";
import { cookieSecure, getActor } from "@/server/auth/session";
import { parseInput } from "@/server/errors";
import { setUserLocale } from "@/server/services/accounts";
import { LOCALE_COOKIE } from "@/shared/locale";

const schema = z.object({ locale: z.enum(["lt", "en"]) });

/** Pakeičia sąsajos kalbą (slapukas) ir, jei prisijungęs, išsaugo ją paskyroje. */
export const POST = route(async (req) => {
  const { locale } = parseInput(schema, await readJson(req));
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    sameSite: "lax",
    secure: cookieSecure(),
    maxAge: 365 * 24 * 3600,
  });
  const actor = await getActor();
  if (actor) await setUserLocale(actor.id, locale);
  return { locale };
});
