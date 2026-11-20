import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, MapPin, Settings2, Sprout } from "lucide-react";
import { nearbyJobs } from "@/server/services/requests";
import { getProviderProfile } from "@/server/services/accounts";
import { requirePageActor } from "@/lib/require";
import { categoryLabel } from "@/shared/categories";
import { formatPriceLabel, formatRelativePast } from "@/shared/format";
import { municipalityLabel } from "@/shared/municipalities";
import { AutoRefresh } from "@/components/auto-refresh";
import { CategoryBadge } from "@/components/category-icon";
import { ProviderGate } from "@/components/provider-gate";
import { WhenLine } from "@/components/request-summary";
import { Badge, DemoBadge, EmptyState, PageHeader } from "@/components/ui";
import { getI18n } from "@/i18n/server";
import { describeDetails, requestHeadline } from "@/shared/categories";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.titles.nearby };
}

export default async function NearbyPage() {
  const actor = await requirePageActor("/darbai-salia");
  const { locale, t } = await getI18n();
  if (!actor.isProvider) {
    return (
      <div>
        <PageHeader title={t.titles.nearby} />
        <ProviderGate />
      </div>
    );
  }
  const [jobs, profile] = await Promise.all([nearbyJobs(actor), getProviderProfile(actor.id)]);
  const areas = profile?.municipalities.map(municipalityLabel) ?? [];
  const cats = profile?.categories.map((c) => categoryLabel(c, locale)) ?? [];

  return (
    <div>
      <AutoRefresh seconds={30} />
      <PageHeader
        title={t.titles.nearby}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2 text-sm">
            <span>
              {cats.join(", ")} · {areas.slice(0, 3).join(", ")}
              {areas.length > 3 ? t.provider.andMore(areas.length - 3) : ""}
            </span>
            <Link href="/paskyra/teikejas" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
              <Settings2 className="size-3.5" aria-hidden /> {t.common.change}
            </Link>
          </span>
        }
      />
      {jobs.length === 0 ? (
        <EmptyState icon={<Sprout className="size-6" />} title={t.provider.noJobsTitle}>
          {t.provider.noJobsText}
        </EmptyState>
      ) : (
        <ul className="grid gap-3" data-testid="nearby-list">
          {jobs.map((j) => (
            <li key={j.id}>
              <Link
                href={`/darbai-salia/${j.id}`}
                className="group flex gap-3 rounded-2xl border border-line bg-white p-4 transition hover:border-brand-300 hover:shadow-sm"
              >
                {j.photos[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={j.photos[0].url} alt="" className="size-20 shrink-0 rounded-xl object-cover sm:size-24" loading="lazy" />
                ) : (
                  <span className="flex size-20 shrink-0 items-center justify-center sm:size-24"><CategoryBadge category={j.category} size="lg" /></span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{requestHeadline(j.category, j.details, locale)}</span>
                    {j.recurrence.frequency && <Badge tone="blue">{t.status.periodic}</Badge>}
                    {j.isDemo && <DemoBadge />}
                  </span>
                  <span className="mt-1 flex flex-col gap-0.5 text-sm text-stone-700">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-4 text-brand-600" aria-hidden />
                      {j.locality}, {j.municipalityLabel}
                    </span>
                    <WhenLine request={j} />
                  </span>
                  <span className="mt-1.5 line-clamp-1 block text-sm text-muted">{describeDetails(j.category, j.details, locale).join(" · ")}</span>
                  <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                    {t.request.posted(formatRelativePast(j.createdAt, locale))}
                    {j.myOffer && j.myOffer.status === "active" && (
                      <Badge tone={j.myOffer.needsReconfirmation ? "amber" : "green"}>
                        {j.myOffer.needsReconfirmation
                          ? t.provider.reconfirmBadge
                          : t.provider.yourOfferBadge(formatPriceLabel(j.myOffer.priceCents, j.myOffer.perVisit, locale))}
                      </Badge>
                    )}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 self-center text-stone-400 group-hover:text-brand-600" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
