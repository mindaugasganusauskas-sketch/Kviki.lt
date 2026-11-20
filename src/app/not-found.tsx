import { getI18n } from "@/i18n/server";
import { ButtonLink, EmptyState } from "@/components/ui";

export default async function NotFound() {
  const { t } = await getI18n();
  return (
    <EmptyState title={t.common.notFoundTitle} action={<ButtonLink href="/">{t.common.toHome}</ButtonLink>}>
      {t.common.notFoundText}
    </EmptyState>
  );
}
