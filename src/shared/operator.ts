// Svetainės valdytojo (duomenų valdytojo) rekvizitai, rodomi privatumo politikoje ir taisyklėse.
// Kol `ready` yra false, teisiniuose puslapiuose rodomas įspėjimas, kad tai juodraštis.
export const OPERATOR = {
  ready: false,
  name: "UAB Kviki",
  code: "30001111",
  address: null as string | null,
  email: "info@kviki.lt",
  updated: "2026 m. lapkričio 20 d.",
} as const;

/** „UAB Kviki (įmonės kodas …, adresas …)“ */
export function operatorLine(): string {
  return `${OPERATOR.name} (įmonės kodas ${OPERATOR.code}${OPERATOR.address ? `, ${OPERATOR.address}` : ""})`;
}
