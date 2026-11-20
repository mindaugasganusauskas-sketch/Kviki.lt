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
import { requestHeadline } from "@/shared/categories";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.titles.request };
}

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
  const { locale, t } = await getI18n();

  const activeOffers = view.offers.filter((o) => o.status === "active");
  const providerCancelled = view.lastAgreement?.cancelledBy === "provider";

  return (
    <div className="space-y-6">
      {view.status === "open" && <AutoRefresh seconds={15} />}
      <PageHeader
        back={{ href: "/mano-uzklausos", label: t.request.backToMine }}
        title={requestHeadline(view.category, view.details, locale)}
        subtitle={<RequestStatusBadge status={view.status} offerCount={activeOffers.length} />}
      />

      {sp.paskelbta === "1" && view.status === "open" && (
        <Alert tone="success" title={t.request.publishedTitle}>
          {t.request.publishedText}
        </Alert>
      )}
      {sp.atnaujinta === "1" && (
        <Alert tone="success" title={t.request.updatedTitle}>
          {activeOffers.length > 0 ? t.request.updatedWithOffers : t.request.updatedNoOffers}
        </Alert>
      )}

      {view.status === "open" && (
        <section>
          <SectionTitle>{t.request.offersTitle}</SectionTitle>
          {activeOffers.length === 0 ? (
            <EmptyState
              icon={<Hourglass className="size-6" />}
              title={t.request.noOffersTitle}
              action={
                <>
                  <ButtonLink href={`/uzklausos/${id}/redaguoti`} variant="outline">
                    <Pencil className="size-4" aria-hidden /> {t.request.editTimeScope}
                  </ButtonLink>
                </>
              }
            >
              {t.request.noOffersText}
            </EmptyState>
          ) : (
            <OffersCompare requestId={id} offers={activeOffers} />
          )}
        </section>
      )}

      {view.status === "agreed" && view.activeAgreementId && (
        <Alert
          tone="success"
          title={t.request.agreedTitle}
          action={<ButtonLink href={`/susitarimai/${view.activeAgreementId}`}>{t.request.openAgreement}</ButtonLink>}
        >
          {t.request.agreedText}
        </Alert>
      )}

      {view.status === "completed" && view.activeAgreementId && (
        <Alert tone="success" title={t.request.completedTitle} action={<ButtonLink href={`/susitarimai/${view.activeAgreementId}`} variant="outline">{t.request.agreementCard}</ButtonLink>} />
      )}

      {view.status === "on_hold" && (
        <Alert
          tone="warning"
          title={providerCancelled ? t.request.providerCancelledTitle : t.request.cancelledAgreementTitle}
          action={
            <>
              <ActionButton endpoint={`/api/v1/requests/${id}/reopen`} label={t.request.findAnother} />
              <ActionButton endpoint={`/api/v1/requests/${id}/cancel`} label={t.request.cancelRequest} variant="outline" confirm={t.request.cancelRequestConfirm} />
              {view.lastAgreement && (
                <Link href={`/susitarimai/${view.lastAgreement.id}`} className="self-center text-sm font-semibold underline">
                  {t.request.previousAgreement}
                </Link>
              )}
            </>
          }
        >
          {t.request.onHoldText}
        </Alert>
      )}

      {view.status === "cancelled" && <Alert tone="info" title={t.request.cancelledTitle}>{t.request.cancelledText}</Alert>}

      {view.status === "expired" && (
        <Alert
          tone="warning"
          title={t.request.expiredTitle}
          action={
            <>
              <ButtonLink href={`/uzklausos/${id}/redaguoti`}>{t.request.renew}</ButtonLink>
              <ActionButton endpoint={`/api/v1/requests/${id}/cancel`} label={t.request.close} variant="outline" />
            </>
          }
        >
          {t.request.expiredText}
        </Alert>
      )}

      <section>
        <SectionTitle
          action={
            view.status === "open" && (
              <Link href={`/uzklausos/${id}/redaguoti`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
                <Pencil className="size-4" aria-hidden /> {t.common.edit}
              </Link>
            )
          }
        >
          {t.request.yourRequest}
        </SectionTitle>
        <RequestSummary request={view}>
          <PrivateLocation data={view.private} note={t.request.privateOwner} />
        </RequestSummary>
      </section>

      {view.status === "open" && (
        <div className="flex justify-end">
          <ActionButton
            endpoint={`/api/v1/requests/${id}/cancel`}
            label={t.request.cancelRequest}
            variant="danger"
            confirm={t.request.cancelOpenConfirm}
          />
        </div>
      )}
    </div>
  );
}
