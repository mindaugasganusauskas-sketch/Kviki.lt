import { authed } from "@/server/api";
import { listAgreements } from "@/server/services/agreements";

export const GET = authed(async (req, actor) => {
  const as = req.nextUrl.searchParams.get("as") === "provider" ? "provider" : "client";
  return { agreements: await listAgreements(actor, as) };
});
