// Lietuvos savivaldybės (60). Kodas – stabilus identifikatorius, saugomas duomenų bazėje.
// Šis modulis neturi priklausomybių, todėl jį gali naudoti ir mobilioji programėlė.

export interface Municipality {
  code: string;
  label: string;
}

export const MUNICIPALITIES: readonly Municipality[] = [
  { code: "akmenes-r", label: "Akmenės r." },
  { code: "alytaus-m", label: "Alytaus m." },
  { code: "alytaus-r", label: "Alytaus r." },
  { code: "anyksciu-r", label: "Anykščių r." },
  { code: "birstono", label: "Birštono sav." },
  { code: "birzu-r", label: "Biržų r." },
  { code: "druskininku", label: "Druskininkų sav." },
  { code: "elektrenu", label: "Elektrėnų sav." },
  { code: "ignalinos-r", label: "Ignalinos r." },
  { code: "jonavos-r", label: "Jonavos r." },
  { code: "joniskio-r", label: "Joniškio r." },
  { code: "jurbarko-r", label: "Jurbarko r." },
  { code: "kaisiadoriu-r", label: "Kaišiadorių r." },
  { code: "kalvarijos", label: "Kalvarijos sav." },
  { code: "kauno-m", label: "Kauno m." },
  { code: "kauno-r", label: "Kauno r." },
  { code: "kazlu-rudos", label: "Kazlų Rūdos sav." },
  { code: "kedainiu-r", label: "Kėdainių r." },
  { code: "kelmes-r", label: "Kelmės r." },
  { code: "klaipedos-m", label: "Klaipėdos m." },
  { code: "klaipedos-r", label: "Klaipėdos r." },
  { code: "kretingos-r", label: "Kretingos r." },
  { code: "kupiskio-r", label: "Kupiškio r." },
  { code: "lazdiju-r", label: "Lazdijų r." },
  { code: "marijampoles", label: "Marijampolės sav." },
  { code: "mazeikiu-r", label: "Mažeikių r." },
  { code: "moletu-r", label: "Molėtų r." },
  { code: "neringos", label: "Neringos sav." },
  { code: "pagegiu", label: "Pagėgių sav." },
  { code: "pakruojo-r", label: "Pakruojo r." },
  { code: "palangos-m", label: "Palangos m." },
  { code: "panevezio-m", label: "Panevėžio m." },
  { code: "panevezio-r", label: "Panevėžio r." },
  { code: "pasvalio-r", label: "Pasvalio r." },
  { code: "plunges-r", label: "Plungės r." },
  { code: "prienu-r", label: "Prienų r." },
  { code: "radviliskio-r", label: "Radviliškio r." },
  { code: "raseiniu-r", label: "Raseinių r." },
  { code: "rietavo", label: "Rietavo sav." },
  { code: "rokiskio-r", label: "Rokiškio r." },
  { code: "skuodo-r", label: "Skuodo r." },
  { code: "sakiu-r", label: "Šakių r." },
  { code: "salcininku-r", label: "Šalčininkų r." },
  { code: "siauliu-m", label: "Šiaulių m." },
  { code: "siauliu-r", label: "Šiaulių r." },
  { code: "silales-r", label: "Šilalės r." },
  { code: "silutes-r", label: "Šilutės r." },
  { code: "sirvintu-r", label: "Širvintų r." },
  { code: "svencioniu-r", label: "Švenčionių r." },
  { code: "taurages-r", label: "Tauragės r." },
  { code: "telsiu-r", label: "Telšių r." },
  { code: "traku-r", label: "Trakų r." },
  { code: "ukmerges-r", label: "Ukmergės r." },
  { code: "utenos-r", label: "Utenos r." },
  { code: "varenos-r", label: "Varėnos r." },
  { code: "vilkaviskio-r", label: "Vilkaviškio r." },
  { code: "vilniaus-m", label: "Vilniaus m." },
  { code: "vilniaus-r", label: "Vilniaus r." },
  { code: "visagino", label: "Visagino sav." },
  { code: "zarasu-r", label: "Zarasų r." },
] as const;

export const MUNICIPALITY_CODES = MUNICIPALITIES.map((m) => m.code);

const byCode = new Map(MUNICIPALITIES.map((m) => [m.code, m]));

export function municipalityLabel(code: string): string {
  return byCode.get(code)?.label ?? code;
}

export function isMunicipalityCode(code: string): boolean {
  return byCode.has(code);
}

/** Lietuviškų raidžių suvienodinimas paieškai ir adreso atpažinimui. */
export function foldLt(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Bando atpažinti savivaldybę iš žemėlapio paslaugos grąžinto pavadinimo,
 * pvz. „Jurbarko rajono savivaldybė“ arba „Vilniaus miesto savivaldybė“.
 */
export function guessMunicipality(name: string | undefined | null): string | null {
  if (!name) return null;
  const n = foldLt(name);
  const stem = n.split(" ")[0];
  const isCity = /miesto/.test(n);
  const isDistrict = /rajono/.test(n);
  const candidates = MUNICIPALITIES.filter((m) => foldLt(m.label).split(" ")[0] === stem);
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0].code;
  if (isCity) return candidates.find((c) => c.code.endsWith("-m"))?.code ?? candidates[0].code;
  if (isDistrict) return candidates.find((c) => c.code.endsWith("-r"))?.code ?? candidates[0].code;
  return candidates[0].code;
}
