/**
 * fetch-safe.ts
 * Fetch wrapper with timeout, retry, and typed error handling.
 * Never throws — always returns { data, error, status }.
 */

interface FetchSafeOptions extends RequestInit {
  /** Timeout in ms before aborting. Default: 15000 */
  timeoutMs?: number;
  /** Number of additional attempts on network failure. Default: 1 */
  retries?: number;
  /** Delay between retries in ms. Default: 800 */
  retryDelayMs?: number;
}

interface FetchSafeResult<T> {
  data: T | null;
  error: string | null;
  status: number | null;
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchSafe<T = unknown>(
  url: string,
  options: FetchSafeOptions = {}
): Promise<FetchSafeResult<T>> {
  const {
    timeoutMs = 15_000,
    retries = 1,
    retryDelayMs = 800,
    ...fetchOptions
  } = options;

  let lastError = "Unknown error";
  let attempt = 0;

  while (attempt <= retries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { ...fetchOptions, signal: controller.signal });
      clearTimeout(timeoutId);

      // Try to parse JSON regardless of status
      let data: T | null = null;
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        try {
          data = await res.json();
        } catch {
          data = null;
        }
      }

      if (!res.ok) {
        const errorMsg = (data as any)?.error ?? `Request failed (${res.status})`;
        return { data: null, error: errorMsg, status: res.status };
      }

      return { data, error: null, status: res.status };
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      if (err instanceof DOMException && err.name === "AbortError") {
        lastError = "Request timed out. Please try again.";
      } else if (err instanceof TypeError && err.message.includes("fetch")) {
        lastError = "Connection interrupted. Check your network.";
      } else {
        lastError = err instanceof Error ? err.message : "Unknown error";
      }

      attempt++;
      if (attempt <= retries) {
        await delay(retryDelayMs * attempt);
      }
    }
  }

  return { data: null, error: lastError, status: null };
}

/** POST shorthand */
export function postSafe<T = unknown>(url: string, body: unknown, options?: Omit<FetchSafeOptions, "method" | "body">) {
  return fetchSafe<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...options,
  });
}
