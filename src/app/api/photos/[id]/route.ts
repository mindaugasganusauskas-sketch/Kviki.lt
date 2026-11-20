import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { errorResponse } from "@/server/api";
import { getActor } from "@/server/auth/session";
import { db } from "@/server/db";
import { jobPhotos } from "@/server/db/schema";
import { isUuid, readPhotoFile } from "@/server/services/photos";
import { canViewRequest } from "@/server/services/requests";

/** Nuotrauką gauna tik tas, kas gali matyti pačią užklausą. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const actor = await getActor();
    if (!actor || !isUuid(id)) return new NextResponse("Nerasta", { status: 404 });
    const [photo] = await db.select().from(jobPhotos).where(eq(jobPhotos.id, id));
    if (!photo || !(await canViewRequest(actor, photo.requestId))) return new NextResponse("Nerasta", { status: 404 });
    const file = await readPhotoFile(photo.requestId, photo.fileName);
    if (!file) return new NextResponse("Nerasta", { status: 404 });
    return new NextResponse(new Uint8Array(file), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=3600" },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
