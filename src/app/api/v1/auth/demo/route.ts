import { z } from "zod";
import { authResponse } from "../session-response";
import { readJson, route } from "@/server/api";
import { parseInput } from "@/server/errors";
import { demoUserId, resetDemo, demoEnabled } from "@/server/services/demo";
import { AppError } from "@/server/errors";

const schema = z.object({ as: z.enum(["client", "tomas", "company"]), reset: z.boolean().optional() });

export const POST = route(async (req) => {
  if (!demoEnabled()) throw new AppError("FORBIDDEN", "Demonstracija išjungta");
  const { as, reset } = parseInput(schema, await readJson(req));
  if (reset) await resetDemo();
  const userId = await demoUserId(as);
  return authResponse(userId, false);
});
