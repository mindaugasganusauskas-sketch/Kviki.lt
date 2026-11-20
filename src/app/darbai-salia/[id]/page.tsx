import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getRequestView } from "@/server/services/requests";
import { markReadByLink } from "@/server/services/notifications";
import { AppError } from "@/server/errors";
import { requirePageActor } from "@/lib/require";
import { AutoRefresh } from "@/components/auto-refresh";
import { MyOfferPanel } from "@/components/my-offer-panel";
import { PrivateLocation, RequestSummary } from "@/components/request-summary";
import { ProviderGate } from "@/components/provider-gate";
import { Alert, ButtonLink, PageHeader } from "@/components/ui";
import type { RequestView } from "@/shared/types";
import { frequencyLabel } from "@/shared/format";
import { requestHeadline } from "@/shared/categories";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.titles.job };
}

export default async function ProviderRequestPage(props: PageProps<"/darbai-salia/[id]">) {
  const { id } = await props.params;
  const actor = await requirePageActor(`/darbai-salia/${id}`);
  let view: RequestView;
  try {
    view = await getRequestView(actor, id);
  } catch (err) {
    if (err instanceof AppError && err.code === "NOT_FOUND") notFound();
    throw err;
  }
  if (view.viewer === "owner") redirect(`/uzklausos/${id}`);
  if (!actor.isProvider) return <ProviderGate />;
  await markReadByLink(actor, `/darbai-salia/${id}`);
  const { locale, t } = await getI18n();
  const p = t.provider;

  const open = view.status === "open";
  const offer = view.myOffer;
  const myCancelled = !view.myAgreementId && view.myLastAgreement ? view.myLastAgreement : null;
  const lost = !open && !view.myAgreementId && !myCancelled;

  return (
    <div className="space-y-5">
      {open && <AutoRefresh seconds={30} />}
      <PageHeader back={{ href: "/darbai-salia", label: t.titles.nearby }} title={requestHeadline(view.category, view.details, locale)} />

      {view.myAgreementId && (
        <Alert
          tone="success"
          title={p.chosenTitle}
          action={<ButtonLink href={`/susitarimai/${view.myAgreementId}`}>{t.request.openAgreement}</ButtonLink>}
        >
          {p.chosenText}
        </Alert>
      )}
      {myCancelled && (
        <Alert
          tone="warning"
          title={myCancelled.status === "ended" ? p.seriesEndedTitle : p.agreementCancelledTitle}
          action={<ButtonLink href={`/susitarimai/${myCancelled.id}`} variant="outline">{t.request.agreementCard}</ButtonLink>}
        >
          {myCancelled.cancelledBy === "client" ? p.cancelledByClient : p.cancelledByYou} {p.clientChooses}
        </Alert>
      )}
      {lost && (
        <Alert tone="info" title={p.endedTitle}>
          {view.status === "cancelled"
            ? p.endedCancelled
            : view.status === "expired"
              ? p.endedExpired
              : p.endedOther}
        </Alert>
      )}

      <RequestSummary request={view}>
        {view.private ? (
          <PrivateLocation data={view.private} note={t.request.privateProvider} />
        ) : (
          <p className="mt-4 rounded-xl bg-paper p-3 text-sm text-muted">
            {t.request.privateHidden}
          </p>
        )}
      </RequestSummary>

      {view.recurrence.frequency && open && (
        <Alert tone="info" title={p.periodicTitle(frequencyLabel(view.recurrence.frequency, locale).toLowerCase())}>
          {p.periodicText}
        </Alert>
      )}

      {!myCancelled && (open || (offer && !view.myAgreementId)) && (
        <MyOfferPanel
          requestId={view.id}
          perVisit={view.recurrence.frequency !== null}
          offer={offer}
          open={open}
          suggestedStartDate={view.recurrence.startDate}
        />
      )}
    </div>
  );
}
