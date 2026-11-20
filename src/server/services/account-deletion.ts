// Paskyros ištrynimas (BDAR teisė būti pamirštam).
// Asmens duomenys pašalinami iš karto; kitai sandorio šaliai lieka tik nuasmeninta užsakymų istorija.
import { randomBytes } from "node:crypto";
import { and, eq, inArray, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import {
  agreements,
  jobPhotos,
  jobRequestPrivate,
  jobRequestRevisions,
  jobRequests,
  notifications,
  offers,
  providerAreas,
  providerCategories,
  providerProfiles,
  sessions,
  users,
} from "@/server/db/schema";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import type { Actor } from "@/server/auth/session";
import { AppError, parseInput } from "@/server/errors";
import { requestHeadline } from "@/shared/categories";
import { notify } from "./notifications";
import { deletePhotoFiles } from "./photos";

const deleteSchema = z.object({ password: z.string().min(1, { error: "Įrašykite slaptažodį" }).max(200) });

export const DELETED_NAME = "Ištrinta paskyra";

export async function deleteAccount(actor: Actor, input: unknown): Promise<void> {
  if (actor.isDemo) throw new AppError("FORBIDDEN", "Demonstracinės paskyros ištrinti negalima");
  const { password } = parseInput(deleteSchema, input);
  const [u] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, actor.id));
  if (!u || !(await verifyPassword(password, u.passwordHash))) {
    throw new AppError("VALIDATION", "Neteisingas slaptažodis");
  }

  const myRequestIds: string[] = [];
  await db.transaction(async (tx) => {
    const active = await tx
      .select({ id: agreements.id })
      .from(agreements)
      .where(and(eq(agreements.status, "active"), or(eq(agreements.clientId, actor.id), eq(agreements.providerId, actor.id))))
      .limit(1);
    if (active.length) {
      throw new AppError(
        "CONFLICT",
        "Turite aktyvių užsakymų. Pirmiausia juos užbaikite arba atšaukite, kad kita šalis žinotų.",
      );
    }

    // Kliento užklausos: atviras uždarome, privačius duomenis ir aprašymus išvalome.
    const mine = await tx
      .select({ id: jobRequests.id, status: jobRequests.status, category: jobRequests.category, details: jobRequests.details })
      .from(jobRequests)
      .where(eq(jobRequests.clientId, actor.id))
      .for("update");
    myRequestIds.push(...mine.map((r) => r.id));
    const closable = mine.filter((r) => r.status === "open" || r.status === "on_hold" || r.status === "expired");
    for (const r of closable) {
      const holders = await tx
        .update(offers)
        .set({ status: "closed", updatedAt: new Date() })
        .where(and(eq(offers.requestId, r.id), eq(offers.status, "active")))
        .returning({ providerId: offers.providerId });
      await notify(
        tx,
        holders.map(({ providerId }) => ({
          userId: providerId,
          type: "request_cancelled",
          params: { category: r.category, details: r.details },
          link: `/darbai-salia/${r.id}`,
          dedupeKey: `request_cancelled:${r.id}:${providerId}`,
        })),
      );
    }
    if (closable.length) {
      await tx
        .update(jobRequests)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(inArray(jobRequests.id, closable.map((r) => r.id)));
    }
    if (myRequestIds.length) {
      await tx
        .update(jobRequestPrivate)
        .set({ address: "(ištrinta)", contactPhone: "", lat: null, lng: null })
        .where(inArray(jobRequestPrivate.requestId, myRequestIds));
      await tx.update(jobRequests).set({ description: "" }).where(inArray(jobRequests.id, myRequestIds));
      await tx.delete(jobRequestRevisions).where(inArray(jobRequestRevisions.requestId, myRequestIds));
      await tx.delete(jobPhotos).where(inArray(jobPhotos.requestId, myRequestIds));
    }
    await tx.update(agreements).set({ description: "" }).where(eq(agreements.clientId, actor.id));

    // Teikėjo pusė: aktyvius pasiūlymus atsiimame, profilį nuasmeniname.
    await tx
      .update(offers)
      .set({ status: "withdrawn", updatedAt: new Date() })
      .where(and(eq(offers.providerId, actor.id), eq(offers.status, "active")));
    await tx
      .update(providerProfiles)
      .set({ displayName: DELETED_NAME, phone: "", description: "", companyCode: null, verifiedAt: null, updatedAt: new Date() })
      .where(eq(providerProfiles.userId, actor.id));
    await tx.delete(providerCategories).where(eq(providerCategories.userId, actor.id));
    await tx.delete(providerAreas).where(eq(providerAreas.userId, actor.id));

    await tx.delete(notifications).where(eq(notifications.userId, actor.id));
    await tx.delete(sessions).where(eq(sessions.userId, actor.id));
    await tx
      .update(users)
      .set({
        email: `istrinta-${actor.id}@kviki.invalid`,
        name: DELETED_NAME,
        phone: null,
        passwordHash: await hashPassword(randomBytes(24).toString("base64url")),
        activeMode: "client",
        deletedAt: new Date(),
      })
      .where(eq(users.id, actor.id));
  });

  for (const id of myRequestIds) await deletePhotoFiles(id).catch(() => undefined);
}
