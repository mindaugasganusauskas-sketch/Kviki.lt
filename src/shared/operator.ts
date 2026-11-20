// Svetainės valdytojo (duomenų valdytojo) rekvizitai, rodomi privatumo politikoje ir taisyklėse.
// Kol `ready` yra false, teisiniuose puslapiuose rodomas įspėjimas, kad tai juodraštis.
// Įmonės kodą įrašykite tik įregistravus įmonę – kitaip jis gali sutapti su kitos įmonės kodu.
export const OPERATOR = {
  ready: false,
  name: "UAB Kviki (steigiama)",
  code: null as string | null,
  address: null as string | null,
  email: "info@kviki.lt",
  updated: "2026 m. lapkričio 20 d.",
  updatedEn: "20 November 2026",
} as const;

/** „UAB Kviki (įmonės kodas …, adresas …)“ – rodomi tik žinomi rekvizitai. */
export function operatorLine(locale: "lt" | "en" = "lt"): string {
  const name = locale === "en" ? OPERATOR.name.replace("(steigiama)", "(being established)") : OPERATOR.name;
  const parts = [OPERATOR.code ? `${locale === "en" ? "company code" : "įmonės kodas"} ${OPERATOR.code}` : null, OPERATOR.address].filter(Boolean);
  return parts.length ? `${name}, ${parts.join(", ")}` : name;
}
