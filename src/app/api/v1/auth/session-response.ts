import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { actorFromToken, createSession, setSessionCookie } from "@/server/auth/session";
import { toUserDTO } from "@/server/services/accounts";
import type { Mode } from "@/shared/types";

/** Sukuria sesiją. Svetainei – „httpOnly“ slapukas, mobiliajai programėlei – raktas atsakyme. */
export async function authResponse(userId: string, mobile: boolean, mode?: Mode) {
  if (mode) await db.update(users).set({ activeMode: mode }).where(eq(users.id, userId));
  const { token, expiresAt } = await createSession(userId);
  const actor = await actorFromToken(token);
  if (!mobile) await setSessionCookie(token, expiresAt);
  return NextResponse.json({
    user: actor ? toUserDTO(actor) : null,
    ...(mobile ? { token, expiresAt: expiresAt.toISOString() } : {}),
  });
}
