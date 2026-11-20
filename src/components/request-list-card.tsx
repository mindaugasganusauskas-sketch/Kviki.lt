import Link from "next/link";
import { ChevronRight, Clock, MapPin, Repeat } from "lucide-react";
import type { RequestListItem } from "@/shared/types";
import { formatDateKey, formatRelativePast, formatTiming, frequencyLabel } from "@/shared/format";
import { CategoryBadge } from "./category-icon";
import { RequestStatusBadge } from "./status";
import { DemoBadge } from "./ui";

export function RequestListCard({ item }: { item: RequestListItem }) {
  const href = item.activeAgreementId ? `/susitarimai/${item.activeAgreementId}` : `/uzklausos/${item.id}`;
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-4 transition hover:border-brand-300 hover:shadow-sm"
    >
      <CategoryBadge category={item.category} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-bold">{item.headline}</span>
          <RequestStatusBadge status={item.status} offerCount={item.offerCount} />
          {item.isDemo && <DemoBadge />}
        </span>
        <span className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden />
            {item.locality}, {item.municipalityLabel}
          </span>
          {item.recurrence.frequency ? (
            <span className="inline-flex items-center gap-1">
              <Repeat className="size-3.5" aria-hidden />
              {frequencyLabel(item.recurrence.frequency)}
              {item.recurrence.startDate && ` nuo ${formatDateKey(item.recurrence.startDate).toLowerCase()}`}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden />
              {formatTiming(item.timing)}
            </span>
          )}
          <span>Paskelbta {formatRelativePast(item.createdAt)}</span>
        </span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-stone-400 group-hover:text-brand-600" aria-hidden />
    </Link>
  );
}
