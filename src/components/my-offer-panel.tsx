"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { formatDateTime, formatPrice } from "@/shared/format";
import type { OfferDTO } from "@/shared/types";
import { OfferForm } from "./offer-form";
import { OfferStatusBadge } from "./status";
import { Alert, Button, Card } from "./ui";
import { useI18n } from "@/i18n/client";

/** Teikėjo pasiūlymas užklausos puslapyje: pateikti, keisti, atsiimti ar patvirtinti po kliento pakeitimų. */
export function MyOfferPanel({
  requestId,
  perVisit,
  offer,
  open,
  suggestedStartDate,
}: {
  requestId: string;
  perVisit: boolean;
  offer: OfferDTO | null;
  open: boolean;
  suggestedStartDate?: string | null;
}) {
  const { t, locale } = useI18n();
  const f = t.offerForm;
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState<"withdraw" | "confirm" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const showForm = open && (!offer || offer.status === "withdrawn" || editing);

  async function withdraw() {
    if (!offer) return;
    setPending("withdraw");
    setError(null);
    try {
      await api(`/api/v1/offers/${offer.id}/withdraw`, { json: {} });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(null);
    }
  }

  async function reconfirm() {
    if (!offer) return;
    setPending("confirm");
    setError(null);
    try {
      await api(`/api/v1/requests/${requestId}/offers`, {
        json: { priceCents: offer.priceCents, startAt: offer.startAt, included: offer.included },
      });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setEditing(true);
    } finally {
      setPending(null);
    }
  }

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{offer && offer.status !== "withdrawn" ? f.yourOffer : f.makeOffer}</h2>
        {offer && <OfferStatusBadge status={offer.status} needsReconfirmation={offer.needsReconfirmation} />}
      </div>

      {offer && offer.status === "active" && offer.needsReconfirmation && !editing && (
        <Alert tone="warning" className="mb-4" title={f.changedTitle}>
          {f.changedText}
        </Alert>
      )}

      {offer && offer.status !== "withdrawn" && !editing && (
        <dl className="grid grid-cols-2 gap-3 rounded-xl bg-paper p-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted">{perVisit ? f.pricePerVisitShort : f.price}</dt>
            <dd className="text-2xl font-extrabold">{formatPrice(offer.priceCents, locale)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{perVisit ? f.firstVisit : t.offers.start}</dt>
            <dd className="font-bold">{formatDateTime(offer.startAt, locale)}</dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="text-xs text-muted">{f.included}</dt>
            <dd className="font-medium">{offer.included}</dd>
          </div>
        </dl>
      )}

      {offer && offer.status === "withdrawn" && !editing && (
        <p className="mb-4 text-sm text-muted">{f.withdrawnText}</p>
      )}

      {error && <Alert tone="error" className="mt-3">{error}</Alert>}

      {open && offer && offer.status === "active" && !editing && (
        <div className="mt-4 flex flex-wrap gap-2">
          {offer.needsReconfirmation && (
            <Button onClick={reconfirm} loading={pending === "confirm"}>
              {f.reconfirm}
            </Button>
          )}
          <Button variant="outline" onClick={() => setEditing(true)}>
            {t.common.change}
          </Button>
          <Button variant="danger" onClick={withdraw} loading={pending === "withdraw"}>
            {f.withdraw}
          </Button>
        </div>
      )}

      {showForm && (
        <OfferForm
          requestId={requestId}
          perVisit={perVisit}
          existing={offer}
          suggestedStartDate={suggestedStartDate}
          onDone={editing ? () => setEditing(false) : undefined}
        />
      )}
    </Card>
  );
}
