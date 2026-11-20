import { and, count, desc, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import nodemailer, { type Transporter } from "nodemailer";
import { db, type Tx } from "@/server/db";
import { notifications, users } from "@/server/db/schema";
import type { Actor } from "@/server/auth/session";
import { notFound } from "@/server/errors";
import type { NotificationDTO } from "@/shared/types";

export interface NewNotification {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link: string;
  /** Tas pats raktas = tas pats įvykis; pakartojus antras pranešimas nesukuriamas. */
  dedupeKey: string;
  email?: boolean;
}

export async function notify(tx: Tx, items: NewNotification[]): Promise<void> {
  if (!items.length) return;
  await tx
    .insert(notifications)
    .values(
      items.map((n) => ({
        userId: n.userId,
        type: n.type,
        title: n.title,
        body: n.body ?? "",
        link: n.link,
        dedupeKey: n.dedupeKey,
        emailWanted: n.email ?? false,
      })),
    )
    .onConflictDoNothing({ target: notifications.dedupeKey });
}

function toDTO(n: typeof notifications.$inferSelect): NotificationDTO {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    read: n.readAt !== null,
    createdAt: n.createdAt.toISOString(),
  };
}

export async function listNotifications(actor: Actor, limit = 50): Promise<NotificationDTO[]> {
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, actor.id))
    .orderBy(desc(notifications.createdAt))
    .limit(Math.min(limit, 200));
  return rows.map(toDTO);
}

export async function unreadCount(actor: Actor): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, actor.id), isNull(notifications.readAt)));
  return row?.n ?? 0;
}

export async function markRead(actor: Actor, id: string): Promise<void> {
  const res = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, actor.id)))
    .returning({ id: notifications.id });
  if (!res.length) throw notFound();
}

export async function markAllRead(actor: Actor): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, actor.id), isNull(notifications.readAt)));
}

/** Pažymi perskaitytais visus pranešimus su nuoroda į šį puslapį (pvz., atidarius užklausą). */
export async function markReadByLink(actor: Actor, link: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, actor.id), eq(notifications.link, link), isNull(notifications.readAt)));
}

// --- El. laiškai (nebūtina) -------------------------------------------------------

let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;
  const host = process.env.SMTP_HOST;
  if (!host) {
    transporter = null;
    return null;
  }
  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: (process.env.SMTP_SECURE ?? "true") === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
}

export function emailEnabled(): boolean {
  return getTransporter() !== null;
}

/** Išsiunčia dar neišsiųstus laiškus. Kiekvienas laiškas pirmiausia „užimamas“, kad nebūtų išsiųstas dukart. */
export async function dispatchEmails(): Promise<void> {
  const t = getTransporter();
  if (!t) return;
  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const since = new Date(Date.now() - 2 * 24 * 3600 * 1000);
  const pending = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(eq(notifications.emailWanted, true), isNull(notifications.emailSentAt), gt(notifications.createdAt, since)),
    )
    .limit(50);
  if (!pending.length) return;
  const claimed = await db
    .update(notifications)
    .set({ emailSentAt: sql`now()` })
    .where(and(inArray(notifications.id, pending.map((p) => p.id)), isNull(notifications.emailSentAt)))
    .returning();
  for (const n of claimed) {
    const [u] = await db.select({ email: users.email, name: users.name, isDemo: users.isDemo }).from(users).where(eq(users.id, n.userId));
    if (!u || u.isDemo) continue;
    const url = `${appUrl}${n.link}`;
    try {
      await t.sendMail({
        from: process.env.MAIL_FROM ?? "Kviki <info@kviki.lt>",
        to: u.email,
        subject: n.title,
        text: `${n.title}\n\n${n.body ? n.body + "\n\n" : ""}Atidaryti: ${url}\n\n– Kviki`,
      });
    } catch (err) {
      console.error("Nepavyko išsiųsti laiško", n.id, err);
    }
  }
}

export function dispatchEmailsInBackground() {
  if (!emailEnabled()) return;
  void dispatchEmails().catch((err) => console.error("El. laiškų siuntimo klaida", err));
}
