import type { Metadata } from "next";
import { BadgeCheck, Building2, User } from "lucide-react";
import { getProviderProfile } from "@/server/services/accounts";
import { requirePageActor } from "@/lib/require";
import { categoryLabel } from "@/shared/categories";
import { businessFormLabel } from "@/shared/format";
import { municipalityLabel } from "@/shared/municipalities";
import { ModeSwitch } from "@/components/nav";
import { ButtonLink, Card, DefinitionRow, PageHeader } from "@/components/ui";
import Link from "next/link";
import { AccountForm, ChangePassword, DeleteAccount, LogoutButton } from "./account-form";

export const metadata: Metadata = { title: "Paskyra" };

export default async function AccountPage() {
  const actor = await requirePageActor("/paskyra");
  const profile = await getProviderProfile(actor.id);
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Paskyra" subtitle={actor.email} />
      <Card>
        <h2 className="mb-4 text-lg font-bold">Jūsų duomenys</h2>
        <AccountForm name={actor.name} phone={actor.phone ?? ""} />
      </Card>

      {!actor.isDemo && (
        <Card>
          <h2 className="mb-4 text-lg font-bold">Slaptažodis</h2>
          <ChangePassword />
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Teikėjo profilis</h2>
            <p className="mt-1 text-sm text-muted">Viena paskyra gali ir užsakyti darbus, ir juos atlikti. Perjungus režimą ankstesni užsakymai nesikeičia.</p>
          </div>
          {profile && <ModeSwitch mode={actor.mode} />}
        </div>
        {profile ? (
          <>
            <dl className="mt-3 divide-y divide-line">
              <DefinitionRow label="Pavadinimas">
                <span className="inline-flex items-center gap-1.5">
                  {profile.businessForm === "company" ? <Building2 className="size-4" aria-hidden /> : <User className="size-4" aria-hidden />}
                  {profile.displayName}
                  {profile.verified && <BadgeCheck className="size-4 text-brand-600" aria-label="Patikrinta" />}
                </span>
              </DefinitionRow>
              <DefinitionRow label="Veiklos forma">{businessFormLabel(profile.businessForm)}</DefinitionRow>
              <DefinitionRow label="Paslaugos">{profile.categories.map(categoryLabel).join(", ")}</DefinitionRow>
              <DefinitionRow label="Savivaldybės">{profile.municipalities.map(municipalityLabel).join(", ")}</DefinitionRow>
            </dl>
            <ButtonLink href="/paskyra/teikejas" variant="outline" className="mt-3">
              Redaguoti teikėjo profilį
            </ButtonLink>
          </>
        ) : (
          <ButtonLink href="/paskyra/teikejas" variant="secondary" className="mt-4">
            Tapti teikėju
          </ButtonLink>
        )}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex gap-4 text-sm">
          <Link href="/taisykles" className="font-semibold text-brand-700 hover:underline">
            Taisyklės
          </Link>
          <Link href="/privatumas" className="font-semibold text-brand-700 hover:underline">
            Privatumo politika
          </Link>
        </p>
        <LogoutButton />
      </div>

      {!actor.isDemo && (
        <Card className="border-red-200">
          <h2 className="text-lg font-bold">Paskyros ištrynimas</h2>
          <p className="mb-4 mt-1 text-sm text-muted">
            Galite ištrinti paskyrą ir asmens duomenis. Jei turite aktyvių užsakymų, pirmiausia juos užbaikite arba atšaukite.
          </p>
          <DeleteAccount />
        </Card>
      )}
    </div>
  );
}
