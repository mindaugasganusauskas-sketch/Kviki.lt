import type { ZodError } from "zod";
import { firstIssue } from "@/shared/schemas";

export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "OFFER_CHANGED"
  | "ALREADY_AGREED"
  | "REQUEST_CLOSED"
  | "RATE_LIMITED"
  | "PROVIDER_PROFILE_REQUIRED"
  | "BAD_ORIGIN"
  | "INTERNAL";

const STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 400,
  CONFLICT: 409,
  OFFER_CHANGED: 409,
  ALREADY_AGREED: 409,
  REQUEST_CLOSED: 409,
  RATE_LIMITED: 429,
  PROVIDER_PROFILE_REQUIRED: 403,
  BAD_ORIGIN: 403,
  INTERNAL: 500,
};

export class AppError extends Error {
  readonly status: number;
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.status = STATUS[code];
  }
}

export const notFound = (what = "Įrašas nerastas arba jums nepasiekiamas") => new AppError("NOT_FOUND", what);

export function fromZod(error: ZodError): AppError {
  return new AppError("VALIDATION", firstIssue(error), error.issues);
}

type SafeParser<T> = {
  safeParse(v: unknown): { success: true; data: T } | { success: false; error: ZodError };
};

/** Validuoja įvestį ir meta lietuvišką klaidą. */
export function parseInput<T>(schema: SafeParser<T>, value: unknown): T {
  const res = schema.safeParse(value);
  if (!res.success) throw fromZod(res.error);
  return res.data;
}
