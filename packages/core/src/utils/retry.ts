/** Exponential-backoff retry helper used by DEX clients and the engine. */
import { OmdbError } from "../errors.js";

export type RetryOptions = {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
};

const defaults: Required<RetryOptions> = {
  retries: 3,
  baseDelayMs: 500,
  maxDelayMs: 5_000
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { retries, baseDelayMs, maxDelayMs } = { ...defaults, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isRateLimit =
        error instanceof OmdbError && error.code === "RATE_LIMITED";
      if (!isRateLimit && attempt === retries) break;
      const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      await sleep(delay);
    }
  }
  throw lastError;
}

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
