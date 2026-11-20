import { defaultDetails, type CategoryId, type DetailsByCategory } from "@/shared/categories";
import { normalizePhone, requestInputSchema, type RequestInput } from "@/shared/schemas";
import { addDaysToKey, vilniusDateKey, vilniusTimeKey, vilniusToDate, vilniusWeekday, type Frequency } from "@/shared/time";
import type { RequestOwnerView } from "@/shared/types";

export interface WizardState {
  category: CategoryId | null;
  description: string;
  details: DetailsByCategory;
  areaUnknown: boolean;
  municipality: string;
  locality: string;
  address: string;
  contactPhone: string;
  lat: number | null;
  lng: number | null;
  kind: "once" | "recurring";
  timingType: "asap" | "window" | "flexible";
  window: { startDate: string; startTime: string; endDate: string; endTime: string };
  frequency: Frequency;
  seriesStart: string;
  seriesEnd: string;
}

export const STEPS = ["Darbas", "Apimtis", "Vieta ir laikas", "Peržiūra"] as const;

export function emptyState(phone = ""): WizardState {
  const today = vilniusDateKey(new Date());
  return {
    category: null,
    description: "",
    details: {
      mowing: defaultDetails("mowing"),
      yard: defaultDetails("yard"),
      pruning: defaultDetails("pruning"),
      helper: defaultDetails("helper"),
      other: defaultDetails("other"),
    },
    areaUnknown: false,
    municipality: "",
    locality: "",
    address: "",
    contactPhone: phone,
    lat: null,
    lng: null,
    kind: "once",
    timingType: "asap",
    window: { startDate: today, startTime: "08:00", endDate: addDaysToKey(today, 1), endTime: "20:00" },
    frequency: "biweekly",
    seriesStart: today,
    seriesEnd: "",
  };
}

/** Paprastas spėjimas iš laisvo teksto, kurią kategoriją pasiūlyti. */
export function guessCategory(text: string): CategoryId | null {
  const t = text.toLowerCase();
  if (/(žol|zol|pjau|piev|vej|šienau|sienau|trimer)/.test(t)) return "mowing";
  if (/(gen[eė]|gyvatvor|medž|medz|krūm|krum|nupjauti medį)/.test(t)) return "pruning";
  if (/(lap|kiem|tvark|ravė|rave|šiukš|siuks|šak)/.test(t)) return "yard";
  if (/(nešt|nest|krau|padė|pade|rank|perkraust|malk)/.test(t)) return "helper";
  return null;
}

export function toPayload(s: WizardState): RequestInput {
  const category = s.category ?? "other";
  let details: Record<string, unknown> = { ...s.details[category] };
  if ((category === "mowing" || category === "yard") && s.areaUnknown) details = { ...details, areaAres: null };
  return {
    category,
    description: s.description.trim(),
    details,
    municipality: s.municipality,
    locality: s.locality.trim(),
    address: s.address.trim(),
    contactPhone: s.contactPhone.trim(),
    lat: s.lat,
    lng: s.lng,
    timing:
      s.timingType === "window"
        ? { type: "window", ...s.window }
        : { type: s.timingType },
    recurrence:
      s.kind === "recurring"
        ? { type: "recurring", frequency: s.frequency, startDate: s.seriesStart, endDate: s.seriesEnd || null }
        : { type: "once" },
  };
}

/** Užpildo vedlį esamos užklausos duomenimis (redagavimui). */
export function fromRequest(r: RequestOwnerView): WizardState {
  const s = emptyState(r.private.contactPhone);
  const details = { ...s.details, [r.category]: { ...s.details[r.category], ...r.details } } as DetailsByCategory;
  const ws = r.timing.windowStart ? new Date(r.timing.windowStart) : null;
  const we = r.timing.windowEnd ? new Date(r.timing.windowEnd) : null;
  return {
    ...s,
    category: r.category,
    description: r.description,
    details,
    areaUnknown: (r.category === "mowing" || r.category === "yard") && r.details.areaAres == null,
    municipality: r.municipality,
    locality: r.locality,
    address: r.private.address,
    contactPhone: r.private.contactPhone,
    lat: r.private.lat,
    lng: r.private.lng,
    kind: r.recurrence.frequency ? "recurring" : "once",
    timingType: r.recurrence.frequency ? "asap" : r.timing.type,
    window:
      ws && we
        ? { startDate: vilniusDateKey(ws), startTime: vilniusTimeKey(ws), endDate: vilniusDateKey(we), endTime: vilniusTimeKey(we) }
        : s.window,
    frequency: r.recurrence.frequency ?? "biweekly",
    seriesStart: r.recurrence.startDate ?? s.seriesStart,
    seriesEnd: r.recurrence.endDate ?? "",
  };
}

export type StepErrors = Partial<Record<string, string>>;

/** Žingsnio patikra prieš einant toliau. Grąžina klaidas pagal lauką. */
export function validateStep(step: number, s: WizardState, now = new Date()): StepErrors {
  const e: StepErrors = {};
  if (step === 0) {
    if (!s.category) e.category = "Pasirinkite, kokios pagalbos reikia";
  }
  if (step === 1) {
    const c = s.category;
    if ((c === "helper" || c === "other") && s.description.trim().length < 10) {
      e.description = "Trumpai aprašykite, ką reikės padaryti (bent kelis žodžius)";
    }
    if ((c === "mowing" || c === "yard") && !s.areaUnknown) {
      const a = s.details[c].areaAres;
      if (a === null || !(a > 0)) e.area = "Įrašykite apytikslį plotą arba pažymėkite „Nežinau“";
    }
    if (c === "helper") {
      const d = s.details.helper;
      if (!(d.peopleCount >= 1 && d.peopleCount <= 20)) e.people = "Nuo 1 iki 20 žmonių";
    }
  }
  if (step === 2) {
    if (!s.municipality) e.municipality = "Pasirinkite savivaldybę";
    if (s.locality.trim().length < 2) e.locality = "Įrašykite gyvenvietę ar vietovę";
    if (s.address.trim().length < 3) e.address = "Įrašykite adresą arba kaip rasti vietą";
    if (!normalizePhone(s.contactPhone)) e.contactPhone = "Įrašykite telefono numerį, pvz. +370 600 00000";
    if (s.kind === "once" && s.timingType === "window") {
      const w = s.window;
      if (!w.startDate || !w.endDate || !w.startTime || !w.endTime) e.window = "Nurodykite pradžią ir pabaigą";
      else {
        const start = vilniusToDate(w.startDate, w.startTime);
        const end = vilniusToDate(w.endDate, w.endTime);
        if (end <= start) e.window = "Pabaiga turi būti vėliau nei pradžia";
        else if (end < now) e.window = "Šis laikas jau praėjo";
      }
    }
    if (s.kind === "recurring") {
      const today = vilniusDateKey(now);
      if (!s.seriesStart) e.series = "Nurodykite pradžią";
      else if (s.seriesStart < today) e.series = "Pradžia negali būti praeityje";
      else if (s.seriesEnd && s.seriesEnd < s.seriesStart) e.series = "Pabaiga turi būti vėliau nei pradžia";
    }
  }
  if (step === 3) {
    const parsed = requestInputSchema.safeParse(toPayload(s));
    if (!parsed.success) e.form = parsed.error.issues[0]?.message ?? "Patikrinkite įvestus duomenis";
  }
  return e;
}

/** Greiti laiko pasirinkimai, pvz. „Šį savaitgalį“. */
export function quickWindows(now = new Date()) {
  const today = vilniusDateKey(now);
  const hour = Number(vilniusTimeKey(now).slice(0, 2));
  const fromToday = `${String(Math.min(Math.max(hour + 1, 8), 21)).padStart(2, "0")}:00`;
  const tomorrow = addDaysToKey(today, 1);
  const wd = vilniusWeekday(today);
  const saturday = wd === 7 ? today : addDaysToKey(today, (6 - wd + 7) % 7);
  const sunday = wd === 7 ? today : addDaysToKey(saturday, 1);
  const lateToday = hour >= 20;
  return [
    ...(lateToday ? [] : [{ label: "Šiandien", value: { startDate: today, startTime: fromToday, endDate: today, endTime: "21:00" } }]),
    { label: "Rytoj", value: { startDate: tomorrow, startTime: "08:00", endDate: tomorrow, endTime: "21:00" } },
    ...(lateToday
      ? []
      : [{ label: "Šiandien arba rytoj", value: { startDate: today, startTime: fromToday, endDate: tomorrow, endTime: "21:00" } }]),
    {
      label: "Šį savaitgalį",
      value: { startDate: wd === 6 && !lateToday ? today : saturday, startTime: wd === 6 && !lateToday ? fromToday : "08:00", endDate: sunday, endTime: "21:00" },
    },
  ];
}
