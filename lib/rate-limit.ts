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
  // x-forwarded-for can have an attacker-supplied value prepended to it (a
  // client can send its own XFF header); Vercel appends the true connecting
  // IP as the LAST entry rather than stripping what the client sent, so take
  // the last entry, not the first — otherwise a client can set a fresh fake
  // IP per request to get a new rate-limit bucket every time.
  const ip =
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ||
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
if (typeof globalThis !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetAt) store.delete(key);
    }
  }, 5 * 60_000);
}
