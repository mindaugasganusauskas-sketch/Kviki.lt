"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpDown, BadgeCheck, Building2, CalendarClock, User, X } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { businessFormLabel, formatDateTime, formatPrice } from "@/shared/format";
import type { OfferDTO } from "@/shared/types";
import { Alert, Badge, Button, cx } from "./ui";

type Sort = "price" | "time";

function ProviderLine({ offer }: { offer: OfferDTO }) {
  const Icon = offer.provider.businessForm === "company" ? Building2 : User;
  return (
    <div className="min-w-0">
      <p className="flex flex-wrap items-center gap-1.5 font-bold">
        {offer.provider.displayName}
        {offer.provider.verified && (
          <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-brand-700" title="Teikėjo duomenys patikrinti">
            <BadgeCheck className="size-4" aria-hidden /> Patikrinta
          </span>
        )}
      </p>
      <p className="mt-0.5 inline-flex items-center gap-1 text-sm text-muted">
        <Icon className="size-3.5" aria-hidden /> {businessFormLabel(offer.provider.businessForm)}
      </p>
    </div>
  );
}

function PriceBlock({ offer, large = false }: { offer: OfferDTO; large?: boolean }) {
  return (
    <div>
      <p className={cx("font-extrabold tabular-nums text-ink", large ? "text-3xl" : "text-2xl")}>{formatPrice(offer.priceCents)}</p>
      <p className="text-xs font-medium text-muted">{offer.perVisit ? "už vieną vizitą" : "galutinė kaina"}</p>
    </div>
  );
}

export function OffersCompare({ requestId, offers }: { requestId: string; offers: OfferDTO[] }) {
  const router = useRouter();
  const [sort, setSort] = useState<Sort>("price");
  const [selected, setSelected] = useState<OfferDTO | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const sorted = useMemo(() => {
    const list = [...offers];
    list.sort((a, b) =>
      sort === "price"
        ? a.priceCents - b.priceCents || a.startAt.localeCompare(b.startAt)
        : a.startAt.localeCompare(b.startAt) || a.priceCents - b.priceCents,
    );
    // Nepatvirtinti po pakeitimų – sąrašo gale.
    return [...list.filter((o) => !o.needsReconfirmation), ...list.filter((o) => o.needsReconfirmation)];
  }, [offers, sort]);

  const cheapest = Math.min(...offers.filter((o) => !o.needsReconfirmation).map((o) => o.priceCents));
  const earliest = offers.filter((o) => !o.needsReconfirmation).map((o) => o.startAt).sort()[0];

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (selected && !d.open) d.showModal();
    if (!selected && d.open) d.close();
  }, [selected]);

  // Jei pasirinkto pasiūlymo sąlygos pasikeitė fone – rodome naujausias.
  useEffect(() => {
    if (!selected) return;
    const fresh = offers.find((o) => o.id === selected.id);
    if (!fresh) return;
    if (fresh.version !== selected.version || fresh.needsReconfirmation !== selected.needsReconfirmation) {
      setError("Teikėjas ką tik pakeitė pasiūlymą. Peržiūrėkite naujas sąlygas.");
      setSelected(fresh);
    }
  }, [offers, selected]);

  async function accept() {
    if (!selected) return;
    setPending(true);
    setError(null);
    try {
      const res = await api<{ agreementId: string }>(`/api/v1/requests/${requestId}/accept`, {
        json: { offerId: selected.id, offerVersion: selected.version },
      });
      router.push(`/susitarimai/${res.agreementId}?sutarta=1`);
      router.refresh();
    } catch (err) {
      setPending(false);
      if (err instanceof ApiError && err.code === "OFFER_CHANGED") {
        const fresh = (err.details as { offer?: OfferDTO } | undefined)?.offer;
        setSelected(null);
        setNotice(`${err.message}${fresh && fresh.status === "active" ? "" : ""}`);
        router.refresh();
        return;
      }
      if (err instanceof ApiError && err.code === "ALREADY_AGREED") {
        setSelected(null);
        setNotice(err.message);
        router.refresh();
        return;
      }
      setError((err as Error).message);
    }
  }

  return (
    <div>
      {notice && (
        <Alert tone="warning" className="mb-3" title="Sąlygos pasikeitė">
          {notice}
        </Alert>
      )}
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {offers.length} {offers.length === 1 ? "pasiūlymas" : offers.length < 10 ? "pasiūlymai" : "pasiūlymų"}
        </p>
        <div className="flex items-center gap-1 rounded-xl bg-stone-100 p-1 text-sm" role="group" aria-label="Rikiuoti">
          <ArrowUpDown className="ml-1.5 size-4 text-muted" aria-hidden />
          {(
            [
              ["price", "Pigiausi"],
              ["time", "Anksčiausi"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={sort === k}
              onClick={() => setSort(k)}
              className={cx("h-8 rounded-lg px-3 font-semibold", sort === k ? "bg-white shadow-sm" : "text-stone-600")}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Didesniame ekrane – palyginimo lentelė */}
      <div className="hidden overflow-hidden rounded-2xl border border-line bg-white md:block">
        <table className="w-full text-left">
          <thead className="bg-paper text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Teikėjas</th>
              <th className="px-4 py-3 font-semibold">Galima pradžia</th>
              <th className="px-4 py-3 font-semibold">Kaina</th>
              <th className="px-4 py-3 font-semibold">Kas įskaičiuota</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((o) => (
              <tr key={o.id} className={cx("border-t border-line align-top", o.needsReconfirmation && "bg-stone-50 text-muted")} data-testid="offer-row">
                <td className="px-4 py-4">
                  <ProviderLine offer={o} />
                </td>
                <td className="px-4 py-4">
                  <p className="font-semibold">{formatDateTime(o.startAt)}</p>
                  {o.startAt === earliest && !o.needsReconfirmation && offers.length > 1 && <Badge tone="blue">Anksčiausiai</Badge>}
                </td>
                <td className="px-4 py-4">
                  <PriceBlock offer={o} />
                  {o.priceCents === cheapest && !o.needsReconfirmation && offers.length > 1 && <Badge tone="green">Pigiausia</Badge>}
                </td>
                <td className="max-w-xs px-4 py-4 text-sm">{o.included}</td>
                <td className="px-4 py-4 text-right">
                  {o.needsReconfirmation ? (
                    <Badge tone="amber">Laukiama teikėjo patvirtinimo</Badge>
                  ) : (
                    <Button onClick={() => { setError(null); setNotice(null); setSelected(o); }}>Pasirinkti</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Telefone – vertikalios kortelės */}
      <ul className="grid gap-3 md:hidden">
        {sorted.map((o) => (
          <li key={o.id} className={cx("rounded-2xl border border-line bg-white p-4", o.needsReconfirmation && "opacity-70")} data-testid="offer-card">
            <div className="flex items-start justify-between gap-3">
              <PriceBlock offer={o} />
              <div className="text-right">
                <p className="inline-flex items-center gap-1 font-semibold">
                  <CalendarClock className="size-4 text-brand-600" aria-hidden />
                  {formatDateTime(o.startAt)}
                </p>
                <div className="mt-1 flex flex-wrap justify-end gap-1">
                  {o.priceCents === cheapest && !o.needsReconfirmation && offers.length > 1 && <Badge tone="green">Pigiausia</Badge>}
                  {o.startAt === earliest && !o.needsReconfirmation && offers.length > 1 && <Badge tone="blue">Anksčiausiai</Badge>}
                </div>
              </div>
            </div>
            <div className="mt-3 border-t border-line pt-3">
              <ProviderLine offer={o} />
              <p className="mt-2 text-sm">{o.included}</p>
            </div>
            {o.needsReconfirmation ? (
              <p className="mt-3 text-sm font-medium text-sun-700">Po jūsų pakeitimų laukiama teikėjo patvirtinimo</p>
            ) : (
              <Button className="mt-3 w-full" onClick={() => { setError(null); setNotice(null); setSelected(o); }}>
                Pasirinkti
              </Button>
            )}
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        onClose={() => setSelected(null)}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl p-0 shadow-2xl backdrop:bg-black/40"
        aria-labelledby="confirm-title"
      >
        {selected && (
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 id="confirm-title" className="text-xl font-bold">
                Patvirtinti susitarimą?
              </h2>
              <button type="button" onClick={() => setSelected(null)} aria-label="Uždaryti" className="rounded-lg p-1 hover:bg-stone-100">
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="mt-4 space-y-3 rounded-xl bg-paper p-4">
              <ProviderLine offer={selected} />
              <div className="flex flex-wrap items-end justify-between gap-3">
                <PriceBlock offer={selected} large />
                <div className="text-right">
                  <p className="text-xs text-muted">{selected.perVisit ? "Pirmas vizitas" : "Pradžia"}</p>
                  <p className="font-bold">{formatDateTime(selected.startAt)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted">Kas įskaičiuota</p>
                <p className="font-medium">{selected.included}</p>
              </div>
            </div>
            <ul className="mt-4 space-y-1.5 text-sm text-stone-700">
              <li>• Teikėjas gaus jūsų tikslų adresą ir telefoną.</li>
              <li>• Kiti pasiūlymai bus uždaryti.</li>
              <li>• Apmokėjimą sutvarkote tiesiogiai su teikėju{selected.perVisit ? " už kiekvieną vizitą" : ""}.</li>
            </ul>
            {error && (
              <Alert tone="warning" className="mt-4">
                {error}
              </Alert>
            )}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setSelected(null)} disabled={pending}>
                Atgal
              </Button>
              <Button onClick={accept} loading={pending} disabled={selected.needsReconfirmation || selected.status !== "active"}>
                Patvirtinti už {formatPrice(selected.priceCents)}
                {selected.perVisit ? " / kartą" : ""}
              </Button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
