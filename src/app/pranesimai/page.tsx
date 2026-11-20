import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { listNotifications } from "@/server/services/notifications";
import { requirePageActor } from "@/lib/require";
import { AutoRefresh } from "@/components/auto-refresh";
import { EmptyState, PageHeader } from "@/components/ui";
import { NotificationList } from "./notification-list";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getI18n()).t.titles.notifications };
}

export default async function NotificationsPage() {
  const actor = await requirePageActor("/pranesimai");
  const { locale, t } = await getI18n();
  const items = await listNotifications(actor, locale);
  return (
    <div className="mx-auto max-w-2xl">
      <AutoRefresh seconds={30} />
      <PageHeader title={t.titles.notifications} />
      {items.length === 0 ? (
        <EmptyState icon={<Bell className="size-6" />} title={t.notifications.emptyTitle}>
          {t.notifications.emptyText}
        </EmptyState>
      ) : (
        <NotificationList items={items} />
      )}
    </div>
  );
}
