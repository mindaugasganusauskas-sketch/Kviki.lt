import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Hourglass, Pencil } from "lucide-react";
import { getRequestView } from "@/server/services/requests";
import { markReadByLink } from "@/server/services/notifications";
import { AppError } from "@/server/errors";
import { requirePageActor } from "@/lib/require";
import { ActionButton } from "@/components/action-button";
import { AutoRefresh } from "@/components/auto-refresh";
import { OffersCompare } from "@/components/offers-compare";
import { PrivateLocation, RequestSummary } from "@/components/request-summary";
import { RequestStatusBadge } from "@/components/status";
import { Alert, ButtonLink, EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import type { RequestView } from "@/shared/types";

export const metadata: Metadata = { title: "Užklausa" };

export default async function RequestPage(props: PageProps<"/uzklausos/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const actor = await requirePageActor(`/uzklausos/${id}`);
  let view: RequestView;
  try {
    view = await getRequestView(actor, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
  if (view.viewer === "provider") redirect(`/darbai-salia/${id}`);
  await markReadByLink(actor, `/uzklausos/${id}`);

  const activeOffers = view.offers.filter((o) => o.status === "active");
  const providerCancelled = view.lastAgreement?.cancelledBy === "provider";

  return (
    <div className="space-y-6">
      {view.status === "open" && <AutoRefresh seconds={15} />}
      <PageHeader
        back={{ href: "/mano-uzklausos", label: "Mano užklausos" }}
        title={view.headline}
        subtitle={<RequestStatusBadge status={view.status} offerCount={activeOffers.length} />}
      />

      {sp.paskelbta === "1" && view.status === "open" && (
        <Alert tone="success" title="Užklausa paskelbta">
          Teikėjai jūsų savivaldybėje ją jau mato. Galite užverti puslapį – apie naujus pasiūlymus pranešime pranešimų skiltyje ir el. paštu.
        </Alert>
      )}
      {sp.atnaujinta === "1" && (
        <Alert tone="success" title="Pakeitimai išsaugoti">
          {activeOffers.length > 0 ? "Teikėjai gavo pranešimą ir turės patvirtinti savo kainas iš naujo." : "Teikėjai matys atnaujintą užklausą."}
        </Alert>
      )}

      {view.status === "open" && (
        <section>
          <SectionTitle>Pasiūlymai</SectionTitle>
          {activeOffers.length === 0 ? (
            <EmptyState
              icon={<Hourglass className="size-6" />}
              title="Kol kas pasiūlymų nėra"
              action={
                <>
                  <ButtonLink href={`/uzklausos/${id}/redaguoti`} variant="outline">
                    <Pencil className="size-4" aria-hidden /> Keisti laiką ar apimtį
                  </ButtonLink>
                </>
              }
            >
              Kai teikėjas pasiūlys kainą ir laiką, jis atsiras čia. Puslapis atsinaujina pats.
            </EmptyState>
          ) : (
            <OffersCompare requestId={id} offers={activeOffers} />
          )}
        </section>
      )}

      {view.status === "agreed" && view.activeAgreementId && (
        <Alert
          tone="success"
          title="Dėl darbo sutarta"
          action={<ButtonLink href={`/susitarimai/${view.activeAgreementId}`}>Atidaryti užsakymo kortelę</ButtonLink>}
        >
          Pasirinktas teikėjas mato jūsų adresą ir kontaktą.
        </Alert>
      )}

      {view.status === "completed" && view.activeAgreementId && (
        <Alert tone="success" title="Darbas užbaigtas" action={<ButtonLink href={`/susitarimai/${view.activeAgreementId}`} variant="outline">Užsakymo kortelė</ButtonLink>} />
      )}

      {view.status === "on_hold" && (
        <Alert
          tone="warning"
          title={providerCancelled ? "Teikėjas atšaukė užsakymą" : "Užsakymas atšauktas"}
          action={
            <>
              <ActionButton endpoint={`/api/v1/requests/${id}/reopen`} label="Ieškoti kito teikėjo" />
              <ActionButton endpoint={`/api/v1/requests/${id}/cancel`} label="Atšaukti užklausą" variant="outline" confirm="Užklausa bus uždaryta. Tęsti?" />
              {view.lastAgreement && (
                <Link href={`/susitarimai/${view.lastAgreement.id}`} className="self-center text-sm font-semibold underline">
                  Ankstesnis užsakymas
                </Link>
              )}
            </>
          }
        >
          Naują teikėją pasirenkate jūs. Ankstesni kitų teikėjų pasiūlymai vėl atsiras, kai jie patvirtins savo kainą.
        </Alert>
      )}

      {view.status === "cancelled" && <Alert tone="info" title="Užklausa atšaukta">Teikėjai jos nebemato.</Alert>}

      <section>
        <SectionTitle
          action={
            view.status === "open" && (
              <Link href={`/uzklausos/${id}/redaguoti`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
                <Pencil className="size-4" aria-hidden /> Redaguoti
              </Link>
            )
          }
        >
          Jūsų užklausa
        </SectionTitle>
        <RequestSummary request={view}>
          <PrivateLocation data={view.private} note="Matote jūs ir pasirinktas teikėjas" />
        </RequestSummary>
      </section>

      {view.status === "open" && (
        <div className="flex justify-end">
          <ActionButton
            endpoint={`/api/v1/requests/${id}/cancel`}
            label="Atšaukti užklausą"
            variant="danger"
            confirm="Teikėjai nebematys šios užklausos, o jų pasiūlymai bus uždaryti."
          />
        </div>
      )}
    </div>
  );
}
