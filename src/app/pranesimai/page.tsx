import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { listNotifications } from "@/server/services/notifications";
import { requirePageActor } from "@/lib/require";
import { AutoRefresh } from "@/components/auto-refresh";
import { EmptyState, PageHeader } from "@/components/ui";
import { NotificationList } from "./notification-list";

export const metadata: Metadata = { title: "Pranešimai" };

export default async function NotificationsPage() {
  const actor = await requirePageActor("/pranesimai");
  const items = await listNotifications(actor);
  return (
    <div className="mx-auto max-w-2xl">
      <AutoRefresh seconds={30} />
      <PageHeader title="Pranešimai" />
      {items.length === 0 ? (
        <EmptyState icon={<Bell className="size-6" />} title="Pranešimų dar nėra">
          Čia matysite naujus pasiūlymus, patvirtintus užsakymus ir kitus svarbius pokyčius.
        </EmptyState>
      ) : (
        <NotificationList items={items} />
      )}
    </div>
  );
}
