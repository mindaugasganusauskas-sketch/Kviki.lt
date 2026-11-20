// Testų pagalbininkai: kiekvienas „įrenginys“ turi savo sesijos slapuką.
import { randomUUID } from "node:crypto";
import sharp from "sharp";

export const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3100";

export class Device {
  cookie = "";
  /** Sąsajos kalba (slapukas „kviki_lang“). */
  lang: "lt" | "en" | null = null;
  constructor(readonly label: string) {}

  async call<T = any>(method: string, path: string, body?: unknown, extraHeaders: Record<string, string> = {}): Promise<{ status: number; body: T }> {
    const headers: Record<string, string> = { Origin: BASE, ...extraHeaders };
    const cookies = [this.cookie, this.lang ? `kviki_lang=${this.lang}` : ""].filter(Boolean);
    if (cookies.length) headers.Cookie = cookies.join("; ");
    let payload: BodyInit | undefined;
    if (body instanceof FormData) payload = body;
    else if (body !== undefined) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
    const res = await fetch(BASE + path, { method, headers, body: payload, redirect: "manual" });
    const set = res.headers.getSetCookie?.() ?? [];
    for (const c of set) {
      const [pair] = c.split(";");
      if (pair.startsWith("kviki_session=")) this.cookie = pair.endsWith("=") ? "" : pair;
    }
    const text = await res.text();
    let parsed: unknown = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      /* ne JSON */
    }
    return { status: res.status, body: parsed as T };
  }
  get<T = any>(path: string) {
    return this.call<T>("GET", path);
  }
  post<T = any>(path: string, body: unknown = {}) {
    return this.call<T>("POST", path, body);
  }
  async raw(path: string) {
    return fetch(BASE + path, { headers: this.cookie ? { Cookie: this.cookie } : {} });
  }
}

export const uid = () => randomUUID().slice(0, 8);

export async function newUser(label: string, extra: Record<string, unknown> = {}) {
  const d = new Device(label);
  const email = `${label}-${uid()}@test.kviki.lt`;
  const r = await d.post("/api/v1/auth/register", { name: label, email, password: "slaptazodis123", phone: "+37061111111", acceptTerms: true, ...extra });
  if (r.status !== 200) throw new Error(`register ${label}: ${r.status} ${JSON.stringify(r.body)}`);
  return Object.assign(d, { email, userId: r.body.user.id as string });
}

export async function loginAgain(email: string, label: string) {
  const d = new Device(label);
  const r = await d.post("/api/v1/auth/login", { email, password: "slaptazodis123" });
  if (r.status !== 200) throw new Error(`login: ${r.status}`);
  return d;
}

export async function newProvider(
  label: string,
  opts: { businessForm: "company" | "individual"; categories: string[]; municipalities: string[] },
) {
  const d = await newUser(label);
  const r = await d.call("PUT", "/api/v1/me/provider-profile", {
    businessForm: opts.businessForm,
    displayName: label,
    phone: "+37062222222",
    description: "",
    categories: opts.categories,
    municipalities: opts.municipalities,
  });
  if (r.status !== 200) throw new Error(`profile ${label}: ${r.status} ${JSON.stringify(r.body)}`);
  return d;
}

export function vilniusDate(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Vilnius" }).format(d);
}

export function requestBody(overrides: Record<string, unknown> = {}) {
  return {
    category: "mowing",
    description: "Reikia nupjauti apie 40 arų pievos. Žolė iki kelių, žolės surinkti nereikia.",
    details: { areaAres: 40, grassHeight: "knee", collectGrass: false, equipment: "provider", tractorAccess: true },
    municipality: "jurbarko-r",
    locality: "Paantvardys",
    address: "Slaptas adresas 7, Paantvardys",
    contactPhone: "+37069999999",
    lat: 55.07,
    lng: 22.76,
    timing: { type: "window", startDate: vilniusDate(0), startTime: "00:00", endDate: vilniusDate(2), endTime: "20:00" },
    recurrence: { type: "once" },
    ...overrides,
  };
}

/** JPEG su GPS koordinatėmis EXIF duomenyse – turi būti pašalintos. */
export async function jpegWithGps(): Promise<Blob> {
  const buf = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#4a8a3a" } })
    .withExif({
      IFD0: { Make: "TestPhone", Model: "Kviki" },
      IFD3: { GPSLatitudeRef: "N", GPSLatitude: "55/1 4/1 17/1", GPSLongitudeRef: "E", GPSLongitude: "22/1 45/1 56/1" },
    })
    .jpeg()
    .toBuffer();
  return new Blob([new Uint8Array(buf)], { type: "image/jpeg" });
}

export function offerBody(priceEur: number, startOffsetHours: number, included = "Atvykimas ir pjovimas savo technika") {
  return {
    priceCents: Math.round(priceEur * 100),
    startAt: new Date(Date.now() + startOffsetHours * 3600 * 1000).toISOString(),
    included,
  };
}
