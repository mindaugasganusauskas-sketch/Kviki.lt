import { authed, readRequestPayload } from "@/server/api";
import { createRequest, listMyRequests } from "@/server/services/requests";
import { processPhotos } from "@/server/services/photos";

export const GET = authed(async (_req, actor) => ({ requests: await listMyRequests(actor) }));

export const POST = authed(async (req, actor) => {
  const { data, files } = await readRequestPayload(req);
  const photos = await processPhotos(files);
  return createRequest(actor, data, photos);
});
