"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { formatRelativePast } from "@/shared/format";
import type { NotificationDTO } from "@/shared/types";
import { Button, cx } from "@/components/ui";
import { useI18n } from "@/i18n/client";

export function NotificationList({ items }: { items: NotificationDTO[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const unread = items.filter((n) => !n.read).length;

  async function open(n: NotificationDTO) {
    if (!n.read) {
      try {
        await api(`/api/v1/notifications/${n.id}/read`, { json: {} });
      } catch {
        /* nesvarbu – pereiname vis tiek */
      }
    }
    router.push(n.link);
  }

  return (
    <div>
      {unread > 0 && (
        <div className="mb-3 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await api("/api/v1/notifications/read-all", { json: {} });
                router.refresh();
              } finally {
                setBusy(false);
              }
            }}
          >
            {t.notifications.markAll}
          </Button>
        </div>
      )}
      <ul className="overflow-hidden rounded-2xl border border-line bg-white">
        {items.map((n) => (
          <li key={n.id} className="border-b border-line last:border-0">
            <button
              type="button"
              onClick={() => open(n)}
              className={cx("flex w-full gap-3 px-4 py-3.5 text-left hover:bg-paper", !n.read && "bg-brand-50/50")}
            >
              <span className={cx("mt-1.5 size-2.5 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-berry-500")} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className={cx("block", n.read ? "font-medium" : "font-bold")}>{n.title}</span>
                {n.body && <span className="mt-0.5 block text-sm text-muted">{n.body}</span>}
                <span className="mt-1 block text-xs text-muted">{formatRelativePast(n.createdAt, locale)}</span>
              </span>
              {!n.read && <span className="sr-only">{t.notifications.unread}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
