import { authed } from "@/server/api";
import { listNotifications, unreadCount } from "@/server/services/notifications";

export const GET = authed(async (_req, actor) => ({
  notifications: await listNotifications(actor),
  unread: await unreadCount(actor),
}));
