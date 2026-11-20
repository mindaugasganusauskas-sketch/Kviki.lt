/** Leidžia grįžti tik į šios svetainės puslapį (apsauga nuo nukreipimo į svetimą svetainę). */
export function safeNext(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 500) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  if (/[\u0000-\u001f]/.test(value)) return null;
  return value;
}
