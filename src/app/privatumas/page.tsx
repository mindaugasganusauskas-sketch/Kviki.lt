import type { Metadata } from "next";
import Link from "next/link";
import { OPERATOR, operatorLine } from "@/shared/operator";
import { Alert, Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Privatumo politika" };

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-6 text-lg font-bold first:mt-0">{children}</h2>;
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Privatumo politika" subtitle={`Atnaujinta ${OPERATOR.updated}`} />
      {!OPERATOR.ready && (
        <Alert tone="warning" title="Juodraštis">
          Tekstas dar tikslinamas. Prieš paleidžiant platformą tikriems naudotojams jį rekomenduojama peržiūrėti teisininkui.
        </Alert>
      )}

      <Card className="space-y-3 leading-relaxed text-stone-800 [&_li]:ml-5 [&_li]:list-disc [&_p]:mt-2">
        <p className="!mt-0">
          <strong>Trumpai:</strong> renkame tik tiek duomenų, kiek reikia, kad klientas ir teikėjas galėtų susitarti dėl darbo.
          Iki pasirinkimo teikėjai mato tik darbo aprašymą, nuotraukas, savivaldybę ir gyvenvietę. Tikslų adresą ir telefoną
          mato tik pasirinktas teikėjas. Reklamos ir sekimo slapukų nenaudojame.
        </p>

        <H>1. Kas tvarko jūsų duomenis</H>
        <p>
          Duomenų valdytojas: <strong>{operatorLine()}</strong>. Klausimais dėl duomenų rašykite{" "}
          <strong>{OPERATOR.email}</strong>.
        </p>

        <H>2. Kokius duomenis renkame ir kodėl</H>
        <ul>
          <li>
            <strong>Paskyra:</strong> vardas, el. paštas, slaptažodis (saugoma tik kriptografinė santrauka), telefonas, jei jį
            nurodote. Tikslas – paskyros sukūrimas ir prisijungimas. Pagrindas – sutarties vykdymas (BDAR 6 str. 1 d. b p.).
          </li>
          <li>
            <strong>Užklausos:</strong> darbo rūšis, aprašymas, apimtis, nuotraukos, savivaldybė, gyvenvietė, pageidaujamas
            laikas, tikslus adresas, kontaktinis telefonas ir, jei leidžiate, vietos koordinatės. Tikslas – rasti teikėją ir
            susitarti. Pagrindas – sutarties vykdymas.
          </li>
          <li>
            <strong>Teikėjo profilis:</strong> vardas arba įmonės pavadinimas, veiklos forma, įmonės kodas (nebūtina), telefonas,
            paslaugos ir savivaldybės. Pagrindas – sutarties vykdymas.
          </li>
          <li>
            <strong>Pasiūlymai, užsakymai ir vizitai:</strong> kainos, laikai, būsenos, atšaukimo priežastys. Pagrindas – sutarties
            vykdymas ir teisėtas interesas išsaugoti susitarimų istoriją ginčų atvejams (BDAR 6 str. 1 d. f p.).
          </li>
          <li>
            <strong>Techniniai duomenys:</strong> serverio žurnaluose fiksuojamas IP adresas ir užklausos laikas, taip pat
            prisijungimo bandymų skaičius. Tikslas – saugumas ir piktnaudžiavimo prevencija. Pagrindas – teisėtas interesas.
          </li>
          <li>
            <strong>Vietos nustatymas</strong> naudojamas tik jums paspaudus „Naudoti mano vietą“ ir leidus tai naršyklėje.
            Pagrindas – jūsų sutikimas, kurį galite bet kada atšaukti naršyklės nustatymuose.
          </li>
        </ul>

        <H>3. Kas mato jūsų duomenis</H>
        <ul>
          <li>Kiti teikėjai iki pasirinkimo mato tik darbo aprašymą, nuotraukas, savivaldybę ir gyvenvietę – ne vardą, adresą ar telefoną.</li>
          <li>Jūsų pasirinktas teikėjas mato jūsų vardą, telefoną, el. paštą ir tikslų adresą.</li>
          <li>Klientas, pasirinkęs teikėją, mato teikėjo vardą ar pavadinimą, veiklos formą, telefoną ir el. paštą.</li>
          <li>Pasiūlymų kainas mato tik užklausos autorius; teikėjai nemato vieni kitų kainų.</li>
          <li>
            Paslaugų teikėjai, padedantys veikti svetainei: serverio nuomos paslaugų teikėjas (Hostinger); el. pašto siuntimo
            paslauga (jei įjungta pranešimai el. paštu); „OpenStreetMap Nominatim“ – tik koordinatės, kai patys paspaudžiate
            „Naudoti mano vietą“.
          </li>
          <li>Duomenų neparduodame ir nenaudojame reklamai.</li>
        </ul>

        <H>4. Kiek laiko saugome</H>
        <ul>
          <li>Paskyros, užklausų ir užsakymų duomenis – kol turite paskyrą.</li>
          <li>
            Ištrynus paskyrą, jūsų vardas, kontaktai, adresai, aprašymai ir nuotraukos pašalinami iš karto. Lieka tik nuasmeninta
            užsakymų istorija (darbo rūšis, kaina, datos), reikalinga kitai sandorio šaliai.
          </li>
          <li>Atsarginės kopijos saugomos iki 14 dienų, po to automatiškai ištrinamos.</li>
          <li>Neaktyvios užklausos uždaromos automatiškai: „Kuo greičiau“ – po 14 d., kitos – praėjus nurodytam laikui arba po 30 d.</li>
        </ul>

        <H>5. Jūsų teisės</H>
        <p>
          Turite teisę susipažinti su savo duomenimis, juos ištaisyti, ištrinti, apriboti jų tvarkymą, nesutikti su tvarkymu ir
          gauti juos perkeliamu formatu. Vardą ir telefoną pakeisite{" "}
          <Link href="/paskyra" className="font-semibold text-brand-700 underline">
            paskyros nustatymuose
          </Link>
          , ten pat galite ir ištrinti paskyrą. Dėl kitų prašymų rašykite {OPERATOR.email} – atsakysime per 30 dienų. Jei
          manote, kad jūsų teisės pažeistos, galite kreiptis į Valstybinę duomenų apsaugos inspekciją (vdai.lrv.lt).
        </p>

        <H>6. Slapukai ir naršyklės atmintis</H>
        <p>
          Naudojame tik vieną būtiną slapuką <code>kviki_session</code> – jis reikalingas, kad liktumėte prisijungę (galioja iki
          60 d. arba kol atsijungsite). Pradėtos užklausos juodraštis laikomas tik jūsų naršyklėje, kol ją paskelbiate. Analitikos
          ir reklamos slapukų nenaudojame, todėl sutikimo juostos nėra.
        </p>

        <H>7. Saugumas</H>
        <p>
          Ryšys šifruojamas (HTTPS), slaptažodžiai saugomi tik kaip kriptografinė santrauka, iš nuotraukų pašalinami vietos (GPS)
          duomenys, o prieiga prie privačių duomenų tikrinama serveryje.
        </p>
      </Card>
      <p className="text-sm text-muted">
        Taip pat skaitykite{" "}
        <Link href="/taisykles" className="font-semibold text-brand-700 underline">
          naudojimosi taisykles
        </Link>
        .
      </p>
    </div>
  );
}
