export const DOMAIN_CODES = [
  "OUT_OF_STOCK",
  "NOT_SERVICEABLE",
  "COD_UNAVAILABLE",
  "AMOUNT_MISMATCH",
  "INVALID_TRANSITION",
  "RATE_LIMITED",
  "EMPTY_CART",
  "VALIDATION",
  "UNAUTHORIZED",
  "NOT_FOUND",
  "PAYMENT_PROVIDER_UNAVAILABLE",
  "ALREADY_EXISTS",
  "UNEXPECTED",
] as const;

export type DomainCode = (typeof DOMAIN_CODES)[number];

export type DomainError = {
  code: DomainCode;
  message: string;
  requestId?: string;
  details?: Record<string, unknown>;
};

export type Result<T, E extends DomainError = DomainError> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function err(code: DomainCode, message: string, details?: Record<string, unknown>): Result<never> {
  return { ok: false, error: { code, message, details } };
}

export function unexpected(requestId: string): Result<never> {
  return {
    ok: false,
    error: {
      code: "UNEXPECTED",
      message: "Something went quiet on our side. Try again in a moment.",
      requestId,
    },
  };
}
