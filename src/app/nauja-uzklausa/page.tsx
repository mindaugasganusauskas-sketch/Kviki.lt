import type { Metadata } from "next";
import { getActor } from "@/server/auth/session";
import { isCategoryId } from "@/shared/categories";
import { RequestWizard } from "@/components/wizard/request-wizard";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.titles.newRequest };
}

export default async function NewRequestPage(props: PageProps<"/nauja-uzklausa">) {
  const actor = await getActor();
  const sp = await props.searchParams;
  const cat = typeof sp.kategorija === "string" && isCategoryId(sp.kategorija) ? sp.kategorija : null;
  const text = typeof sp.tekstas === "string" ? sp.tekstas.slice(0, 2000) : null;
  return (
    <RequestWizard
      mode="create"
      user={actor ? { name: actor.name, phone: actor.phone, isDemo: actor.isDemo } : null}
      startCategory={cat}
      startText={text}
    />
  );
}
