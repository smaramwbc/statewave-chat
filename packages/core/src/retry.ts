/**
 * Retry utilities extracted from statewave-web's fetchWithRetry pattern.
 * Retries on network errors and retryable HTTP status codes (408, 429, 5xx).
 * AbortError is never retried — it represents intentional cancellation.
 */

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryOnStatus?: number[];
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelayMs: 250,
  maxDelayMs: 5000,
  retryOnStatus: [408, 429, 500, 502, 503, 504],
};

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

function backoff(attempt: number, opts: Required<RetryOptions>): number {
  const ms = opts.baseDelayMs * Math.pow(3, attempt - 1);
  return Math.min(ms, opts.maxDelayMs);
}

/**
 * Fetch with automatic retry on transient failures.
 * AbortError propagates immediately without retrying.
 */
export async function fetchWithRetry(
  input: string | URL,
  init?: RequestInit,
  options?: RetryOptions,
): Promise<Response> {
  const opts: Required<RetryOptions> = { ...DEFAULT_RETRY_OPTIONS, ...options };
  const signal = init?.signal as AbortSignal | undefined;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    let resp: Response;
    try {
      resp = await fetch(input, init);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") throw err;
      if (attempt === opts.maxAttempts) throw err;
      await delay(backoff(attempt, opts), signal);
      continue;
    }

    if (resp.ok) return resp;

    if (opts.retryOnStatus.includes(resp.status) && attempt < opts.maxAttempts) {
      const retryAfter = resp.headers.get("retry-after");
      const ms = retryAfter ? parseFloat(retryAfter) * 1000 : backoff(attempt, opts);
      await delay(Math.min(ms, opts.maxDelayMs), signal);
      continue;
    }

    return resp;
  }

  throw new Error("Retry attempts exhausted");
}
