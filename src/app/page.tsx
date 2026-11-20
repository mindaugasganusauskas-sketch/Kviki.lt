import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BadgeCheck, Lock, MessageSquareText, Wallet, Zap } from "lucide-react";
import { getActor } from "@/server/auth/session";
import { listMyRequests } from "@/server/services/requests";
import { demoEnabled } from "@/server/services/demo";
import { categoriesFor } from "@/shared/categories";
import { getI18n } from "@/i18n/server";
import { CategoryBadge } from "@/components/category-icon";
import { Alert, ButtonLink, Card, cx } from "@/components/ui";
import { RequestListCard } from "@/components/request-list-card";
import { FreeTextStart } from "./free-text-start";
import { DemoButtons } from "./demo-buttons";

/** Žolės juosta herojaus apačioje (dekoracija). */
function Grass({ className }: { className?: string }) {
  const blades: string[] = [];
  for (let x = 0; x < 1200; x += 14) {
    const h = 18 + ((x * 37) % 29);
    const lean = ((x * 13) % 9) - 4;
    blades.push(`M${x} 60 Q${x + 4 + lean} ${60 - h * 0.6} ${x + 7 + lean} ${60 - h} Q${x + 8} ${60 - h * 0.5} ${x + 14} 60 Z`);
  }
  return (
    <svg viewBox="0 0 1200 60" preserveAspectRatio="none" className={className} aria-hidden>
      <path d={blades.join(" ")} fill="currentColor" />
    </svg>
  );
}


export default async function HomePage(props: PageProps<"/">) {
  const sp = await props.searchParams;
  const { locale, t } = await getI18n();
  const actor = await getActor();
  const CATEGORIES = categoriesFor(locale);
  const STEPS = [
    { n: 1, title: t.home.step1Title, text: t.home.step1Text, tint: "bg-brand-100 text-brand-700" },
    { n: 2, title: t.home.step2Title, text: t.home.step2Text, tint: "bg-sun-100 text-sun-700" },
    { n: 3, title: t.home.step3Title, text: t.home.step3Text, tint: "bg-berry-100 text-berry-600" },
  ];
  if (actor?.mode === "provider") redirect("/darbai-salia");
  const recent = actor ? (await listMyRequests(actor)).filter((r) => r.status === "open" || r.status === "agreed").slice(0, 3) : [];

  return (
    <div className="space-y-12">
      {sp.paskyra === "istrinta" && !actor && (
        <Alert tone="success" title={t.home.deletedTitle}>
          {t.home.deletedText}
        </Alert>
      )}

      <section className="relative -mx-4 -mt-5 overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 px-5 pb-10 pt-9 text-white sm:mx-0 sm:mt-0 sm:rounded-[2rem] sm:px-10 sm:pb-14 sm:pt-12">
        <div className="pointer-events-none absolute -right-16 -top-16 size-36 rounded-full bg-sun-400 shadow-[0_0_0_18px_rgba(255,198,26,0.12)] sm:-right-8 sm:-top-8 sm:size-44 sm:shadow-[0_0_0_28px_rgba(255,198,26,0.12)]" aria-hidden />
        <Grass className="pointer-events-none absolute inset-x-0 bottom-0 h-10 w-full text-brand-600/60 sm:h-14" />

        <div className="relative">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-brand-100 ring-1 ring-white/15 backdrop-blur">
            <Zap className="size-3.5 text-sun-300" aria-hidden /> {t.meta.tagline}
          </p>
          <h1 className="mt-4 max-w-2xl text-[2.25rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
            {t.home.heroBefore} <span className="text-sun-300">{t.home.heroAccent}</span> {t.home.heroAfter}
          </h1>
          <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-brand-100">
            {t.home.heroText}
          </p>

          <ul className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-5 sm:gap-3">
            {CATEGORIES.map((c, i) => (
              <li key={c.id} className={cx(i === CATEGORIES.length - 1 && "col-span-2 sm:col-span-1")}>
                <Link
                  href={`/nauja-uzklausa?kategorija=${c.id}`}
                  className={cx(
                    "group flex h-full gap-3 rounded-2xl bg-white p-3.5 text-ink shadow-lg shadow-black/10 ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-xl",
                    i === CATEGORIES.length - 1 ? "flex-row items-center sm:flex-col sm:items-start" : "flex-col",
                  )}
                >
                  <CategoryBadge category={c.id} />
                  <span className="min-w-0">
                    <span className="block text-[15px] font-bold leading-snug">{c.label}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted">{c.hint}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <FreeTextStart />
        </div>
      </section>

      <ul className="-mt-4 grid gap-2 text-sm sm:grid-cols-3">
        {[
          { icon: MessageSquareText, text: t.home.trust1 },
          { icon: Lock, text: t.home.trust2 },
          { icon: Wallet, text: t.home.trust3 },
        ].map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-2.5 rounded-xl bg-white px-3.5 py-3 font-medium text-stone-700 ring-1 ring-line">
            <Icon className="size-4.5 shrink-0 text-brand-600" aria-hidden /> {text}
          </li>
        ))}
      </ul>

      {recent.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-extrabold tracking-tight">{t.home.activeRequests}</h2>
            <Link href="/mano-uzklausos" className="text-sm font-semibold text-brand-700 hover:underline">
              {t.home.all}
            </Link>
          </div>
          <div className="grid gap-3">
            {recent.map((r) => (
              <RequestListCard key={r.id} item={r} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-2xl font-extrabold tracking-tight">{t.home.howTitle}</h2>
        <ol className="mt-5 grid gap-3 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n}>
              <Card className="h-full">
                <span className={cx("flex size-10 items-center justify-center rounded-xl text-lg font-extrabold", s.tint)}>{s.n}</span>
                <p className="mt-4 text-lg font-bold">{s.title}</p>
                <p className="mt-1 text-[15px] leading-relaxed text-muted">{s.text}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {!actor && demoEnabled() && (
        <section className="rounded-3xl border border-sun-200 bg-sun-50 p-5 sm:p-7">
          <p className="text-lg font-extrabold">{t.demo.tryTitle}</p>
          <p className="mt-1 max-w-2xl text-[15px] text-stone-700">{t.demo.tryText}</p>
          <DemoButtons />
        </section>
      )}

      {!actor?.isProvider && (
        <section className="relative overflow-hidden rounded-3xl bg-ink p-6 text-white sm:p-8">
          <Grass className="pointer-events-none absolute inset-x-0 bottom-0 h-8 w-full text-brand-800" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3.5">
              <BadgeCheck className="mt-0.5 size-7 shrink-0 text-sun-300" aria-hidden />
              <div>
                <p className="text-xl font-extrabold">{t.home.providerTitle}</p>
                <p className="mt-1 max-w-xl text-[15px] text-white/75">{t.home.providerText}</p>
              </div>
            </div>
            <ButtonLink href={actor ? "/paskyra/teikejas" : "/registracija?teikejas=1"} variant="accent" size="lg" className="shrink-0">
              {t.home.becomeProvider} <ArrowRight className="size-5" aria-hidden />
            </ButtonLink>
          </div>
        </section>
      )}
    </div>
  );
}
