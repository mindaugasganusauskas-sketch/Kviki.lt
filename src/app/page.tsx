import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BadgeCheck, Lock, MessageSquareText, Wallet, Zap } from "lucide-react";
import { getActor } from "@/server/auth/session";
import { listMyRequests } from "@/server/services/requests";
import { demoEnabled } from "@/server/services/demo";
import { CATEGORIES } from "@/shared/categories";
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

const STEPS = [
  { n: 1, title: "Aprašote darbą", text: "Kas, kur ir kada. Galite pridėti nuotrauką. Tikslų adresą matys tik pasirinktas teikėjas.", tint: "bg-brand-100 text-brand-700" },
  { n: 2, title: "Gaunate pasiūlymus", text: "Teikėjai siūlo galutinę kainą ir konkretų laiką. Lyginate pagal kainą ar ankstyviausią laiką.", tint: "bg-sun-100 text-sun-700" },
  { n: 3, title: "Pasirenkate – ir atlikta", text: "Abu matote tą pačią užsakymo kortelę. Atsiskaitote tiesiogiai su teikėju.", tint: "bg-berry-100 text-berry-600" },
];

export default async function HomePage(props: PageProps<"/">) {
  const sp = await props.searchParams;
  const actor = await getActor();
  if (actor?.mode === "provider") redirect("/darbai-salia");
  const recent = actor ? (await listMyRequests(actor)).filter((r) => r.status === "open" || r.status === "agreed").slice(0, 3) : [];

  return (
    <div className="space-y-12">
      {sp.paskyra === "istrinta" && !actor && (
        <Alert tone="success" title="Paskyra ištrinta">
          Jūsų asmens duomenys pašalinti. Ačiū, kad naudojotės Kviki.
        </Alert>
      )}

      <section className="relative -mx-4 overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 px-5 pb-10 pt-9 text-white sm:mx-0 sm:rounded-[2rem] sm:px-10 sm:pb-14 sm:pt-12">
        <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-sun-400 opacity-90 sm:-right-6 sm:-top-6 sm:size-44" aria-hidden />
        <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-sun-300/20 blur-2xl" aria-hidden />
        <Grass className="pointer-events-none absolute inset-x-0 bottom-0 h-10 w-full text-brand-600/60 sm:h-14" />

        <div className="relative">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-brand-100 ring-1 ring-white/15 backdrop-blur">
            <Zap className="size-3.5 text-sun-300" aria-hidden /> Vietinė pagalba kiemo ir ūkio darbams
          </p>
          <h1 className="mt-4 max-w-2xl text-[2.25rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
            Kokios <span className="text-sun-300">pagalbos</span> reikia?
          </h1>
          <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-brand-100">
            Aprašykite darbą vieną kartą. Netoliese dirbantys žmonės ir įmonės pasiūlys kainą ir laiką – jums lieka išsirinkti.
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
          { icon: MessageSquareText, text: "Vienas aprašymas – keli pasiūlymai" },
          { icon: Lock, text: "Tikslų adresą mato tik pasirinktas teikėjas" },
          { icon: Wallet, text: "Atsiskaitote tiesiogiai, be tarpininkų" },
        ].map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-2.5 rounded-xl bg-white px-3.5 py-3 font-medium text-stone-700 ring-1 ring-line">
            <Icon className="size-4.5 shrink-0 text-brand-600" aria-hidden /> {text}
          </li>
        ))}
      </ul>

      {recent.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-extrabold tracking-tight">Jūsų aktyvios užklausos</h2>
            <Link href="/mano-uzklausos" className="text-sm font-semibold text-brand-700 hover:underline">
              Visos
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
        <h2 className="text-2xl font-extrabold tracking-tight">Kaip tai veikia</h2>
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
          <p className="text-lg font-extrabold">Norite pabandyti be registracijos?</p>
          <p className="mt-1 max-w-2xl text-[15px] text-stone-700">
            Demonstracijoje yra išgalvota užklausa iš Paantvardžio (Jurbarko r.) su dviem pasiūlymais. Duomenys aiškiai pažymėti ir
            nematomi tikriems naudotojams.
          </p>
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
                <p className="text-xl font-extrabold">Teikiate paslaugas?</p>
                <p className="mt-1 max-w-xl text-[15px] text-white/75">
                  Įmonė ar individuali veikla – pasirinkite paslaugas ir savivaldybes, matykite darbus šalia ir siūlykite savo kainą.
                </p>
              </div>
            </div>
            <ButtonLink href={actor ? "/paskyra/teikejas" : "/registracija?teikejas=1"} variant="accent" size="lg" className="shrink-0">
              Tapti teikėju <ArrowRight className="size-5" aria-hidden />
            </ButtonLink>
          </div>
        </section>
      )}
    </div>
  );
}
