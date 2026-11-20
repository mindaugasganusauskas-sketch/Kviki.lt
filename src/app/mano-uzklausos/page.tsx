import type { Metadata } from "next";
import { ClipboardList, Plus } from "lucide-react";
import { listMyRequests } from "@/server/services/requests";
import { requirePageActor } from "@/lib/require";
import { RequestListCard } from "@/components/request-list-card";
import { ButtonLink, EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import { AutoRefresh } from "@/components/auto-refresh";

export const metadata: Metadata = { title: "Mano užklausos" };

export default async function MyRequestsPage() {
  const actor = await requirePageActor("/mano-uzklausos");
  const items = await listMyRequests(actor);
  const active = items.filter((i) => i.status === "open" || i.status === "agreed" || i.status === "on_hold");
  const past = items.filter((i) => !active.includes(i));
  return (
    <div>
      <AutoRefresh seconds={30} />
      <PageHeader
        title="Mano užklausos"
        action={
          <ButtonLink href="/nauja-uzklausa" className="hidden sm:inline-flex">
            <Plus className="size-4" aria-hidden /> Nauja užklausa
          </ButtonLink>
        }
      />
      {items.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="size-6" />}
          title="Dar neturite užklausų"
          action={<ButtonLink href="/nauja-uzklausa">Aprašyti darbą</ButtonLink>}
        >
          Aprašykite, ko reikia, ir vietos teikėjai pasiūlys kainą bei laiką.
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
              <SectionTitle>Ankstesnės</SectionTitle>
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
