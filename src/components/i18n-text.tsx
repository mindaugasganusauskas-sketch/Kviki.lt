"use client";

import { useI18n } from "@/i18n/client";

/** „(nebūtina)“ / „(optional)“ – naudojama ir serverio komponentuose. */
export function OptionalLabel() {
  const { t } = useI18n();
  return <span className="ml-1 font-normal text-muted">{t.common.optional}</span>;
}
