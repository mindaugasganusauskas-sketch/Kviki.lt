import { addDaysToKey, FREQUENCIES, type Frequency, TIME_ZONE, vilniusDateKey, vilniusTimeKey } from "./time";

const eurWhole = new Intl.NumberFormat("lt-LT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eurCents = new Intl.NumberFormat("lt-LT", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });

/** 9000 → „90 €“, 9050 → „90,50 €“. */
export function formatPrice(cents: number): string {
  return cents % 100 === 0 ? eurWhole.format(cents / 100) : eurCents.format(cents / 100);
}

export function formatPriceLabel(cents: number, perVisit: boolean): string {
  return perVisit ? `${formatPrice(cents)} už kartą` : formatPrice(cents);
}

const dayMonth = new Intl.DateTimeFormat("lt-LT", { timeZone: TIME_ZONE, month: "long", day: "numeric" });
const weekdayFmt = new Intl.DateTimeFormat("lt-LT", { timeZone: TIME_ZONE, weekday: "long" });

function toDate(value: Date | string): Date {
  return typeof value === "string" ? new Date(value) : value;
}

/** „Šiandien“, „Rytoj“, „Vakar“ arba „Šeštadienis, lapkričio 23 d.“ */
export function formatDay(value: Date | string, now: Date = new Date()): string {
  const d = toDate(value);
  const key = vilniusDateKey(d);
  const today = vilniusDateKey(now);
  if (key === today) return "Šiandien";
  if (key === addDaysToKey(today, 1)) return "Rytoj";
  if (key === addDaysToKey(today, -1)) return "Vakar";
  const weekday = weekdayFmt.format(d);
  // „lt-LT“ formatas jau prideda „d.“, pvz. „lapkričio 22 d.“
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${dayMonth.format(d)}`;
}

/** „Šiandien 17:00“, „Šeštadienis, lapkričio 23 d. 09:00“. */
export function formatDateTime(value: Date | string, now: Date = new Date()): string {
  const d = toDate(value);
  return `${formatDay(d, now)} ${vilniusTimeKey(d)}`;
}

/** Tik data, be laiko, iš „YYYY-MM-DD“. */
export function formatDateKey(dateKey: string, now: Date = new Date()): string {
  return formatDay(new Date(`${dateKey}T12:00:00Z`), now);
}

export function formatRelativePast(value: Date | string, now: Date = new Date()): string {
  const d = toDate(value);
  const minutes = Math.round((now.getTime() - d.getTime()) / 60000);
  if (minutes < 1) return "ką tik";
  if (minutes < 60) return `prieš ${minutes} min.`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `prieš ${hours} val.`;
  return formatDay(d, now);
}

export function frequencyLabel(frequency: string): string {
  return FREQUENCIES[frequency as Frequency] ?? "";
}

export const BUSINESS_FORMS = {
  company: "Įmonė",
  individual: "Individuali veikla",
} as const;
export type BusinessForm = keyof typeof BUSINESS_FORMS;

export function businessFormLabel(form: string): string {
  return BUSINESS_FORMS[form as BusinessForm] ?? "";
}

export interface TimingLike {
  type: "asap" | "window" | "flexible";
  windowStart: string | null;
  windowEnd: string | null;
}

/** Pageidaujamas laikas žmogui suprantamu tekstu. */
export function formatTiming(t: TimingLike, now: Date = new Date()): string {
  if (t.type === "asap") return "Kuo greičiau";
  if (t.type === "flexible") return "Laikas lankstus";
  if (!t.windowStart || !t.windowEnd) return "Pasirinktas laikas";
  const start = new Date(t.windowStart);
  const end = new Date(t.windowEnd);
  const sameDay = vilniusDateKey(start) === vilniusDateKey(end);
  if (sameDay) return `${formatDay(start, now)} ${vilniusTimeKey(start)}–${vilniusTimeKey(end)}`;
  return `${formatDay(start, now)} ${vilniusTimeKey(start)} – ${formatDay(end, now).toLowerCase()} ${vilniusTimeKey(end)}`;
}
