import { authed } from "@/server/api";
import { nearbyJobs } from "@/server/services/requests";

export const GET = authed(async (_req, actor) => ({ jobs: await nearbyJobs(actor) }));
