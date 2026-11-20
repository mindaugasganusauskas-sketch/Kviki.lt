// Laiko pagalbinės funkcijos. Visi laikai saugomi UTC, rodomi „Europe/Vilnius“ juostoje.
import { TZDate } from "@date-fns/tz";
import { addDays, addMonths, addWeeks } from "date-fns";

export const TIME_ZONE = "Europe/Vilnius";

/** „2026-11-21“ + „17:00“ Vilniaus laiku → tikslus laiko momentas. */
export function vilniusToDate(date: string, time = "00:00"): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(new TZDate(y, m - 1, d, hh || 0, mm || 0, 0, TIME_ZONE).getTime());
}

/** Vilniaus kalendorinė data „YYYY-MM-DD“. */
export function vilniusDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Vilniaus laikas „HH:MM“. */
export function vilniusTimeKey(date: Date): string {
  return new Intl.DateTimeFormat("lt-LT", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function addDaysToKey(dateKey: string, days: number): string {
  const d = new TZDate(dateKey + "T12:00:00", TIME_ZONE);
  return vilniusDateKey(addDays(d, days));
}

/** Vilniaus savaitės diena: 1 = pirmadienis … 7 = sekmadienis. */
export function vilniusWeekday(dateKey: string): number {
  const day = new TZDate(dateKey + "T12:00:00", TIME_ZONE).getDay();
  return day === 0 ? 7 : day;
}

export const FREQUENCIES = {
  weekly: "Kas savaitę",
  biweekly: "Kas dvi savaites",
  monthly: "Kas mėnesį",
} as const;
export type Frequency = keyof typeof FREQUENCIES;

/**
 * n-tasis vizitas (0 – pirmas) skaičiuojamas nuo pirmojo vizito Vilniaus vietos laiku,
 * kad pasikeitus vasaros/žiemos laikui vizito valanda nepasislinktų.
 */
export function nthOccurrence(first: Date, frequency: Frequency, n: number): Date {
  const base = new TZDate(first.getTime(), TIME_ZONE);
  const next =
    frequency === "weekly" ? addWeeks(base, n) : frequency === "biweekly" ? addWeeks(base, 2 * n) : addMonths(base, n);
  return new Date(next.getTime());
}
