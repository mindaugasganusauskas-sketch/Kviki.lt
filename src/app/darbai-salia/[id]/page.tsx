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

export const metadata: Metadata = { title: "Darbas" };

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

  const open = view.status === "open";
  const offer = view.myOffer;
  const myCancelled = !view.myAgreementId && view.myLastAgreement ? view.myLastAgreement : null;
  const lost = !open && !view.myAgreementId && !myCancelled;

  return (
    <div className="space-y-5">
      {open && <AutoRefresh seconds={30} />}
      <PageHeader back={{ href: "/darbai-salia", label: "Darbai šalia" }} title={view.headline} />

      {view.myAgreementId && (
        <Alert
          tone="success"
          title="Klientas pasirinko jus"
          action={<ButtonLink href={`/susitarimai/${view.myAgreementId}`}>Atidaryti užsakymo kortelę</ButtonLink>}
        >
          Adresas ir kliento kontaktas – užsakymo kortelėje.
        </Alert>
      )}
      {myCancelled && (
        <Alert
          tone="warning"
          title={myCancelled.status === "ended" ? "Periodinio darbo serija nutraukta" : "Užsakymas atšauktas"}
          action={<ButtonLink href={`/susitarimai/${myCancelled.id}`} variant="outline">Užsakymo kortelė</ButtonLink>}
        >
          {myCancelled.cancelledBy === "client" ? "Atšaukė klientas." : "Atšaukėte jūs."} Naują teikėją pasirenka klientas.
        </Alert>
      )}
      {lost && (
        <Alert tone="info" title="Užklausa baigėsi">
          {view.status === "cancelled" ? "Klientas atšaukė užklausą." : "Klientas pasirinko kitą pasiūlymą. Ačiū, kad pasiūlėte."}
        </Alert>
      )}

      <RequestSummary request={view}>
        {view.private ? (
          <PrivateLocation data={view.private} note="Matote, nes klientas pasirinko jus" />
        ) : (
          <p className="mt-4 rounded-xl bg-paper p-3 text-sm text-muted">
            Tikslų adresą ir kliento kontaktą pamatysite, kai klientas pasirinks jūsų pasiūlymą.
          </p>
        )}
      </RequestSummary>

      {view.recurrence.frequency && open && (
        <Alert tone="info" title={`Periodinis darbas: ${frequencyLabel(view.recurrence.frequency).toLowerCase()}`}>
          Siūlykite kainą už vieną vizitą. Klientas matys ją kaip „€ už kartą“.
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
