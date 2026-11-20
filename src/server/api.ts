import { NextResponse, type NextRequest } from "next/server";
import { AppError } from "@/server/errors";
import { requireActor, type Actor } from "@/server/auth/session";
import { getLocale } from "@/i18n/server";
import { translateError } from "@/shared/errors-en";
import type { Locale } from "@/shared/locale";

const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Apsauga nuo užklausų iš svetimų svetainių, kai naudojamas sesijos slapukas.
 * Mobilioji programėlė siunčia „Authorization: Bearer“, todėl jai tikrinimas netaikomas.
 */
function checkOrigin(req: NextRequest) {
  if (!UNSAFE.has(req.method)) return;
  if (/^Bearer\s/i.test(req.headers.get("authorization") ?? "")) return;
  const origin = req.headers.get("origin");
  if (origin) {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    let originHost = "";
    try {
      originHost = new URL(origin).host;
    } catch {
      /* neteisingas Origin */
    }
    if (!host || originHost !== host) throw new AppError("BAD_ORIGIN", "Užklausa atmesta");
    return;
  }
  if (req.headers.get("sec-fetch-site") === "cross-site") throw new AppError("BAD_ORIGIN", "Užklausa atmesta");
}

export function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "local"
  );
}

/** Klaidos atsakymas naudotojo kalba (pagal slapuką „kviki_lang“). */
export function errorResponse(err: unknown, locale: Locale = "lt"): NextResponse {
  if (err instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: err.code,
          message: translateError(err.message, locale),
          details: err.code === "VALIDATION" ? undefined : err.details,
        },
      },
      { status: err.status },
    );
  }
  console.error(err);
  return NextResponse.json(
    { error: { code: "INTERNAL", message: translateError("Įvyko klaida. Bandykite dar kartą.", locale) } },
    { status: 500 },
  );
}

type Ctx<P> = { params: Promise<P> };

/** Viešas maršrutas (be prisijungimo). */
export function route<P = Record<string, string>>(
  fn: (req: NextRequest, params: P) => Promise<unknown>,
) {
  return async (req: NextRequest, ctx: Ctx<P>) => {
    try {
      checkOrigin(req);
      const result = await fn(req, await ctx.params);
      if (result instanceof Response) return result;
      return NextResponse.json(result ?? { ok: true }, { headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      return errorResponse(err, await getLocale().catch(() => "lt" as const));
    }
  };
}

/** Maršrutas prisijungusiam naudotojui. */
export function authed<P = Record<string, string>>(
  fn: (req: NextRequest, actor: Actor, params: P) => Promise<unknown>,
) {
  return route<P>(async (req, params) => fn(req, await requireActor(), params));
}

export async function readJson(req: NextRequest): Promise<unknown> {
  const text = await req.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError("VALIDATION", "Neteisingas užklausos formatas");
  }
}

/** JSON arba multipart forma su lauku „data“ ir nuotraukomis „photos“. */
export async function readRequestPayload(req: NextRequest): Promise<{ data: unknown; files: File[] }> {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("multipart/form-data")) {
    const form = await req.formData();
    const raw = form.get("data");
    let data: unknown = {};
    if (typeof raw === "string") {
      try {
        data = JSON.parse(raw);
      } catch {
        throw new AppError("VALIDATION", "Neteisingas užklausos formatas");
      }
    }
    const files = form.getAll("photos").filter((f): f is File => typeof f !== "string");
    return { data, files };
  }
  return { data: await readJson(req), files: [] };
}
