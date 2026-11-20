import type { Metadata } from "next";
import { ButtonLink, Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Kaip tai veikia" };

const CLIENT = [
  ["Aprašykite darbą", "Pasirinkite, ko reikia, atsakykite į kelis klausimus, pridėkite nuotrauką. Nurodykite vietą ir laiką."],
  ["Palaukite pasiūlymų", "Teikėjai jūsų savivaldybėje pasiūlo galutinę kainą, pradžios laiką ir ką įskaičiuoja. Apie kiekvieną pranešime."],
  ["Pasirinkite", "Palyginkite pagal kainą ar ankstyviausią laiką ir patvirtinkite. Tik tada teikėjas pamato tikslų adresą ir telefoną."],
  ["Užbaikite", "Teikėjas pažymi darbą atliktu, jūs patvirtinate rezultatą arba pažymite problemą."],
];
const PROVIDER = [
  ["Užpildykite profilį", "Veiklos forma (įmonė ar individuali veikla), paslaugos ir savivaldybės, kuriose dirbate."],
  ["Matykite darbus šalia", "Rodome atviras užklausas, kurios atitinka jūsų paslaugas ir savivaldybes."],
  ["Siūlykite savo kainą", "Galutinė kaina, siūloma pradžia ir kas įskaičiuota. Kol klientas nepasirinko – galite keisti ar atsiimti."],
  ["Atlikite darbą", "Priimtas darbas atsiranda skiltyje „Mano darbai“ su adresu ir kliento kontaktu."],
];

export default function HowPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Kaip tai veikia" subtitle="Kviki sujungia žmones, kuriems reikia pagalbos kieme ar ūkyje, su netoliese dirbančiais teikėjais." />
      {[
        ["Klientams", CLIENT],
        ["Teikėjams", PROVIDER],
      ].map(([title, steps]) => (
        <Card key={title as string}>
          <h2 className="text-lg font-bold">{title as string}</h2>
          <ol className="mt-3 space-y-3">
            {(steps as string[][]).map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">{i + 1}</span>
                <span>
                  <span className="font-semibold">{t}.</span> <span className="text-stone-700">{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>
      ))}
      <Card>
        <h2 className="text-lg font-bold">Apmokėjimas</h2>
        <p className="mt-2 text-stone-700">Šiuo metu už darbą atsiskaitote tiesiogiai su teikėju. Kviki mokėjimų nerenka.</p>
      </Card>
      <div className="flex flex-wrap gap-2">
        <ButtonLink href="/nauja-uzklausa">Aprašyti darbą</ButtonLink>
        <ButtonLink href="/registracija?teikejas=1" variant="outline">Tapti teikėju</ButtonLink>
      </div>
    </div>
  );
}
