"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Lock, Minus, Plus, Send } from "lucide-react";
import { api } from "@/lib/api-client";
import {
  CATEGORIES,
  describeDetails,
  EQUIPMENT,
  GRASS_HEIGHTS,
  PRUNING_TARGETS,
  requestHeadline,
  YARD_TASKS,
  type CategoryId,
  type DetailsByCategory,
} from "@/shared/categories";
import { formatDateKey, formatTiming, frequencyLabel } from "@/shared/format";
import { MUNICIPALITIES, municipalityLabel } from "@/shared/municipalities";
import { FREQUENCIES, vilniusDateKey, vilniusToDate, type Frequency } from "@/shared/time";
import type { PhotoDTO, UserDTO } from "@/shared/types";
import { AuthForm } from "../auth-form";
import { CategoryIcon } from "../category-icon";
import { Alert, Button, Card, Field, Input, Select, Textarea, cx } from "../ui";
import { LocationButton } from "./location-button";
import { PhotoPicker } from "./photo-picker";
import {
  emptyState,
  guessCategory,
  quickWindows,
  STEPS,
  toPayload,
  validateStep,
  type StepErrors,
  type WizardState,
} from "./state";

const DRAFT_KEY = "kviki:juodrastis:v1";

function Choice<T extends string>({
  value,
  options,
  onChange,
  name,
  columns = 2,
}: {
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
  name: string;
  columns?: 2 | 3 | 4;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className={cx("grid gap-2", columns === 2 ? "grid-cols-2" : columns === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-4")}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "min-h-11 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition",
            value === o.value ? "border-brand-500 bg-brand-50 text-brand-900 ring-1 ring-brand-500" : "border-line bg-white hover:bg-paper",
          )}
        >
          {o.label}
          {o.hint && <span className="mt-0.5 block text-xs font-normal text-muted">{o.hint}</span>}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-line bg-white px-3.5 py-2 text-sm font-medium hover:bg-paper">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-5 accent-brand-600" />
      {label}
    </label>
  );
}

function numberOrNull(v: string): number | null {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export interface WizardProps {
  mode: "create" | "edit";
  requestId?: string;
  initial?: WizardState;
  existingPhotos?: PhotoDTO[];
  user: { name: string; phone: string | null; isDemo?: boolean } | null;
  startCategory?: CategoryId | null;
  startText?: string | null;
  hasOffers?: boolean;
}

export function RequestWizard(props: WizardProps) {
  const router = useRouter();
  const [s, setS] = useState<WizardState>(() => props.initial ?? emptyState(props.user?.phone ?? ""));
  const [step, setStep] = useState(props.mode === "edit" ? 1 : 0);
  const [errors, setErrors] = useState<StepErrors>({});
  const [files, setFiles] = useState<File[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [user, setUser] = useState(props.user);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const hydrated = useRef(false);

  // Juodraštis: įvesti duomenys išlieka net perkrovus puslapį ar prisijungus.
  useEffect(() => {
    if (props.mode !== "create" || hydrated.current) return;
    hydrated.current = true;
    let next: WizardState | null = null;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) next = { ...emptyState(props.user?.phone ?? ""), ...(JSON.parse(raw) as WizardState) };
    } catch {
      next = null;
    }
    if (props.startCategory || props.startText) {
      const base = next && !props.startText ? next : emptyState(props.user?.phone ?? "");
      const cat = props.startCategory ?? (props.startText ? guessCategory(props.startText) : null) ?? base.category;
      next = { ...base, category: cat ?? (props.startText ? "other" : null), description: props.startText ?? base.description };
      if (props.startCategory) setStep(1);
      else if (props.startText) setStep(0);
    } else if (next) {
      setRestored(true);
    }
    if (next) {
      if (!next.contactPhone && props.user?.phone) next.contactPhone = props.user.phone;
      setS(next);
    }
  }, [props.mode, props.startCategory, props.startText, props.user?.phone]);

  useEffect(() => {
    if (props.mode !== "create" || !hydrated.current) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(s));
    } catch {
      /* privatus naršymas – juodraštis tiesiog neišsaugomas */
    }
  }, [s, props.mode]);

  const update = (patch: Partial<WizardState>) => setS((prev) => ({ ...prev, ...patch }));
  function setDetails<C extends CategoryId>(c: C, patch: Partial<DetailsByCategory[C]>) {
    setS((prev) => ({ ...prev, details: { ...prev.details, [c]: { ...prev.details[c], ...patch } } }));
  }

  function go(to: number) {
    if (to > step) {
      for (let i = step; i < to; i++) {
        const e = validateStep(i, s);
        if (Object.keys(e).length) {
          setErrors(e);
          setStep(i);
          return;
        }
      }
    }
    setErrors({});
    setStep(to);
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function publish() {
    const e = validateStep(3, s);
    if (Object.keys(e).length) {
      setSubmitError(e.form ?? "Patikrinkite įvestus duomenis");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const form = new FormData();
      const payload = toPayload(s);
      form.set("data", JSON.stringify(props.mode === "edit" ? { ...payload, removePhotoIds: removedIds } : payload));
      files.forEach((f) => form.append("photos", f));
      if (props.mode === "edit" && props.requestId) {
        await api(`/api/v1/requests/${props.requestId}`, { method: "PATCH", form });
        router.push(`/uzklausos/${props.requestId}?atnaujinta=1`);
      } else {
        const res = await api<{ id: string }>("/api/v1/requests", { form });
        try {
          localStorage.removeItem(DRAFT_KEY);
        } catch {
          /* nesvarbu */
        }
        router.push(`/uzklausos/${res.id}?paskelbta=1`);
      }
      router.refresh();
    } catch (err) {
      setSubmitError((err as Error).message);
      setSubmitting(false);
    }
  }

  const today = vilniusDateKey(new Date());
  const quick = useMemo(() => quickWindows(), []);
  const sortedMunicipalities = useMemo(
    () => [...MUNICIPALITIES].sort((a, b) => a.label.localeCompare(b.label, "lt")),
    [],
  );
  const cat = s.category;
  const payload = toPayload(s);

  return (
    <div ref={topRef} className="mx-auto max-w-2xl scroll-mt-24">
      {/* Žingsnių juosta */}
      <ol className="mb-5 grid grid-cols-4 gap-1.5" aria-label="Žingsniai">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => (i < step ? go(i) : undefined)}
              disabled={i > step}
              className="w-full text-left"
              aria-current={i === step ? "step" : undefined}
            >
              <span className={cx("block h-1.5 rounded-full", i <= step ? "bg-brand-500" : "bg-stone-200")} />
              <span className={cx("mt-1.5 hidden text-xs font-semibold sm:block", i === step ? "text-brand-800" : "text-muted")}>
                {i + 1}. {label}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted sm:hidden">
        {step + 1} žingsnis iš 4 · {STEPS[step]}
      </p>

      {restored && step === 0 && (
        <Alert
          tone="info"
          className="mb-4"
          action={
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setS(emptyState(props.user?.phone ?? ""));
                setFiles([]);
                setRestored(false);
              }}
            >
              Pradėti iš naujo
            </Button>
          }
        >
          Tęsiate anksčiau pradėtą užklausą. Nuotraukas, jei jas buvote pridėję, reikės pridėti dar kartą.
        </Alert>
      )}

      {/* 1. Darbas */}
      {step === 0 && (
        <section>
          <h1 className="text-2xl font-bold">Kokios pagalbos reikia?</h1>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {CATEGORIES.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    update({ category: c.id });
                    setErrors({});
                  }}
                  aria-pressed={cat === c.id}
                  className={cx(
                    "flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition",
                    cat === c.id ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500" : "border-line bg-white hover:border-brand-300",
                  )}
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-brand-700 ring-1 ring-brand-100">
                    <CategoryIcon category={c.id} className="size-6" />
                  </span>
                  <span>
                    <span className="block font-bold">{c.label}</span>
                    <span className="block text-sm text-muted">{c.hint}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {errors.category && <p className="mt-2 text-sm font-medium text-red-700">{errors.category}</p>}
          <div className="mt-5">
            <Field label="Arba aprašykite savais žodžiais" htmlFor="w-free" optional>
              <Textarea
                id="w-free"
                value={s.description}
                onChange={(e) => {
                  const text = e.target.value;
                  const guess = !s.category ? guessCategory(text) : null;
                  update(guess ? { description: text, category: guess } : { description: text });
                }}
                placeholder="Pvz.: Reikia nupjauti apie 40 arų pievos prie sodybos, žolė iki kelių."
              />
            </Field>
          </div>
        </section>
      )}

      {/* 2. Apimtis */}
      {step === 1 && cat && (
        <section className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold">Darbo apimtis</h1>
            <p className="mt-1 text-muted">
              {CATEGORIES.find((c) => c.id === cat)?.label}.{" "}
              <button type="button" className="font-semibold text-brand-700 underline" onClick={() => go(0)}>
                Keisti
              </button>
            </p>
          </div>

          {cat === "mowing" && (
            <>
              <Field label="Apytikslis plotas" htmlFor="w-area" error={errors.area} hint="1 aras = 100 m². Jei nežinote – pažymėkite ir aprašykite ar pridėkite nuotrauką.">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative w-36">
                    <Input
                      id="w-area"
                      inputMode="decimal"
                      disabled={s.areaUnknown}
                      value={s.details.mowing.areaAres ?? ""}
                      onChange={(e) => setDetails("mowing", { areaAres: numberOrNull(e.target.value) })}
                      className="pr-12"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">arų</span>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={s.areaUnknown} onChange={(e) => update({ areaUnknown: e.target.checked })} className="size-5 accent-brand-600" />
                    Nežinau
                  </label>
                </div>
              </Field>
              <Field label="Žolės aukštis">
                <Choice
                  name="Žolės aukštis"
                  columns={4}
                  value={s.details.mowing.grassHeight}
                  onChange={(v) => setDetails("mowing", { grassHeight: v })}
                  options={Object.entries(GRASS_HEIGHTS).map(([value, label]) => ({ value: value as keyof typeof GRASS_HEIGHTS, label }))}
                />
              </Field>
              <Field label="Kieno technika">
                <Choice
                  name="Kieno technika"
                  value={s.details.mowing.equipment}
                  onChange={(v) => setDetails("mowing", { equipment: v })}
                  options={Object.entries(EQUIPMENT).map(([value, label]) => ({ value: value as keyof typeof EQUIPMENT, label }))}
                />
              </Field>
              <div className="grid gap-2 sm:grid-cols-2">
                <Toggle checked={s.details.mowing.collectGrass} onChange={(v) => setDetails("mowing", { collectGrass: v })} label="Žolę reikia surinkti" />
                <Toggle checked={s.details.mowing.tractorAccess} onChange={(v) => setDetails("mowing", { tractorAccess: v })} label="Traktoriukas gali įvažiuoti" />
              </div>
            </>
          )}

          {cat === "yard" && (
            <>
              <Field label="Ką reikia padaryti?">
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(YARD_TASKS).map(([key, label]) => {
                    const k = key as keyof typeof YARD_TASKS;
                    const on = s.details.yard.tasks.includes(k);
                    return (
                      <Toggle
                        key={k}
                        checked={on}
                        label={label}
                        onChange={(v) =>
                          setDetails("yard", { tasks: v ? [...s.details.yard.tasks, k] : s.details.yard.tasks.filter((t) => t !== k) })
                        }
                      />
                    );
                  })}
                </div>
              </Field>
              <Field label="Apytikslis plotas" htmlFor="w-yard-area" error={errors.area} hint="Jei nežinote – pažymėkite „Nežinau“.">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative w-36">
                    <Input
                      id="w-yard-area"
                      inputMode="decimal"
                      disabled={s.areaUnknown}
                      value={s.details.yard.areaAres ?? ""}
                      onChange={(e) => setDetails("yard", { areaAres: numberOrNull(e.target.value) })}
                      className="pr-12"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">arų</span>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={s.areaUnknown} onChange={(e) => update({ areaUnknown: e.target.checked })} className="size-5 accent-brand-600" />
                    Nežinau
                  </label>
                </div>
              </Field>
              <Toggle checked={s.details.yard.haulAway} onChange={(v) => setDetails("yard", { haulAway: v })} label="Reikia išvežti atliekas" />
            </>
          )}

          {cat === "pruning" && (
            <>
              <Field label="Ką genėti?">
                <Choice
                  name="Ką genėti"
                  columns={3}
                  value={s.details.pruning.target}
                  onChange={(v) => setDetails("pruning", { target: v })}
                  options={Object.entries(PRUNING_TARGETS).map(([value, label]) => ({ value: value as keyof typeof PRUNING_TARGETS, label }))}
                />
              </Field>
              <Field label="Kiekis" htmlFor="w-amount" optional hint="Pvz.: 5 obelys arba 30 m gyvatvorės">
                <Input id="w-amount" value={s.details.pruning.amount} onChange={(e) => setDetails("pruning", { amount: e.target.value })} />
              </Field>
              <Toggle checked={s.details.pruning.haulAway} onChange={(v) => setDetails("pruning", { haulAway: v })} label="Reikia išvežti šakas" />
            </>
          )}

          {cat === "helper" && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Kiek žmonių prireiks?" error={errors.people}>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" aria-label="Mažiau" onClick={() => setDetails("helper", { peopleCount: Math.max(1, s.details.helper.peopleCount - 1) })}>
                    <Minus className="size-4" aria-hidden />
                  </Button>
                  <span className="w-10 text-center text-xl font-bold" aria-live="polite">
                    {s.details.helper.peopleCount}
                  </span>
                  <Button type="button" variant="outline" aria-label="Daugiau" onClick={() => setDetails("helper", { peopleCount: Math.min(20, s.details.helper.peopleCount + 1) })}>
                    <Plus className="size-4" aria-hidden />
                  </Button>
                </div>
              </Field>
              <Field label="Kiek laiko gali užtrukti?" htmlFor="w-hours" optional>
                <div className="relative w-36">
                  <Input
                    id="w-hours"
                    inputMode="decimal"
                    value={s.details.helper.durationHours ?? ""}
                    onChange={(e) => setDetails("helper", { durationHours: numberOrNull(e.target.value) })}
                    className="pr-12"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">val.</span>
                </div>
              </Field>
            </div>
          )}

          <Field
            label={cat === "helper" || cat === "other" ? "Ką reikės padaryti?" : "Papildomai"}
            htmlFor="w-desc"
            optional={!(cat === "helper" || cat === "other")}
            error={errors.description}
            hint="Kuo aiškiau aprašysite, tuo tikslesnę kainą pasiūlys teikėjai."
          >
            <Textarea
              id="w-desc"
              rows={4}
              value={s.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder={
                cat === "mowing"
                  ? "Pvz.: Traktoriukas gali įvažiuoti pro vartus. Prie tvoros yra keli akmenys."
                  : cat === "helper"
                    ? "Pvz.: Reikia sukrauti 3 m³ malkų į pašiūrę."
                    : "Aprašykite darbą"
              }
            />
          </Field>

          <Field label="Nuotraukos" optional>
            {props.user?.isDemo ? (
              <p className="rounded-xl bg-paper p-3 text-sm text-muted">Demonstracijoje nuotraukų įkelti negalima.</p>
            ) : (
            <PhotoPicker
              files={files}
              onFiles={setFiles}
              existing={props.existingPhotos}
              removedIds={removedIds}
              onToggleExisting={(id) => setRemovedIds((r) => (r.includes(id) ? r.filter((x) => x !== id) : [...r, id]))}
            />
            )}
          </Field>
        </section>
      )}

      {/* 3. Vieta ir laikas */}
      {step === 2 && (
        <section className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Kur ir kada?</h1>
            <p className="mt-1 text-muted">Iki pasirinkimo teikėjai matys tik gyvenvietę ir savivaldybę.</p>
          </div>

          <Card className="space-y-4">
            <LocationButton
              onFound={(loc) =>
                update({
                  lat: loc.lat,
                  lng: loc.lng,
                  ...(loc.municipality ? { municipality: loc.municipality } : {}),
                  ...(loc.locality ? { locality: loc.locality } : {}),
                  ...(loc.address ? { address: loc.address } : {}),
                })
              }
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Savivaldybė" htmlFor="w-mun" error={errors.municipality}>
                <Select id="w-mun" value={s.municipality} onChange={(e) => update({ municipality: e.target.value })}>
                  <option value="">Pasirinkite…</option>
                  {sortedMunicipalities.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Gyvenvietė ar vietovė" htmlFor="w-loc" error={errors.locality} hint="Matys visi teikėjai">
                <Input id="w-loc" value={s.locality} onChange={(e) => update({ locality: e.target.value })} placeholder="Pvz.: Paantvardys" />
              </Field>
            </div>
            <div className="rounded-xl bg-paper p-3.5">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
                <Lock className="size-3.5" aria-hidden /> Matys tik jūsų pasirinktas teikėjas
              </p>
              <div className="space-y-4">
                <Field label="Tikslus adresas arba kaip rasti" htmlFor="w-addr" error={errors.address}>
                  <Textarea
                    id="w-addr"
                    rows={2}
                    value={s.address}
                    onChange={(e) => update({ address: e.target.value })}
                    placeholder="Gatvė ir namo nr., arba pvz.: antra sodyba po kairės už tilto"
                  />
                </Field>
                <Field label="Telefonas susisiekti" htmlFor="w-phone" error={errors.contactPhone}>
                  <Input
                    id="w-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={s.contactPhone}
                    onChange={(e) => update({ contactPhone: e.target.value })}
                    placeholder="+370 600 00000"
                  />
                </Field>
                {s.lat !== null && (
                  <p className="text-xs text-muted">
                    Išsaugotos vietos koordinatės – teikėjas galės atsidaryti žemėlapį.{" "}
                    <button type="button" className="font-semibold underline" onClick={() => update({ lat: null, lng: null })}>
                      Pašalinti
                    </button>
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <Field label="Ar darbas kartosis?">
              <Choice
                name="Darbo pobūdis"
                value={s.kind}
                onChange={(v) => update({ kind: v })}
                options={[
                  { value: "once", label: "Vienkartinis" },
                  { value: "recurring", label: "Pasikartojantis", hint: "Pvz., pjauti kas dvi savaites" },
                ]}
              />
            </Field>

            {s.kind === "once" ? (
              <>
                <Field label="Kada?">
                  <Choice
                    name="Kada"
                    columns={3}
                    value={s.timingType}
                    onChange={(v) => update({ timingType: v })}
                    options={[
                      { value: "asap", label: "Kuo greičiau" },
                      { value: "window", label: "Pasirinkti laiką" },
                      { value: "flexible", label: "Laikas lankstus" },
                    ]}
                  />
                </Field>
                {s.timingType === "window" && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {quick.map((q) => {
                        const active = JSON.stringify(q.value) === JSON.stringify(s.window);
                        return (
                          <button
                            key={q.label}
                            type="button"
                            onClick={() => update({ window: q.value })}
                            className={cx(
                              "h-9 rounded-full border px-3.5 text-sm font-semibold",
                              active ? "border-brand-500 bg-brand-600 text-white" : "border-line bg-white hover:bg-paper",
                            )}
                          >
                            {q.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Nuo" htmlFor="w-sd">
                        <div className="flex gap-2">
                          <Input id="w-sd" type="date" min={today} value={s.window.startDate} onChange={(e) => update({ window: { ...s.window, startDate: e.target.value } })} />
                        </div>
                      </Field>
                      <Field label="Laikas" htmlFor="w-st">
                        <Input id="w-st" type="time" value={s.window.startTime} onChange={(e) => update({ window: { ...s.window, startTime: e.target.value } })} />
                      </Field>
                      <Field label="Iki" htmlFor="w-ed">
                        <Input id="w-ed" type="date" min={s.window.startDate || today} value={s.window.endDate} onChange={(e) => update({ window: { ...s.window, endDate: e.target.value } })} />
                      </Field>
                      <Field label="Laikas" htmlFor="w-et">
                        <Input id="w-et" type="time" value={s.window.endTime} onChange={(e) => update({ window: { ...s.window, endTime: e.target.value } })} />
                      </Field>
                    </div>
                    {errors.window && <p className="text-sm font-medium text-red-700">{errors.window}</p>}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <Field label="Kaip dažnai?">
                  <Choice
                    name="Dažnis"
                    columns={3}
                    value={s.frequency}
                    onChange={(v) => update({ frequency: v })}
                    options={Object.entries(FREQUENCIES).map(([value, label]) => ({ value: value as Frequency, label }))}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Pradžia" htmlFor="w-ss">
                    <Input id="w-ss" type="date" min={today} value={s.seriesStart} onChange={(e) => update({ seriesStart: e.target.value })} />
                  </Field>
                  <Field label="Pabaiga" htmlFor="w-se" optional hint="Jei nežinote – palikite tuščią">
                    <Input id="w-se" type="date" min={s.seriesStart || today} value={s.seriesEnd} onChange={(e) => update({ seriesEnd: e.target.value })} />
                  </Field>
                </div>
                {errors.series && <p className="text-sm font-medium text-red-700">{errors.series}</p>}
                <Alert tone="info">Teikėjai siūlys kainą už vieną apsilankymą pagal šį grafiką.</Alert>
              </div>
            )}
          </Card>
        </section>
      )}

      {/* 4. Peržiūra */}
      {step === 3 && (
        <section className="space-y-4">
          <h1 className="text-2xl font-bold">{props.mode === "edit" ? "Peržiūrėkite pakeitimus" : "Patikrinkite ir paskelbkite"}</h1>
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <CategoryIcon category={payload.category} className="size-6" />
                </span>
                <div>
                  <p className="text-lg font-bold">{requestHeadline(payload.category, payload.details)}</p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {describeDetails(payload.category, payload.details).map((l) => (
                      <li key={l} className="rounded-lg bg-paper px-2 py-0.5 text-sm">
                        {l}
                      </li>
                    ))}
                  </ul>
                  {s.description && <p className="mt-2 whitespace-pre-line text-[15px]">{s.description}</p>}
                  {(files.length > 0 || (props.existingPhotos?.length ?? 0) - removedIds.length > 0) && (
                    <p className="mt-2 text-sm text-muted">
                      Nuotraukų: {files.length + (props.existingPhotos?.length ?? 0) - removedIds.length}
                    </p>
                  )}
                </div>
              </div>
              <button type="button" className="shrink-0 text-sm font-semibold text-brand-700 underline" onClick={() => go(1)}>
                Keisti
              </button>
            </div>
            <hr className="my-4 border-line" />
            <div className="flex items-start justify-between gap-3">
              <dl className="space-y-1.5 text-[15px]">
                <div>
                  <dt className="inline text-muted">Vieta: </dt>
                  <dd className="inline font-medium">
                    {s.locality}, {municipalityLabel(s.municipality)}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-muted">Laikas: </dt>
                  <dd className="inline font-medium">
                    {s.kind === "recurring"
                      ? `${frequencyLabel(s.frequency)}, nuo ${formatDateKey(s.seriesStart).toLowerCase()}${s.seriesEnd ? ` iki ${formatDateKey(s.seriesEnd).toLowerCase()}` : ""}`
                      : formatTiming({
                          type: s.timingType,
                          windowStart: s.timingType === "window" ? vilniusToDate(s.window.startDate, s.window.startTime).toISOString() : null,
                          windowEnd: s.timingType === "window" ? vilniusToDate(s.window.endDate, s.window.endTime).toISOString() : null,
                        })}
                  </dd>
                </div>
                <div className="rounded-lg bg-paper p-2.5 text-sm">
                  <p className="flex items-center gap-1 font-semibold text-brand-700">
                    <Lock className="size-3.5" aria-hidden /> Tik pasirinktam teikėjui
                  </p>
                  <p className="mt-1">{s.address}</p>
                  <p>{s.contactPhone}</p>
                </div>
              </dl>
              <button type="button" className="shrink-0 text-sm font-semibold text-brand-700 underline" onClick={() => go(2)}>
                Keisti
              </button>
            </div>
          </Card>

          {props.mode === "edit" && props.hasOffers && (
            <Alert tone="warning">
              Jau turite pasiūlymų. Išsaugojus pakeitimus teikėjams reikės patvirtinti kainą iš naujo – iki tol jų pasiūlymų priimti nebus galima.
            </Alert>
          )}

          {submitError && <Alert tone="error">{submitError}</Alert>}

          {user || props.mode === "edit" ? (
            <Button size="lg" className="w-full" onClick={publish} loading={submitting}>
              <Send className="size-5" aria-hidden />
              {props.mode === "edit" ? "Išsaugoti pakeitimus" : "Paskelbti užklausą"}
            </Button>
          ) : (
            <Card>
              <p className="font-bold">Liko vienas žingsnis – paskyra</p>
              <p className="mb-4 mt-1 text-sm text-muted">
                Ji reikalinga, kad galėtumėte matyti pasiūlymus ir gauti pranešimus. Jūsų įvesti duomenys neprarandami.
              </p>
              <AuthForm
                defaults={{ phone: s.contactPhone }}
                submitLabel={{ register: "Sukurti paskyrą ir paskelbti", login: "Prisijungti ir paskelbti" }}
                onSuccess={async (u: UserDTO) => {
                  setUser({ name: u.name, phone: u.phone });
                  await publish();
                }}
              />
            </Card>
          )}
          <p className="text-center text-xs text-muted">
            Apmokėjimą už darbą sutvarkysite tiesiogiai su pasirinktu teikėju.
          </p>
        </section>
      )}

      {/* Navigacija */}
      {step < 3 && (
        <div className="sticky bottom-20 z-10 mt-6 flex gap-2 rounded-2xl bg-paper/90 py-2 backdrop-blur md:static md:bg-transparent md:p-0">
          {step > 0 && (
            <Button type="button" variant="outline" size="lg" onClick={() => go(step - 1)} aria-label="Atgal">
              <ChevronLeft className="size-5" aria-hidden />
              <span className="hidden sm:inline">Atgal</span>
            </Button>
          )}
          <Button type="button" size="lg" className="flex-1" onClick={() => go(step + 1)}>
            {step === 2 ? "Peržiūrėti" : "Toliau"} <ChevronRight className="size-5" aria-hidden />
          </Button>
        </div>
      )}
      {step === 3 && (
        <div className="mt-3">
          <Button type="button" variant="ghost" onClick={() => go(2)}>
            <ChevronLeft className="size-4" aria-hidden /> Atgal
          </Button>
        </div>
      )}
    </div>
  );
}
