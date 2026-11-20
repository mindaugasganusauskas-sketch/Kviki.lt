"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Lock, Minus, Plus, Send } from "lucide-react";
import { api } from "@/lib/api-client";
import {
  categoriesFor,
  describeDetails,
  OPTION_TEXT,
  requestHeadline,
  type CategoryId,
  type DetailsByCategory,
  type Equipment,
  type GrassHeight,
  type PruningTarget,
  type YardTask,
} from "@/shared/categories";
import { FREQUENCY_LABELS, formatDateKey, formatTiming, frequencyLabel, midSentence } from "@/shared/format";
import { MUNICIPALITIES, municipalityLabel } from "@/shared/municipalities";
import { vilniusDateKey, vilniusToDate, type Frequency } from "@/shared/time";
import { useI18n } from "@/i18n/client";
import type { PhotoDTO, UserDTO } from "@/shared/types";
import { AuthForm } from "../auth-form";
import { CategoryBadge } from "../category-icon";
import { Alert, Button, Card, Field, Input, Select, Textarea, cx } from "../ui";
import { LocationButton } from "./location-button";
import { PhotoPicker } from "./photo-picker";
import {
  emptyState,
  guessCategory,
  quickWindows,
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
  const { locale, t } = useI18n();
  const w = t.wizard;
  const CATEGORIES = categoriesFor(locale);
  const opt = OPTION_TEXT[locale];
  const STEPS = w.steps;
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
        const e = validateStep(i, s, w);
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
    const e = validateStep(3, s, w);
    if (Object.keys(e).length) {
      setSubmitError(e.form ?? w.errForm);
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
  const quick = useMemo(() => quickWindows(new Date(), w), [w]);
  const sortedMunicipalities = useMemo(
    () => [...MUNICIPALITIES].sort((a, b) => a.label.localeCompare(b.label, "lt")),
    [],
  );
  const cat = s.category;
  const payload = toPayload(s);

  return (
    <div ref={topRef} className="mx-auto max-w-2xl scroll-mt-24">
      {/* Žingsnių juosta */}
      <ol className="mb-5 grid grid-cols-4 gap-1.5" aria-label={w.stepsLabel}>
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
        {w.stepOf(step + 1)} · {STEPS[step]}
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
              {w.startOver}
            </Button>
          }
        >
          {w.restored}
        </Alert>
      )}

      {/* 1. Darbas */}
      {step === 0 && (
        <section>
          <h1 className="text-2xl font-bold">{w.whatHelp}</h1>
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
                  <CategoryBadge category={c.id} />
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
            <Field label={w.ownWords} htmlFor="w-free" optional>
              <Textarea
                id="w-free"
                value={s.description}
                onChange={(e) => {
                  const text = e.target.value;
                  const guess = !s.category ? guessCategory(text) : null;
                  update(guess ? { description: text, category: guess } : { description: text });
                }}
                placeholder={w.ownWordsPlaceholder}
              />
            </Field>
          </div>
        </section>
      )}

      {/* 2. Apimtis */}
      {step === 1 && cat && (
        <section className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold">{w.scopeTitle}</h1>
            <p className="mt-1 text-muted">
              {CATEGORIES.find((c) => c.id === cat)?.label}.{" "}
              <button type="button" className="font-semibold text-brand-700 underline" onClick={() => go(0)}>
                {t.common.change}
              </button>
            </p>
          </div>

          {cat === "mowing" && (
            <>
              <Field label={w.area} htmlFor="w-area" error={errors.area} hint={w.areaHint}>
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
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">{w.ares}</span>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={s.areaUnknown} onChange={(e) => update({ areaUnknown: e.target.checked })} className="size-5 accent-brand-600" />
                    {w.dontKnow}
                  </label>
                </div>
              </Field>
              <Field label={w.grassHeight}>
                <Choice
                  name={w.grassHeight}
                  columns={4}
                  value={s.details.mowing.grassHeight}
                  onChange={(v) => setDetails("mowing", { grassHeight: v })}
                  options={Object.entries(opt.grass).map(([value, label]) => ({ value: value as GrassHeight, label }))}
                />
              </Field>
              <Field label={w.equipment}>
                <Choice
                  name={w.equipment}
                  value={s.details.mowing.equipment}
                  onChange={(v) => setDetails("mowing", { equipment: v })}
                  options={Object.entries(opt.equipment).map(([value, label]) => ({ value: value as Equipment, label }))}
                />
              </Field>
              <div className="grid gap-2 sm:grid-cols-2">
                <Toggle checked={s.details.mowing.collectGrass} onChange={(v) => setDetails("mowing", { collectGrass: v })} label={w.collectGrass} />
                <Toggle checked={s.details.mowing.tractorAccess} onChange={(v) => setDetails("mowing", { tractorAccess: v })} label={w.tractor} />
              </div>
            </>
          )}

          {cat === "yard" && (
            <>
              <Field label={w.yardWhat}>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(opt.yardTasks).map(([key, label]) => {
                    const k = key as YardTask;
                    const on = s.details.yard.tasks.includes(k);
                    return (
                      <Toggle
                        key={k}
                        checked={on}
                        label={label}
                        onChange={(v) =>
                          setDetails("yard", { tasks: v ? [...s.details.yard.tasks, k] : s.details.yard.tasks.filter((x) => x !== k) })
                        }
                      />
                    );
                  })}
                </div>
              </Field>
              <Field label={w.area} htmlFor="w-yard-area" error={errors.area} hint={w.areaHintShort}>
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
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">{w.ares}</span>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={s.areaUnknown} onChange={(e) => update({ areaUnknown: e.target.checked })} className="size-5 accent-brand-600" />
                    {w.dontKnow}
                  </label>
                </div>
              </Field>
              <Toggle checked={s.details.yard.haulAway} onChange={(v) => setDetails("yard", { haulAway: v })} label={w.haulWaste} />
            </>
          )}

          {cat === "pruning" && (
            <>
              <Field label={w.pruneWhat}>
                <Choice
                  name={w.pruneWhat}
                  columns={3}
                  value={s.details.pruning.target}
                  onChange={(v) => setDetails("pruning", { target: v })}
                  options={Object.entries(opt.pruning).map(([value, label]) => ({ value: value as PruningTarget, label }))}
                />
              </Field>
              <Field label={w.amount} htmlFor="w-amount" optional hint={w.amountHint}>
                <Input id="w-amount" value={s.details.pruning.amount} onChange={(e) => setDetails("pruning", { amount: e.target.value })} />
              </Field>
              <Toggle checked={s.details.pruning.haulAway} onChange={(v) => setDetails("pruning", { haulAway: v })} label={w.haulBranches} />
            </>
          )}

          {cat === "helper" && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={w.people} error={errors.people}>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" aria-label={w.fewer} onClick={() => setDetails("helper", { peopleCount: Math.max(1, s.details.helper.peopleCount - 1) })}>
                    <Minus className="size-4" aria-hidden />
                  </Button>
                  <span className="w-10 text-center text-xl font-bold" aria-live="polite">
                    {s.details.helper.peopleCount}
                  </span>
                  <Button type="button" variant="outline" aria-label={w.more} onClick={() => setDetails("helper", { peopleCount: Math.min(20, s.details.helper.peopleCount + 1) })}>
                    <Plus className="size-4" aria-hidden />
                  </Button>
                </div>
              </Field>
              <Field label={w.hours} htmlFor="w-hours" optional>
                <div className="relative w-36">
                  <Input
                    id="w-hours"
                    inputMode="decimal"
                    value={s.details.helper.durationHours ?? ""}
                    onChange={(e) => setDetails("helper", { durationHours: numberOrNull(e.target.value) })}
                    className="pr-12"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">{w.hoursUnit}</span>
                </div>
              </Field>
            </div>
          )}

          <Field
            label={cat === "helper" || cat === "other" ? w.whatToDo : w.extra}
            htmlFor="w-desc"
            optional={!(cat === "helper" || cat === "other")}
            error={errors.description}
            hint={w.descHint}
          >
            <Textarea
              id="w-desc"
              rows={4}
              value={s.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder={
                cat === "mowing" ? w.descPlaceholderMowing : cat === "helper" ? w.descPlaceholderHelper : w.descPlaceholderOther
              }
            />
          </Field>

          <Field label={w.photos} optional>
            {props.user?.isDemo ? (
              <p className="rounded-xl bg-paper p-3 text-sm text-muted">{t.demo.noPhotos}</p>
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
            <h1 className="text-2xl font-bold">{w.whereWhen}</h1>
            <p className="mt-1 text-muted">{w.whereWhenHint}</p>
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
              <Field label={w.municipality} htmlFor="w-mun" error={errors.municipality}>
                <Select id="w-mun" value={s.municipality} onChange={(e) => update({ municipality: e.target.value })}>
                  <option value="">{w.choose}</option>
                  {sortedMunicipalities.map((m) => (
                    <option key={m.code} value={m.code}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={w.locality} htmlFor="w-loc" error={errors.locality} hint={w.localityHint}>
                <Input id="w-loc" value={s.locality} onChange={(e) => update({ locality: e.target.value })} placeholder={w.localityPlaceholder} />
              </Field>
            </div>
            <div className="rounded-xl bg-paper p-3.5">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700">
                <Lock className="size-3.5" aria-hidden /> {w.privateOnly}
              </p>
              <div className="space-y-4">
                <Field label={w.address} htmlFor="w-addr" error={errors.address}>
                  <Textarea
                    id="w-addr"
                    rows={2}
                    value={s.address}
                    onChange={(e) => update({ address: e.target.value })}
                    placeholder={w.addressPlaceholder}
                  />
                </Field>
                <Field label={w.contactPhone} htmlFor="w-phone" error={errors.contactPhone}>
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
                    {w.coordsSaved}{" "}
                    <button type="button" className="font-semibold underline" onClick={() => update({ lat: null, lng: null })}>
                      {w.removeCoords}
                    </button>
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <Field label={w.recurring}>
              <Choice
                name={w.kindLabel}
                value={s.kind}
                onChange={(v) => update({ kind: v })}
                options={[
                  { value: "once", label: w.once },
                  { value: "recurring", label: w.repeating, hint: w.repeatingHint },
                ]}
              />
            </Field>

            {s.kind === "once" ? (
              <>
                <Field label={w.when}>
                  <Choice
                    name={w.when}
                    columns={3}
                    value={s.timingType}
                    onChange={(v) => update({ timingType: v })}
                    options={[
                      { value: "asap", label: w.asap },
                      { value: "window", label: w.window },
                      { value: "flexible", label: w.flexible },
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
                              active ? "border-brand-700 bg-brand-700 text-white" : "border-line bg-white hover:bg-paper",
                            )}
                          >
                            {q.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label={w.from} htmlFor="w-sd">
                        <div className="flex gap-2">
                          <Input id="w-sd" type="date" min={today} value={s.window.startDate} onChange={(e) => update({ window: { ...s.window, startDate: e.target.value } })} />
                        </div>
                      </Field>
                      <Field label={w.time} htmlFor="w-st">
                        <Input id="w-st" type="time" value={s.window.startTime} onChange={(e) => update({ window: { ...s.window, startTime: e.target.value } })} />
                      </Field>
                      <Field label={w.to} htmlFor="w-ed">
                        <Input id="w-ed" type="date" min={s.window.startDate || today} value={s.window.endDate} onChange={(e) => update({ window: { ...s.window, endDate: e.target.value } })} />
                      </Field>
                      <Field label={w.time} htmlFor="w-et">
                        <Input id="w-et" type="time" value={s.window.endTime} onChange={(e) => update({ window: { ...s.window, endTime: e.target.value } })} />
                      </Field>
                    </div>
                    {errors.window && <p className="text-sm font-medium text-red-700">{errors.window}</p>}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <Field label={w.howOften}>
                  <Choice
                    name={w.frequencyLabel}
                    columns={3}
                    value={s.frequency}
                    onChange={(v) => update({ frequency: v })}
                    options={Object.entries(FREQUENCY_LABELS[locale]).map(([value, label]) => ({ value: value as Frequency, label }))}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={w.start} htmlFor="w-ss">
                    <Input id="w-ss" type="date" min={today} value={s.seriesStart} onChange={(e) => update({ seriesStart: e.target.value })} />
                  </Field>
                  <Field label={w.end} htmlFor="w-se" optional hint={w.endHint}>
                    <Input id="w-se" type="date" min={s.seriesStart || today} value={s.seriesEnd} onChange={(e) => update({ seriesEnd: e.target.value })} />
                  </Field>
                </div>
                {errors.series && <p className="text-sm font-medium text-red-700">{errors.series}</p>}
                <Alert tone="info">{w.perVisitInfo}</Alert>
              </div>
            )}
          </Card>
        </section>
      )}

      {/* 4. Peržiūra */}
      {step === 3 && (
        <section className="space-y-4">
          <h1 className="text-2xl font-bold">{props.mode === "edit" ? w.reviewEdit : w.reviewCreate}</h1>
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <CategoryBadge category={payload.category} />
                <div>
                  <p className="text-lg font-bold">{requestHeadline(payload.category, payload.details, locale)}</p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {describeDetails(payload.category, payload.details, locale).map((l) => (
                      <li key={l} className="rounded-lg bg-paper px-2 py-0.5 text-sm">
                        {l}
                      </li>
                    ))}
                  </ul>
                  {s.description && <p className="mt-2 whitespace-pre-line text-[15px]">{s.description}</p>}
                  {(files.length > 0 || (props.existingPhotos?.length ?? 0) - removedIds.length > 0) && (
                    <p className="mt-2 text-sm text-muted">
                      {w.photosCount(files.length + (props.existingPhotos?.length ?? 0) - removedIds.length)}
                    </p>
                  )}
                </div>
              </div>
              <button type="button" className="shrink-0 text-sm font-semibold text-brand-700 underline" onClick={() => go(1)}>
                {t.common.change}
              </button>
            </div>
            <hr className="my-4 border-line" />
            <div className="flex items-start justify-between gap-3">
              <dl className="space-y-1.5 text-[15px]">
                <div>
                  <dt className="inline text-muted">{w.place}: </dt>
                  <dd className="inline font-medium">
                    {s.locality}, {municipalityLabel(s.municipality)}
                  </dd>
                </div>
                <div>
                  <dt className="inline text-muted">{w.timeLabel}: </dt>
                  <dd className="inline font-medium">
                    {s.kind === "recurring"
                      ? `${frequencyLabel(s.frequency, locale)}, ${t.request.from(midSentence(formatDateKey(s.seriesStart, locale), locale))}${s.seriesEnd ? ` ${t.request.until(midSentence(formatDateKey(s.seriesEnd, locale), locale))}` : ""}`
                      : formatTiming({
                          type: s.timingType,
                          windowStart: s.timingType === "window" ? vilniusToDate(s.window.startDate, s.window.startTime).toISOString() : null,
                          windowEnd: s.timingType === "window" ? vilniusToDate(s.window.endDate, s.window.endTime).toISOString() : null,
                        }, locale)}
                  </dd>
                </div>
                <div className="rounded-lg bg-paper p-2.5 text-sm">
                  <p className="flex items-center gap-1 font-semibold text-brand-700">
                    <Lock className="size-3.5" aria-hidden /> {w.onlyChosen}
                  </p>
                  <p className="mt-1">{s.address}</p>
                  <p>{s.contactPhone}</p>
                </div>
              </dl>
              <button type="button" className="shrink-0 text-sm font-semibold text-brand-700 underline" onClick={() => go(2)}>
                {t.common.change}
              </button>
            </div>
          </Card>

          {props.mode === "edit" && props.hasOffers && (
            <Alert tone="warning">
              {w.hasOffersWarning}
            </Alert>
          )}

          {submitError && <Alert tone="error">{submitError}</Alert>}

          {user || props.mode === "edit" ? (
            <Button size="lg" className="w-full" onClick={publish} loading={submitting}>
              <Send className="size-5" aria-hidden />
              {props.mode === "edit" ? w.saveChanges : w.publish}
            </Button>
          ) : (
            <Card>
              <p className="font-bold">{w.accountStep}</p>
              <p className="mb-4 mt-1 text-sm text-muted">{w.accountStepText}</p>
              <AuthForm
                defaults={{ phone: s.contactPhone }}
                submitLabel={{ register: w.registerAndPublish, login: w.loginAndPublish }}
                onSuccess={async (u: UserDTO) => {
                  setUser({ name: u.name, phone: u.phone });
                  await publish();
                }}
              />
            </Card>
          )}
          <p className="text-center text-xs text-muted">
            {w.paymentNote}
          </p>
        </section>
      )}

      {/* Navigacija */}
      {step < 3 && (
        <div className="sticky bottom-20 z-10 mt-6 flex gap-2 rounded-2xl bg-paper/90 py-2 backdrop-blur md:static md:bg-transparent md:p-0">
          {step > 0 && (
            <Button type="button" variant="outline" size="lg" onClick={() => go(step - 1)} aria-label={t.common.back}>
              <ChevronLeft className="size-5" aria-hidden />
              <span className="hidden sm:inline">{t.common.back}</span>
            </Button>
          )}
          <Button type="button" size="lg" className="flex-1" onClick={() => go(step + 1)}>
            {step === 2 ? w.review : t.common.next} <ChevronRight className="size-5" aria-hidden />
          </Button>
        </div>
      )}
      {step === 3 && (
        <div className="mt-3">
          <Button type="button" variant="ghost" onClick={() => go(2)}>
            <ChevronLeft className="size-4" aria-hidden /> {t.common.back}
          </Button>
        </div>
      )}
    </div>
  );
}
