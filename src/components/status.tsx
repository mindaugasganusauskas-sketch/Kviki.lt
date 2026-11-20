import type { AgreementStatus, OfferStatus, RequestStatus, VisitStatus } from "@/shared/types";
import { Badge } from "./ui";

export function RequestStatusBadge({ status, offerCount }: { status: RequestStatus; offerCount?: number }) {
  switch (status) {
    case "open":
      return offerCount && offerCount > 0 ? (
        <Badge tone="amber">
          {offerCount} {offerCount === 1 ? "pasiūlymas" : offerCount < 10 ? "pasiūlymai" : "pasiūlymų"}
        </Badge>
      ) : (
        <Badge tone="blue">Laukia pasiūlymų</Badge>
      );
    case "agreed":
      return <Badge tone="green">Sutarta</Badge>;
    case "on_hold":
      return <Badge tone="amber">Laukia jūsų sprendimo</Badge>;
    case "cancelled":
      return <Badge>Atšaukta</Badge>;
    case "completed":
      return <Badge tone="green">Užbaigta</Badge>;
    case "expired":
      return <Badge>Nebegalioja</Badge>;
  }
}

export function AgreementStatusBadge({ status }: { status: AgreementStatus }) {
  switch (status) {
    case "active":
      return <Badge tone="green">Sutarta</Badge>;
    case "completed":
      return <Badge tone="green">Užbaigta</Badge>;
    case "cancelled":
      return <Badge tone="red">Atšaukta</Badge>;
    case "ended":
      return <Badge>Serija nutraukta</Badge>;
  }
}

export function VisitStatusBadge({ status }: { status: VisitStatus }) {
  switch (status) {
    case "scheduled":
      return <Badge tone="blue">Suplanuota</Badge>;
    case "done":
      return <Badge tone="amber">Laukia kliento patvirtinimo</Badge>;
    case "confirmed":
      return <Badge tone="green">Atlikta</Badge>;
    case "problem":
      return <Badge tone="red">Pažymėta problema</Badge>;
    case "cancelled":
      return <Badge>Atšaukta</Badge>;
  }
}

export function OfferStatusBadge({ status, needsReconfirmation }: { status: OfferStatus; needsReconfirmation?: boolean }) {
  if (status === "active" && needsReconfirmation) return <Badge tone="amber">Reikia patvirtinti iš naujo</Badge>;
  switch (status) {
    case "active":
      return <Badge tone="blue">Laukia kliento sprendimo</Badge>;
    case "accepted":
      return <Badge tone="green">Priimtas</Badge>;
    case "withdrawn":
      return <Badge>Atsiimtas</Badge>;
    case "closed":
      return <Badge>Užklausa baigėsi</Badge>;
  }
}
