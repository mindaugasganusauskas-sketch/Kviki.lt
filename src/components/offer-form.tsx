"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Send } from "lucide-react";
import { api } from "@/lib/api-client";
import { formatDateTime, formatPrice } from "@/shared/format";
import { parseEurToCents } from "@/shared/schemas";
import { addDaysToKey, vilniusDateKey, vilniusTimeKey, vilniusToDate } from "@/shared/time";
import type { OfferDTO } from "@/shared/types";
import { Alert, Button, Field, Input, Textarea, cx } from "./ui";
import { useI18n } from "@/i18n/client";


function defaultStart(): { date: string; time: string } {
  const now = new Date();
  const today = vilniusDateKey(now);
  const hour = Number(vilniusTimeKey(now).slice(0, 2));
  if (hour < 16) return { date: today, time: `${String(Math.max(hour + 2, 9)).padStart(2, "0")}:00` };
  return { date: addDaysToKey(today, 1), time: "09:00" };
}

export function OfferForm({
  requestId,
  perVisit,
  existing,
  onDone,
  suggestedStartDate,
}: {
  requestId: string;
  perVisit: boolean;
  existing: OfferDTO | null;
  onDone?: () => void;
  suggestedStartDate?: string | null;
}) {
  const { t, locale } = useI18n();
  const f = t.offerForm;
  const INCLUDED_CHIPS = f.chips;
  const router = useRouter();
  const initial = existing
    ? { date: vilniusDateKey(new Date(existing.startAt)), time: vilniusTimeKey(new Date(existing.startAt)) }
    : suggestedStartDate && suggestedStartDate > vilniusDateKey(new Date())
      ? { date: suggestedStartDate, time: "09:00" }
      : defaultStart();
  const [price, setPrice] = useState(existing ? String(existing.priceCents / 100).replace(".", ",") : "");
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [included, setIncluded] = useState(existing?.included ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const today = vilniusDateKey(new Date());
  const cents = parseEurToCents(price);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (cents === null || cents < 100) {
      setError(f.errPrice);
      return;
    }
    if (!date || !time) {
      setError(f.errStart);
      return;
    }
    setPending(true);
    try {
      const body = { priceCents: cents, startAt: vilniusToDate(date, time).toISOString(), included };
      await api(`/api/v1/requests/${requestId}/offers`, { json: body });
      onDone?.();
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  function toggleChip(chip: string) {
    const parts = included.split(/,\s*/).map((p) => p.trim()).filter(Boolean);
    const has = parts.some((p) => p.toLowerCase() === chip.toLowerCase());
    const next = has ? parts.filter((p) => p.toLowerCase() !== chip.toLowerCase()) : [...parts, parts.length ? chip.toLowerCase() : chip];
    setIncluded(next.join(", "));
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field
        label={perVisit ? f.pricePerVisit : f.priceFinal}
        htmlFor="o-price"
        hint={perVisit ? f.pricePerVisitHint : f.priceFinalHint}
      >
        <div className="relative w-44">
          <Input
            id="o-price"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="75"
            className="pr-10 text-lg font-bold"
          />
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 font-semibold text-muted">€</span>
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={perVisit ? f.firstVisit : f.canStart} htmlFor="o-date">
          <Input id="o-date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label={f.time} htmlFor="o-time">
          <Input id="o-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>
      <Field label={f.included} htmlFor="o-incl">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {INCLUDED_CHIPS.map((chip) => {
            const on = included.toLowerCase().includes(chip.toLowerCase());
            return (
              <button
                key={chip}
                type="button"
                onClick={() => toggleChip(chip)}
                className={cx(
                  "h-8 rounded-full border px-3 text-xs font-semibold",
                  on ? "border-brand-500 bg-brand-50 text-brand-800" : "border-line bg-white hover:bg-paper",
                )}
              >
                {chip}
              </button>
            );
          })}
        </div>
        <Textarea id="o-incl" rows={2} value={included} onChange={(e) => setIncluded(e.target.value)} placeholder={f.includedPlaceholder} />
      </Field>
      {cents !== null && date && time && (
        <p className="rounded-xl bg-paper p-3 text-sm">
          {f.preview} <strong>{formatPrice(cents, locale)}{perVisit ? f.perVisitSuffix : ""}</strong>, {f.previewStart}{" "}
          <strong>{formatDateTime(vilniusToDate(date, time), locale)}</strong>
        </p>
      )}
      {error && <Alert tone="error">{error}</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg" loading={pending} className="flex-1 sm:flex-none">
          <Send className="size-5" aria-hidden />
          {existing && existing.status === "active" ? f.save : f.submit}
        </Button>
        {onDone && existing && (
          <Button type="button" variant="ghost" size="lg" onClick={onDone}>
            {t.common.cancel}
          </Button>
        )}
      </div>
    </form>
  );
}
