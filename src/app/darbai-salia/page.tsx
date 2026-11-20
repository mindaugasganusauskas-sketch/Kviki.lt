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

export const metadata: Metadata = { title: "Darbai šalia" };

export default async function NearbyPage() {
  const actor = await requirePageActor("/darbai-salia");
  if (!actor.isProvider) {
    return (
      <div>
        <PageHeader title="Darbai šalia" />
        <ProviderGate />
      </div>
    );
  }
  const [jobs, profile] = await Promise.all([nearbyJobs(actor), getProviderProfile(actor.id)]);
  const areas = profile?.municipalities.map(municipalityLabel) ?? [];
  const cats = profile?.categories.map(categoryLabel) ?? [];

  return (
    <div>
      <AutoRefresh seconds={30} />
      <PageHeader
        title="Darbai šalia"
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2 text-sm">
            <span>
              {cats.join(", ")} · {areas.slice(0, 3).join(", ")}
              {areas.length > 3 ? ` ir dar ${areas.length - 3}` : ""}
            </span>
            <Link href="/paskyra/teikejas" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">
              <Settings2 className="size-3.5" aria-hidden /> Keisti
            </Link>
          </span>
        }
      />
      {jobs.length === 0 ? (
        <EmptyState icon={<Sprout className="size-6" />} title="Šiuo metu tinkamų darbų nėra">
          Rodome atviras užklausas, kurių paslauga ir savivaldybė sutampa su jūsų profiliu. Kai klientas paskelbs tinkamą darbą, jis atsiras čia ir gausite pranešimą.
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
                    <span className="font-bold">{j.headline}</span>
                    {j.recurrence.frequency && <Badge tone="blue">Periodinis</Badge>}
                    {j.isDemo && <DemoBadge />}
                  </span>
                  <span className="mt-1 flex flex-col gap-0.5 text-sm text-stone-700">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-4 text-brand-600" aria-hidden />
                      {j.locality}, {j.municipalityLabel}
                    </span>
                    <WhenLine request={j} />
                  </span>
                  {j.detailLines.length > 0 && (
                    <span className="mt-1.5 line-clamp-1 block text-sm text-muted">{j.detailLines.join(" · ")}</span>
                  )}
                  <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                    Paskelbta {formatRelativePast(j.createdAt)}
                    {j.myOffer && j.myOffer.status === "active" && (
                      <Badge tone={j.myOffer.needsReconfirmation ? "amber" : "green"}>
                        {j.myOffer.needsReconfirmation
                          ? "Patvirtinkite kainą iš naujo"
                          : `Jūsų pasiūlymas: ${formatPriceLabel(j.myOffer.priceCents, j.myOffer.perVisit)}`}
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
