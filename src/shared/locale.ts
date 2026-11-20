// Palaikomos kalbos. Modulis be priklausomybių – tinka ir mobiliajai programėlei.
export const LOCALES = ["lt", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "lt";
export const LOCALE_COOKIE = "kviki_lang";

export function isLocale(value: unknown): value is Locale {
  return value === "lt" || value === "en";
}

/** Intl kalbos žymė datoms ir kainoms. */
export function intlTag(locale: Locale): string {
  return locale === "en" ? "en-GB" : "lt-LT";
}
