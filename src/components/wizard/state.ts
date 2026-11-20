import { defaultDetails, type CategoryId, type DetailsByCategory } from "@/shared/categories";
import { normalizePhone, requestInputSchema, type RequestInput } from "@/shared/schemas";
import { addDaysToKey, vilniusDateKey, vilniusTimeKey, vilniusToDate, vilniusWeekday, type Frequency } from "@/shared/time";
import type { RequestOwnerView } from "@/shared/types";
import type { Dict } from "@/i18n";

type W = Dict["wizard"];

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
  if (/(žol|zol|pjau|piev|vej|šienau|sienau|trimer|mow|grass|lawn|meadow)/.test(t)) return "mowing";
  if (/(gen[eė]|gyvatvor|medž|medz|krūm|krum|nupjauti medį|prun|hedge|tree|bush|trim)/.test(t)) return "pruning";
  if (/(lap|kiem|tvark|ravė|rave|šiukš|siuks|šak|leaves|yard|garden|clean|weed|rubbish)/.test(t)) return "yard";
  if (/(nešt|nest|krau|padė|pade|rank|perkraust|malk|carry|load|help|move|firewood)/.test(t)) return "helper";
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
export function validateStep(step: number, s: WizardState, w: W, now = new Date()): StepErrors {
  const e: StepErrors = {};
  if (step === 0) {
    if (!s.category) e.category = w.errCategory;
  }
  if (step === 1) {
    const c = s.category;
    if ((c === "helper" || c === "other") && s.description.trim().length < 10) {
      e.description = w.errDescription;
    }
    if ((c === "mowing" || c === "yard") && !s.areaUnknown) {
      const a = s.details[c].areaAres;
      if (a === null || !(a > 0)) e.area = w.errArea;
    }
    if (c === "helper") {
      const d = s.details.helper;
      if (!(d.peopleCount >= 1 && d.peopleCount <= 20)) e.people = w.errPeople;
    }
  }
  if (step === 2) {
    if (!s.municipality) e.municipality = w.errMunicipality;
    if (s.locality.trim().length < 2) e.locality = w.errLocality;
    if (s.address.trim().length < 3) e.address = w.errAddress;
    if (!normalizePhone(s.contactPhone)) e.contactPhone = w.errPhone;
    if (s.kind === "once" && s.timingType === "window") {
      const win = s.window;
      if (!win.startDate || !win.endDate || !win.startTime || !win.endTime) e.window = w.errWindowMissing;
      else {
        const start = vilniusToDate(win.startDate, win.startTime);
        const end = vilniusToDate(win.endDate, win.endTime);
        if (end <= start) e.window = w.errWindowOrder;
        else if (end < now) e.window = w.errWindowPast;
      }
    }
    if (s.kind === "recurring") {
      const today = vilniusDateKey(now);
      if (!s.seriesStart) e.series = w.errSeriesStart;
      else if (s.seriesStart < today) e.series = w.errSeriesPast;
      else if (s.seriesEnd && s.seriesEnd < s.seriesStart) e.series = w.errWindowOrder;
    }
  }
  if (step === 3) {
    const parsed = requestInputSchema.safeParse(toPayload(s));
    if (!parsed.success) e.form = parsed.error.issues[0]?.message ?? w.errForm;
  }
  return e;
}

/** Greiti laiko pasirinkimai, pvz. „Šį savaitgalį“. */
export function quickWindows(now = new Date(), w?: Pick<W, "quickToday" | "quickTomorrow" | "quickTodayTomorrow" | "quickWeekend">) {
  const L = w ?? { quickToday: "Šiandien", quickTomorrow: "Rytoj", quickTodayTomorrow: "Šiandien arba rytoj", quickWeekend: "Šį savaitgalį" };
  const today = vilniusDateKey(now);
  const hour = Number(vilniusTimeKey(now).slice(0, 2));
  const fromToday = `${String(Math.min(Math.max(hour + 1, 8), 21)).padStart(2, "0")}:00`;
  const tomorrow = addDaysToKey(today, 1);
  const wd = vilniusWeekday(today);
  const saturday = wd === 7 ? today : addDaysToKey(today, (6 - wd + 7) % 7);
  const sunday = wd === 7 ? today : addDaysToKey(saturday, 1);
  const lateToday = hour >= 20;
  return [
    ...(lateToday ? [] : [{ label: L.quickToday, value: { startDate: today, startTime: fromToday, endDate: today, endTime: "21:00" } }]),
    { label: L.quickTomorrow, value: { startDate: tomorrow, startTime: "08:00", endDate: tomorrow, endTime: "21:00" } },
    ...(lateToday
      ? []
      : [{ label: L.quickTodayTomorrow, value: { startDate: today, startTime: fromToday, endDate: tomorrow, endTime: "21:00" } }]),
    {
      label: L.quickWeekend,
      value: { startDate: wd === 6 && !lateToday ? today : saturday, startTime: wd === 6 && !lateToday ? fromToday : "08:00", endDate: sunday, endTime: "21:00" },
    },
  ];
}
