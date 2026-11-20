import { getI18n } from "@/i18n/server";
import { Spinner } from "@/components/ui";

export default async function Loading() {
  const { t } = await getI18n();
  return (
    <div className="flex min-h-[40vh] items-center justify-center gap-3 text-muted" role="status">
      <Spinner /> {t.common.loading}
    </div>
  );
}
