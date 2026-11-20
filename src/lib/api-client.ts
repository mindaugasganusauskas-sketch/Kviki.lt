// Naršyklės pusės API klientas. Tą patį API naudos ir mobilioji programėlė.
import type { ApiErrorBody } from "@/shared/types";

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

type Options = { method?: string; json?: unknown; form?: FormData };

export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const init: RequestInit = { method: opts.method ?? (opts.json !== undefined || opts.form ? "POST" : "GET"), credentials: "same-origin" };
  if (opts.form) init.body = opts.form;
  else if (opts.json !== undefined) {
    init.body = JSON.stringify(opts.json);
    init.headers = { "Content-Type": "application/json" };
  }
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new ApiError("NETWORK", "Nepavyko susisiekti su serveriu. Patikrinkite interneto ryšį ir bandykite dar kartą.", 0);
  }
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    const err = (body as ApiErrorBody | null)?.error;
    throw new ApiError(err?.code ?? "HTTP_" + res.status, err?.message ?? "Įvyko klaida. Bandykite dar kartą.", res.status, err?.details);
  }
  return body as T;
}
