"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";

/** Pradėti nuo laisvo teksto: „Reikia nupjauti pievą prie sodybos…“ */
export function FreeTextStart() {
  const router = useRouter();
  const [text, setText] = useState("");
  return (
    <form
      className="mt-4 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const t = text.trim();
        router.push(t ? `/nauja-uzklausa?tekstas=${encodeURIComponent(t)}` : "/nauja-uzklausa");
      }}
    >
      <label htmlFor="free-text" className="sr-only">
        Arba aprašykite savais žodžiais
      </label>
      <input
        id="free-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Arba parašykite savais žodžiais…"
        className="h-12 min-w-0 flex-1 rounded-xl border-0 bg-white/95 px-4 text-[16px] text-ink placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-sun-400"
      />
      <button
        type="submit"
        className="inline-flex h-12 shrink-0 items-center gap-1.5 rounded-xl bg-sun-400 px-4 font-bold text-ink hover:bg-sun-200"
      >
        <span className="hidden sm:inline">Tęsti</span>
        <ArrowRight className="size-5" aria-hidden />
      </button>
    </form>
  );
}
