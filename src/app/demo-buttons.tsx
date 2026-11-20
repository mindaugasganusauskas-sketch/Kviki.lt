"use client";

import { useDemoLogin } from "@/components/demo-bar";
import { Button } from "@/components/ui";
import { useI18n } from "@/i18n/client";

export function DemoButtons() {
  const { t } = useI18n();
  const { login, pending, error } = useDemoLogin();
  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="accent" onClick={() => login("client")} loading={pending}>
          {t.demo.tryClient}
        </Button>
        <Button type="button" variant="outline" onClick={() => login("tomas")} disabled={pending}>
          {t.demo.tryProvider}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
