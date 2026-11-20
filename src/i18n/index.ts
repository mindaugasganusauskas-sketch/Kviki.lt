import { en } from "./en";
import { lt, type Dict } from "./lt";
import type { Locale } from "@/shared/locale";

export const dictionaries: Record<Locale, Dict> = { lt, en };
export type { Dict };
