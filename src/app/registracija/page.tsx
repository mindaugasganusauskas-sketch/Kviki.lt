import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getActor } from "@/server/auth/session";
import { AuthPageForm } from "../prisijungti/auth-page-form";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.titles.register };
}

export default async function RegisterPage(props: PageProps<"/registracija">) {
  const sp = await props.searchParams;
  const provider = sp.teikejas === "1";
  if (await getActor()) redirect(provider ? "/paskyra/teikejas" : "/");
  const { t } = await getI18n();
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-1 text-2xl font-bold">{provider ? t.auth.registerProviderTitle : t.auth.registerTitle}</h1>
      <p className="mb-6 text-muted">{provider ? t.auth.registerProviderSubtitle : t.auth.loginSubtitle}</p>
      <AuthPageForm tab="register" next={null} provider={provider} />
    </div>
  );
}
