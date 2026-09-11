import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

// This runs on Vercel's servers, not the visitor's browser. Previously the
// login page called supabase-js directly from the browser, which meant
// every sign-in depended on that specific visitor's own network/ISP/DNS
// being able to reach *.supabase.co. Server-to-server (Vercel -> Supabase)
// is a far more reliable path than an arbitrary visitor's connection to a
// third-party domain, and it removes a whole class of "works for me, hangs
// for them" bugs that no amount of client-side caching/timeout fixes could
// actually solve.
export async function POST(req: Request) {
  const limited = rateLimit(req, { limit: 20, windowMs: 60_000 });
  if (!limited.ok) {
    return NextResponse.json({ error: limited.error }, { status: 429 });
  }

  let body: { action?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { action, email, password } = body;

  if (!email || !password || (action !== "signin" && action !== "signup")) {
    return NextResponse.json({ error: "Missing email, password, or action." }, { status: 400 });
  }

  const supabase = await createClient();

  if (action === "signup") {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true, session: !!data.session });
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  return NextResponse.json({ ok: true, session: true });
}
