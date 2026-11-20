import type { Metadata } from "next";
import { getProviderProfile } from "@/server/services/accounts";
import { requirePageActor } from "@/lib/require";
import { PageHeader } from "@/components/ui";
import { ProviderProfileForm } from "./provider-profile-form";

export const metadata: Metadata = { title: "Teikėjo profilis" };

export default async function ProviderProfilePage() {
  const actor = await requirePageActor("/paskyra/teikejas");
  const profile = await getProviderProfile(actor.id);
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        back={{ href: "/paskyra", label: "Paskyra" }}
        title={profile ? "Teikėjo profilis" : "Tapkite teikėju"}
        subtitle="Klientai matys jūsų vardą ar įmonės pavadinimą ir veiklos formą. Darbus rodysime pagal pasirinktas paslaugas ir savivaldybes."
      />
      <ProviderProfileForm profile={profile} defaultName={actor.name} defaultPhone={actor.phone ?? ""} />
    </div>
  );
}
