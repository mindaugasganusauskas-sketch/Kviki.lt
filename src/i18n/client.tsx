"use client";

import { createContext, useContext } from "react";
import { DEFAULT_LOCALE, type Locale } from "@/shared/locale";
import { dictionaries, type Dict } from "./index";

const I18nContext = createContext<{ locale: Locale; t: Dict }>({ locale: DEFAULT_LOCALE, t: dictionaries[DEFAULT_LOCALE] });

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <I18nContext.Provider value={{ locale, t: dictionaries[locale] }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
