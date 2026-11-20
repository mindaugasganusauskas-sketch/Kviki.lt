import type { Metadata } from "next";
import { getProviderProfile } from "@/server/services/accounts";
import { requirePageActor } from "@/lib/require";
import { PageHeader } from "@/components/ui";
import { ProviderProfileForm } from "./provider-profile-form";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.titles.providerProfile };
}

export default async function ProviderProfilePage() {
  const actor = await requirePageActor("/paskyra/teikejas");
  const profile = await getProviderProfile(actor.id);
  const { t } = await getI18n();
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        back={{ href: "/paskyra", label: t.providerForm.backToAccount }}
        title={profile ? t.providerForm.titleEdit : t.providerForm.titleNew}
        subtitle={t.providerForm.subtitle}
      />
      <ProviderProfileForm profile={profile} defaultName={actor.name} defaultPhone={actor.phone ?? ""} />
    </div>
  );
}
