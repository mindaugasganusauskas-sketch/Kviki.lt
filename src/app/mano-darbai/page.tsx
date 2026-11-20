import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ListChecks } from "lucide-react";
import { listAgreements } from "@/server/services/agreements";
import { listMyOffers } from "@/server/services/offers";
import { requirePageActor } from "@/lib/require";
import { formatDateTime, formatPriceLabel } from "@/shared/format";
import { AgreementListCard } from "@/components/agreement-list-card";
import { AutoRefresh } from "@/components/auto-refresh";
import { ProviderGate } from "@/components/provider-gate";
import { OfferStatusBadge } from "@/components/status";
import { ButtonLink, EmptyState, PageHeader, SectionTitle } from "@/components/ui";

export const metadata: Metadata = { title: "Mano darbai" };

export default async function MyJobsPage() {
  const actor = await requirePageActor("/mano-darbai");
  if (!actor.isProvider) {
    return (
      <div>
        <PageHeader title="Mano darbai" />
        <ProviderGate />
      </div>
    );
  }
  const [agreements, offers] = await Promise.all([listAgreements(actor, "provider"), listMyOffers(actor)]);
  const active = agreements.filter((a) => a.status === "active");
  const pastAgreements = agreements.filter((a) => a.status !== "active");
  const waiting = offers.filter((o) => o.offer.status === "active" && o.requestStatus === "open");
  const closedOffers = offers.filter((o) => !waiting.includes(o));

  const empty = agreements.length === 0 && offers.length === 0;

  return (
    <div>
      <AutoRefresh seconds={30} />
      <PageHeader title="Mano darbai" />
      {empty ? (
        <EmptyState
          icon={<ListChecks className="size-6" />}
          title="Kol kas sutartų darbų nėra"
          action={<ButtonLink href="/darbai-salia">Žiūrėti darbus šalia</ButtonLink>}
        >
          Pateikite pasiūlymą – kai klientas jį pasirinks, darbas atsiras čia.
        </EmptyState>
      ) : (
        <>
          <SectionTitle>Sutarti darbai</SectionTitle>
          {active.length ? (
            <div className="grid gap-3">
              {active.map((a) => (
                <AgreementListCard key={a.id} item={a} />
              ))}
            </div>
          ) : (
            <p className="text-muted">Šiuo metu aktyvių užsakymų nėra.</p>
          )}

          {waiting.length > 0 && (
            <>
              <SectionTitle>Laukia kliento sprendimo</SectionTitle>
              <ul className="grid gap-2">
                {waiting.map((o) => (
                  <li key={o.offer.id}>
                    <Link
                      href={`/darbai-salia/${o.requestId}`}
                      className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 hover:border-brand-300"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2 font-bold">
                          {o.headline}
                          <OfferStatusBadge status={o.offer.status} needsReconfirmation={o.offer.needsReconfirmation} />
                        </span>
                        <span className="mt-0.5 block text-sm text-muted">
                          {o.locality}, {o.municipalityLabel} · {formatPriceLabel(o.offer.priceCents, o.offer.perVisit)} ·{" "}
                          {formatDateTime(o.offer.startAt)}
                        </span>
                      </span>
                      <ChevronRight className="size-5 text-stone-400" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}

          {(pastAgreements.length > 0 || closedOffers.length > 0) && (
            <>
              <SectionTitle>Istorija</SectionTitle>
              <div className="grid gap-2">
                {pastAgreements.map((a) => (
                  <AgreementListCard key={a.id} item={a} />
                ))}
                {closedOffers.map((o) => (
                  <Link
                    key={o.offer.id}
                    href={`/darbai-salia/${o.requestId}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white/60 p-3.5 text-sm hover:bg-white"
                  >
                    <span>
                      <span className="font-semibold">{o.headline}</span>
                      <span className="text-muted"> · {o.locality} · {formatPriceLabel(o.offer.priceCents, o.offer.perVisit)}</span>
                    </span>
                    <OfferStatusBadge status={o.offer.status} />
                  </Link>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
