"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Building2, Search, User, X } from "lucide-react";
import { api } from "@/lib/api-client";
import { CATEGORIES, type CategoryId } from "@/shared/categories";
import { foldLt, MUNICIPALITIES, municipalityLabel } from "@/shared/municipalities";
import type { ProviderProfileDTO } from "@/shared/types";
import { Alert, Button, Card, Field, Input, Textarea, cx } from "@/components/ui";

export function ProviderProfileForm({
  profile,
  defaultName,
  defaultPhone,
}: {
  profile: ProviderProfileDTO | null;
  defaultName: string;
  defaultPhone: string;
}) {
  const router = useRouter();
  const [businessForm, setBusinessForm] = useState<"individual" | "company">(profile?.businessForm ?? "individual");
  const [displayName, setDisplayName] = useState(profile?.displayName ?? defaultName);
  const [companyCode, setCompanyCode] = useState(profile?.companyCode ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? defaultPhone);
  const [description, setDescription] = useState(profile?.description ?? "");
  const [categories, setCategories] = useState<CategoryId[]>(profile?.categories ?? []);
  const [areas, setAreas] = useState<string[]>(profile?.municipalities ?? []);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const sorted = useMemo(() => [...MUNICIPALITIES].sort((a, b) => a.label.localeCompare(b.label, "lt")), []);
  const filtered = query ? sorted.filter((m) => foldLt(m.label).includes(foldLt(query))) : sorted;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api("/api/v1/me/provider-profile", {
        method: "PUT",
        json: { businessForm, displayName, companyCode: businessForm === "company" ? companyCode : "", phone, description, categories, municipalities: areas },
      });
      router.push("/darbai-salia");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <Card className="space-y-4">
        <Field label="Veiklos forma">
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Veiklos forma">
            {(
              [
                ["individual", "Individuali veikla", "Fizinis asmuo, dirbantis pagal individualią veiklą", User],
                ["company", "Įmonė", "UAB, MB, IĮ ar kita juridinė forma", Building2],
              ] as const
            ).map(([value, label, hint, Icon]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={businessForm === value}
                onClick={() => setBusinessForm(value)}
                className={cx(
                  "flex gap-3 rounded-xl border p-3.5 text-left",
                  businessForm === value ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500" : "border-line bg-white hover:bg-paper",
                )}
              >
                <Icon className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
                <span>
                  <span className="block font-semibold">{label}</span>
                  <span className="block text-xs text-muted">{hint}</span>
                </span>
              </button>
            ))}
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={businessForm === "company" ? "Įmonės pavadinimas" : "Vardas, kurį matys klientai"} htmlFor="p-name">
            <Input id="p-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </Field>
          {businessForm === "company" && (
            <Field label="Įmonės kodas" htmlFor="p-code" optional>
              <Input id="p-code" inputMode="numeric" value={companyCode} onChange={(e) => setCompanyCode(e.target.value)} />
            </Field>
          )}
          <Field label="Telefonas" htmlFor="p-phone" hint="Klientas jį matys tik pasirinkęs jūsų pasiūlymą.">
            <Input id="p-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
          </Field>
        </div>
        <Field label="Trumpai apie save" htmlFor="p-desc" optional hint="Pvz., kokią techniką turite, kiek metų dirbate">
          <Textarea id="p-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </Card>

      <Card>
        <Field label="Kokias paslaugas teikiate?">
          <div className="grid gap-2 sm:grid-cols-2">
            {CATEGORIES.map((c) => {
              const on = categories.includes(c.id);
              return (
                <label
                  key={c.id}
                  className={cx(
                    "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2 text-sm font-medium",
                    on ? "border-brand-500 bg-brand-50" : "border-line bg-white hover:bg-paper",
                  )}
                >
                  <input
                    type="checkbox"
                    className="size-5 accent-brand-600"
                    checked={on}
                    onChange={(e) => setCategories(e.target.checked ? [...categories, c.id] : categories.filter((x) => x !== c.id))}
                  />
                  {c.label}
                </label>
              );
            })}
          </div>
        </Field>
      </Card>

      <Card>
        <Field label="Kuriose savivaldybėse dirbate?" hint="Matysite tik šiose savivaldybėse paskelbtus darbus.">
          {areas.length > 0 && (
            <ul className="mb-3 flex flex-wrap gap-1.5">
              {areas.map((code) => (
                <li key={code}>
                  <button
                    type="button"
                    onClick={() => setAreas(areas.filter((a) => a !== code))}
                    className="inline-flex h-8 items-center gap-1 rounded-full bg-brand-600 px-3 text-xs font-semibold text-white"
                  >
                    {municipalityLabel(code)} <X className="size-3.5" aria-label="pašalinti" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ieškoti savivaldybės" className="pl-9" aria-label="Ieškoti savivaldybės" />
          </div>
          <ul className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-line">
            {filtered.map((m) => {
              const on = areas.includes(m.code);
              return (
                <li key={m.code} className="border-b border-line last:border-0">
                  <label className="flex cursor-pointer items-center gap-3 px-3.5 py-2.5 text-sm hover:bg-paper">
                    <input
                      type="checkbox"
                      className="size-5 accent-brand-600"
                      checked={on}
                      onChange={(e) => setAreas(e.target.checked ? [...areas, m.code] : areas.filter((a) => a !== m.code))}
                    />
                    {m.label}
                  </label>
                </li>
              );
            })}
            {filtered.length === 0 && <li className="px-3.5 py-3 text-sm text-muted">Nerasta</li>}
          </ul>
        </Field>
      </Card>

      {error && <Alert tone="error">{error}</Alert>}
      <Button type="submit" size="lg" className="w-full sm:w-auto" loading={pending}>
        {profile ? "Išsaugoti profilį" : "Tapti teikėju ir žiūrėti darbus"}
      </Button>
    </form>
  );
}
