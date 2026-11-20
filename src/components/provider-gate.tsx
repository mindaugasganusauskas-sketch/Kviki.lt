import { BadgeCheck } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { ButtonLink, EmptyState } from "./ui";

export async function ProviderGate() {
  const { t } = await getI18n();
  return (
    <EmptyState icon={<BadgeCheck className="size-6" />} title={t.provider.gateTitle} action={<ButtonLink href="/paskyra/teikejas">{t.provider.become}</ButtonLink>}>
      {t.provider.gateText}
    </EmptyState>
  );
}
