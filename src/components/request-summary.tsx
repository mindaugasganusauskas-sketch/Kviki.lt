import { Clock, Lock, MapPin, Navigation, Phone, Repeat } from "lucide-react";
import type { RequestPrivateDTO, RequestPublicDTO } from "@/shared/types";
import { describeDetails, requestHeadline } from "@/shared/categories";
import { formatDateKey, formatTiming, frequencyLabel, midSentence } from "@/shared/format";
import { getI18n } from "@/i18n/server";
import { CategoryBadge } from "./category-icon";
import { Card, DemoBadge } from "./ui";

export function mapsLink(p: RequestPrivateDTO): string {
  const q = p.lat !== null && p.lng !== null ? `${p.lat},${p.lng}` : p.address;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export async function WhenLine({ request }: { request: Pick<RequestPublicDTO, "timing" | "recurrence"> }) {
  const { locale, t } = await getI18n();
  const r = request.recurrence;
  if (r.frequency) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Repeat className="size-4 text-brand-600" aria-hidden />
        {frequencyLabel(r.frequency, locale)}
        {r.startDate && `, ${t.request.from(midSentence(formatDateKey(r.startDate, locale), locale))}`}
        {r.endDate ? ` ${t.request.until(midSentence(formatDateKey(r.endDate, locale), locale))}` : t.request.noEnd}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <Clock className="size-4 text-brand-600" aria-hidden />
      {formatTiming(request.timing, locale)}
    </span>
  );
}

export async function PhotoStrip({ photos }: { photos: RequestPublicDTO["photos"] }) {
  if (!photos.length) return null;
  const { t } = await getI18n();
  return (
    <ul className="mt-4 flex gap-2 overflow-x-auto pb-1">
      {photos.map((p, i) => (
        <li key={p.id} className="shrink-0">
          <a href={p.url} target="_blank" rel="noopener" className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              alt={t.request.photo(i + 1)}
              className="h-28 w-36 rounded-xl border border-line object-cover sm:h-36 sm:w-48"
              loading="lazy"
            />
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Užklausos aprašymas: ką mato teikėjai (ir klientas). */
export async function RequestSummary({ request, children }: { request: RequestPublicDTO; children?: React.ReactNode }) {
  const { locale } = await getI18n();
  const lines = describeDetails(request.category, request.details, locale);
  return (
    <Card>
      <div className="flex items-start gap-3">
        <CategoryBadge category={request.category} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold leading-snug">{requestHeadline(request.category, request.details, locale)}</h2>
            {request.isDemo && <DemoBadge />}
          </div>
          <div className="mt-1.5 flex flex-col gap-1 text-[15px] text-stone-700 sm:flex-row sm:flex-wrap sm:gap-x-4">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4 text-brand-600" aria-hidden />
              {request.locality}, {request.municipalityLabel}
            </span>
            <WhenLine request={request} />
          </div>
        </div>
      </div>
      {lines.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {lines.map((l) => (
            <li key={l} className="rounded-lg bg-paper px-2.5 py-1 text-sm text-stone-700">
              {l}
            </li>
          ))}
        </ul>
      )}
      {request.description && <p className="mt-4 whitespace-pre-line leading-relaxed">{request.description}</p>}
      <PhotoStrip photos={request.photos} />
      {children}
    </Card>
  );
}

/** Tikslus adresas ir kontaktas – tik klientui ir pasirinktam teikėjui. */
export async function PrivateLocation({ data, note }: { data: RequestPrivateDTO; note: string }) {
  const { t } = await getI18n();
  return (
    <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/60 p-3.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
        <Lock className="size-3.5" aria-hidden /> {note}
      </p>
      <p className="mt-1.5 font-semibold">{data.address}</p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <a href={`tel:${data.contactPhone}`} className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline">
          <Phone className="size-4" aria-hidden /> {data.contactPhone}
        </a>
        <a href={mapsLink(data)} target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline">
          <Navigation className="size-4" aria-hidden /> {t.request.openMap}
        </a>
      </div>
    </div>
  );
}
