import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Privatumas" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Privatumas" subtitle="Trumpai, kas ką mato Kviki platformoje." />
      <Card className="space-y-3 leading-relaxed text-stone-800">
        <p><strong>Iki pasirinkimo</strong> teikėjai mato tik darbo aprašymą, nuotraukas, savivaldybę ir gyvenvietę. Tikslaus adreso, telefono ir jūsų vardo jie nemato.</p>
        <p><strong>Po pasirinkimo</strong> tikslų adresą ir telefoną mato tik jūsų pasirinktas teikėjas. Kiti teikėjai mato tik tai, kad užklausa baigėsi.</p>
        <p><strong>Pasiūlymus</strong> mato tik užklausos autorius. Teikėjai nemato vieni kitų kainų.</p>
        <p><strong>Nuotraukos</strong> sumažinamos, o vietos duomenys (GPS) iš jų pašalinami.</p>
        <p><strong>Vietos nustatymas</strong> naudojamas tik jums paspaudus „Naudoti mano vietą“. Adreso pasiūlymui koordinatės siunčiamos „OpenStreetMap Nominatim“ paslaugai.</p>
        <p><strong>Slaptažodžiai</strong> saugomi tik kaip kriptografinė santrauka.</p>
      </Card>
    </div>
  );
}
