import type { Metadata } from "next";
import Link from "next/link";
import { OPERATOR, operatorLine } from "@/shared/operator";
import { Alert, Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Naudojimosi taisyklės" };

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-6 text-lg font-bold first:mt-0">{children}</h2>;
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Naudojimosi taisyklės" subtitle={`Atnaujinta ${OPERATOR.updated}`} />
      {!OPERATOR.ready && (
        <Alert tone="warning" title="Juodraštis">
          Tekstas dar tikslinamas. Prieš paleidžiant platformą tikriems naudotojams jį rekomenduojama peržiūrėti teisininkui.
        </Alert>
      )}

      <Card className="space-y-3 leading-relaxed text-stone-800 [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-2">
        <H>1. Kas yra Kviki</H>
        <p>
          Kviki – interneto platforma, kurioje klientai aprašo kiemo ir ūkio darbus, o paslaugų teikėjai (įmonės ir individualią
          veiklą vykdantys asmenys) siūlo savo kainą ir laiką. Platformą valdo {operatorLine()}, el. paštas {OPERATOR.email}.
        </p>
        <p>
          <strong>Kviki yra tarpininkas.</strong> Sutartis dėl darbo sudaroma tiesiogiai tarp kliento ir teikėjo. Kviki nėra šios
          sutarties šalis ir neatsako už darbų atlikimą, kokybę, terminus ar dėl jų kilusią žalą.
        </p>

        <H>2. Paskyra</H>
        <ul>
          <li>Naudotis platforma gali asmenys nuo 18 metų.</li>
          <li>Nurodykite tikrus duomenis ir saugokite slaptažodį. Už veiksmus savo paskyroje atsakote jūs.</li>
          <li>Viena paskyra gali būti naudojama ir užsakyti darbus, ir juos atlikti.</li>
          <li>Paskyrą bet kada galite ištrinti paskyros nustatymuose.</li>
        </ul>

        <H>3. Užklausos ir pasiūlymai</H>
        <ul>
          <li>Klientas sąžiningai aprašo darbą, vietą ir laiką. Nuotraukose neturi būti kitų žmonių asmens duomenų be jų sutikimo.</li>
          <li>Teikėjo pasiūlyme nurodyta kaina yra galutinė kliento mokama kaina už nurodytą darbų apimtį (periodiniam darbui – už vieną vizitą).</li>
          <li>Kol klientas pasiūlymo nepriėmė, teikėjas gali jį keisti ar atsiimti. Klientui pakeitus užklausą, teikėjas turi kainą patvirtinti iš naujo.</li>
          <li>Klientui patvirtinus pasiūlymą, abi šalys įsipareigoja atlikti darbą sutartomis sąlygomis arba laiku jį atšaukti per platformą.</li>
        </ul>

        <H>4. Teikėjams</H>
        <ul>
          <li>Paslaugas teikiate teisėtai: kaip įmonė arba turėdami individualios veiklos pažymą, verslo liudijimą ar kitą tinkamą pagrindą.</li>
          <li>Patys atsakote už mokesčius, darbo saugą, reikalingus leidimus ir, jei reikia, civilinės atsakomybės draudimą.</li>
          <li>Ženklas „Patikrinta“ rodomas tik tada, kai Kviki realiai patikrino teikėjo duomenis.</li>
        </ul>

        <H>5. Kainos ir atsiskaitymas</H>
        <p>
          Naudotis Kviki šiuo metu nemokama. Už darbą klientas atsiskaito tiesiogiai su teikėju jų sutartu būdu. Kviki mokėjimų
          nerenka ir už juos neatsako.
        </p>

        <H>6. Draudžiama</H>
        <ul>
          <li>skelbti melagingą, įžeidžiančią ar neteisėtą informaciją;</li>
          <li>naudoti kitų asmenų duomenis be jų leidimo;</li>
          <li>siųsti šlamštą, reklamą ar teikti fiktyvius pasiūlymus;</li>
          <li>bandyti apeiti platformos saugumą ar gauti kitų naudotojų duomenis.</li>
        </ul>
        <p>Pažeidus taisykles, Kviki gali pašalinti turinį, apriboti ar ištrinti paskyrą.</p>

        <H>7. Atsakomybė</H>
        <p>
          Kviki stengiasi, kad platforma veiktų be pertrūkių, tačiau negarantuoja, kad ji visada bus pasiekiama. Kviki neatsako už
          naudotojų pateiktos informacijos teisingumą ir už sandorių tarp naudotojų pasekmes, išskyrus atvejus, kai atsakomybės
          negalima riboti pagal įstatymus.
        </p>

        <H>8. Asmens duomenys</H>
        <p>
          Kaip tvarkome duomenis, aprašyta{" "}
          <Link href="/privatumas" className="font-semibold text-brand-700 underline">
            privatumo politikoje
          </Link>
          .
        </p>

        <H>9. Taisyklių keitimas ir ginčai</H>
        <p>
          Taisykles galime atnaujinti; nauja redakcija skelbiama šiame puslapyje. Taikoma Lietuvos Respublikos teisė. Ginčus
          stengiamės spręsti derybomis ({OPERATOR.email}). Vartotojai taip pat gali kreiptis į Valstybinę vartotojų teisių apsaugos
          tarnybą (vvtat.lt).
        </p>
      </Card>
    </div>
  );
}
