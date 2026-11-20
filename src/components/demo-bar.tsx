"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { api } from "@/lib/api-client";

type DemoAs = "client" | "tomas" | "company";

const LABELS: Record<DemoAs, string> = {
  client: "Rūta (klientė)",
  tomas: "Tomas (individuali veikla)",
  company: "Žalias kiemas (įmonė)",
};

export function useDemoLogin() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const login = (as: DemoAs, reset = false) =>
    start(async () => {
      try {
        setError(null);
        await api("/api/v1/auth/demo", { json: { as, reset } });
        router.push(as === "client" ? "/mano-uzklausos" : "/darbai-salia");
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  return { login, pending, error };
}

/** Juosta demonstracinėse paskyrose: aiškiai pažymi, kad duomenys išgalvoti. */
export function DemoBar({ name }: { name: string }) {
  const { login, pending, error } = useDemoLogin();
  return (
    <div className="bg-violet-700 text-white">
      <div className="mx-auto max-w-5xl px-4 py-2 text-xs sm:text-sm">
        <p>
          <span className="font-semibold">Demonstracija</span> · {name}
          <span className="hidden sm:inline"> · Visi duomenys išgalvoti ir matomi tik demonstracijoje.</span>
        </p>
        <div className="-mx-4 mt-1.5 flex gap-1.5 overflow-x-auto px-4 pb-0.5">
          {(Object.keys(LABELS) as DemoAs[]).map((k) => (
            <button
              key={k}
              type="button"
              disabled={pending}
              onClick={() => login(k)}
              className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 font-medium hover:bg-white/25 disabled:opacity-50"
            >
              {LABELS[k]}
            </button>
          ))}
          <button
            type="button"
            disabled={pending}
            onClick={() => login("client", true)}
            className="shrink-0 rounded-full border border-white/40 px-2.5 py-1 font-medium hover:bg-white/10 disabled:opacity-50"
          >
            Atkurti pradžią
          </button>
        </div>
        {error && <p className="mt-1 text-sun-200">{error}</p>}
      </div>
    </div>
  );
}
