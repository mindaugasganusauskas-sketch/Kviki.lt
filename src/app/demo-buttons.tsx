"use client";

import { useDemoLogin } from "@/components/demo-bar";
import { Button } from "@/components/ui";

export function DemoButtons() {
  const { login, pending, error } = useDemoLogin();
  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="accent" onClick={() => login("client")} loading={pending}>
          Išbandyti kaip klientas
        </Button>
        <Button type="button" variant="outline" onClick={() => login("tomas")} disabled={pending}>
          Išbandyti kaip teikėjas
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
