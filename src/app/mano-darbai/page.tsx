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
import { getI18n } from "@/i18n/server";
import { requestHeadline } from "@/shared/categories";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.titles.myJobs };
}

export default async function MyJobsPage() {
  const actor = await requirePageActor("/mano-darbai");
  const { locale, t } = await getI18n();
  if (!actor.isProvider) {
    return (
      <div>
        <PageHeader title={t.titles.myJobs} />
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
      <PageHeader title={t.titles.myJobs} />
      {empty ? (
        <EmptyState
          icon={<ListChecks className="size-6" />}
          title={t.provider.myJobsEmptyTitle}
          action={<ButtonLink href="/darbai-salia">{t.provider.seeNearby}</ButtonLink>}
        >
          {t.provider.myJobsEmptyText}
        </EmptyState>
      ) : (
        <>
          <SectionTitle>{t.provider.agreedJobs}</SectionTitle>
          {active.length ? (
            <div className="grid gap-3">
              {active.map((a) => (
                <AgreementListCard key={a.id} item={a} />
              ))}
            </div>
          ) : (
            <p className="text-muted">{t.provider.noActive}</p>
          )}

          {waiting.length > 0 && (
            <>
              <SectionTitle>{t.provider.awaitingDecision}</SectionTitle>
              <ul className="grid gap-2">
                {waiting.map((o) => (
                  <li key={o.offer.id}>
                    <Link
                      href={`/darbai-salia/${o.requestId}`}
                      className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 hover:border-brand-300"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2 font-bold">
                          {requestHeadline(o.category, o.details, locale)}
                          <OfferStatusBadge status={o.offer.status} needsReconfirmation={o.offer.needsReconfirmation} />
                        </span>
                        <span className="mt-0.5 block text-sm text-muted">
                          {o.locality}, {o.municipalityLabel} · {formatPriceLabel(o.offer.priceCents, o.offer.perVisit, locale)} ·{" "}
                          {formatDateTime(o.offer.startAt, locale)}
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
              <SectionTitle>{t.provider.history}</SectionTitle>
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
                      <span className="font-semibold">{requestHeadline(o.category, o.details, locale)}</span>
                      <span className="text-muted"> · {o.locality} · {formatPriceLabel(o.offer.priceCents, o.offer.perVisit, locale)}</span>
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
