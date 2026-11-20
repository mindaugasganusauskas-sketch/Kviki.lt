"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { api } from "@/lib/api-client";
import { useI18n } from "@/i18n/client";
import { LOCALES, type Locale } from "@/shared/locale";
import { cx } from "./ui";

/** LT | EN perjungiklis antraštėje. */
export function LanguageSwitch() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  const choose = (next: Locale) =>
    start(async () => {
      if (next === locale) return;
      try {
        await api("/api/v1/locale", { json: { locale: next } });
      } finally {
        router.refresh();
      }
    });
  return (
    <div role="group" aria-label={t.common.language} className={cx("flex rounded-full bg-stone-100 p-0.5 text-xs font-bold", pending && "opacity-60")}>
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={l === locale}
          onClick={() => choose(l)}
          className={cx("h-7 rounded-full px-2.5 uppercase", l === locale ? "bg-white text-ink shadow-sm" : "text-stone-500 hover:text-ink")}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
