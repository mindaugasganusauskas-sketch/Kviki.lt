import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { providerAreas, providerCategories, providerProfiles, users } from "@/server/db/schema";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { deleteOtherSessions, type Actor } from "@/server/auth/session";
import { allow } from "@/server/auth/rate-limit";
import { AppError, parseInput } from "@/server/errors";
import {
  changePasswordSchema,
  loginSchema,
  modeSchema,
  providerProfileSchema,
  registerSchema,
  updateAccountSchema,
} from "@/shared/schemas";
import type { Mode, ProviderProfileDTO, UserDTO } from "@/shared/types";
import { isLocale, type Locale } from "@/shared/locale";
import type { CategoryId } from "@/shared/categories";

export function toUserDTO(actor: Actor): UserDTO {
  return {
    id: actor.id,
    name: actor.name,
    email: actor.email,
    phone: actor.phone,
    mode: actor.mode,
    isDemo: actor.isDemo,
    isProvider: actor.isProvider,
  };
}

export async function register(input: unknown, ip: string, locale: Locale = "lt"): Promise<{ userId: string; mode: Mode }> {
  if (!allow(`register:${ip}`, 20, 60 * 60 * 1000)) {
    throw new AppError("RATE_LIMITED", "Per daug bandymų. Pabandykite vėliau.");
  }
  const data = parseInput(registerSchema, input);
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, data.email)).limit(1);
  if (existing.length) {
    throw new AppError("CONFLICT", "Šis el. pašto adresas jau užregistruotas. Prisijunkite.");
  }
  const passwordHash = await hashPassword(data.password);
  try {
    const [row] = await db
      .insert(users)
      .values({ email: data.email, passwordHash, name: data.name, phone: data.phone ?? null, termsAcceptedAt: new Date(), locale })
      .returning({ id: users.id });
    return { userId: row.id, mode: data.mode ?? "client" };
  } catch (err) {
    if ((err as { code?: string }).code === "23505") {
      throw new AppError("CONFLICT", "Šis el. pašto adresas jau užregistruotas. Prisijunkite.");
    }
    throw err;
  }
}

let dummy: Promise<string> | null = null;
function dummyHash(): Promise<string> {
  dummy ??= hashPassword("kviki-netikras-slaptazodis");
  return dummy;
}

export async function login(input: unknown, ip: string): Promise<{ userId: string }> {
  const data = parseInput(loginSchema, input);
  if (!allow(`login:${ip}:${data.email}`, 10, 15 * 60 * 1000) || !allow(`login-email:${data.email}`, 30, 60 * 60 * 1000)) {
    throw new AppError("RATE_LIMITED", "Per daug bandymų. Palaukite 15 minučių.");
  }
  const [row] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, data.email))
    .limit(1);
  // Neegzistuojančiam el. paštui tikriname „netikrą“ slaptažodį, kad atsakymo laikas neišduotų, ar paskyra yra.
  const ok = await verifyPassword(data.password, row?.passwordHash ?? (await dummyHash()));

  if (!row || !ok) throw new AppError("UNAUTHENTICATED", "Neteisingas el. paštas arba slaptažodis");
  return { userId: row.id };
}

/** Pakeičia slaptažodį ir atjungia visus kitus įrenginius. */
export async function changePassword(actor: Actor, input: unknown, currentToken: string | null): Promise<void> {
  if (actor.isDemo) throw new AppError("FORBIDDEN", "Demonstracinės paskyros slaptažodžio keisti negalima");
  const data = parseInput(changePasswordSchema, input);
  if (!allow(`password:${actor.id}`, 10, 60 * 60 * 1000)) {
    throw new AppError("RATE_LIMITED", "Per daug bandymų. Pabandykite vėliau.");
  }
  const [row] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, actor.id));
  if (!row || !(await verifyPassword(data.currentPassword, row.passwordHash))) {
    throw new AppError("VALIDATION", "Neteisingas dabartinis slaptažodis");
  }
  await db.update(users).set({ passwordHash: await hashPassword(data.newPassword) }).where(eq(users.id, actor.id));
  await deleteOtherSessions(actor.id, currentToken);
}

export async function updateAccount(actor: Actor, input: unknown) {
  const data = parseInput(updateAccountSchema, input);
  await db.update(users).set({ name: data.name, phone: data.phone }).where(eq(users.id, actor.id));
}

export async function setMode(actor: Actor, input: unknown): Promise<Mode> {
  const { mode } = parseInput(modeSchema, input);
  if (mode === "provider" && !actor.isProvider) {
    throw new AppError("PROVIDER_PROFILE_REQUIRED", "Pirmiausia užpildykite teikėjo profilį");
  }
  await db.update(users).set({ activeMode: mode }).where(eq(users.id, actor.id));
  return mode;
}

export async function getProviderProfile(userId: string): Promise<ProviderProfileDTO | null> {
  const [p] = await db.select().from(providerProfiles).where(eq(providerProfiles.userId, userId)).limit(1);
  if (!p) return null;
  const [cats, areas] = await Promise.all([
    db.select({ c: providerCategories.category }).from(providerCategories).where(eq(providerCategories.userId, userId)),
    db.select({ m: providerAreas.municipality }).from(providerAreas).where(eq(providerAreas.userId, userId)),
  ]);
  return {
    businessForm: p.businessForm,
    displayName: p.displayName,
    companyCode: p.companyCode,
    phone: p.phone,
    description: p.description,
    categories: cats.map((c) => c.c as CategoryId),
    municipalities: areas.map((a) => a.m),
    verified: p.verifiedAt !== null,
  };
}

/** Sukuria arba atnaujina teikėjo profilį ir perjungia į teikėjo režimą. */
export async function saveProviderProfile(actor: Actor, input: unknown): Promise<ProviderProfileDTO> {
  const data = parseInput(providerProfileSchema, input);
  await db.transaction(async (tx) => {
    await tx
      .insert(providerProfiles)
      .values({
        userId: actor.id,
        businessForm: data.businessForm,
        displayName: data.displayName,
        companyCode: data.companyCode ?? null,
        phone: data.phone,
        description: data.description,
      })
      .onConflictDoUpdate({
        target: providerProfiles.userId,
        set: {
          businessForm: data.businessForm,
          displayName: data.displayName,
          companyCode: data.companyCode ?? null,
          phone: data.phone,
          description: data.description,
          updatedAt: new Date(),
        },
      });
    await tx.delete(providerCategories).where(eq(providerCategories.userId, actor.id));
    await tx.delete(providerAreas).where(eq(providerAreas.userId, actor.id));
    const cats = [...new Set(data.categories)];
    const areas = [...new Set(data.municipalities)];
    await tx.insert(providerCategories).values(cats.map((category) => ({ userId: actor.id, category })));
    await tx.insert(providerAreas).values(areas.map((municipality) => ({ userId: actor.id, municipality })));
    await tx.update(users).set({ activeMode: "provider" }).where(eq(users.id, actor.id));
  });
  return (await getProviderProfile(actor.id))!;
}

/** Išsaugo naudotojo kalbą – pagal ją rašomi pranešimai ir el. laiškai. */
export async function setUserLocale(userId: string, locale: unknown): Promise<void> {
  if (!isLocale(locale)) return;
  await db.update(users).set({ locale }).where(eq(users.id, userId));
}
