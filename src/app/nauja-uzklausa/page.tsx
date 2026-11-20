import type { Metadata } from "next";
import { getActor } from "@/server/auth/session";
import { isCategoryId } from "@/shared/categories";
import { RequestWizard } from "@/components/wizard/request-wizard";

export const metadata: Metadata = { title: "Nauja užklausa" };

export default async function NewRequestPage(props: PageProps<"/nauja-uzklausa">) {
  const actor = await getActor();
  const sp = await props.searchParams;
  const cat = typeof sp.kategorija === "string" && isCategoryId(sp.kategorija) ? sp.kategorija : null;
  const text = typeof sp.tekstas === "string" ? sp.tekstas.slice(0, 2000) : null;
  return (
    <RequestWizard
      mode="create"
      user={actor ? { name: actor.name, phone: actor.phone } : null}
      startCategory={cat}
      startText={text}
    />
  );
}
