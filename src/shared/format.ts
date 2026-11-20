import { DEFAULT_LOCALE, intlTag, type Locale } from "./locale";
import { addDaysToKey, type Frequency, TIME_ZONE, vilniusDateKey, vilniusTimeKey } from "./time";

const eurFormatters = new Map<string, Intl.NumberFormat>();
function eur(locale: Locale, cents: boolean): Intl.NumberFormat {
  const key = `${locale}:${cents}`;
  let f = eurFormatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale === "en" ? "en-IE" : "lt-LT", {
      style: "currency",
      currency: "EUR",
      ...(cents ? { minimumFractionDigits: 2 } : { maximumFractionDigits: 0 }),
    });
    eurFormatters.set(key, f);
  }
  return f;
}

/** 9000 → „90 €“ (lt) arba „€90“ (en); 9050 → „90,50 €“ / „€90.50“. */
export function formatPrice(cents: number, locale: Locale = DEFAULT_LOCALE): string {
  return eur(locale, cents % 100 !== 0).format(cents / 100);
}

export function formatPriceLabel(cents: number, perVisit: boolean, locale: Locale = DEFAULT_LOCALE): string {
  if (!perVisit) return formatPrice(cents, locale);
  return locale === "en" ? `${formatPrice(cents, locale)} per visit` : `${formatPrice(cents, locale)} už kartą`;
}

const dateFormatters = new Map<string, { dayMonth: Intl.DateTimeFormat; weekday: Intl.DateTimeFormat }>();
function dateFmt(locale: Locale) {
  let f = dateFormatters.get(locale);
  if (!f) {
    const tag = intlTag(locale);
    f = {
      dayMonth: new Intl.DateTimeFormat(tag, { timeZone: TIME_ZONE, month: "long", day: "numeric" }),
      weekday: new Intl.DateTimeFormat(tag, { timeZone: TIME_ZONE, weekday: "long" }),
    };
    dateFormatters.set(locale, f);
  }
  return f;
}

const RELATIVE = {
  lt: { today: "Šiandien", tomorrow: "Rytoj", yesterday: "Vakar" },
  en: { today: "Today", tomorrow: "Tomorrow", yesterday: "Yesterday" },
} as const;

function toDate(value: Date | string): Date {
  return typeof value === "string" ? new Date(value) : value;
}

/** „Šiandien“, „Rytoj“ arba „Šeštadienis, lapkričio 23 d.“ / „Today“, „Saturday, 23 November“. */
export function formatDay(value: Date | string, locale: Locale = DEFAULT_LOCALE, now: Date = new Date()): string {
  const d = toDate(value);
  const key = vilniusDateKey(d);
  const today = vilniusDateKey(now);
  const r = RELATIVE[locale];
  if (key === today) return r.today;
  if (key === addDaysToKey(today, 1)) return r.tomorrow;
  if (key === addDaysToKey(today, -1)) return r.yesterday;
  const f = dateFmt(locale);
  const weekday = f.weekday.format(d);
  // „lt-LT“ formatas jau prideda „d.“, pvz. „lapkričio 22 d.“
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${f.dayMonth.format(d)}`;
}

/** „Šiandien 17:00“ / „Today 17:00“. */
export function formatDateTime(value: Date | string, locale: Locale = DEFAULT_LOCALE, now: Date = new Date()): string {
  const d = toDate(value);
  return `${formatDay(d, locale, now)} ${vilniusTimeKey(d)}`;
}

/** Tik data, be laiko, iš „YYYY-MM-DD“. */
export function formatDateKey(dateKey: string, locale: Locale = DEFAULT_LOCALE, now: Date = new Date()): string {
  return formatDay(new Date(`${dateKey}T12:00:00Z`), locale, now);
}

export function formatRelativePast(value: Date | string, locale: Locale = DEFAULT_LOCALE, now: Date = new Date()): string {
  const d = toDate(value);
  const minutes = Math.round((now.getTime() - d.getTime()) / 60000);
  const en = locale === "en";
  if (minutes < 1) return en ? "just now" : "ką tik";
  if (minutes < 60) return en ? `${minutes} min ago` : `prieš ${minutes} min.`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return en ? `${hours} h ago` : `prieš ${hours} val.`;
  return formatDay(d, locale, now);
}

export const FREQUENCY_LABELS: Record<Locale, Record<Frequency, string>> = {
  lt: { weekly: "Kas savaitę", biweekly: "Kas dvi savaites", monthly: "Kas mėnesį" },
  en: { weekly: "Every week", biweekly: "Every two weeks", monthly: "Every month" },
};

export function frequencyLabel(frequency: string, locale: Locale = DEFAULT_LOCALE): string {
  return FREQUENCY_LABELS[locale][frequency as Frequency] ?? "";
}

export const BUSINESS_FORMS = {
  company: "Įmonė",
  individual: "Individuali veikla",
} as const;
export type BusinessForm = keyof typeof BUSINESS_FORMS;

const BUSINESS_FORMS_EN: Record<BusinessForm, string> = { company: "Company", individual: "Self-employed" };

export function businessFormLabel(form: string, locale: Locale = DEFAULT_LOCALE): string {
  const map = locale === "en" ? BUSINESS_FORMS_EN : BUSINESS_FORMS;
  return map[form as BusinessForm] ?? "";
}

export interface TimingLike {
  type: "asap" | "window" | "flexible";
  windowStart: string | null;
  windowEnd: string | null;
}

/** Pageidaujamas laikas žmogui suprantamu tekstu. */
export function formatTiming(t: TimingLike, locale: Locale = DEFAULT_LOCALE, now: Date = new Date()): string {
  const en = locale === "en";
  if (t.type === "asap") return en ? "As soon as possible" : "Kuo greičiau";
  if (t.type === "flexible") return en ? "Flexible timing" : "Laikas lankstus";
  if (!t.windowStart || !t.windowEnd) return en ? "Chosen time" : "Pasirinktas laikas";
  const start = new Date(t.windowStart);
  const end = new Date(t.windowEnd);
  const sameDay = vilniusDateKey(start) === vilniusDateKey(end);
  if (sameDay) return `${formatDay(start, locale, now)} ${vilniusTimeKey(start)}–${vilniusTimeKey(end)}`;
  return `${formatDay(start, locale, now)} ${vilniusTimeKey(start)} – ${midSentence(formatDay(end, locale, now), locale)} ${vilniusTimeKey(end)}`;
}

/** Sakinio viduryje: lietuviškai mažąja raide; angliškai – tik „today/tomorrow“, o savaitės dienos ir mėnesiai lieka didžiąja. */
export function midSentence(text: string, locale: Locale = DEFAULT_LOCALE): string {
  if (locale === "lt") return text.toLowerCase();
  return /^(Today|Tomorrow|Yesterday)$/.test(text) ? text.toLowerCase() : text;
}
