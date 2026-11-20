"use client";

import { useI18n } from "@/i18n/client";
import { Button, EmptyState } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const { t } = useI18n();
  return (
    <EmptyState title={t.common.errorTitle} action={<Button onClick={reset}>{t.common.retry}</Button>}>
      {t.common.errorText}
    </EmptyState>
  );
}
