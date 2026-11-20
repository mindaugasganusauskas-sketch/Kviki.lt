import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt, ne } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { db } from "@/server/db";
import { providerProfiles, sessions, users } from "@/server/db/schema";
import { AppError } from "@/server/errors";
import type { Mode } from "@/shared/types";

export const SESSION_COOKIE = "kviki_session";
const SESSION_DAYS = 60;

export interface Actor {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  isDemo: boolean;
  mode: Mode;
  isProvider: boolean;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  await db.insert(sessions).values({ tokenHash: hashToken(token), userId, expiresAt });
  // Kartais išvalome pasibaigusias sesijas.
  if (Math.random() < 0.05) await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  return { token, expiresAt };
}

/** Atjungia visus naudotojo įrenginius, išskyrus dabartinį. */
export async function deleteOtherSessions(userId: string, keepToken: string | null): Promise<void> {
  await db
    .delete(sessions)
    .where(keepToken ? and(eq(sessions.userId, userId), ne(sessions.tokenHash, hashToken(keepToken))) : eq(sessions.userId, userId));
}

export async function deleteSession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

export async function actorFromToken(token: string | null | undefined): Promise<Actor | null> {
  if (!token || token.length > 200) return null;
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      phone: users.phone,
      isDemo: users.isDemo,
      mode: users.activeMode,
      providerId: providerProfiles.userId,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .leftJoin(providerProfiles, eq(providerProfiles.userId, users.id))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const isProvider = row.providerId !== null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    isDemo: row.isDemo,
    isProvider,
    mode: isProvider ? row.mode : "client",
  };
}

function bearer(authorization: string | null): string | null {
  if (!authorization) return null;
  const m = /^Bearer\s+(.+)$/i.exec(authorization);
  return m ? m[1].trim() : null;
}

/** Dabartinis naudotojas serverio komponentuose ir API maršrutuose (slapukas arba „Bearer“ raktas). */
export const getActor = cache(async (): Promise<Actor | null> => {
  const h = await headers();
  const fromHeader = bearer(h.get("authorization"));
  if (fromHeader) return actorFromToken(fromHeader);
  const c = await cookies();
  return actorFromToken(c.get(SESSION_COOKIE)?.value);
});

export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) throw new AppError("UNAUTHENTICATED", "Prisijunkite, kad galėtumėte tęsti");
  return actor;
}

export function cookieSecure(): boolean {
  return (process.env.APP_URL ?? "").startsWith("https://");
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const c = await cookies();
  c.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const c = await cookies();
  c.delete(SESSION_COOKIE);
}

export async function currentSessionToken(): Promise<string | null> {
  const h = await headers();
  return bearer(h.get("authorization")) ?? (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}
