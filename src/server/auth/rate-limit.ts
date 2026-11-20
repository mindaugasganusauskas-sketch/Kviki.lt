// Paprastas atminties ribotuvas vienam serveriui (pakanka vienam VPS).
const buckets = new Map<string, { count: number; resetAt: number }>();

/** Grąžina false, jei per laikotarpį viršytas leidžiamas bandymų skaičius. */
export function allow(key: string, limit: number, windowMs: number): boolean {
  if (process.env.KVIKI_DISABLE_RATE_LIMIT === "1") return true;
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) {
      for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
    }
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}
