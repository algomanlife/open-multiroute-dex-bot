/**
 * Custom error hierarchy for Open Multiroute DEX Bot.
 * Every error carries a machine-readable `code` so the API layer can map
 * failures to HTTP status codes and structured log fields deterministically.
 */

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "CONFIG_ERROR"
  | "AUTH_ERROR"
  | "UNKNOWN_EXCHANGE"
  | "ORDER_REJECTED"
  | "ORDER_FAILED"
  | "ACCOUNT_NOT_READY"
  | "RATE_LIMITED";

export class OmdbError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/** Alert payload failed schema or business-rule validation (HTTP 400/422). */
export class AlertValidationError extends OmdbError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("VALIDATION_ERROR", message, 422, details);
  }
}

/** Required environment variable or credential is missing (HTTP 500). */
export class ConfigError extends OmdbError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("CONFIG_ERROR", message, 500, details);
  }
}

/** Alert references an exchange that is not in the registry (HTTP 400). */
export class UnknownExchangeError extends OmdbError {
  constructor(exchange: string, supported: string[]) {
    super("UNKNOWN_EXCHANGE", `Exchange "${exchange}" is not supported`, 400, {
      exchange,
      supported
    });
  }
}

/** The DEX rejected the order (insufficient margin, bad market, etc.). */
export class OrderRejectedError extends OmdbError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("ORDER_REJECTED", message, 409, details);
  }
}

/** The order was submitted but the exchange returned an execution failure. */
export class OrderFailedError extends OmdbError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("ORDER_FAILED", message, 502, details);
  }
}

/** Exchange account is not configured / not ready to trade. */
export class AccountNotReadyError extends OmdbError {
  constructor(exchange: string) {
    super(
      "ACCOUNT_NOT_READY",
      `Exchange account "${exchange}" is not ready to trade`,
      503,
      { exchange }
    );
  }
}

/** Upstream rate limit hit — retry with backoff before surfacing. */
export class RateLimitError extends OmdbError {
  constructor(exchange: string, retryAfterMs?: number) {
    super("RATE_LIMITED", `Rate limited by "${exchange}"`, 429, {
      exchange,
      retryAfterMs
    });
  }
}
