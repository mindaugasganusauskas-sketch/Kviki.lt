import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BadgeCheck, Bell, Lock, MessageSquareWarning } from "lucide-react";
import { getActor } from "@/server/auth/session";
import { listMyRequests } from "@/server/services/requests";
import { demoEnabled } from "@/server/services/demo";
import { CATEGORIES } from "@/shared/categories";
import { CategoryIcon } from "@/components/category-icon";
import { ButtonLink, Card } from "@/components/ui";
import { FreeTextStart } from "./free-text-start";
import { DemoButtons } from "./demo-buttons";
import { RequestListCard } from "@/components/request-list-card";

export default async function HomePage() {
  const actor = await getActor();
  if (actor?.mode === "provider") redirect("/darbai-salia");
  const recent = actor ? (await listMyRequests(actor)).filter((r) => r.status === "open" || r.status === "agreed").slice(0, 3) : [];

  return (
    <div className="space-y-10">
      <section className="rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 px-5 py-8 text-white sm:px-10 sm:py-12">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-200">Vietinė pagalba kiemo ir ūkio darbams</p>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight sm:text-4xl">Kokios pagalbos reikia?</h1>
        <p className="mt-2 max-w-xl text-brand-100">
          Aprašykite darbą vieną kartą. Netoliese dirbantys žmonės ir įmonės pasiūlys kainą ir laiką, o jūs išsirinksite.
        </p>
        <ul className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          {CATEGORIES.map((c) => (
            <li key={c.id}>
              <Link
                href={`/nauja-uzklausa?kategorija=${c.id}`}
                className="flex h-full flex-col gap-2 rounded-2xl bg-white p-3.5 text-ink shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <CategoryIcon category={c.id} className="size-6" />
                </span>
                <span className="text-[15px] font-bold leading-snug">{c.label}</span>
                <span className="text-xs text-muted">{c.hint}</span>
              </Link>
            </li>
          ))}
        </ul>
        <FreeTextStart />
      </section>

      {recent.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Jūsų aktyvios užklausos</h2>
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
        <h2 className="mb-4 text-lg font-bold">Kaip tai veikia</h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {[
            ["Aprašote darbą", "Kas, kur ir kada. Galite pridėti nuotrauką. Tikslų adresą matys tik pasirinktas teikėjas."],
            ["Gaunate pasiūlymus", "Teikėjai siūlo galutinę kainą ir konkretų laiką. Galite palyginti pagal kainą ar ankstyviausią laiką."],
            ["Pasirenkate ir susitariate", "Abu matote tą pačią užsakymo kortelę. Atsiskaitote tiesiogiai su teikėju."],
          ].map(([title, text], i) => (
            <li key={title}>
              <Card className="h-full">
                <span className="flex size-8 items-center justify-center rounded-full bg-sun-100 font-bold text-sun-700">{i + 1}</span>
                <p className="mt-3 font-bold">{title}</p>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </Card>
            </li>
          ))}
        </ol>
        <ul className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-3">
          <li className="flex gap-2">
            <Lock className="size-4 shrink-0 text-brand-600" aria-hidden /> Iki pasirinkimo teikėjai mato tik gyvenvietę
          </li>
          <li className="flex gap-2">
            <Bell className="size-4 shrink-0 text-brand-600" aria-hidden /> Apie naujus pasiūlymus pranešame
          </li>
          <li className="flex gap-2">
            <MessageSquareWarning className="size-4 shrink-0 text-brand-600" aria-hidden /> Rodome tik tikrus pasiūlymus, be išgalvotų teikėjų
          </li>
        </ul>
      </section>

      {!actor && demoEnabled() && (
        <section>
          <Card className="border-violet-200 bg-violet-50">
            <p className="font-bold text-violet-900">Norite pabandyti be registracijos?</p>
            <p className="mt-1 text-sm text-violet-900/80">
              Demonstracijoje yra išgalvota užklausa iš Paantvardžio (Jurbarko r.) su dviem pasiūlymais. Duomenys aiškiai pažymėti ir nematomi tikriems naudotojams.
            </p>
            <DemoButtons />
          </Card>
        </section>
      )}

      {!actor?.isProvider && (
        <section>
          <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <BadgeCheck className="mt-0.5 size-6 shrink-0 text-brand-600" aria-hidden />
              <div>
                <p className="font-bold">Teikiate paslaugas?</p>
                <p className="text-sm text-muted">
                  Įmonė ar individuali veikla – pasirinkite paslaugas ir savivaldybes, matykite darbus šalia ir siūlykite savo kainą.
                </p>
              </div>
            </div>
            <ButtonLink href={actor ? "/paskyra/teikejas" : "/registracija?teikejas=1"} variant="secondary">
              Tapti teikėju <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          </Card>
        </section>
      )}
    </div>
  );
}
