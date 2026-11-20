import { authed } from "@/server/api";
import { getAgreement } from "@/server/services/agreements";

export const GET = authed<{ id: string }>(async (_req, actor, { id }) => ({ agreement: await getAgreement(actor, id) }));
