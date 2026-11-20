"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { api } from "@/lib/api-client";
import { useI18n } from "@/i18n/client";

type DemoAs = "client" | "tomas" | "company";

const ACCOUNTS: DemoAs[] = ["client", "tomas", "company"];

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
  const { t } = useI18n();
  const { login, pending, error } = useDemoLogin();
  return (
    <div className="bg-ink text-white">
      <div className="mx-auto max-w-5xl px-4 py-2 text-xs sm:text-sm">
        <p className="flex flex-wrap items-center gap-x-2">
          <span className="rounded-full bg-sun-400 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-ink">Demo</span>
          <span className="font-semibold">{name}</span>
          <span className="hidden text-white/70 sm:inline">· {t.demo.bar}</span>
        </p>
        <div className="-mx-4 mt-1.5 flex gap-1.5 overflow-x-auto px-4 pb-0.5">
          {ACCOUNTS.map((k) => (
            <button
              key={k}
              type="button"
              disabled={pending}
              onClick={() => login(k)}
              className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 font-medium hover:bg-white/20 disabled:opacity-50"
            >
              {t.demo[k]}
            </button>
          ))}
          <button
            type="button"
            disabled={pending}
            onClick={() => login("client", true)}
            className="shrink-0 rounded-full border border-white/30 px-2.5 py-1 font-medium hover:bg-white/10 disabled:opacity-50"
          >
            {t.demo.reset}
          </button>
        </div>
        {error && <p className="mt-1 text-sun-200">{error}</p>}
      </div>
    </div>
  );
}
