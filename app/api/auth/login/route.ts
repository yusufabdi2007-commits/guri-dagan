import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

// Handles a plain HTML <form method="POST"> submission — not a fetch() call.
// This is deliberately the simplest possible mechanism the web platform
// offers: no client-side JS, no JSON, no custom timeout logic, nothing for
// a browser extension or a flaky script to interfere with. The browser's
// own native form navigation handles the request/response, and the
// service worker (public/sw.js) explicitly ignores non-GET requests, so
// this path can never be intercepted by it either.
export async function POST(req: Request) {
  const limited = rateLimit(req, { limit: 20, windowMs: 60_000 });
  if (!limited.ok) {
    return redirectWithError(req, limited.error || "Too many attempts. Please wait a moment.");
  }

  const form = await req.formData();
  const action = form.get("action");
  const email = form.get("email");
  const password = form.get("password");

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email ||
    !password ||
    (action !== "signin" && action !== "signup")
  ) {
    return redirectWithError(req, "Please fill in both fields.");
  }

  const supabase = await createClient();

  if (action === "signup") {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return redirectWithError(req, error.message, "signup");
    if (!data.session) {
      return redirectWithInfo(req, "Account created. Check your email to confirm, then sign in.");
    }
    return NextResponse.redirect(new URL("/today", req.url), { status: 303 });
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return redirectWithError(req, error.message, "signin");
  return NextResponse.redirect(new URL("/today", req.url), { status: 303 });
}

function redirectWithError(req: Request, message: string, mode?: string) {
  const url = new URL("/login", req.url);
  url.searchParams.set("error", message);
  if (mode) url.searchParams.set("mode", mode);
  return NextResponse.redirect(url, { status: 303 });
}

function redirectWithInfo(req: Request, message: string) {
  const url = new URL("/login", req.url);
  url.searchParams.set("info", message);
  return NextResponse.redirect(url, { status: 303 });
}
