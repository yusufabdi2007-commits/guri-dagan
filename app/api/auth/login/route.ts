import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
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

    // Supabase's "Enable email confirmations" project setting is on, so a fresh
    // signUp() returns no session — the account sits unconfirmed until someone
    // clicks the email link, but this app has no confirmation-callback route to
    // land that click on, so it never actually signs the visitor in here. That
    // left every new signup permanently stuck (see HANDOFF.md 2026-09-11).
    // Fix: confirm the account ourselves via the service-role admin API right
    // after signup, then sign in for real, so no email click is required.
    if (!data.session && data.user) {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (serviceKey && supabaseUrl) {
        const admin = createAdminClient(supabaseUrl, serviceKey);
        const { error: confirmError } = await admin.auth.admin.updateUserById(data.user.id, { email_confirm: true });
        if (!confirmError) {
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (!signInError) return NextResponse.redirect(new URL("/today", req.url), { status: 303 });
        }
      }
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
