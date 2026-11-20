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
} as const;

/** „UAB Kviki (įmonės kodas …, adresas …)“ – rodomi tik žinomi rekvizitai. */
export function operatorLine(): string {
  const parts = [OPERATOR.code ? `įmonės kodas ${OPERATOR.code}` : null, OPERATOR.address].filter(Boolean);
  return parts.length ? `${OPERATOR.name}, ${parts.join(", ")}` : OPERATOR.name;
}
