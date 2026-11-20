"use client";

import { useState } from "react";
import { LocateFixed } from "lucide-react";
import { guessMunicipality } from "@/shared/municipalities";
import { Spinner } from "../ui";

export interface FoundLocation {
  lat: number;
  lng: number;
  municipality: string | null;
  locality: string | null;
  address: string | null;
}

/**
 * Vietos nustatymas gavus leidimą. Adresą pagal koordinates pasiūlo „OpenStreetMap“ paslauga.
 * Atsisakius leidimo viską galima įvesti ranka.
 */
export function LocationButton({ onFound }: { onFound: (loc: FoundLocation) => void }) {
  const [state, setState] = useState<"idle" | "busy" | "ok" | "denied" | "error">("idle");

  function locate() {
    if (!("geolocation" in navigator)) {
      setState("error");
      return;
    }
    setState("busy");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Math.round(pos.coords.latitude * 1e5) / 1e5;
        const lng = Math.round(pos.coords.longitude * 1e5) / 1e5;
        let found: FoundLocation = { lat, lng, municipality: null, locality: null, address: null };
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=lt`,
          );
          const j = (await res.json()) as { address?: Record<string, string> };
          const a = j.address ?? {};
          const locality = a.village ?? a.hamlet ?? a.isolated_dwelling ?? a.town ?? a.city ?? a.suburb ?? null;
          const street = [a.road, a.house_number].filter(Boolean).join(" ");
          found = {
            lat,
            lng,
            municipality: guessMunicipality(a.municipality) ?? guessMunicipality(a.city) ?? guessMunicipality(a.county),
            locality,
            address: street ? `${street}${locality ? `, ${locality}` : ""}` : null,
          };
        } catch {
          /* adreso nepavyko gauti – koordinatės vis tiek išsaugomos */
        }
        onFound(found);
        setState("ok");
      },
      (err) => setState(err.code === err.PERMISSION_DENIED ? "denied" : "error"),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={locate}
        disabled={state === "busy"}
        className="inline-flex h-11 items-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 text-sm font-semibold text-brand-800 hover:bg-brand-100 disabled:opacity-60"
      >
        {state === "busy" ? <Spinner className="size-4" /> : <LocateFixed className="size-5" aria-hidden />}
        Naudoti mano vietą
      </button>
      {state === "ok" && <p className="mt-1.5 text-xs text-brand-700">Vieta nustatyta. Patikrinkite ir, jei reikia, pataisykite laukus.</p>}
      {state === "denied" && (
        <p className="mt-1.5 text-xs text-muted">Vietos nustatymas išjungtas – nieko tokio, įveskite vietą ranka.</p>
      )}
      {state === "error" && <p className="mt-1.5 text-xs text-muted">Nepavyko nustatyti vietos. Įveskite ją ranka.</p>}
    </div>
  );
}
