// Bendrų (svetainės ir būsimos programėlės) modulių testai – be serverio.
import { describe, expect, it } from "vitest";
import { describeDetails, requestHeadline } from "@/shared/categories";
import { formatDay, formatPrice, formatPriceLabel, formatTiming } from "@/shared/format";
import { guessMunicipality, MUNICIPALITIES } from "@/shared/municipalities";
import { normalizePhone, parseEurToCents, requestInputSchema } from "@/shared/schemas";
import { nthOccurrence, vilniusDateKey, vilniusTimeKey, vilniusToDate } from "@/shared/time";
import { guessCategory, quickWindows } from "@/components/wizard/state";
import { safeNext } from "@/lib/safe-next";

describe("savivaldybės", () => {
  it("visos 60 Lietuvos savivaldybių, kodai unikalūs", () => {
    expect(MUNICIPALITIES).toHaveLength(60);
    expect(new Set(MUNICIPALITIES.map((m) => m.code)).size).toBe(60);
  });
  it("atpažįsta savivaldybę iš žemėlapio pavadinimo", () => {
    expect(guessMunicipality("Jurbarko rajono savivaldybė")).toBe("jurbarko-r");
    expect(guessMunicipality("Vilniaus miesto savivaldybė")).toBe("vilniaus-m");
    expect(guessMunicipality("Vilniaus rajono savivaldybė")).toBe("vilniaus-r");
    expect(guessMunicipality("Kazlų Rūdos savivaldybė")).toBe("kazlu-rudos");
    expect(guessMunicipality("Birštono savivaldybė")).toBe("birstono");
    expect(guessMunicipality(undefined)).toBeNull();
  });
});

describe("formatavimas", () => {
  it("kaina eurais lietuviškai", () => {
    expect(formatPrice(9000).replace(/\s/g, " ")).toBe("90 €");
    expect(formatPrice(9050).replace(/\s/g, " ")).toBe("90,50 €");
    expect(formatPriceLabel(4000, true).replace(/\s/g, " ")).toBe("40 € už kartą");
    expect(formatPriceLabel(4000, true, "en")).toBe("€40 per visit");
    expect(formatPrice(9050, "en")).toBe("€90.50");
  });
  it("datos be dvigubo „d.“", () => {
    const now = new Date("2026-11-20T10:00:00Z");
    expect(formatDay(new Date("2026-11-20T15:00:00Z"), "lt", now)).toBe("Šiandien");
    expect(formatDay(new Date("2026-11-21T07:00:00Z"), "lt", now)).toBe("Rytoj");
    expect(formatDay(new Date("2026-11-24T07:00:00Z"), "lt", now)).toBe("Antradienis, lapkričio 24 d.");
    expect(formatDay(new Date("2026-11-21T07:00:00Z"), "en", now)).toBe("Tomorrow");
    expect(formatDay(new Date("2026-11-24T07:00:00Z"), "en", now)).toBe("Tuesday, 24 November");
  });
  it("laiko intervalas", () => {
    const now = new Date("2026-11-20T10:00:00Z");
    const t = { type: "window" as const, windowStart: vilniusToDate("2026-11-20", "08:00").toISOString(), windowEnd: vilniusToDate("2026-11-21", "20:00").toISOString() };
    expect(formatTiming(t, "lt", now)).toBe("Šiandien 08:00 – rytoj 20:00");
    expect(formatTiming(t, "en", now)).toBe("Today 08:00 – tomorrow 20:00");
    expect(formatTiming({ type: "asap", windowStart: null, windowEnd: null })).toBe("Kuo greičiau");
  });
  it("antraštė ir apimtis", () => {
    const d = { areaAres: 40, grassHeight: "knee", collectGrass: false, equipment: "provider", tractorAccess: true };
    expect(requestHeadline("mowing", d)).toBe("Žolės pjovimas · apie 40 a");
    expect(describeDetails("mowing", d)).toContain("Žolės surinkti nereikia");
    expect(requestHeadline("helper", { peopleCount: 2, durationHours: 3 })).toBe("Pagalbiniai darbai · 2 žmonės, ~3 val.");
    expect(requestHeadline("mowing", d, "en")).toBe("Grass mowing · about 40 ares");
    expect(describeDetails("mowing", d, "en")).toContain("No need to collect grass");
  });
});

describe("laikas Europe/Vilnius", () => {
  it("vietos laikas → UTC ir atgal", () => {
    const d = vilniusToDate("2026-07-01", "17:00");
    expect(d.toISOString()).toBe("2026-07-01T14:00:00.000Z"); // vasaros laikas UTC+3
    const w = vilniusToDate("2026-12-01", "17:00");
    expect(w.toISOString()).toBe("2026-12-01T15:00:00.000Z"); // žiemos laikas UTC+2
    expect(vilniusDateKey(w)).toBe("2026-12-01");
    expect(vilniusTimeKey(w)).toBe("17:00");
  });
  it("periodiniai vizitai išlaiko vietos valandą per laiko keitimą", () => {
    const first = vilniusToDate("2026-10-15", "09:00");
    const third = nthOccurrence(first, "biweekly", 2); // po spalio 25 d. laiko keitimo
    expect(vilniusDateKey(third)).toBe("2026-11-12");
    expect(vilniusTimeKey(third)).toBe("09:00");
    const m = nthOccurrence(vilniusToDate("2027-01-31", "10:00"), "monthly", 1);
    expect(vilniusDateKey(m)).toBe("2027-02-28");
  });
  it("„Šį savaitgalį“ – šeštadienis–sekmadienis", () => {
    const friday = new Date("2026-11-20T10:00:00Z");
    const weekend = quickWindows(friday).find((q) => q.label === "Šį savaitgalį")!;
    expect(weekend.value.startDate).toBe("2026-11-21");
    expect(weekend.value.endDate).toBe("2026-11-22");
  });
});

describe("įvesties validacija", () => {
  it("telefonai", () => {
    expect(normalizePhone("8 612 34567")).toBe("+37061234567");
    expect(normalizePhone("+370 612 34567")).toBe("+37061234567");
    expect(normalizePhone("abc")).toBeNull();
  });
  it("kaina eurais → centai", () => {
    expect(parseEurToCents("75")).toBe(7500);
    expect(parseEurToCents("90,5 €")).toBe(9050);
    expect(parseEurToCents("-3")).toBeNull();
  });
  it("kategorijos spėjimas iš laisvo teksto", () => {
    expect(guessCategory("Reikia nupjauti pievą")).toBe("mowing");
    expect(guessCategory("apgenėti gyvatvorę")).toBe("pruning");
    expect(guessCategory("sukrauti malkas")).toBe("helper");
  });
  it("pagalbiniams darbams būtinas aprašymas", () => {
    const base = {
      category: "helper",
      description: "trumpai",
      details: { peopleCount: 2, durationHours: null },
      municipality: "kauno-r",
      locality: "Garliava",
      address: "Vytauto g. 1",
      contactPhone: "+37060000000",
      timing: { type: "flexible" },
      recurrence: { type: "once" },
    };
    const bad = requestInputSchema.safeParse(base);
    expect(bad.success).toBe(false);
    const good = requestInputSchema.safeParse({ ...base, description: "Reikia sukrauti malkas į pašiūrę" });
    expect(good.success).toBe(true);
  });
});

describe("grįžimo nuoroda po prisijungimo", () => {
  it("leidžia tik šios svetainės kelius", () => {
    expect(safeNext("/mano-uzklausos")).toBe("/mano-uzklausos");
    expect(safeNext("//evil.example")).toBeNull();
    expect(safeNext("/\\evil.example")).toBeNull();
    expect(safeNext("https://evil.example")).toBeNull();
    expect(safeNext(undefined)).toBeNull();
  });
});
