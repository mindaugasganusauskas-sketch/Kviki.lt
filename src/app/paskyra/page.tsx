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
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.titles.account };
}

export default async function AccountPage() {
  const actor = await requirePageActor("/paskyra");
  const profile = await getProviderProfile(actor.id);
  const { locale, t } = await getI18n();
  const c = t.account;
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title={t.titles.account} subtitle={actor.email} />
      <Card>
        <h2 className="mb-4 text-lg font-bold">{c.yourData}</h2>
        <AccountForm name={actor.name} phone={actor.phone ?? ""} />
      </Card>

      {!actor.isDemo && (
        <Card>
          <h2 className="mb-4 text-lg font-bold">{c.password}</h2>
          <ChangePassword />
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">{c.providerProfile}</h2>
            <p className="mt-1 text-sm text-muted">{c.providerProfileText}</p>
          </div>
          {profile && <ModeSwitch mode={actor.mode} />}
        </div>
        {profile ? (
          <>
            <dl className="mt-3 divide-y divide-line">
              <DefinitionRow label={c.displayName}>
                <span className="inline-flex items-center gap-1.5">
                  {profile.businessForm === "company" ? <Building2 className="size-4" aria-hidden /> : <User className="size-4" aria-hidden />}
                  {profile.displayName}
                  {profile.verified && <BadgeCheck className="size-4 text-brand-600" aria-label={c.verified} />}
                </span>
              </DefinitionRow>
              <DefinitionRow label={c.businessForm}>{businessFormLabel(profile.businessForm, locale)}</DefinitionRow>
              <DefinitionRow label={c.services}>{profile.categories.map((x) => categoryLabel(x, locale)).join(", ")}</DefinitionRow>
              <DefinitionRow label={c.municipalities}>{profile.municipalities.map(municipalityLabel).join(", ")}</DefinitionRow>
            </dl>
            <ButtonLink href="/paskyra/teikejas" variant="outline" className="mt-3">
              {c.editProvider}
            </ButtonLink>
          </>
        ) : (
          <ButtonLink href="/paskyra/teikejas" variant="secondary" className="mt-4">
            {c.become}
          </ButtonLink>
        )}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex gap-4 text-sm">
          <Link href="/taisykles" className="font-semibold text-brand-700 hover:underline">
            {t.common.terms}
          </Link>
          <Link href="/privatumas" className="font-semibold text-brand-700 hover:underline">
            {t.common.privacyPolicy}
          </Link>
        </p>
        <LogoutButton />
      </div>

      {!actor.isDemo && (
        <Card className="border-red-200">
          <h2 className="text-lg font-bold">{c.deleteTitle}</h2>
          <p className="mb-4 mt-1 text-sm text-muted">
            {c.deleteText}
          </p>
          <DeleteAccount />
        </Card>
      )}
    </div>
  );
}
