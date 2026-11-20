import { authed, readRequestPayload } from "@/server/api";
import { getRequestView, updateRequest } from "@/server/services/requests";
import { processPhotos } from "@/server/services/photos";

type P = { id: string };

export const GET = authed<P>(async (_req, actor, { id }) => ({ request: await getRequestView(actor, id) }));

export const PATCH = authed<P>(async (req, actor, { id }) => {
  const { data, files } = await readRequestPayload(req);
  const photos = await processPhotos(files);
  const d = (data ?? {}) as { removePhotoIds?: unknown };
  const remove = Array.isArray(d.removePhotoIds) ? d.removePhotoIds.filter((x): x is string => typeof x === "string") : [];
  return updateRequest(actor, id, data, photos, remove);
});
