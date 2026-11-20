import { redirect } from "next/navigation";
import { getActor, type Actor } from "@/server/auth/session";

/** Puslapiams: jei neprisijungęs – nukreipia į prisijungimą ir grąžina atgal. */
export async function requirePageActor(returnTo: string): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect(`/prisijungti?next=${encodeURIComponent(returnTo)}`);
  return actor;
}
