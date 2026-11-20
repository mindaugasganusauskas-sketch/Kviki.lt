import Link from "next/link";
import { ChevronRight, CalendarClock, MapPin, User } from "lucide-react";
import type { AgreementListItem } from "@/shared/types";
import { formatDateTime, formatPriceLabel, frequencyLabel } from "@/shared/format";
import { AgreementStatusBadge } from "./status";
import { Badge } from "./ui";

export function AgreementListCard({ item }: { item: AgreementListItem }) {
  return (
    <Link
      href={`/susitarimai/${item.id}`}
      className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-4 transition hover:border-brand-300 hover:shadow-sm"
    >
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-bold">{item.headline}</span>
          <AgreementStatusBadge status={item.status} />
          {item.pendingConfirmation && <Badge tone="amber">Laukia patvirtinimo</Badge>}
        </span>
        <span className="mt-1 flex flex-col gap-0.5 text-sm text-stone-700 sm:flex-row sm:flex-wrap sm:gap-x-4">
          <span className="inline-flex items-center gap-1.5">
            <User className="size-4 text-brand-600" aria-hidden /> {item.counterpartName}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4 text-brand-600" aria-hidden /> {item.locality}, {item.municipalityLabel}
          </span>
          {item.nextVisit && item.status === "active" && (
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <CalendarClock className="size-4 text-brand-600" aria-hidden />
              {item.frequency ? "Kitas vizitas: " : ""}
              {formatDateTime(item.nextVisit.scheduledAt)}
            </span>
          )}
        </span>
        <span className="mt-1 block text-sm text-muted">
          {formatPriceLabel(item.priceCents, item.perVisit)}
          {item.frequency ? ` · ${frequencyLabel(item.frequency).toLowerCase()}` : ""}
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-stone-400 group-hover:text-brand-600" aria-hidden />
    </Link>
  );
}
