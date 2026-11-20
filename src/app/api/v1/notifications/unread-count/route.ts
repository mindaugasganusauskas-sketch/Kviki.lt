import { authed } from "@/server/api";
import { unreadCount } from "@/server/services/notifications";

export const GET = authed(async (_req, actor) => ({ unread: await unreadCount(actor) }));
