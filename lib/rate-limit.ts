/**
 * Simple in-memory rate limiter for Next.js API routes.
 * Resets between deployments (stateless). Good enough for a single-user app.
 *
 * Usage:
 *   const result = rateLimit(req, { limit: 10, windowMs: 60_000 });
 *   if (!result.ok) return NextResponse.json({ error: result.error }, { status: 429 });
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Global store — survives between requests in the same process
const store = new Map<string, RateLimitEntry>();

interface RateLimitOptions {
  /** Max requests allowed in the window */
  limit?: number;
  /** Time window in milliseconds */
  windowMs?: number;
}

interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
  error?: string;
}

export function rateLimit(
  req: Request,
  { limit = 20, windowMs = 60_000 }: RateLimitOptions = {}
): RateLimitResult {
  // Use IP from headers (Vercel sets x-forwarded-for)
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const key = `${ip}:${new URL(req.url).pathname}`;
  const now = Date.now();

  let entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
    return { ok: true, remaining: limit - 1, resetAt: entry.resetAt };
  }

  entry.count += 1;

  if (entry.count > limit) {
    return {
      ok: false,
      remaining: 0,
      resetAt: entry.resetAt,
      error: `Too many requests. Please wait ${Math.ceil((entry.resetAt - now) / 1000)} seconds.`,
    };
  }

  return { ok: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

// Cleanup old entries every 5 minutes to prevent memory leaks
if (typeof global !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetAt) store.delete(key);
    }
  }, 5 * 60_000);
}
