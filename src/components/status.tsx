"use client";

import { useI18n } from "@/i18n/client";
import type { AgreementStatus, OfferStatus, RequestStatus, VisitStatus } from "@/shared/types";
import { Badge } from "./ui";

export function RequestStatusBadge({ status, offerCount }: { status: RequestStatus; offerCount?: number }) {
  const { t } = useI18n();
  switch (status) {
    case "open":
      return offerCount && offerCount > 0 ? <Badge tone="amber">{t.status.offers(offerCount)}</Badge> : <Badge tone="blue">{t.status.waitingOffers}</Badge>;
    case "agreed":
      return <Badge tone="green">{t.status.agreed}</Badge>;
    case "on_hold":
      return <Badge tone="amber">{t.status.onHold}</Badge>;
    case "cancelled":
      return <Badge>{t.status.cancelled}</Badge>;
    case "completed":
      return <Badge tone="green">{t.status.completed}</Badge>;
    case "expired":
      return <Badge>{t.status.expired}</Badge>;
  }
}

export function AgreementStatusBadge({ status }: { status: AgreementStatus }) {
  const { t } = useI18n();
  switch (status) {
    case "active":
      return <Badge tone="green">{t.status.agreed}</Badge>;
    case "completed":
      return <Badge tone="green">{t.status.completed}</Badge>;
    case "cancelled":
      return <Badge tone="red">{t.status.cancelled}</Badge>;
    case "ended":
      return <Badge>{t.status.seriesEnded}</Badge>;
  }
}

export function VisitStatusBadge({ status }: { status: VisitStatus }) {
  const { t } = useI18n();
  switch (status) {
    case "scheduled":
      return <Badge tone="blue">{t.status.scheduled}</Badge>;
    case "done":
      return <Badge tone="amber">{t.status.awaitingClient}</Badge>;
    case "confirmed":
      return <Badge tone="green">{t.status.done}</Badge>;
    case "problem":
      return <Badge tone="red">{t.status.problem}</Badge>;
    case "cancelled":
      return <Badge>{t.status.cancelled}</Badge>;
  }
}

export function OfferStatusBadge({ status, needsReconfirmation }: { status: OfferStatus; needsReconfirmation?: boolean }) {
  const { t } = useI18n();
  if (status === "active" && needsReconfirmation) return <Badge tone="amber">{t.status.reconfirm}</Badge>;
  switch (status) {
    case "active":
      return <Badge tone="blue">{t.status.awaitingDecision}</Badge>;
    case "accepted":
      return <Badge tone="green">{t.status.accepted}</Badge>;
    case "withdrawn":
      return <Badge>{t.status.withdrawn}</Badge>;
    case "closed":
      return <Badge>{t.status.closed}</Badge>;
  }
}
