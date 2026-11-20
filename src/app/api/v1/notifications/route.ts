import { authed } from "@/server/api";
import { listNotifications, unreadCount } from "@/server/services/notifications";
import { getLocale } from "@/i18n/server";

export const GET = authed(async (_req, actor) => ({
  notifications: await listNotifications(actor, await getLocale()),
  unread: await unreadCount(actor),
}));
