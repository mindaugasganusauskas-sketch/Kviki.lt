import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = () => ts("created_at").notNull().defaultNow();
const updatedAt = () => ts("updated_at").notNull().defaultNow();

export const modeEnum = pgEnum("mode", ["client", "provider"]);
export const categoryEnum = pgEnum("category", ["mowing", "yard", "pruning", "helper", "other"]);
export const businessFormEnum = pgEnum("business_form", ["company", "individual"]);
export const timingTypeEnum = pgEnum("timing_type", ["asap", "window", "flexible"]);
export const frequencyEnum = pgEnum("frequency", ["weekly", "biweekly", "monthly"]);
export const requestStatusEnum = pgEnum("request_status", ["open", "agreed", "on_hold", "cancelled", "completed", "expired"]);
export const offerStatusEnum = pgEnum("offer_status", ["active", "withdrawn", "accepted", "closed"]);
export const agreementStatusEnum = pgEnum("agreement_status", ["active", "completed", "cancelled", "ended"]);
export const visitStatusEnum = pgEnum("visit_status", ["scheduled", "done", "confirmed", "problem", "cancelled"]);
export const partyEnum = pgEnum("party", ["client", "provider"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  activeMode: modeEnum("active_mode").notNull().default("client"),
  isDemo: boolean("is_demo").notNull().default(false),
  termsAcceptedAt: ts("terms_accepted_at"),
  // Sąsajos kalba: pagal ją rašomi pranešimai ir el. laiškai.
  locale: text("locale").notNull().default("lt"),
  // Ištrinta paskyra anonimizuojama: lieka tik tai, ko reikia kitos šalies užsakymų istorijai.
  deletedAt: ts("deleted_at"),
  createdAt: createdAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenHash: text("token_hash").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    expiresAt: ts("expires_at").notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const providerProfiles = pgTable("provider_profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  businessForm: businessFormEnum("business_form").notNull(),
  displayName: text("display_name").notNull(),
  companyCode: text("company_code"),
  phone: text("phone").notNull(),
  description: text("description").notNull().default(""),
  // Patikros ženklas rodomas tik tada, kai administratorius realiai patikrino teikėją.
  verifiedAt: ts("verified_at"),
  verificationNote: text("verification_note"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const providerCategories = pgTable(
  "provider_categories",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    category: categoryEnum("category").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.category] }), index("provider_categories_cat_idx").on(t.category)],
);

export const providerAreas = pgTable(
  "provider_areas",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    municipality: text("municipality").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.municipality] }), index("provider_areas_mun_idx").on(t.municipality)],
);

export const jobRequests = pgTable(
  "job_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => users.id),
    category: categoryEnum("category").notNull(),
    description: text("description").notNull().default(""),
    details: jsonb("details").$type<Record<string, unknown>>().notNull(),
    municipality: text("municipality").notNull(),
    // Apytikslė vieta (gyvenvietė), matoma visiems teikėjams.
    locality: text("locality").notNull(),
    timingType: timingTypeEnum("timing_type").notNull(),
    windowStart: ts("window_start"),
    windowEnd: ts("window_end"),
    frequency: frequencyEnum("frequency"),
    seriesStart: date("series_start", { mode: "string" }),
    seriesEnd: date("series_end", { mode: "string" }),
    status: requestStatusEnum("status").notNull().default("open"),
    version: integer("version").notNull().default(1),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("job_requests_match_idx").on(t.status, t.municipality, t.category),
    index("job_requests_client_idx").on(t.clientId, t.createdAt),
  ],
);

// Tikslus adresas ir kontaktas laikomi atskirai, kad jie nepatektų į viešus atsakymus netyčia.
export const jobRequestPrivate = pgTable("job_request_private", {
  requestId: uuid("request_id")
    .primaryKey()
    .references(() => jobRequests.id, { onDelete: "cascade" }),
  address: text("address").notNull(),
  contactPhone: text("contact_phone").notNull(),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
});

export const jobRequestRevisions = pgTable(
  "job_request_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => jobRequests.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("job_request_revisions_uq").on(t.requestId, t.version)],
);

export const jobPhotos = pgTable(
  "job_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => jobRequests.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    width: integer("width"),
    height: integer("height"),
    position: integer("position").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("job_photos_request_idx").on(t.requestId)],
);

export const offers = pgTable(
  "offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => jobRequests.id, { onDelete: "cascade" }),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => users.id),
    priceCents: integer("price_cents").notNull(),
    startAt: ts("start_at").notNull(),
    included: text("included").notNull(),
    status: offerStatusEnum("status").notNull().default("active"),
    version: integer("version").notNull().default(1),
    // Užklausos versija, kuriai teikėjas patvirtino kainą.
    requestVersion: integer("request_version").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("offers_request_provider_uq").on(t.requestId, t.providerId),
    index("offers_provider_idx").on(t.providerId),
  ],
);

export const agreements = pgTable(
  "agreements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => jobRequests.id),
    offerId: uuid("offer_id")
      .notNull()
      .references(() => offers.id),
    clientId: uuid("client_id")
      .notNull()
      .references(() => users.id),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => users.id),
    // Sutartos sąlygos nukopijuojamos priėmimo metu.
    requestVersion: integer("request_version").notNull(),
    offerVersion: integer("offer_version").notNull(),
    category: categoryEnum("category").notNull(),
    description: text("description").notNull(),
    details: jsonb("details").$type<Record<string, unknown>>().notNull(),
    municipality: text("municipality").notNull(),
    locality: text("locality").notNull(),
    frequency: frequencyEnum("frequency"),
    seriesEnd: date("series_end", { mode: "string" }),
    priceCents: integer("price_cents").notNull(),
    startAt: ts("start_at").notNull(),
    included: text("included").notNull(),
    status: agreementStatusEnum("status").notNull().default("active"),
    cancelledBy: partyEnum("cancelled_by"),
    cancelReason: text("cancel_reason"),
    cancelledAt: ts("cancelled_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // Vienai užklausai – tik vienas galiojantis susitarimas, net jei priėmimas kartojamas.
    uniqueIndex("agreements_one_live_per_request")
      .on(t.requestId)
      .where(sql`status in ('active', 'completed')`),
    uniqueIndex("agreements_offer_uq").on(t.offerId),
    index("agreements_client_idx").on(t.clientId),
    index("agreements_provider_idx").on(t.providerId),
  ],
);

export const visits = pgTable(
  "visits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agreementId: uuid("agreement_id")
      .notNull()
      .references(() => agreements.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    scheduledAt: ts("scheduled_at").notNull(),
    status: visitStatusEnum("status").notNull().default("scheduled"),
    doneAt: ts("done_at"),
    confirmedAt: ts("confirmed_at"),
    problemNote: text("problem_note"),
    cancelledBy: partyEnum("cancelled_by"),
    cancelReason: text("cancel_reason"),
    cancelledAt: ts("cancelled_at"),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("visits_agreement_seq_uq").on(t.agreementId, t.seq)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    // Pranešimo tekstas sudaromas rodant, gavėjo kalba, iš tipo ir šių parametrų.
    params: jsonb("params").$type<Record<string, unknown>>(),
    link: text("link").notNull(),
    // Pakartotinis siuntimas su tuo pačiu raktu nesukuria antro pranešimo.
    dedupeKey: text("dedupe_key").unique(),
    readAt: ts("read_at"),
    emailWanted: boolean("email_wanted").notNull().default(false),
    emailSentAt: ts("email_sent_at"),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)],
);
