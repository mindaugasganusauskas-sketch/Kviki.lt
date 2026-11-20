// Bendra įvesties validacija svetainei, API ir būsimai mobiliajai programėlei.
import { z } from "zod";
import { CATEGORY_IDS, EQUIPMENT, GRASS_HEIGHTS, PRUNING_TARGETS, YARD_TASKS } from "./categories";
import { isMunicipalityCode } from "./municipalities";
import { BUSINESS_FORMS } from "./format";

const keys = <T extends Record<string, unknown>>(o: T) => Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

export const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Neteisinga data" });
export const timeKeySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "Neteisingas laikas" });

/** Lietuviškas ar tarptautinis telefono numeris → „+370…“ formatas. */
export function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-()]/g, "");
  if (!/^\+?\d{8,15}$/.test(cleaned)) return null;
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("370")) return `+${cleaned}`;
  if (cleaned.startsWith("8") && cleaned.length === 9) return `+370${cleaned.slice(1)}`;
  if (cleaned.length === 8 && cleaned.startsWith("6")) return `+370${cleaned}`;
  return cleaned;
}

export const phoneSchema = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const n = normalizePhone(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "Įrašykite telefono numerį, pvz. +370 600 00000" });
      return z.NEVER;
    }
    return n;
  });

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Neteisingas el. pašto adresas" }).max(200));

// --- Paskyra -----------------------------------------------------------------

export const registerSchema = z.object({
  name: z.string().trim().min(2, { error: "Įrašykite vardą" }).max(80),
  email: emailSchema,
  password: z.string().min(8, { error: "Slaptažodis turi būti bent 8 simbolių" }).max(200),
  phone: z.union([phoneSchema, z.literal("").transform(() => null), z.null()]).optional(),
  mode: z.enum(["client", "provider"]).optional(),
  acceptTerms: z.literal(true, { error: "Pažymėkite, kad sutinkate su taisyklėmis ir privatumo politika" }),
});
export type RegisterInput = z.input<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: "Įrašykite slaptažodį" }).max(200),
});

export const updateAccountSchema = z.object({
  name: z.string().trim().min(2, { error: "Įrašykite vardą" }).max(80),
  phone: z.union([phoneSchema, z.literal("").transform(() => null), z.null()]),
});

export const modeSchema = z.object({ mode: z.enum(["client", "provider"]) });

export const providerProfileSchema = z.object({
  businessForm: z.enum(keys(BUSINESS_FORMS), { error: "Pasirinkite veiklos formą" }),
  displayName: z.string().trim().min(2, { error: "Įrašykite vardą arba įmonės pavadinimą" }).max(100),
  companyCode: z
    .string()
    .trim()
    .regex(/^(\d{7,9})?$/, { error: "Įmonės kodas – 9 skaitmenys" })
    .transform((v) => v || null)
    .nullable()
    .optional(),
  phone: phoneSchema,
  description: z.string().trim().max(1000).default(""),
  categories: z.array(z.enum(CATEGORY_IDS)).min(1, { error: "Pasirinkite bent vieną paslaugą" }),
  municipalities: z
    .array(z.string().refine(isMunicipalityCode, { error: "Nežinoma savivaldybė" }))
    .min(1, { error: "Pasirinkite bent vieną savivaldybę" })
    .max(60),
});
export type ProviderProfileInput = z.input<typeof providerProfileSchema>;

// --- Užklausa ----------------------------------------------------------------

const ares = z.number().positive({ error: "Plotas turi būti teigiamas" }).max(100000).nullable();

export const detailsSchemas = {
  mowing: z.object({
    areaAres: ares,
    grassHeight: z.enum(keys(GRASS_HEIGHTS)),
    collectGrass: z.boolean(),
    equipment: z.enum(keys(EQUIPMENT)),
    tractorAccess: z.boolean(),
  }),
  yard: z.object({
    tasks: z.array(z.enum(keys(YARD_TASKS))).max(10),
    areaAres: ares,
    haulAway: z.boolean(),
  }),
  pruning: z.object({
    target: z.enum(keys(PRUNING_TARGETS)),
    amount: z.string().trim().max(100),
    haulAway: z.boolean(),
  }),
  helper: z.object({
    peopleCount: z.number().int().min(1).max(20),
    durationHours: z.number().positive().max(200).nullable(),
  }),
  other: z.object({}).strip(),
} as const;

export const timingSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("asap") }),
  z.object({ type: z.literal("flexible") }),
  z.object({
    type: z.literal("window"),
    startDate: dateKeySchema,
    startTime: timeKeySchema,
    endDate: dateKeySchema,
    endTime: timeKeySchema,
  }),
]);
export type TimingInput = z.infer<typeof timingSchema>;

export const recurrenceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("once") }),
  z.object({
    type: z.literal("recurring"),
    frequency: z.enum(["weekly", "biweekly", "monthly"]),
    startDate: dateKeySchema,
    endDate: dateKeySchema.nullable(),
  }),
]);
export type RecurrenceInput = z.infer<typeof recurrenceSchema>;

export const requestInputSchema = z
  .object({
    category: z.enum(CATEGORY_IDS, { error: "Pasirinkite darbo rūšį" }),
    description: z.string().trim().max(2000).default(""),
    details: z.unknown(),
    municipality: z.string().refine(isMunicipalityCode, { error: "Pasirinkite savivaldybę" }),
    locality: z.string().trim().min(2, { error: "Įrašykite gyvenvietę ar vietovę" }).max(100),
    address: z.string().trim().min(3, { error: "Įrašykite tikslų adresą ar kaip atvykti" }).max(300),
    contactPhone: phoneSchema,
    lat: z.number().min(53.5).max(56.6).nullable().default(null),
    lng: z.number().min(20.8).max(27).nullable().default(null),
    timing: timingSchema,
    recurrence: recurrenceSchema,
  })
  .superRefine((v, ctx) => {
    const parsed = detailsSchemas[v.category].safeParse(v.details ?? {});
    if (!parsed.success) {
      ctx.addIssue({ code: "custom", path: ["details"], message: "Patikslinkite darbo apimtį" });
    }
    if ((v.category === "helper" || v.category === "other") && v.description.length < 10) {
      ctx.addIssue({ code: "custom", path: ["description"], message: "Trumpai aprašykite, ką reikės padaryti" });
    }
    if (v.timing.type === "window") {
      const start = `${v.timing.startDate}T${v.timing.startTime}`;
      const end = `${v.timing.endDate}T${v.timing.endTime}`;
      if (end <= start) ctx.addIssue({ code: "custom", path: ["timing"], message: "Pabaiga turi būti vėliau nei pradžia" });
    }
    if (v.recurrence.type === "recurring" && v.recurrence.endDate && v.recurrence.endDate < v.recurrence.startDate) {
      ctx.addIssue({ code: "custom", path: ["recurrence"], message: "Pabaiga turi būti vėliau nei pradžia" });
    }
  })
  .transform((v) => ({ ...v, details: detailsSchemas[v.category].parse(v.details ?? {}) as Record<string, unknown> }));

export type RequestInput = z.input<typeof requestInputSchema>;
export type RequestParsed = z.output<typeof requestInputSchema>;

// --- Pasiūlymas ----------------------------------------------------------------

export const offerInputSchema = z.object({
  priceCents: z
    .number({ error: "Įrašykite kainą" })
    .int()
    .min(100, { error: "Kaina turi būti bent 1 €" })
    .max(10_000_000, { error: "Per didelė kaina" }),
  startAt: z.iso.datetime({ offset: true, error: "Pasirinkite pradžios laiką" }),
  included: z.string().trim().min(3, { error: "Parašykite, kas įskaičiuota" }).max(500),
});
export type OfferInput = z.infer<typeof offerInputSchema>;

/** „90“, „90,50“, „90.5 €“ → centai arba null. */
export function parseEurToCents(raw: string): number | null {
  const cleaned = raw.replace(/[€\s]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(parseFloat(cleaned) * 100);
}

export const acceptOfferSchema = z.object({
  offerId: z.uuid(),
  offerVersion: z.number().int().min(1),
});

export const cancelSchema = z.object({ reason: z.string().trim().max(500).optional().default("") });
export const problemSchema = z.object({
  note: z.string().trim().min(3, { error: "Trumpai aprašykite problemą" }).max(1000),
});

/** Pirmas validacijos klaidos pranešimas – rodomas formoje. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Patikrinkite įvestus duomenis";
}
