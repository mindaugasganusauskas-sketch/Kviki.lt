import type { Metadata } from "next";
import { ClipboardList, Plus } from "lucide-react";
import { listMyRequests } from "@/server/services/requests";
import { requirePageActor } from "@/lib/require";
import { RequestListCard } from "@/components/request-list-card";
import { ButtonLink, EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import { AutoRefresh } from "@/components/auto-refresh";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.titles.myRequests };
}

export default async function MyRequestsPage() {
  const actor = await requirePageActor("/mano-uzklausos");
  const items = await listMyRequests(actor);
  const { t } = await getI18n();
  const active = items.filter((i) => i.status === "open" || i.status === "agreed" || i.status === "on_hold");
  const past = items.filter((i) => !active.includes(i));
  return (
    <div>
      <AutoRefresh seconds={30} />
      <PageHeader
        title={t.titles.myRequests}
        action={
          <ButtonLink href="/nauja-uzklausa" className="hidden sm:inline-flex">
            <Plus className="size-4" aria-hidden /> {t.nav.newRequest}
          </ButtonLink>
        }
      />
      {items.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-6" />}
          title={t.myRequests.emptyTitle}
          action={<ButtonLink href="/nauja-uzklausa">{t.myRequests.describe}</ButtonLink>}
        >
          {t.myRequests.emptyText}
        </EmptyState>
      ) : (
        <>
          {active.length > 0 && (
            <div className="grid gap-3">
              {active.map((r) => (
                <RequestListCard key={r.id} item={r} />
              ))}
            </div>
          )}
          {past.length > 0 && (
            <>
              <SectionTitle>{t.myRequests.previous}</SectionTitle>
              <div className="grid gap-3 opacity-90">
                {past.map((r) => (
                  <RequestListCard key={r.id} item={r} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
